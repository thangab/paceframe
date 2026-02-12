#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PaceFrameHealthKit, NSObject)

RCT_EXTERN_METHOD(
  getRecentActivities:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
