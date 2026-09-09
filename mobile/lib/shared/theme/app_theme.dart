import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'status_colors.dart';
import 'tokens.dart';

/// The dark palette, shared with the web dashboard's CSS variables.
///
/// These are the raw values the dark [ColorScheme] is built from. Screens
/// written before the theme existed still read them directly; new code should
/// go through `Theme.of(context).colorScheme` and [AppStatusColors] instead, so
/// it works in both themes. Every name here maps to a scheme role:
///
///   bgPage    -> surface                  textBase  -> onSurface
///   bgCard    -> surfaceContainerLow      textMuted -> onSurfaceVariant
///   bgSubtle  -> surfaceContainer         textFaint -> outline
///   borderDim -> outlineVariant           accent    -> primary
class AppColors {
  const AppColors._();

  static const bgPage = Color(0xFF0D1117);
  static const bgCard = Color(0xFF161B22);
  static const bgSubtle = Color(0xFF1C2128);
  static const borderDim = Color(0xFF30363D);
  static const textBase = Color(0xFFE6EDF3);
  static const textMuted = Color(0xFF8B949E);
  static const textFaint = Color(0xFF6E7681);
  static const accent = Color(0xFF388BFD);
  static const accentBg = Color(0xFF1F3352);
  static const green = Color(0xFF3FB950);
  static const greenBg = Color(0xFF1A3028);
  static const amber = Color(0xFFD29922);
  static const amberBg = Color(0xFF2F2208);
  static const red = Color(0xFFF85149);
  static const redBg = Color(0xFF3A1F1E);
  static const teal = Color(0xFF2DD4BF);

  /// The project hero banner, matching the web dashboard's #1a2540.
  static const navy = Color(0xFF1A2540);
  static const navyDeep = Color(0xFF101A2E);
  static const heroText = Color(0xFF93C5FD);
  static const heroAhead = Color(0xFF6EE7B7);
  static const heroBehind = Color(0xFFFCA5A5);

  /// Dialog and bottom-sheet ground.
  ///
  /// Kept because three call sites still name it, but prefer letting the
  /// theme supply it: `dialogTheme` and `bottomSheetTheme` below already set
  /// this value, so a plain `Dialog()` or `showModalBottomSheet()` lands here
  /// on its own and stays correct in light mode. Never set it on a Scaffold —
  /// it is the CARD ground, and a page painted with it makes every card on
  /// that page invisible.
  static const bgSurface = bgCard;
}

/// The light palette. Not the dark one inverted.
///
/// This exists because the app is used outdoors: a foreman punching in at the
/// Nishat site at midday is holding a phone in direct Kashmir sun, where a
/// #0D1117 ground is a mirror. The greys are GitHub's light ramp, which is
/// tuned for exactly this and keeps the two products recognisably one system.
class _Light {
  const _Light._();

  static const surface = Color(0xFFFFFFFF);
  static const surfaceLow = Color(0xFFF6F8FA);
  static const surfaceContainer = Color(0xFFEFF2F5);
  static const surfaceHigh = Color(0xFFE6EAEF);
  static const outlineVariant = Color(0xFFD8DEE4);
  static const outline = Color(0xFF8C959F);
  static const onSurface = Color(0xFF1F2328);
  static const onSurfaceVariant = Color(0xFF59636E);

  /// #0969DA, not the dark theme's #388BFD — that reads as 3.2:1 on white.
  static const primary = Color(0xFF0969DA);
  static const primaryContainer = Color(0xFFDDF4FF);
  static const onPrimaryContainer = Color(0xFF0A3069);
}

class AppTheme {
  const AppTheme._();

  static const _darkScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: AppColors.accent,
    onPrimary: Colors.white,
    primaryContainer: AppColors.accentBg,
    onPrimaryContainer: AppColors.heroText,
    secondary: AppColors.teal,
    onSecondary: Color(0xFF04201C),
    secondaryContainer: Color(0xFF10312C),
    onSecondaryContainer: AppColors.teal,
    error: AppColors.red,
    onError: Colors.white,
    errorContainer: AppColors.redBg,
    onErrorContainer: Color(0xFFFF7B72),
    surface: AppColors.bgPage,
    onSurface: AppColors.textBase,
    onSurfaceVariant: AppColors.textMuted,
    surfaceContainerLowest: Color(0xFF080B0F),
    surfaceContainerLow: AppColors.bgCard,
    surfaceContainer: AppColors.bgSubtle,
    surfaceContainerHigh: Color(0xFF222831),
    surfaceContainerHighest: Color(0xFF2A313B),
    outline: AppColors.textFaint,
    outlineVariant: AppColors.borderDim,
    inverseSurface: AppColors.textBase,
    onInverseSurface: AppColors.bgPage,
  );

  static const _lightScheme = ColorScheme(
    brightness: Brightness.light,
    primary: _Light.primary,
    onPrimary: Colors.white,
    primaryContainer: _Light.primaryContainer,
    onPrimaryContainer: _Light.onPrimaryContainer,
    secondary: Color(0xFF0F766E),
    onSecondary: Colors.white,
    secondaryContainer: Color(0xFFCCFBF1),
    onSecondaryContainer: Color(0xFF0B4F49),
    error: Color(0xFFCF222E),
    onError: Colors.white,
    errorContainer: Color(0xFFFFEBE9),
    onErrorContainer: Color(0xFF8B1A21),
    surface: _Light.surface,
    onSurface: _Light.onSurface,
    onSurfaceVariant: _Light.onSurfaceVariant,
    surfaceContainerLowest: Colors.white,
    surfaceContainerLow: _Light.surfaceLow,
    surfaceContainer: _Light.surfaceContainer,
    surfaceContainerHigh: _Light.surfaceHigh,
    surfaceContainerHighest: Color(0xFFDDE2E8),
    outline: _Light.outline,
    outlineVariant: _Light.outlineVariant,
    inverseSurface: Color(0xFF24292F),
    onInverseSurface: Colors.white,
  );

  /// One scale, two weights, nothing below 11.
  ///
  /// Replaces 224 hardcoded `fontSize:` literals spread over 16 values, 158 of
  /// which sat between 11 and 13 — a range too narrow to express hierarchy, so
  /// screens reached for colour and boxes to do the job type should have been
  /// doing. Body is 14 because this is read on site, in sun, sometimes through
  /// safety glasses.
  static TextTheme _textTheme(Color base, Color muted) => TextTheme(
        // Hero figures — a percentage that has to read at arm's length.
        headlineSmall: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w600,
            height: 1.2,
            color: base),
        // Screen titles and card headings.
        titleMedium: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            height: 1.3,
            color: base),
        // The title of a row in a list.
        titleSmall: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            height: 1.3,
            color: base),
        // The default. Anything a person reads as a sentence.
        bodyMedium: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            height: 1.45,
            color: base),
        // Supporting text under a title.
        bodySmall: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            height: 1.45,
            color: muted),
        // Metadata: dates, names, counts, chip labels.
        labelMedium: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            height: 1.3,
            color: muted),
        // Badges and overlines. The floor — nothing smaller ships.
        labelSmall: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            height: 1.3,
            letterSpacing: 0.3,
            color: muted),
      );

  static ThemeData get dark => _build(
        _darkScheme,
        AppStatusColors.dark,
        const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
        ),
      );

  static ThemeData get light => _build(
        _lightScheme,
        AppStatusColors.light,
        const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
          statusBarBrightness: Brightness.light,
        ),
      );

  static ThemeData _build(
    ColorScheme scheme,
    AppStatusColors status,
    SystemUiOverlayStyle overlay,
  ) {
    final text = _textTheme(scheme.onSurface, scheme.onSurfaceVariant);
    final hairline =
        BorderSide(color: scheme.outlineVariant, width: Sizes.hairline);

    return ThemeData(
      useMaterial3: true,
      brightness: scheme.brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      textTheme: text,
      extensions: [status],

      // Surfaces are separated by tone and a hairline, never by a shadow. A
      // data-dense screen with 20 drop shadows reads as noise.
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: text.titleMedium,
        systemOverlayStyle: overlay,
        shape: Border(bottom: hairline),
      ),

      cardTheme: CardThemeData(
        color: scheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: Radii.cardAll,
          side: hairline,
        ),
        margin: EdgeInsets.zero,
      ),

      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant,
        thickness: Sizes.hairline,
        space: Sizes.hairline,
      ),

      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(horizontal: Space.lg),
        minVerticalPadding: Space.md,
        titleTextStyle: text.titleSmall,
        subtitleTextStyle: text.bodySmall,
        leadingAndTrailingTextStyle: text.labelMedium,
        iconColor: scheme.onSurfaceVariant,
        shape: const RoundedRectangleBorder(borderRadius: Radii.controlAll),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainer,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: Space.md,
          vertical: Space.md,
        ),
        border: OutlineInputBorder(
          borderRadius: Radii.controlAll,
          borderSide: hairline,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: Radii.controlAll,
          borderSide: hairline,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: Radii.controlAll,
          borderSide: BorderSide(color: scheme.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: Radii.controlAll,
          borderSide: BorderSide(color: scheme.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: Radii.controlAll,
          borderSide: BorderSide(color: scheme.error, width: 1.5),
        ),
        labelStyle: text.bodySmall,
        floatingLabelStyle: TextStyle(color: scheme.primary, fontSize: 13),
        hintStyle: text.bodySmall?.copyWith(color: scheme.outline),
        helperStyle: text.labelSmall,
        errorStyle: text.labelSmall?.copyWith(color: scheme.error),
      ),

      // FilledButton is Material 3's primary button. ElevatedButton is kept
      // aligned to it only so the 18 screens still calling it do not stand out
      // while they are migrated.
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, Sizes.control),
          padding: const EdgeInsets.symmetric(horizontal: Space.xl),
          shape: const RoundedRectangleBorder(borderRadius: Radii.controlAll),
          textStyle: text.titleSmall,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          disabledBackgroundColor: scheme.onSurface.withValues(alpha: 0.12),
          disabledForegroundColor: scheme.onSurface.withValues(alpha: 0.38),
          minimumSize: const Size(0, Sizes.control),
          padding: const EdgeInsets.symmetric(horizontal: Space.xl),
          shape: const RoundedRectangleBorder(borderRadius: Radii.controlAll),
          elevation: 0,
          textStyle: text.titleSmall,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: scheme.onSurface,
          minimumSize: const Size(0, Sizes.control),
          padding: const EdgeInsets.symmetric(horizontal: Space.xl),
          shape: const RoundedRectangleBorder(borderRadius: Radii.controlAll),
          side: hairline,
          textStyle: text.titleSmall,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: scheme.primary,
          minimumSize: const Size(0, Sizes.touchTarget),
          padding: const EdgeInsets.symmetric(horizontal: Space.md),
          shape: const RoundedRectangleBorder(borderRadius: Radii.controlAll),
          textStyle: text.titleSmall,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          minimumSize: const Size(Sizes.touchTarget, Sizes.touchTarget),
          foregroundColor: scheme.onSurfaceVariant,
        ),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: scheme.surfaceContainer,
        selectedColor: scheme.primaryContainer,
        side: hairline,
        shape: const RoundedRectangleBorder(borderRadius: Radii.fullAll),
        labelStyle: text.labelMedium,
        secondaryLabelStyle: text.labelMedium,
        padding: const EdgeInsets.symmetric(
          horizontal: Space.md,
          vertical: Space.sm,
        ),
        showCheckmark: false,
      ),

      // SegmentedButton defaults its selected segment to secondaryContainer,
      // which in this scheme is teal — so a plain mode switch (Plant/Vehicle,
      // Pass/Fail/N/A) came out green, and green already means "passed" and
      // "complied" everywhere else in the app. Selection here is not a verdict,
      // so it takes the primary tint. Screens that DO mean a verdict by it
      // override these per segment.
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          backgroundColor: scheme.surfaceContainerLow,
          foregroundColor: scheme.onSurfaceVariant,
          selectedBackgroundColor: scheme.primaryContainer,
          selectedForegroundColor: scheme.onPrimaryContainer,
          side: hairline,
          textStyle: text.labelMedium,
          shape: const RoundedRectangleBorder(borderRadius: Radii.controlAll),
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        indicatorColor: scheme.primaryContainer,
        elevation: 0,
        height: 68,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? text.labelSmall
                  ?.copyWith(color: scheme.primary, fontWeight: FontWeight.w600)
              : text.labelSmall,
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            size: Sizes.iconAction,
            color: states.contains(WidgetState.selected)
                ? scheme.primary
                : scheme.onSurfaceVariant,
          ),
        ),
      ),

      // These three float, so these three get elevation.
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        modalBackgroundColor: scheme.surfaceContainerLow,
        showDragHandle: true,
        dragHandleColor: scheme.outlineVariant,
        shape: const RoundedRectangleBorder(borderRadius: Radii.sheetTop),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        elevation: 3,
        shape: const RoundedRectangleBorder(borderRadius: Radii.cardAll),
        titleTextStyle: text.titleMedium,
        contentTextStyle: text.bodyMedium,
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: scheme.surfaceContainerHigh,
        surfaceTintColor: Colors.transparent,
        elevation: 3,
        shape: const RoundedRectangleBorder(borderRadius: Radii.controlAll),
        textStyle: text.bodyMedium,
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: scheme.inverseSurface,
        contentTextStyle:
            text.bodyMedium?.copyWith(color: scheme.onInverseSurface),
        actionTextColor: scheme.primary,
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: Radii.controlAll),
        insetPadding: const EdgeInsets.all(Space.md),
      ),

      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: scheme.primary,
        linearTrackColor: scheme.surfaceContainer,
        circularTrackColor: Colors.transparent,
      ),

      splashFactory: InkSparkle.splashFactory,
      visualDensity: VisualDensity.standard,
    );
  }
}
