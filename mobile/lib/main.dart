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
      // Follows the phone. The migration this was waiting on is done: every
      // screen now reads its colours from the ColorScheme rather than from
      // AppColors' fixed dark hex values, so a light ground no longer means
      // near-white text on near-white paper.
      //
      // The one deliberate exception is ProjectHeroCard, which stays a fixed
      // dark navy banner in both themes and keeps its light ink — see the note
      // on that widget.
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
