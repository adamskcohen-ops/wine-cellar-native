# TestFlight deployment

This app is configured for an Expo/EAS production iOS build using bundle identifier `com.adamskcohen.winecellar`.

## One-time setup on Adam's Mac

Install dependencies and log into Expo:

```sh
git clone https://github.com/adamskcohen-ops/wine-cellar-native.git
cd wine-cellar-native
npm install
npx eas-cli login
```

If this is the first EAS run for the project, initialize/link the Expo project when prompted:

```sh
npx eas-cli init
```

## Build for App Store Connect/TestFlight

Run:

```sh
npx eas-cli build --platform ios --profile production
```

Choose iOS if prompted. For Apple credentials, let EAS manage certificates and provisioning profiles unless you have a reason not to. EAS may prompt for the Apple ID, 2FA, and permission to create the bundle identifier/profiles.

## Submit the latest build to TestFlight

After the build succeeds, upload the latest EAS build to App Store Connect:

```sh
npx eas-cli submit --platform ios --profile production --latest
```

If EAS asks to create the app in App Store Connect, say yes. If it asks for the App Store Connect app ID, you can leave `ascAppId` out of `eas.json` until the app exists, then paste the value later for fully automated future submissions.

Apple usually takes several minutes to process the upload. Once it appears in App Store Connect, open TestFlight, add Adam as an internal tester, and install through the TestFlight app.

## Faster future release

Once the first App Store Connect app record exists and credentials are stored, future builds can usually use:

```sh
npx eas-cli build --platform ios --profile production --auto-submit
```
