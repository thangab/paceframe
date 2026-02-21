#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PaceFrameVideoComposer, NSObject)

RCT_EXTERN_METHOD(
  composeVideoWithOverlay:(NSDictionary *)params
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
