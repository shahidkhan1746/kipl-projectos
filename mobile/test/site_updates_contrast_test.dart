import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/features/site_updates/screens/site_update_screen.dart';
import 'package:kipl_projectos/features/site_updates/site_updates_provider.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

/// Renders Site Updates so the screen can actually be looked at.
///
/// It shipped with its Scaffold set to `bgSurface`, which is a second name for
/// `bgCard` — and every card, filter chip and input on the screen is also
/// `bgCard`. The whole page was therefore one flat field of #161B22, with the
/// cards separated from the ground behind them only by a 1px border.
///
/// `flutter analyze` cannot see that, and neither can a widget-finder test:
/// both colours are legal and every widget is present and correct. Only the
/// composited frame shows it, which is what this golden is for.
class _SeededNotifier extends SiteUpdatesNotifier {
  _SeededNotifier(super.dio, this._seed);

  final SiteUpdatesState _seed;

  /// Called by the superclass constructor; overridden so the screen renders
  /// from fixed data instead of reaching the network.
  @override
  Future<void> fetchUpdates() async {
    state = _seed;
  }
}

void main() {
  final seed = SiteUpdatesState(
    isLoading: false,
    updates: [
      SiteUpdateItem(
        id: 'u1',
        title: 'Excavation for inlet chamber completed',
        description:
            'Excavation up to founding level completed and inspected by the '
            'site engineer. Levels recorded and shared with UEED.',
        category: 'PROGRESS',
        date: DateTime(2026, 9, 4),
      ),
      SiteUpdateItem(
        id: 'u2',
        title: 'RCC raft pour — Aeration Tank 1',
        description: 'Raft pour completed. Curing in progress.',
        category: 'MILESTONE',
        date: DateTime(2026, 9, 1),
      ),
      SiteUpdateItem(
        id: 'u3',
        title: 'Shuttering material received at site',
        description: 'Two truckloads of shuttering plates received and stacked.',
        category: 'PROGRESS',
        date: DateTime(2026, 8, 28),
      ),
    ],
  );

  testWidgets('site updates — cards read against the page', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          siteUpdatesProvider.overrideWith((ref) => _SeededNotifier(Dio(), seed)),
        ],
        child: MaterialApp(
          theme: AppTheme.dark,
          home: const SiteUpdateScreen(),
        ),
      ),
    );
    // Fixed pumps rather than pumpAndSettle: the RefreshIndicator keeps a
    // ticker alive, so "settled" never arrives.
    await tester.pump(const Duration(milliseconds: 400));

    await expectLater(
      find.byType(SiteUpdateScreen),
      matchesGoldenFile('goldens/site_updates.png'),
    );
  });
}
