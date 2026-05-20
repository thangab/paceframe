import Foundation
import UIKit

@objc(PaceFrameClipboard)
class PaceFrameClipboard: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc(copyPngBase64:resolver:rejecter:)
  func copyPngBase64(
    _ base64: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let data = Data(base64Encoded: base64) else {
      reject("E_INVALID_BASE64", "Invalid PNG base64 content.", nil)
      return
    }

    DispatchQueue.main.async {
      UIPasteboard.general.items = [["public.png": data]]
      resolve(nil)
    }
  }

  @objc(shareImageBase64ToInstagramStory:sourceApplication:resolver:rejecter:)
  func shareImageBase64ToInstagramStory(
    _ base64: String,
    sourceApplication: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let data = Data(base64Encoded: base64) else {
      reject("E_INVALID_BASE64", "Invalid image base64 content.", nil)
      return
    }

    shareToInstagramStory(
      pasteboardPayload: ["com.instagram.sharedSticker.backgroundImage": data],
      sourceApplication: sourceApplication,
      resolver: resolve,
      rejecter: reject
    )
  }

  @objc(shareVideoToInstagramStory:sourceApplication:resolver:rejecter:)
  func shareVideoToInstagramStory(
    _ uri: String,
    sourceApplication: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let path = uri.replacingOccurrences(of: "file://", with: "")
    do {
      let data = try Data(contentsOf: URL(fileURLWithPath: path))
      shareToInstagramStory(
        pasteboardPayload: ["com.instagram.sharedSticker.backgroundVideo": data],
        sourceApplication: sourceApplication,
        resolver: resolve,
        rejecter: reject
      )
    } catch {
      reject("E_INVALID_VIDEO", "Could not read video export.", error)
    }
  }

  private func shareToInstagramStory(
    pasteboardPayload: [String: Any],
    sourceApplication: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !sourceApplication.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      reject("E_MISSING_SOURCE_APPLICATION", "Missing Instagram Stories source application ID.", nil)
      return
    }

    guard let url = URL(string: "instagram-stories://share?source_application=\(sourceApplication)") else {
      reject("E_INVALID_URL", "Invalid Instagram Stories URL.", nil)
      return
    }

    DispatchQueue.main.async {
      guard UIApplication.shared.canOpenURL(url) else {
        reject("E_INSTAGRAM_UNAVAILABLE", "Instagram is not installed.", nil)
        return
      }

      UIPasteboard.general.setItems(
        [pasteboardPayload],
        options: [.expirationDate: Date().addingTimeInterval(60 * 5)]
      )
      UIApplication.shared.open(url, options: [:]) { opened in
        if opened {
          resolve(nil)
        } else {
          reject("E_OPEN_FAILED", "Could not open Instagram.", nil)
        }
      }
    }
  }
}
