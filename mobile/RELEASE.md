# KIPL ProjectOS — Android release runbook

The Android platform scaffold is generated and committed. Flutter 3.47.2 was
used; `flutter analyze` reports zero errors and zero warnings, and
`flutter test` passes.

**What has NOT been verified: the Gradle build.** The environment this was
prepared in could not reach `dl.google.com`, so the Android SDK was never
installed and `flutter build appbundle` was never run. The manifest and
`build.gradle.kts` changes below follow the documented Flutter patterns but are
unproven. **Run a debug build first** (step 2) before trusting the release path.

## What is already done

- `android/` generated, `applicationId` = `com.kipl.projectos`
- Manifest: INTERNET, fine/coarse location, camera; `<queries>` for `tel:` and
  `https:`; app label "KIPL ProjectOS"
- `build.gradle.kts`: release signing wired to `android/key.properties`, falling
  back to the debug key when that file is absent
- SDK levels come from Flutter 3.47 defaults — compileSdk 36, targetSdk 36,
  minSdk 24. Play requires targetSdk 35 or higher, so this already complies.
- `.gitignore` blocks keystores, `key.properties` and Play service-account JSON

## 1. First build on your machine

```bash
cd mobile
flutter pub get
flutter analyze          # expect: no errors, no warnings
flutter test             # expect: 20 passing
flutter run              # on a real device, with GPS enabled
```

Exercise check-in on site and off site before going further. The geofence is
the one thing no test here can prove — it needs real GPS at Nishat.

## 2. Verify the debug build compiles

```bash
flutter build apk --debug
```

If this fails, the problem is in the Gradle config, not your Dart. That is the
step I could not run.

## 3. Create the upload keystore

```bash
keytool -genkey -v -keystore ~/kipl-upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Then create `mobile/android/key.properties` — **an absolute `storeFile` path**:

```properties
storePassword=<password>
keyPassword=<password>
keyAlias=upload
storeFile=/home/you/kipl-upload-keystore.jks
```

`build.gradle.kts` picks this up automatically. With the file absent the release
build silently falls back to the debug key, and Play rejects debug-signed
uploads — so if `flutter build appbundle` succeeds but Play refuses the file,
this is why.

Back the keystore up somewhere you will still have in five years. If it is lost,
updates require a Google-side key reset. If it leaks, anyone can sign an update
that appears to come from KIPL. It is not in git and must stay that way.

## 4. Build the bundle

```bash
flutter build appbundle --release
# build/app/outputs/bundle/release/app-release.aab
```

## 5. Play Console

The app reads precise GPS and the camera, so before the listing can go live:

- **Privacy policy URL** — a public page stating that the app collects location
  and photographs for site attendance and works records, that KIPL controls the
  data, and how to request deletion. Mandatory.
- **Data safety form** — declare location (precise), photos, and personal
  identifiers; encrypted in transit; deletable on request.
- **Prominent disclosure** — Play policy requires an in-app screen explaining
  why location is collected *before* the runtime permission dialog appears.
  `GeofenceHelper.evaluateProximity()` currently calls
  `Geolocator.requestPermission()` with no preceding explanation. **This is the
  most likely cause of a policy rejection and is not yet fixed.**
- **Account deletion** — a documented deletion path, in-app or via a stated URL.

Start on the **internal testing** track. It puts a build in front of site staff
within hours and does not require the store listing to be complete, so the
privacy policy and data safety work can happen in parallel.

## Known gaps, deliberately not addressed

- **Launcher icon** is still the default Flutter icon. Replace the
  `android/app/src/main/res/mipmap-*/ic_launcher.png` set before a public
  release; `kipl-logo.png` exists in the repo but has not been converted to the
  five density buckets.
- **Prominent disclosure screen** — see above, needed for policy compliance.
- **17 `prefer_const` lint hints** remain in `flutter analyze`. They are
  micro-optimisations with no functional impact and were left alone to keep the
  pre-launch diff small.
