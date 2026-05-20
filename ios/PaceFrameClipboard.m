#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PaceFrameClipboard, NSObject)

RCT_EXTERN_METHOD(
  copyPngBase64:(NSString *)base64
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  shareImageBase64ToInstagramStory:(NSString *)base64
  sourceApplication:(NSString *)sourceApplication
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  shareVideoToInstagramStory:(NSString *)uri
  sourceApplication:(NSString *)sourceApplication
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
