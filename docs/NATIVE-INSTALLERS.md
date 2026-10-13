# Native game installers

The native packages contain the entire game, including campaign, mission select,
Resistance, graphics, video, music and voice recordings. Single player starts
offline on first launch, without Firebase, a browser installation step or a local
server. Online multiplayer remains available through the existing room service.
Saves belong to each installed app; browser saves are not automatically imported.

## Player downloads

Open the successful **Build native game installers** run in GitHub Actions.
Download **Shoot-Rabbits-SEND-TO-FRIENDS** for one ZIP containing all four
platforms, or download a platform ZIP below. Extract it and follow the included
`READ-ME-FIRST.txt`. Send the downloaded ZIP directly to friends; they need no
GitHub account or source code. GitHub downloads require your sign-in and expire,
so retain a local copy. See [sharing instructions](SEND-TO-FRIENDS.txt).

| Device | Artifact | Install |
| --- | --- | --- |
| Chromebook x64 / ARM64 | Chromebook installer ZIP | Enable Linux once, extract into Linux files, then run the included `INSTALL-CHROMEBOOK.sh` in Terminal. It selects the correct processor and creates a launcher entry. No Node or server needed. |
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
The workflow must succeed before its installers are available. Automated build
and asset checks do not establish that every physical device has been tested.

ChromeOS requires its Linux environment for this downloadable installer. Linux
setup and missing system libraries may require internet initially. Managed devices
may block Linux. Google has deprecated the graphical `.deb` installer, so the
included script uses APT. [Linux setup](https://support.google.com/chromebook/answer/9145439)
and [ChromeOS changes](https://developers.google.com/chromeos/app-development/develop/news).

## Build a ZIP from the code on your Chromebook

In this project folder, run:

```sh
npm run installer:chromebook
```

This builds the current local code, installs the separate desktop build tools,
and creates `release/Shoot-Rabbits-chromebook-SEND-TO-FRIENDS.zip`. Send that ZIP.
No GitHub upload or hosted game is used by this command. It needs internet to
obtain build tools, npm, and Python 3 to create the ZIP. If your system Node is
older than 22, the command downloads a private Node 22 build runtime automatically
without changing your system installation. You can also run
`bash BUILD-CHROMEBOOK-INSTALLER.sh` from the extracted project folder.

On Windows, `npm run installer:windows` creates the Windows ZIP. On a Mac,
`npm run installer:mac` creates the Mac ZIP. With Android SDK and Java 21 installed,
`npm run installer:android` creates the Android test ZIP. All outputs go in
`release/`. These commands compile the files in the local checkout. To produce
all four without owning each build platform, use the included GitHub workflow
with this project's current code.

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

For Chromebook packages on Linux, use `npm run package:chromebook --prefix desktop`
after desktop preparation and dependency installation. This builds both x64 and
ARM64 Debian packages. To add friend instructions and checksums, run
`node tools/installers/package.cjs chromebook release friend-installer`.

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
