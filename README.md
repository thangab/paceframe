# PaceFrame (Expo + React Native)

PaceFrame is an Expo React Native app to connect Strava, pick an activity, design a story-style overlay, and export visuals for sharing.

## Main Features

- Expo SDK 54 + TypeScript + Expo Router
- Strava OAuth login (`expo-web-browser` / auth session flow)
- Supabase Edge Function for code exchange (Strava code -> access/refresh tokens)
- Secure token storage (`expo-secure-store`)
- Activities list with Strava data + optional mock mode
- Preview editor with draggable/pinchable/rotatable blocks:
  - header/meta block
  - stats block templates
  - route block (`Map` or `Trace`)
  - extra image overlay layers
- Auto subject extraction on image import (`react-native-background-remover`)
- Layer ordering controls + center alignment guides + rotation snap guide (0°)
- Transparent checkerboard background mode
- Export:
  - PNG export (share sheet)
    - with image: image + layers
    - without image: transparent PNG with layers only
  - Video + layers export on iOS (native AVFoundation composer)
- Route map rendering:
  - iOS: native MapKit snapshot + orange route overlay
  - Android: Mapbox static image fallback
- Freemium/paywall with RevenueCat

## Tech Stack

- React Native 0.81
- Expo 54
- Expo Router
- Zustand state management
- RevenueCat (`react-native-purchases`)
- Skia dependency installed (`@shopify/react-native-skia`)

## Project Structure

```txt
app/
  _layout.tsx
  index.tsx
  login.tsx
  activities.tsx
  preview.tsx
  paywall.tsx
components/
  ActivityCard.tsx
  DraggableBlock.tsx
  DraggableOverlay.tsx
  PaceCanvas.tsx
  PrimaryButton.tsx
  RouteLayer.tsx
  StatsLayerContent.tsx
lib/
  backgroundRemoval.ts
  format.ts
  mockData.ts
  nativeVideoComposer.ts
  polyline.ts
  previewConfig.ts
  revenuecat.ts
  storage.ts
  strava.ts
store/
  activityStore.ts
  authStore.ts
  subscriptionStore.ts
types/
  preview.ts
  strava.ts
supabase/
  functions/
    _shared/cors.ts
    strava-exchange/index.ts
ios/
  PaceFrame/PaceFrameVideoComposer.swift
  PaceFrame/PaceFrameVideoComposer.m
  PaceFrame/PaceFrameMapSnapshot.swift
  PaceFrame/PaceFrameMapSnapshot.m
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Xcode (for iOS dev build)
- Strava API app
- Supabase project
- RevenueCat project

## Installation

```bash
npm install
```

Recommended after dependency updates:

```bash
npx expo install --fix
```

## Environment Variables

Copy and fill:

```bash
cp .env.example .env
```

Required values:

```env
EXPO_PUBLIC_STRAVA_CLIENT_ID=YOUR_STRAVA_CLIENT_ID
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_MAPBOX_TOKEN=pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_USE_MOCK_STRAVA=true
```

## Strava Setup

1. Open/create your app: https://www.strava.com/settings/api
2. Set `EXPO_PUBLIC_STRAVA_CLIENT_ID`.
3. Configure callback domain to allow the app redirect host.
4. Current app redirect URI used in code:

```txt
paceframe://app/oauth
```

Notes:

- Keep Strava client secret only in backend secrets.
- Never put client secret in mobile `.env`.

## Supabase Function Setup

Function path:

- `supabase/functions/strava-exchange/index.ts`

Deploy and set secrets:

```bash
supabase login
supabase functions deploy strava-exchange
supabase secrets set STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=...
```

The app calls:

```txt
${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/strava-exchange
```

## Run App

Start Metro:

```bash
npx expo start
```

Run native builds:

```bash
npx expo run:ios
npx expo run:android
```

For physical iPhone:

```bash
npx expo run:ios --device "<Your Device Name>"
```

## iOS Native Notes

This project includes native iOS modules for:

- subject/background removal support library
- video + layers export composition (`AVFoundation`)

After native code or native dependency changes:

```bash
npx pod-install ios
npx expo run:ios --device "<Your Device Name>"
```

## Preview Editor Behavior

- Default canvas background is transparent checkerboard.
- `Choose image`: imports image (no crop edit), then auto subject extraction.
- `Choose video`: imports video with edit enabled.
- `Clear background`: removes current media and returns to transparent checkerboard.
- Layers can be dragged, scaled, rotated, reordered.
- Center alignment guides appear during drag.
- Rotation snaps to 0° and shows a visual indicator.

## Export Behavior

- **Export PNG**:
  - if image background exists -> exports image + layers
  - if no image -> exports transparent PNG with layers only
  - opens share sheet (no automatic library save)
- **Export video + layers (iOS)**:
  - composes video with overlays via native module
  - opens share sheet (no automatic library save)

## RevenueCat

- Free tier:
  - watermark shown
  - premium UI/features gated
- Premium tier:
  - unlocks premium templates/features

Configure offerings/entitlement in RevenueCat and set public SDK keys in `.env`.

## Mock Mode

For local UI development without live Strava:

```env
EXPO_PUBLIC_USE_MOCK_STRAVA=true
```

## Troubleshooting

- `supabase` command not found:
  - install CLI first, then run `supabase login`
- Strava redirect error:
  - verify callback/domain settings exactly match app redirect URI
- Media permissions crash on iOS:
  - ensure proper `Info.plist` usage descriptions are present (already configured in `app.json`)
- Native feature not available:
  - rebuild dev client after native changes (`expo run:ios`)
