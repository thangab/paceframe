#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PaceFrameMapSnapshot, NSObject)

RCT_EXTERN_METHOD(
  generateMapSnapshot:(NSDictionary *)params
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
