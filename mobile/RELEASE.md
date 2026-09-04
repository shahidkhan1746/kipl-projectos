# KIPL ProjectOS — Android release runbook

The Android platform scaffold is generated and committed. Flutter 3.47.2 was
used; `flutter analyze` reports zero errors and zero warnings, and
`flutter test` passes.

The Gradle config is verified: CI built a debug APK successfully on run 2
(`flutter build apk --debug`, 77 MB artifact), which exercised manifest
merging, the applicationId, plugin resolution and the release signing
fallback. The release path itself — signing with a real keystore — is still
unproven, because the keystore does not exist yet.

## What is already done

- `android/` generated, `applicationId` = `com.kipl.projectos`
- Manifest: INTERNET, fine/coarse location, camera; `<queries>` for `tel:` and
  `https:`; app label "KIPL ProjectOS"
- `build.gradle.kts`: release signing wired to `android/key.properties`, falling
  back to the debug key when that file is absent
- SDK levels come from Flutter 3.47 defaults — compileSdk 36, targetSdk 36,
  minSdk 24. Play requires targetSdk 35 or higher, so this already complies.
- `.gitignore` blocks keystores, `key.properties` and Play service-account JSON
- Launcher icons generated from the KIPL crest — legacy at five densities plus
  an adaptive icon for API 26+
- Location prominent disclosure shown before the system permission prompt

## 1. First build on your machine

```bash
cd mobile
flutter pub get
flutter analyze          # expect: no errors, no warnings
flutter test             # expect: 23 passing
flutter run              # on a real device, with GPS enabled
```

Exercise check-in on site and off site before going further. The geofence is
the one thing no test here can prove — it needs real GPS at Nishat.

## 2. Debug build

```bash
flutter build apk --debug
```

CI already does this on every push to `mobile/**` and uploads the APK as a
build artifact, so you can install a build on a phone without any local
Android tooling — open the run in the Actions tab and download
`kipl-projectos-debug-apk`.

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

Locally:

```bash
flutter build appbundle --release
# build/app/outputs/bundle/release/app-release.aab
```

### Or build it in CI (no local Android tooling needed)

The **Mobile Release** workflow builds a release-signed AAB on a runner and
uploads it as an artifact. It needs the signing material as repository secrets.

Encode the keystore — note `-w0`, the value must be a single line:

```bash
base64 -w0 ~/kipl-upload-keystore.jks > keystore.b64
```

Then add four secrets under **Settings → Secrets and variables → Actions →
New repository secret**:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the entire contents of `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_PASSWORD` | the key password (often the same) |
| `ANDROID_KEY_ALIAS` | `upload` |

Avoid a backslash in either password — `key.properties` is a Java properties
file, where a backslash is an escape character.

Delete `keystore.b64` once the secret is saved, and keep the `.jks` itself off
this machine's shared folders. Adding the keystore to GitHub as a secret does
not make the repository a safe place for the file itself.

Run it from **Actions → Mobile Release → Run workflow**. Two optional inputs:

- **build_number** — the Play version code. Every upload needs one strictly
  higher than the last. Leave blank to use `pubspec.yaml` (currently `1`).
- **build_name** — the version shown to users, e.g. `1.0.1`.

Pushing a tag matching `v*` triggers it too.

The workflow refuses to start if any secret is missing, and after building it
verifies the bundle is not debug-signed before uploading — the Gradle fallback
to the debug key is silent, and a debug-signed AAB is rejected by Play only
after you have uploaded it. The keystore and `key.properties` are deleted at
the end of the job whether it succeeded or failed.

Download `kipl-projectos-release-aab` from the run and upload it to the Play
Console.

## 5. Play Console

The app reads precise GPS and the camera, so before the listing can go live:

- **Privacy policy URL** — a public page stating that the app collects location
  and photographs for site attendance and works records, that KIPL controls the
  data, and how to request deletion. Mandatory.
- **Data safety form** — declare location (precise), photos, and personal
  identifiers; encrypted in transit; deletable on request.
- **Prominent disclosure** — done. `GeofenceHelper.evaluateProximity()` no
  longer prompts; it returns `permissionRequired` and the attendance screen
  shows the disclosure first. The only `requestPermission()` call in the app
  sits behind `requestAccessAfterDisclosure()`, reachable only after the
  worker agrees.
- **Account deletion** — a documented deletion path, in-app or via a stated URL.

Start on the **internal testing** track. It puts a build in front of site staff
within hours and does not require the store listing to be complete, so the
privacy policy and data safety work can happen in parallel.

## Known gaps, deliberately not addressed

- **The privacy policy, data safety form and account deletion path** still have
  to be written and published. Nothing in the repo can substitute for them and
  the listing cannot go live without them.
- **A release build has never been signed**, because the keystore does not
  exist yet. Step 3 is the first time that path runs, whether locally or in CI.
- **Automatic upload to the Play internal testing track is not wired up.** It
  needs a Google Cloud service account linked to the Play Console, and Google
  requires the very first bundle for a new app to be uploaded by hand anyway,
  so it is only worth adding once the listing exists.
- **19 `prefer_const` lint hints** remain in `flutter analyze`. They are
  micro-optimisations with no functional impact and were left alone to keep the
  pre-launch diff small.
- **The geofence itself is untested against real GPS.** No test here can prove
  it; it needs a phone at Nishat.
