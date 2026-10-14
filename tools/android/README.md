# Android release build

The repository is the authoritative source. Never patch an APK after building it.
Package: `games.shootrabbits.mobile`, version 2 / 1.1-mobile, minimum Android 7 (API 24), target API 36.

## Reproduce

Install Node 22, a full JDK 17, ffmpeg, Android SDK platform 36 and build tools 35.0.0. Set JAVA_HOME and ANDROID_HOME. Accept the Android SDK licences.

From the repository root:

```sh
npm ci --prefix tools/android --ignore-scripts
npm test
node tests/mobile-runtime.cjs
npm run build
node tests/production-build.cjs
npm run sync --prefix tools/android
BADFODDER_BROWSER_CHANNEL=chrome node tests/mobile-release.cjs
cd tools/android/android
./gradlew --no-daemon assembleRelease
```

For browser verification first install Chrome with `tools/android/node_modules/.bin/playwright install --with-deps chrome`. Browser results and screenshots are written to `test-results/mobile-release`. The GitHub Actions workflow performs browser verification and a native compile. Browser tests emulate phones and packaged-only networking; they do not establish physical Android/WebView performance, audio audibility or system gesture behaviour.

The build creates one compatible H.264/AAC campaign intro, uses local packaged assets, and excludes the browser service worker and duplicate original intro. Run the production asset test before native sync because the web test expects the service worker.

## Signing

Set RABBITS_KEYSTORE to an absolute keystore path, RABBITS_STORE_PASSWORD, and optionally RABBITS_KEY_ALIAS (default rabbits) and RABBITS_KEY_PASSWORD (default store password). Gradle signs the release when the keystore is configured. Otherwise the output is unsigned and cannot be installed directly. Keep the keystore and passwords out of git.

The previous reviewed APK's private signing key was unavailable. The delivered release uses a new key, so it cannot update that APK in place. Uninstalling removes its local app data. Keep a backup before uninstalling; the existing progress export does not include an active mission checkpoint. Future builds signed with the supplied new signing kit can update this release if the package ID stays unchanged and versionCode increases.

Release output: `tools/android/android/app/build/outputs/apk/release/app-release.apk` when signed. Byte-identical builds are not promised; dependencies are locked and all game/native source and build steps are committed.

## Signing an unsigned CI artifact

The workflow compiles the same Gradle release without private credentials. Download its `android-verification` artifact, then use Android SDK build-tools on the extracted `app-release-unsigned.apk`:

```sh
zipalign -c -p 4 app-release-unsigned.apk
apksigner sign --ks "$RABBITS_KEYSTORE" --ks-key-alias rabbits --ks-pass env:RABBITS_STORE_PASSWORD --out Shoot-Rabbits-Android-Polished.apk app-release-unsigned.apk
apksigner verify --verbose --print-certs Shoot-Rabbits-Android-Polished.apk
```

This is the standard Android APK signing step. It does not change game assets or native code. Keep the workflow commit SHA with the delivered APK.
