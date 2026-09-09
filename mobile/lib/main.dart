import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router.dart';
import 'shared/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarBrightness: Brightness.dark,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  runApp(
    const ProviderScope(
      child: KiplApp(),
    ),
  );
}

class KiplApp extends ConsumerWidget {
  const KiplApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'KIPL ProjectOS',
      // Both themes are built; the app is pinned to dark until the remaining
      // screens stop reading AppColors' fixed dark hex values directly. On a
      // light ground those render near-white text on near-white paper, so
      // flipping this switch early would break eleven screens at once.
      // Unpin to ThemeMode.system once that migration lands — the field case
      // for it is real: this is read outdoors in Srinagar daylight.
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.dark,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
