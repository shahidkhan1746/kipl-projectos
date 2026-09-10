# Mobile design audit — 9 September 2026

## Scope and baseline

Inspected the Flutter application's routes, shared theme/widgets, all 12 major
screen implementations, associated providers, dependencies and existing tests.
This is a source-led product/design audit, not a claim of physical-device or
production acceptance testing. Baseline: `f6ef08ef`; pre-existing untracked
`.claude/settings.local.json` is out of scope. The separate React web frontend
and NestJS backend are not being redesigned here.

This is Flutter/Dart, not Expo. Expo Router, shadcn, Reanimated and FlashList are
not compatible replacements for this app's widgets. Keep its existing stack.
Android is scaffolded; no iOS project is present, so iOS release parity is
unverified. No usage analytics were available: prioritising the dashboard is an
inference from its role as the signed-in entry screen.

## Findings and screen order

| Priority / screen | Source under `lib/` | Current UX gap / next design move |
| --- | --- | --- |
| 1 Dashboard | features/dashboard/screens/dashboard_screen.dart; widgets/project_hero_card.dart | Oversized gradient hero, duplicated date/attendance, tiny metrics, ten rainbow shortcuts and repeated reference card. Lead with attendance, use grouped tool rows, disclose project detail progressively. Avatar/sync hit areas and account sheet need accessibility work. |
| 2 Attendance | features/attendance/screens/attendance_screen.dart | GPS, attendance state and submission feedback compete. Keep location disclosure and geofence logic; clarify one next action, pending/offline states and permission recovery. |
| 3 Site Diary | features/diary/screens/diary_screen.dart | Long form, small counter controls, mostly snackbar validation. Group sections, improve field semantics and inline feedback without changing payloads. |
| 3 Tasks | features/tasks/screens/tasks_screen.dart | Filters and card chrome obscure task hierarchy. Preserve lazy list; improve status/readability and contextual empty states. |
| 4 Materials | features/materials/screens/materials_screen.dart | Dense stock/actions and sheet form hierarchy. Clarify quantities/units, validation and disabled/submitting states. |
| 4 Fleet | features/fleet/screens/fleet_screen.dart | Heavy log forms and repeated style literals. Group equipment, usage and fuel; preserve operation-specific fields. |
| 5 QA & Safety | features/qa/screens/qa_screen.dart | Inconsistent sheets and tiny metadata. Empty NCR list claims compliance is intact: absence of records is not proof of compliance. Keep lazy sliver lists and permission gates. |
| 5 Site Orders | features/site_orders/screens/site_orders_screen.dart | Repeated bordered cards; vague empty state. Prioritise instruction/status, author/date secondary; preserve action permissions. |
| 5 Approvals | features/approvals/screens/approvals_screen.dart | Approval context needs stronger hierarchy and accessible decision controls. Keep manager gate and existing lazy lists. |
| 6 Team | features/team/screens/team_screen.dart | Generic empty state and small supporting text. Clarify role/contact hierarchy without exposing additional data. |
| 6 Site Updates | features/site_updates/screens/site_update_screen.dart | Fixed-height filter rail and unconstrained image dialog risk large-font/landscape clipping. Expand-description tap target small. Preserve actual implemented feed/search/photos. Missing integration helpers currently block compilation. |
| 7 Login | features/auth/screens/login_screen.dart | Branding/form proportions, autofill and keyboard flow need polish. Keep specific failure/cold-start diagnostics and endpoint diagnosis. |

Shared findings: `shared/theme/app_theme.dart` has no semantic TextTheme and
screens independently specify 9–17 point text and irregular spacing. Small faint
text on dark surfaces needs contrast checks. `shared/widgets/kipl_button.dart`
fixes height and truncates text; `kipl_text_field.dart` lacks reusable autofill,
submit-action and inline helper contracts. Do not silently migrate every form.
The existing global infinite-width ElevatedButton minimum is risky in rows;
the new scoped design theme uses a finite minimum instead.

`core/router.dart` already has four obvious tabs and secondary pushed routes.
Keep that structure and the stable-router/auth fix. Do not introduce a hamburger
menu. Most lists already use Flutter's lazy builders: keep them. Many form
sheets already handle keyboard insets and scroll: preserve those foundations.

## Direction: field-first, quiet and readable

One primary attendance entry action, a compact project snapshot, and grouped
secondary tools. Blue is for interaction, not a different colour per module.
Use text + icon + label for state; never colour alone. Remove duplicate cards,
not data. Keep project metrics, contract reference, queue recovery, account,
role gates and every destination accessible. Unknown data must remain unknown.
Dark-first rollout; a half-light/half-hard-coded-dark app is not a finished mode.

## Design tokens (first-screen scope)

| Family | Tokens |
| --- | --- |
| Surfaces | background #11161C; surface #1A222C; elevated #242F3B; subtle border #344252 |
| Text | primary #EFF3F8; secondary #BBC6D3; muted #A1AEBD |
| Interaction | primary #A9C9FF; pressed #8BB4F7; on-primary #132B4C |
| Semantics | success #8CD5B3; warning #EBC27E; danger #FFB4AB; also explicit text labels |
| Typography | display 32/1.2, title 28/1.2, section 20/1.3, body 16/1.5, supporting 14/1.4, caption 12/1.4, control 15/1.3, stat 28/1.2; selective medium/semibold weights |
| Spacing | 4, 8, 12, 16, 20, 24, 32, 40, 48; gutter 20; section gap 24 |
| Radius / elevation | 8 control, 12 surface, 20 sheet; flat sections, elevation 0; overlay elevation 2 |
| Icons / touch | 20 supporting, 24 standard; minimum control 48; no fixed text-container heights |
| Motion | 120ms feedback, 200ms disclosure, easeOutCubic; zero custom disclosure duration with reduced motion; no decorative chart animation |
| Buttons | filled primary, outlined secondary, text tertiary, danger text with explicit confirmation |
| Containers | plain section by default; filled surface for related summary/action; no per-row cards |
| Inputs | filled, visible label, helper/error, focused border; rollout with form screens |

Tokens live in `shared/theme/field_theme.dart`; reusable section, navigation row
and adaptive facts in `shared/widgets/field_components.dart`. Scope the theme to
the dashboard and its overlays until remaining screens are tested. Light mode
is deferred, not claimed complete. Follow Flutter's
[accessibility guidance](https://docs.flutter.dev/ui/accessibility/ui-design-and-styling)
and [automated checks](https://docs.flutter.dev/ui/accessibility/accessibility-testing):
use at least 48 logical pixels for controls, test font scaling and contrast.
Apple-specific behaviour still needs an iOS build and VoiceOver/device checks.

## Dependencies

Keep Flutter Material 3, Riverpod, GoRouter, Dio, secure storage, geolocator,
image_picker, intl, url_launcher and connectivity_plus. Keep flutter_test and
flutter_lints. No dependency upgrades or new UI packages needed. Restore the
existing lockfile's dependency mapping only. Site Updates imports a package
that is absent from pubspec; use Flutter Image.network with explicit loading
and failure states. This retains Flutter's in-memory image cache, not persistent
disk caching (that unavailable package could not run at baseline).

## Integration repairs, separate from design

After restoring locked dependencies, baseline analyzer found 61 diagnostics,
including genuine compile errors: malformed dashboard header nesting, missing
`AppColors.bgSurface`, undeclared `cached_network_image`, and five missing JSON
helpers used by Site Updates. Repair those minimal missing contracts to make
the app renderable. Do not change provider requests, parsing call sites,
authentication, role logic, routes or model fields. Add parser regression tests.

## Acceptance boundary

Milestone 1 is dashboard + scoped foundations, not an app-wide completed redesign.
Validate narrow phone, regular phone, tablet, landscape and 200% text, unknown /
failed / loaded schedule states, attendance states, offline / blocked queue,
project disclosure, navigation and account/recovery interactions with local
fixtures. Render images and inspect them. Never hit production to populate
design tests. Preserve existing test coverage; record actual results separately.
Device GPS/camera, Android TalkBack, iOS VoiceOver, physical safe areas and every
remaining screen still need device acceptance before a release claim.

## Milestone 1 verification results

Completed locally on Windows using the existing Flutter 3.47.2 / Dart 3.13.2
toolchain and locked packages. No dependency versions were changed.

- `flutter test --no-pub --reporter expanded`: **100 tests passed**, including
  16 new dashboard tests and two parser regression tests. Existing auth, router,
  geofence, cold-start, endpoint-diagnosis and core-logic tests remain passing.
- `flutter analyze --no-pub --no-fatal-infos`: **no errors or warnings**;
  17 pre-existing informational diagnostics remain in unrelated files. This is
  not a claim that ordinary analysis has zero lint output.
- Generated and visually inspected real Flutter renders at 390×844, 320×740,
  768×1024, 844×390, and 320×740 with 200% body text and long account details.
  Safe-area fixtures include 24 logical pixels at top and bottom. These are
  simulation dimensions, not certification for every physical device.
- Standard-phone Flutter Android/iOS tap-target, tap-label and text-contrast
  guidelines passed. All semantic text colours also pass a calculated 4.5:1
  contrast check against the three new surface colours. This does not replace
  TalkBack/VoiceOver testing or audit every untouched screen's contrast.
- Project unknown/loading/error/retry, role-gated approvals, checked-out status,
  the Infinity GPS sentinel, attendance navigation, disclosure, blocked retry,
  discard cancellation/confirmation, disabled offline sync and sign-out
  confirmation are covered by fixture tests.
- Full-screen golden tests use the **real current navigation shell**. Secondary
  destination callback tests use placeholder destination screens to avoid
  operational API access. A test override rejects creation of a network client.
- Native Material navigation labels retain Flutter's own 1.3× maximum scaling;
  the bar now gains room for wrapped labels. Dashboard body/sheets were tested
  at 2× without shrinking text to fit. No route/branch contract changed.
- Sheets now use the root navigator, covering the tab bar, and watch live sync
  state. The legacy `attention_strip.dart` remains in the tree but is no longer
  rendered by the redesigned dashboard; no misleading all-clear is displayed.

Previews: [phone](test/goldens/dashboard_phone.png),
[narrow phone](test/goldens/dashboard_narrow.png),
[tablet](test/goldens/dashboard_tablet.png),
[landscape](test/goldens/dashboard_landscape.png),
[large text](test/goldens/dashboard_large_text.png),
[large-text account sheet](test/goldens/dashboard_account_large_text.png).
These show deterministic sample data, **not current production project figures**.
Fonts come from the installed Flutter SDK; golden comparison should use the same
SDK and host platform. The existing three project-card snapshots were updated
for the intentional redesign and now use readable fonts too.

Remaining: attendance/diary/tasks next; operational forms, media-viewer layout,
all other modules, light mode, native platform fonts/behaviour, physical-device
and screen-reader acceptance. No Android release package or iOS build was
produced in this milestone. No commit, push or deployment was performed.
