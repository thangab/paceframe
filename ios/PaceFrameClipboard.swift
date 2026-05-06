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
}
