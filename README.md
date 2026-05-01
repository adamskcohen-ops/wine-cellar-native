# Cellar Native

React Native and Expo rebuild of Adam's local-first wine cellar app.

## What is in here

Cellar Native includes onboarding, local profile personalization, camera capture, camera roll upload, OCR-backed label parsing, collection search and filters, grid and list layouts, wine details, ratings, notes, insights, settings, JSON import, and JSON export.

Data is stored locally with AsyncStorage. There is no cloud account or backend.

## Run on iPhone with Expo Go

Install Expo Go on the iPhone, then run:

```bash
npm install
npx expo start
```

Scan the QR code with the iPhone camera or Expo Go.

Expo Go can run the app UI, local storage, photo attachment, manual entry, import, and export. The OCR native module is not bundled inside Expo Go, so OCR will show a friendly fallback there.

## Run with OCR enabled

OCR uses `expo-text-extractor`, which needs a development build or production build because it includes native ML Kit and Apple Vision code.

```bash
npm install
npx expo prebuild
npx expo run:ios --device
```

For TestFlight, connect EAS once and build:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
```

Then upload the resulting iOS build to App Store Connect/TestFlight through EAS or Transporter.

## Scripts

```bash
npm start
npm run ios
npm run android
npx tsc --noEmit
```
