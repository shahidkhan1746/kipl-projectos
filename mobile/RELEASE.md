# KIPL ProjectOS — Android release runbook

The repository holds the Flutter **source only** (`lib/`, `pubspec.yaml`). There
is no `android/` directory, so there is currently nothing to build an App Bundle
from. Everything below has to happen on a machine with the Flutter SDK before a
Play Store submission is possible.

## 1. Generate the Android platform scaffold

```bash
cd mobile
flutter create --platforms=android --org in.kipl --project-name kipl_projectos .
flutter pub get
flutter analyze
```

`flutter create` is additive — it writes `android/` and leaves `lib/` untouched.

Choose the `--org` carefully: it fixes the `applicationId`
(`in.kipl.kipl_projectos`), which **cannot be changed after the first upload**
to Play. If the listing should read something else, set it now.

## 2. Declare the permissions the app actually uses

`android/app/src/main/AndroidManifest.xml` needs these inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
```

Do **not** add `ACCESS_BACKGROUND_LOCATION`. The app only reads GPS in the
foreground when a worker taps check-in, and background location triggers a
separate Play review with a mandatory video demonstration.

For the team directory's call and WhatsApp buttons, `url_launcher` on Android 11+
also needs, as a direct child of `<manifest>`:

```xml
<queries>
  <intent><action android:name="android.intent.action.VIEW"/>
    <data android:scheme="https"/></intent>
  <intent><action android:name="android.intent.action.DIAL"/>
    <data android:scheme="tel"/></intent>
</queries>
```

Without this the call and WhatsApp buttons silently fail on Android 11 and
later — `launchUrl` returns false and the user sees "No phone application is
available."

## 3. Set the SDK levels

In `android/app/build.gradle`:

- `targetSdk` / `compileSdk` — Play requires **35** for new apps as of
  August 2025. `flutter create` may scaffold lower depending on SDK version.
- `minSdk` — `flutter_secure_storage` needs 18+; 23 is a sensible floor and
  covers effectively every device in use on site.

## 4. Create the upload keystore

```bash
keytool -genkey -v -keystore ~/kipl-upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Then `android/key.properties`:

```properties
storePassword=<password>
keyPassword=<password>
keyAlias=upload
storeFile=/absolute/path/to/kipl-upload-keystore.jks
```

Wire it into `android/app/build.gradle` per the Flutter deployment docs, so
`buildTypes.release` uses `signingConfigs.release` rather than the debug key.

**Keep the keystore and `key.properties` out of git.** `mobile/.gitignore`
already blocks `*.jks`, `*.keystore`, and `key.properties`. Store the keystore
somewhere you will still have it in five years — if it is lost, updates to the
listing require a Google-side key reset, and if it leaks, anyone can sign an
update that appears to come from KIPL.

## 5. Build

```bash
flutter build appbundle --release
# output: build/app/outputs/bundle/release/app-release.aab
```

## 6. Play Console requirements

The app reads precise GPS and the camera, so the listing needs:

- **Privacy policy URL** — a public page stating that the app collects location
  and photographs for site attendance and works records, who controls the data
  (KIPL), and how to request deletion. Required before the listing can go live.
- **Data safety form** — declare location (precise), photos, and personal
  identifiers; state that data is encrypted in transit and whether it can be
  deleted on request.
- **Prominent disclosure** — Play policy requires an in-app notice explaining
  why location is collected *before* the runtime permission dialog appears.
  `GeofenceHelper.evaluateProximity()` currently calls
  `Geolocator.requestPermission()` directly with no preceding explanation
  screen. This is the most likely cause of a policy rejection and is worth
  fixing before submission.
- **Account deletion** — an app with user accounts needs a documented deletion
  path, in-app or via a stated URL.

Internal testing track is the fastest way to get the first build in front of
site staff while the store listing is still being completed.
