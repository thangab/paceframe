import AVFoundation
import Foundation
import UIKit

@objc(PaceFrameVideoComposer)
class PaceFrameVideoComposer: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(composeVideoWithOverlay:resolver:rejecter:)
  func composeVideoWithOverlay(
    _ params: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let videoUri = params["videoUri"] as? String,
      let overlayUri = params["overlayUri"] as? String
    else {
      reject("E_INVALID_PARAMS", "Missing videoUri or overlayUri.", nil)
      return
    }

    guard let videoURL = makeURL(from: videoUri), let overlayURL = makeURL(from: overlayUri) else {
      reject("E_INVALID_URI", "Invalid videoUri or overlayUri.", nil)
      return
    }

    let overlayImage = UIImage(contentsOfFile: overlayURL.path)
    guard let overlayCGImage = overlayImage?.cgImage else {
      reject("E_OVERLAY_READ", "Unable to read overlay PNG.", nil)
      return
    }

    let asset = AVAsset(url: videoURL)
    guard let sourceVideoTrack = asset.tracks(withMediaType: .video).first else {
      reject("E_NO_VIDEO_TRACK", "No video track found in source file.", nil)
      return
    }

    let composition = AVMutableComposition()
    guard let compositionVideoTrack = composition.addMutableTrack(
      withMediaType: .video,
      preferredTrackID: kCMPersistentTrackID_Invalid
    ) else {
      reject("E_COMPOSITION", "Unable to create mutable video track.", nil)
      return
    }

    do {
      try compositionVideoTrack.insertTimeRange(
        CMTimeRange(start: .zero, duration: asset.duration),
        of: sourceVideoTrack,
        at: .zero
      )
    } catch {
      reject("E_INSERT_VIDEO", "Unable to insert source video track.", error)
      return
    }

    if let sourceAudioTrack = asset.tracks(withMediaType: .audio).first,
       let compositionAudioTrack = composition.addMutableTrack(
         withMediaType: .audio,
         preferredTrackID: kCMPersistentTrackID_Invalid
       ) {
      do {
        try compositionAudioTrack.insertTimeRange(
          CMTimeRange(start: .zero, duration: asset.duration),
          of: sourceAudioTrack,
          at: .zero
        )
      } catch {
        // Keep going without audio if copy fails.
      }
    }

    let transformedSize = sourceVideoTrack.naturalSize.applying(sourceVideoTrack.preferredTransform)
    let renderSize = CGSize(width: abs(transformedSize.width), height: abs(transformedSize.height))

    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(start: .zero, duration: composition.duration)

    let videoLayerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionVideoTrack)
    videoLayerInstruction.setTransform(sourceVideoTrack.preferredTransform, at: .zero)
    instruction.layerInstructions = [videoLayerInstruction]

    let videoComposition = AVMutableVideoComposition()
    videoComposition.instructions = [instruction]
    videoComposition.renderSize = renderSize
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)

    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: renderSize)
    parentLayer.isGeometryFlipped = true

    let videoLayer = CALayer()
    videoLayer.frame = CGRect(origin: .zero, size: renderSize)
    parentLayer.addSublayer(videoLayer)

    let overlayLayer = CALayer()
    overlayLayer.contents = overlayCGImage
    overlayLayer.frame = CGRect(origin: .zero, size: renderSize)
    overlayLayer.masksToBounds = true
    parentLayer.addSublayer(overlayLayer)

    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )

    guard let exportSession = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
      reject("E_EXPORT_INIT", "Unable to create export session.", nil)
      return
    }

    let outputURL = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent("paceframe-composed-\(Int(Date().timeIntervalSince1970)).mp4")

    if FileManager.default.fileExists(atPath: outputURL.path) {
      try? FileManager.default.removeItem(at: outputURL)
    }

    exportSession.outputURL = outputURL
    exportSession.videoComposition = videoComposition
    exportSession.shouldOptimizeForNetworkUse = true
    if exportSession.supportedFileTypes.contains(.mp4) {
      exportSession.outputFileType = .mp4
    } else {
      exportSession.outputFileType = .mov
    }

    exportSession.exportAsynchronously {
      switch exportSession.status {
      case .completed:
        resolve(outputURL.absoluteString)
      case .failed:
        reject("E_EXPORT_FAILED", exportSession.error?.localizedDescription ?? "Video export failed.", exportSession.error)
      case .cancelled:
        reject("E_EXPORT_CANCELLED", "Video export cancelled.", nil)
      default:
        reject("E_EXPORT_UNKNOWN", "Video export ended with unexpected status.", exportSession.error)
      }
    }
  }

  private func makeURL(from value: String) -> URL? {
    if value.hasPrefix("file://") {
      return URL(string: value)
    }
    return URL(fileURLWithPath: value)
  }
}
