import Foundation
import MapKit
import UIKit

@objc(PaceFrameMapSnapshot)
class PaceFrameMapSnapshot: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(generateMapSnapshot:resolver:rejecter:)
  func generateMapSnapshot(
    _ params: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let encodedPolyline = params["polyline"] as? String,
      let width = params["width"] as? NSNumber,
      let height = params["height"] as? NSNumber
    else {
      reject("E_INVALID_PARAMS", "Missing polyline/width/height.", nil)
      return
    }

    let coordinates = decodePolyline(encodedPolyline)
    guard !coordinates.isEmpty else {
      reject("E_EMPTY_ROUTE", "Polyline decoding returned no coordinates.", nil)
      return
    }

    let colorHex = (params["strokeColorHex"] as? String) ?? "#F97316"
    let strokeColor = UIColor(hex: colorHex) ?? UIColor(red: 0.976, green: 0.451, blue: 0.086, alpha: 1)
    let mapVariant = (params["mapVariant"] as? String) ?? "standard"

    let size = CGSize(width: max(1, CGFloat(truncating: width)), height: max(1, CGFloat(truncating: height)))

    let options = MKMapSnapshotter.Options()
    options.size = size
    if mapVariant == "satellite" {
      options.mapType = .satellite
    } else {
      options.mapType = .standard
      if mapVariant == "dark", #available(iOS 13.0, *) {
        options.traitCollection = UITraitCollection(userInterfaceStyle: .dark)
      }
    }
    options.region = regionFitting(coordinates: coordinates)
    options.showsBuildings = false
    options.pointOfInterestFilter = .excludingAll

    let snapshotter = MKMapSnapshotter(options: options)
    snapshotter.start(with: DispatchQueue.global(qos: .userInitiated)) { snapshot, error in
      if let error {
        reject("E_MAP_SNAPSHOT", "Map snapshot failed: \(error.localizedDescription)", error)
        return
      }

      guard let snapshot else {
        reject("E_MAP_SNAPSHOT", "Map snapshot failed: empty result.", nil)
        return
      }

      let image = self.drawRoute(
        on: snapshot.image,
        snapshot: snapshot,
        coordinates: coordinates,
        strokeColor: strokeColor
      )

      guard let pngData = image.pngData() else {
        reject("E_IMAGE_ENCODE", "Unable to encode map snapshot image.", nil)
        return
      }

      let outURL = URL(fileURLWithPath: NSTemporaryDirectory())
        .appendingPathComponent("paceframe-map-\(Int(Date().timeIntervalSince1970 * 1000)).png")

      do {
        try pngData.write(to: outURL, options: [.atomic])
        resolve(outURL.absoluteString)
      } catch {
        reject("E_FILE_WRITE", "Unable to write map snapshot file.", error)
      }
    }
  }

  private func drawRoute(
    on image: UIImage,
    snapshot: MKMapSnapshotter.Snapshot,
    coordinates: [CLLocationCoordinate2D],
    strokeColor: UIColor
  ) -> UIImage {
    let renderer = UIGraphicsImageRenderer(size: image.size)
    return renderer.image { context in
      image.draw(at: .zero)

      let path = UIBezierPath()
      for (idx, coordinate) in coordinates.enumerated() {
        let point = snapshot.point(for: coordinate)
        if idx == 0 {
          path.move(to: point)
        } else {
          path.addLine(to: point)
        }
      }
      path.lineWidth = 4
      path.lineJoinStyle = .round
      path.lineCapStyle = .round
      strokeColor.setStroke()
      path.stroke()
    }
  }

  private func regionFitting(coordinates: [CLLocationCoordinate2D]) -> MKCoordinateRegion {
    var minLat = coordinates[0].latitude
    var maxLat = coordinates[0].latitude
    var minLng = coordinates[0].longitude
    var maxLng = coordinates[0].longitude

    for c in coordinates {
      minLat = min(minLat, c.latitude)
      maxLat = max(maxLat, c.latitude)
      minLng = min(minLng, c.longitude)
      maxLng = max(maxLng, c.longitude)
    }

    let center = CLLocationCoordinate2D(
      latitude: (minLat + maxLat) / 2.0,
      longitude: (minLng + maxLng) / 2.0
    )

    var span = MKCoordinateSpan(
      latitudeDelta: max((maxLat - minLat) * 1.35, 0.005),
      longitudeDelta: max((maxLng - minLng) * 1.35, 0.005)
    )

    span.latitudeDelta = min(span.latitudeDelta, 180)
    span.longitudeDelta = min(span.longitudeDelta, 360)

    return MKCoordinateRegion(center: center, span: span)
  }

  private func decodePolyline(_ encoded: String) -> [CLLocationCoordinate2D] {
    var index = encoded.startIndex
    let end = encoded.endIndex
    var lat = 0
    var lng = 0
    var coordinates: [CLLocationCoordinate2D] = []

    while index < end {
      var result = 0
      var shift = 0
      var byte: Int

      repeat {
        guard index < end else { return coordinates }
        byte = Int(encoded[index].asciiValue ?? 63) - 63
        index = encoded.index(after: index)
        result |= (byte & 0x1F) << shift
        shift += 5
      } while byte >= 0x20

      let dLat = (result & 1) != 0 ? ~(result >> 1) : (result >> 1)
      lat += dLat

      result = 0
      shift = 0

      repeat {
        guard index < end else { return coordinates }
        byte = Int(encoded[index].asciiValue ?? 63) - 63
        index = encoded.index(after: index)
        result |= (byte & 0x1F) << shift
        shift += 5
      } while byte >= 0x20

      let dLng = (result & 1) != 0 ? ~(result >> 1) : (result >> 1)
      lng += dLng

      coordinates.append(
        CLLocationCoordinate2D(
          latitude: Double(lat) / 1e5,
          longitude: Double(lng) / 1e5
        )
      )
    }

    return coordinates
  }
}

private extension UIColor {
  convenience init?(hex: String) {
    var value = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if value.hasPrefix("#") { value.removeFirst() }
    guard value.count == 6 else { return nil }

    var rgb: UInt64 = 0
    guard Scanner(string: value).scanHexInt64(&rgb) else { return nil }

    self.init(
      red: CGFloat((rgb & 0xFF0000) >> 16) / 255.0,
      green: CGFloat((rgb & 0x00FF00) >> 8) / 255.0,
      blue: CGFloat(rgb & 0x0000FF) / 255.0,
      alpha: 1.0
    )
  }
}
