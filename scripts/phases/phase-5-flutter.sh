#!/usr/bin/env bash
# ================================================================
#  Phase 5 — Flutter Mobile App Scaffold
#  Creates project structure, writes all config files,
#  runs flutter pub get if Flutter is installed
# ================================================================

set -euo pipefail

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
warn() { echo -e "${Y}  ⚠${NC} $1"; }
err()  { echo -e "${R}  ✗ $1${NC}"; exit 1; }
info() { echo -e "${B}  →${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MOBILE="$ROOT/mobile"

# ── Check Flutter ─────────────────────────────────────────────────
FLUTTER_AVAILABLE=false
if command -v flutter &>/dev/null; then
  FLUTTER_AVAILABLE=true
  info "Flutter found: $(flutter --version --machine 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).frameworkVersion)}catch{console.log('installed')}})" 2>/dev/null || echo 'installed')"
else
  warn "Flutter not installed — creating project structure only"
  warn "Install Flutter from https://flutter.dev/docs/get-started/install"
  warn "Then run: cd mobile && flutter pub get"
fi

# ── Create or use existing Flutter project ────────────────────────
if [[ -f "$MOBILE/pubspec.yaml" ]]; then
  warn "mobile/ already exists — skipping flutter create"
else
  if [[ "$FLUTTER_AVAILABLE" == true ]]; then
    info "Creating Flutter project..."
    cd "$ROOT"
    flutter create mobile \
      --org in.kipl \
      --project-name kipl_projectos \
      --platforms android,ios \
      --template app
    ok "Flutter project created"
  else
    info "Creating Flutter project structure manually..."
    mkdir -p "$MOBILE/lib"
    mkdir -p "$MOBILE/android/app/src/main"
    mkdir -p "$MOBILE/ios/Runner"
    mkdir -p "$MOBILE/assets/images"
    mkdir -p "$MOBILE/assets/icons"
  fi
fi

# ── Write pubspec.yaml ────────────────────────────────────────────
info "Writing pubspec.yaml..."
cat > "$MOBILE/pubspec.yaml" << 'YAML'
name: kipl_projectos
description: KIPL ProjectOS — Field Operations Mobile App
version: 1.0.0+1
publish_to: none

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # HTTP client
  dio: ^5.4.0

  # Secure token storage
  flutter_secure_storage: ^9.0.0

  # Navigation
  go_router: ^13.2.0

  # State management
  flutter_riverpod: ^2.5.1

  # GPS / Location
  geolocator: ^11.0.0
  permission_handler: ^11.3.0

  # Camera / Image picker
  image_picker: ^1.1.1
  cached_network_image: ^3.3.1

  # Offline storage
  drift: ^2.18.0
  sqlite3_flutter_libs: ^0.5.0
  path_provider: ^2.1.3
  path: ^1.9.0

  # Connectivity
  connectivity_plus: ^6.0.3

  # UI
  intl: ^0.19.0
  shimmer: ^3.0.0

  # Utils
  logger: ^2.3.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.9
  drift_dev: ^2.18.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
    - assets/icons/
YAML

ok "pubspec.yaml written"

# ── Create all directories ────────────────────────────────────────
mkdir -p \
  "$MOBILE/lib/core/api" \
  "$MOBILE/lib/core/auth" \
  "$MOBILE/lib/core/models" \
  "$MOBILE/lib/core/storage" \
  "$MOBILE/lib/features/auth/screens" \
  "$MOBILE/lib/features/attendance/screens" \
  "$MOBILE/lib/features/site_updates/screens" \
  "$MOBILE/lib/features/tasks/screens" \
  "$MOBILE/lib/features/dashboard/screens" \
  "$MOBILE/lib/shared/theme" \
  "$MOBILE/lib/shared/widgets" \
  "$MOBILE/assets/images" \
  "$MOBILE/assets/icons"

ok "Directory structure created"

# ── main.dart ─────────────────────────────────────────────────────
cat > "$MOBILE/lib/main.dart" << 'DART'
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router.dart';
import 'shared/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait mode for field use
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

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
      theme: AppTheme.dark,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
DART

ok "main.dart written"

# ── App theme ─────────────────────────────────────────────────────
cat > "$MOBILE/lib/shared/theme/app_theme.dart" << 'DART'
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// Design tokens — identical to web dashboard CSS variables
class AppColors {
  static const bgPage    = Color(0xFF0D1117);
  static const bgCard    = Color(0xFF161B22);
  static const bgSubtle  = Color(0xFF1C2128);
  static const borderDim = Color(0xFF30363D);
  static const textBase  = Color(0xFFE6EDF3);
  static const textMuted = Color(0xFF8B949E);
  static const textFaint = Color(0xFF6E7681);
  static const accent    = Color(0xFF388BFD);
  static const accentBg  = Color(0xFF1F3352);
  static const green     = Color(0xFF3FB950);
  static const greenBg   = Color(0xFF1A3028);
  static const amber     = Color(0xFFD29922);
  static const amberBg   = Color(0xFF2F2208);
  static const red       = Color(0xFFF85149);
  static const redBg     = Color(0xFF3A1F1E);
  static const teal      = Color(0xFF2DD4BF);
}

class AppTheme {
  static ThemeData get dark => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bgPage,
    fontFamily: 'DM Sans',
    colorScheme: const ColorScheme.dark(
      primary:   AppColors.accent,
      surface:   AppColors.bgCard,
      error:     AppColors.red,
      onPrimary: Colors.white,
      onSurface: AppColors.textBase,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.bgCard,
      foregroundColor: AppColors.textBase,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: TextStyle(
        fontFamily: 'DM Sans',
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: AppColors.textBase,
      ),
      systemOverlayStyle: SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    ),
    cardTheme: CardTheme(
      color: AppColors.bgCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.borderDim),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.bgSubtle,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.borderDim),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.borderDim),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
      ),
      hintStyle: const TextStyle(color: AppColors.textFaint, fontSize: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        elevation: 0,
        textStyle: const TextStyle(
          fontFamily: 'DM Sans',
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: AppColors.borderDim,
      thickness: 1,
      space: 1,
    ),
  );
}
DART

ok "App theme written"

# ── Router ────────────────────────────────────────────────────────
cat > "$MOBILE/lib/core/router.dart" << 'DART'
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/dashboard/screens/dashboard_screen.dart';
import '../features/attendance/screens/attendance_screen.dart';
import '../features/site_updates/screens/site_update_screen.dart';
import '../features/tasks/screens/tasks_screen.dart';
import 'auth/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggedIn = authState.value != null;
      final isLoginPage = state.matchedLocation == '/login';
      if (!isLoggedIn && !isLoginPage) return '/login';
      if (isLoggedIn && isLoginPage) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login',       builder: (ctx, _) => const LoginScreen()),
      GoRoute(path: '/dashboard',   builder: (ctx, _) => const DashboardScreen()),
      GoRoute(path: '/attendance',  builder: (ctx, _) => const AttendanceScreen()),
      GoRoute(path: '/site-update', builder: (ctx, _) => const SiteUpdateScreen()),
      GoRoute(path: '/tasks',       builder: (ctx, _) => const TasksScreen()),
    ],
  );
});
DART

ok "Router written"

# ── Auth provider ─────────────────────────────────────────────────
mkdir -p "$MOBILE/lib/core/auth"
cat > "$MOBILE/lib/core/auth/auth_provider.dart" << 'DART'
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final _storage = FlutterSecureStorage();

// Holds the current user — null means logged out
final authStateProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final token = await _storage.read(key: 'access_token');
  if (token == null) return null;
  // In a real app, decode the JWT to get user info
  // For now just return a non-null value to indicate logged in
  return {'token': token};
});

final authActionsProvider = Provider((ref) => AuthActions(ref));

class AuthActions {
  final Ref _ref;
  AuthActions(this._ref);

  Future<void> logout() async {
    await _storage.deleteAll();
    _ref.invalidate(authStateProvider);
  }
}
DART

ok "Auth provider written"

# ── API client ────────────────────────────────────────────────────
cat > "$MOBILE/lib/core/api/api_client.dart" << 'DART'
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _baseUrl = 'http://10.0.2.2:3000/api/v1';
// Note: 10.0.2.2 = localhost on Android emulator
// For physical device: use your computer's local IP e.g. 192.168.1.x

final _storage = FlutterSecureStorage();

class ApiClient {
  late final Dio dio;

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
    ));
    dio.interceptors.add(_AuthInterceptor(dio));
  }
}

class _AuthInterceptor extends Interceptor {
  final Dio dio;
  _AuthInterceptor(this.dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.read(key: 'access_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      // Try refresh
      try {
        final refreshToken = await _storage.read(key: 'refresh_token');
        if (refreshToken == null) throw Exception('No refresh token');
        final res = await dio.post('/auth/refresh',
            data: {'refresh_token': refreshToken},
            options: Options(headers: {}));
        final newToken = res.data['access_token'] as String;
        await _storage.write(key: 'access_token', value: newToken);
        err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
        final retry = await dio.fetch(err.requestOptions);
        handler.resolve(retry);
        return;
      } catch (_) {
        await _storage.deleteAll();
      }
    }
    handler.next(err);
  }
}

final apiClient = ApiClient();
DART

ok "API client written"

# ── Screen stubs ──────────────────────────────────────────────────
SCREENS=(
  "features/auth/screens/login_screen.dart:LoginScreen"
  "features/dashboard/screens/dashboard_screen.dart:DashboardScreen"
  "features/attendance/screens/attendance_screen.dart:AttendanceScreen"
  "features/site_updates/screens/site_update_screen.dart:SiteUpdateScreen"
  "features/tasks/screens/tasks_screen.dart:TasksScreen"
)

for entry in "${SCREENS[@]}"; do
  path="${entry%%:*}"
  classname="${entry##*:}"
  dir=$(dirname "$MOBILE/lib/$path")
  mkdir -p "$dir"
  cat > "$MOBILE/lib/$path" << DART_STUB
import 'package:flutter/material.dart';

// ${classname} — will be fully built in later phases
class ${classname} extends StatelessWidget {
  const ${classname}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${classname}')),
      body: const Center(
        child: Text('Coming soon', style: TextStyle(color: Colors.white54)),
      ),
    );
  }
}
DART_STUB
done

ok "Screen stubs created"

# ── Android permissions ───────────────────────────────────────────
ANDROID_MANIFEST="$MOBILE/android/app/src/main/AndroidManifest.xml"
if [[ -f "$ANDROID_MANIFEST" ]]; then
  # Add GPS and camera permissions if not present
  if ! grep -q "ACCESS_FINE_LOCATION" "$ANDROID_MANIFEST"; then
    sed -i 's|<application|<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>\n    <uses-permission android:name="android.permission.CAMERA"/>\n    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>\n    <uses-permission android:name="android.permission.INTERNET"/>\n    <application|' "$ANDROID_MANIFEST"
    ok "Android permissions added"
  fi
fi

# ── flutter pub get ────────────────────────────────────────────────
if [[ "$FLUTTER_AVAILABLE" == true ]]; then
  info "Running flutter pub get..."
  cd "$MOBILE" && flutter pub get
  ok "Flutter packages installed"
else
  warn "Flutter not available — run 'cd mobile && flutter pub get' after installing Flutter"
fi

ok "Phase 5 complete — Flutter mobile app scaffolded"
echo ""
echo -e "  ${Y}To run the mobile app:${NC}"
echo -e "  cd mobile"
echo -e "  flutter run          (with device/emulator connected)"
echo ""
