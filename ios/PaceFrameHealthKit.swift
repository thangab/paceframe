import Foundation
import HealthKit
import CoreLocation

@objc(PaceFrameHealthKit)
class PaceFrameHealthKit: NSObject {
  private let healthStore = HKHealthStore()

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(getRecentActivities:rejecter:)
  func getRecentActivities(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reject("E_HEALTHKIT_UNAVAILABLE", "HealthKit unavailable on this device.", nil)
      return
    }

    guard let distanceRunType = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning),
          let distanceRideType = HKObjectType.quantityType(forIdentifier: .distanceCycling) else {
      reject("E_HEALTHKIT_TYPES", "Could not initialize HealthKit types.", nil)
      return
    }

    let readTypes: Set<HKObjectType> = [
      HKObjectType.workoutType(),
      distanceRunType,
      distanceRideType,
      HKSeriesType.workoutRoute()
    ]

    healthStore.requestAuthorization(toShare: nil, read: readTypes) { granted, authError in
      if let authError {
        reject("E_HEALTHKIT_AUTH", "HealthKit auth failed: \(authError.localizedDescription)", authError)
        return
      }
      if !granted {
        reject("E_HEALTHKIT_AUTH_DENIED", "HealthKit authorization denied.", nil)
        return
      }

      let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
      let query = HKSampleQuery(
        sampleType: HKObjectType.workoutType(),
        predicate: nil,
        limit: 100,
        sortDescriptors: [sort]
      ) { _, samples, queryError in
        if let queryError {
          reject("E_HEALTHKIT_QUERY", "HealthKit query failed: \(queryError.localizedDescription)", queryError)
          return
        }

        let workouts = (samples as? [HKWorkout]) ?? []
        if workouts.isEmpty {
          resolve([])
          return
        }

        let iso = ISO8601DateFormatter()
        let group = DispatchGroup()
        let lock = NSLock()
        var indexedRows: [Int: [String: Any]] = [:]

        for (index, workout) in workouts.enumerated() {
          group.enter()
          self.fetchRoutePolyline(for: workout) { polyline in
            let distance = workout.totalDistance?.doubleValue(for: .meter()) ?? 0
            let movingTime = Int(workout.duration.rounded())
            let elapsedTime = movingTime
            let avgSpeed = movingTime > 0 ? distance / Double(movingTime) : 0

            let info = self.activityInfo(for: workout.workoutActivityType)
            let stableId = Int(workout.startDate.timeIntervalSince1970) + index

            let row: [String: Any] = [
              "id": stableId,
              "name": info.defaultName,
              "distance": distance,
              "moving_time": movingTime,
              "elapsed_time": elapsedTime,
              "total_elevation_gain": 0,
              "type": info.type,
              "start_date": iso.string(from: workout.startDate),
              "average_speed": avgSpeed,
              "summary_polyline": polyline ?? NSNull()
            ]

            lock.lock()
            indexedRows[index] = row
            lock.unlock()
            group.leave()
          }
        }

        group.notify(queue: .main) {
          let rows = indexedRows.keys.sorted().compactMap { indexedRows[$0] }
          resolve(rows)
        }
      }

      self.healthStore.execute(query)
    }
  }

  private func activityInfo(for type: HKWorkoutActivityType) -> (type: String, defaultName: String) {
    switch type {
    case .running:
      return ("Run", "Running Workout")
    case .cycling:
      return ("Ride", "Cycling Workout")
    case .walking:
      return ("Walk", "Walking Workout")
    case .hiking:
      return ("Hike", "Hiking Workout")
    case .swimming:
      return ("Swim", "Swimming Workout")
    case .rowing:
      return ("Rowing", "Rowing Workout")
    case .elliptical:
      return ("Elliptical", "Elliptical Workout")
    case .stairClimbing:
      return ("Stair", "Stair Climbing Workout")
    case .traditionalStrengthTraining, .functionalStrengthTraining:
      return ("Strength", "Strength Workout")
    case .highIntensityIntervalTraining:
      return ("HIIT", "HIIT Workout")
    case .yoga:
      return ("Yoga", "Yoga Session")
    default:
      return ("Workout", "HealthKit Workout")
    }
  }

  private func fetchRoutePolyline(
    for workout: HKWorkout,
    completion: @escaping (String?) -> Void
  ) {
    let predicate = HKQuery.predicateForObjects(from: workout)
    let query = HKSampleQuery(
      sampleType: HKSeriesType.workoutRoute(),
      predicate: predicate,
      limit: HKObjectQueryNoLimit,
      sortDescriptors: nil
    ) { [weak self] _, samples, error in
      if error != nil {
        completion(nil)
        return
      }

      let routes = (samples as? [HKWorkoutRoute]) ?? []
      if routes.isEmpty {
        completion(nil)
        return
      }

      let group = DispatchGroup()
      let lock = NSLock()
      var allCoordinates: [CLLocationCoordinate2D] = []

      for route in routes {
        group.enter()
        self?.fetchCoordinates(from: route) { coords in
          if !coords.isEmpty {
            lock.lock()
            allCoordinates.append(contentsOf: coords)
            lock.unlock()
          }
          group.leave()
        }
      }

      group.notify(queue: .global(qos: .userInitiated)) {
        if allCoordinates.count < 2 {
          completion(nil)
          return
        }
        completion(self?.encodePolyline(allCoordinates))
      }
    }

    healthStore.execute(query)
  }

  private func fetchCoordinates(
    from route: HKWorkoutRoute,
    completion: @escaping ([CLLocationCoordinate2D]) -> Void
  ) {
    var collected: [CLLocationCoordinate2D] = []
    var completed = false

    let query = HKWorkoutRouteQuery(route: route) { _, locations, done, error in
      if let _ = error {
        if !completed {
          completed = true
          completion(collected)
        }
        return
      }

      if let locations = locations {
        collected.append(contentsOf: locations.map(\.coordinate))
      }

      if done && !completed {
        completed = true
        completion(collected)
      }
    }

    healthStore.execute(query)
  }

  private func encodePolyline(_ points: [CLLocationCoordinate2D]) -> String {
    var lastLat = 0
    var lastLng = 0
    var result = ""

    func encode(_ value: Int) -> String {
      var v = value < 0 ? ~(value << 1) : (value << 1)
      var output = ""
      while v >= 0x20 {
        output.append(Character(UnicodeScalar((0x20 | (v & 0x1f)) + 63)!))
        v >>= 5
      }
      output.append(Character(UnicodeScalar(v + 63)!))
      return output
    }

    for point in points {
      let lat = Int((point.latitude * 1e5).rounded())
      let lng = Int((point.longitude * 1e5).rounded())
      let dLat = lat - lastLat
      let dLng = lng - lastLng
      lastLat = lat
      lastLng = lng
      result += encode(dLat)
      result += encode(dLng)
    }

    return result
  }
}
