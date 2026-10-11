# Native game installers

The native packages contain the entire game, including campaign, mission select,
Resistance, graphics, video, music and voice recordings. Single player starts
offline on first launch, without Firebase, a browser installation step or a local
server. Online multiplayer remains available through the existing room service.
Saves belong to each installed app; browser saves are not automatically imported.

## Player downloads

Run the **Build native game installers** workflow in GitHub Actions after pushing
these files. Download its ZIP artifacts and extract them:

| Device | Artifact | Install |
| --- | --- | --- |
| Windows x64 | Windows installer ZIP | Run `Shoot-Rabbits-Install-…exe`; launch the desktop or Start menu shortcut. |
| Mac | Mac installer ZIP | Open the `.dmg` and drag the game into Applications. The universal app supports Intel and Apple Silicon. |
| Android | Android test installer ZIP | Open the `.apk` on the device and allow installation from that download source. |
| iPhone / iPad | Unsigned archive | Not installable yet. Sign and distribute through an Apple developer team using TestFlight, the App Store or a supported device distribution method. |

The Windows and Mac packages are not code-signed by this project yet. macOS
Gatekeeper may block unsigned downloads. The Android test APK uses a debug key;
its signing identity can change between clean builds, so it is for testing rather
than permanent releases. Do not uninstall an existing test build to upgrade if
you need its saves. A release signing key is required for stable Android updates.
The iOS archive deliberately says **NOT-INSTALLABLE** in its artifact name.
No installers have been built or device-tested until the workflow succeeds.

## Building locally

Use Node 22 or newer. Native build dependencies are separate from the browser
project, so ordinary web builds do not download Electron or Capacitor.

Windows or macOS:

```sh
npm run desktop:prepare
npm install --prefix desktop
npm run test:desktop
npm run package:windows --prefix desktop
# On a Mac instead:
npm run package:mac --prefix desktop
```

Output is in `release/`, separate from the website's `dist/`.
To try the desktop app before packaging: `npm start --prefix desktop`.

Android (Android Studio/SDK and Java 21 required):

```sh
npm run mobile:prepare
npm install --prefix mobile
npm run android --prefix mobile
npm run open:android --prefix mobile
```

Use Android Studio's APK build command for a test installation, or Generate Signed
Bundle / APK with your release key for distribution. The CLI equivalent for a test
APK is `./gradlew assembleDebug` inside `mobile/android/`.

Apple phones and tablets (Mac and Xcode required):

```sh
npm run mobile:prepare
npm install --prefix mobile
npm run ios --prefix mobile
npm run open:ios --prefix mobile
```

Select your signing team in Xcode, connect a device and run the app. Archive and
distribute through your Apple developer account for other users. The generated
project uses Swift Package Manager. Re-running preparation keeps generated native
projects and signing settings, syncs web assets, and reapplies landscape and icons.

## Verification

`npm run test:native` verifies local origins, complete bundled files, multiplayer
invite links and installer shortcuts. `npm run test:coop` checks multiplayer
regressions. These checks do not replace installation and gameplay tests on each
platform. Before publishing, install on a clean device with networking disabled,
play campaign, mission select and Resistance, close/reopen and confirm progress,
then reconnect and check multiplayer with a second device.

Electron uses a stable `rabbits://game/` origin and the app's persistent user-data
folder. Mobile apps use Capacitor's bundled local origin. Keep the app IDs and
origins stable across releases to preserve saves. Uninstalling mobile apps can
remove their saves. Desktop uninstall configuration retains app data.
