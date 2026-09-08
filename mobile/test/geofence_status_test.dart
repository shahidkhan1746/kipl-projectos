import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/utils/geofence_helper.dart';
import 'package:kipl_projectos/shared/widgets/status_pill.dart';

/// GeofenceResult carries `double.infinity` as its distance until a real fix
/// arrives. Both screens formatted that field themselves and disagreed about
/// the no-fix case:
///
///   dashboard   distanceMeters.round()  ->  roundToDouble().toInt()
///               -> "Unsupported operation: Infinity or NaN toInt"
///               -> a red error screen instead of the dashboard
///
///   attendance  took the >= 1000 branch and printed
///               "Outside Geofence (Infinity km away)"
///
/// Both were reported from a real phone that had not granted location yet.
/// statusLabel is now the single formatter, and these pin it.
void main() {
  GeofenceResult fixAt(double metres, {double radius = 500}) => GeofenceResult(
        distanceMeters: metres,
        isInside: metres <= radius,
        accuracyMeters: 8,
        isMocked: false,
      );

  group('no fix', () {
    test('permission not granted says so, and does not throw', () {
      final geo = GeofenceResult.permissionRequired();

      expect(geo.hasFix, isFalse);
      expect(geo.distanceLabel, isNull);
      expect(geo.statusLabel, 'Location access not enabled');
    });

    test('an error surfaces its own message', () {
      final geo = GeofenceResult.error('Location services are switched off');

      expect(geo.hasFix, isFalse);
      expect(geo.statusLabel, 'Location services are switched off');
    });

    test('permission is reported ahead of any error', () {
      // "GPS unavailable" sends a worker to settings that are already correct.
      // Only the permission prompt is something they can act on.
      const geo = GeofenceResult(
        distanceMeters: double.infinity,
        isInside: false,
        accuracyMeters: 0,
        isMocked: false,
        errorMessage: 'Position could not be determined',
        needsPermission: true,
      );

      expect(geo.statusLabel, 'Location access not enabled');
    });

    test('a NaN distance is treated as no fix, not as a number', () {
      expect(fixAt(double.nan).hasFix, isFalse);
      expect(fixAt(double.nan).distanceLabel, isNull);
      expect(fixAt(double.nan).statusLabel, 'GPS position unavailable');
    });

    test('no label ever formats the raw sentinel', () {
      for (final geo in [
        GeofenceResult.permissionRequired(),
        GeofenceResult.error('boom'),
        fixAt(double.nan),
      ]) {
        expect(geo.statusLabel, isNot(contains('Infinity')));
        expect(geo.statusLabel, isNot(contains('NaN')));
      }
    });

    test('formatting the raw field is the trap these exist to avoid', () {
      // If anyone reaches past statusLabel back to distanceMeters, this is
      // what they get — and it happens during build, so it takes the frame
      // with it rather than showing a wrong number.
      final sentinel = GeofenceResult.permissionRequired().distanceMeters;
      expect(() => sentinel.round(), throwsUnsupportedError);
      expect(() => sentinel.toInt(), throwsUnsupportedError);
    });
  });

  group('with a fix', () {
    test('reports metres inside the geofence', () {
      expect(fixAt(200).statusLabel, 'Inside site geofence (200 m)');
    });

    test('reports metres just outside it', () {
      expect(fixAt(750).statusLabel, 'Outside geofence — 750 m away');
    });

    test('switches to kilometres at 1000 m', () {
      expect(fixAt(999).distanceLabel, '999 m');
      expect(fixAt(1000).distanceLabel, '1.0 km');
      expect(fixAt(1998).distanceLabel, '2.0 km');
    });

    test('rounds rather than truncating', () {
      // 199.6 m is 200 m, not 199 m — toInt() used to truncate here.
      expect(fixAt(199.6).distanceLabel, '200 m');
    });

    test('a zero distance is a fix, not a missing one', () {
      expect(fixAt(0).hasFix, isTrue);
      expect(fixAt(0).statusLabel, 'Inside site geofence (0 m)');
    });
  });

  group('StatusPill layout', () {
    /// The pill sits in a Row on the attendance card. Its Text already asked
    /// for maxLines/ellipsis, but an unconstrained Text in a Row is measured
    /// at its full intrinsic width, so the ellipsis never engaged and the pill
    /// painted the yellow-and-black "RIGHT OVERFLOWED BY 20 PIXELS" stripe.
    Future<void> pumpInWidth(WidgetTester tester, double width, String label) {
      return tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: width,
                child: Row(
                  children: [
                    Flexible(child: StatusPill(label: label, type: StatusPillType.warning)),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    testWidgets('trims a long label instead of overflowing', (tester) async {
      await pumpInWidth(tester, 120, 'Outside geofence — 1998.4 km away');

      expect(tester.takeException(), isNull);
    });

    testWidgets('still renders a label that fits', (tester) async {
      await pumpInWidth(tester, 300, 'Inside site geofence (200 m)');

      expect(tester.takeException(), isNull);
      expect(find.text('Inside site geofence (200 m)'), findsOneWidget);
    });

    testWidgets('survives a label far wider than the pill', (tester) async {
      await pumpInWidth(tester, 60, 'Location services are switched off on this device');

      expect(tester.takeException(), isNull);
    });
  });
}
