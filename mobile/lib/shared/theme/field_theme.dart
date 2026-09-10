import 'package:flutter/material.dart';

/// Scoped to redesigned screens until the remaining screens are migrated.
abstract final class FieldColors {
  static const background = Color(0xFF11161C);
  static const surface = Color(0xFF1A222C);
  static const surfaceElevated = Color(0xFF242F3B);
  static const textPrimary = Color(0xFFEFF3F8);
  static const textSecondary = Color(0xFFBBC6D3);
  static const textMuted = Color(0xFFA1AEBD);
  static const borderSubtle = Color(0xFF344252);
  static const primary = Color(0xFFA9C9FF);
  static const primaryPressed = Color(0xFF8BB4F7);
  static const onPrimary = Color(0xFF132B4C);
  static const success = Color(0xFF8CD5B3);
  static const warning = Color(0xFFEBC27E);
  static const danger = Color(0xFFFFB4AB);
}

abstract final class FieldSpace {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const gutter = 20.0;
  static const section = 24.0;
  static const xl = 32.0;
  static const xxl = 40.0;
  static const xxxl = 48.0;
}

abstract final class FieldShape {
  static const control = 8.0;
  static const surface = 12.0;
  static const sheet = 20.0;
  static const flat = 0.0;
  static const overlay = 2.0;
}

abstract final class FieldSize {
  static const control = 48.0;
  static const icon = 24.0;
  static const iconSmall = 20.0;
  static const maxContent = 840.0;
}

abstract final class FieldMotion {
  static const press = Duration(milliseconds: 120);
  static const disclosure = Duration(milliseconds: 200);
  static const curve = Curves.easeOutCubic;
  static Duration duration(BuildContext context) =>
      MediaQuery.disableAnimationsOf(context) ? Duration.zero : disclosure;
}

abstract final class FieldType {
  static const display = TextStyle(
      fontFamily: 'Roboto',
      fontSize: 32,
      height: 1.2,
      fontWeight: FontWeight.w600);
  static const title = TextStyle(
      fontFamily: 'Roboto',
      fontSize: 28,
      height: 1.2,
      fontWeight: FontWeight.w600);
  static const section = TextStyle(
      fontFamily: 'Roboto',
      fontSize: 20,
      height: 1.3,
      fontWeight: FontWeight.w600);
  static const body =
      TextStyle(fontFamily: 'Roboto', fontSize: 16, height: 1.5);
  static const supporting = TextStyle(
      fontFamily: 'Roboto',
      fontSize: 14,
      height: 1.4,
      color: FieldColors.textSecondary);
  static const caption = TextStyle(
      fontFamily: 'Roboto',
      fontSize: 12,
      height: 1.4,
      color: FieldColors.textMuted);
  static const label = TextStyle(
      fontFamily: 'Roboto',
      fontSize: 15,
      height: 1.3,
      fontWeight: FontWeight.w500);
  static const stat = TextStyle(
      fontFamily: 'Roboto',
      fontSize: 28,
      height: 1.2,
      fontWeight: FontWeight.w600,
      fontFeatures: [FontFeature.tabularFigures()]);
}

abstract final class FieldTheme {
  static ThemeData get dark {
    final shape = RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(FieldShape.control));
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'Roboto',
      brightness: Brightness.dark,
      scaffoldBackgroundColor: FieldColors.background,
      colorScheme: const ColorScheme.dark(
        primary: FieldColors.primary,
        onPrimary: FieldColors.onPrimary,
        surface: FieldColors.surface,
        onSurface: FieldColors.textPrimary,
        onSurfaceVariant: FieldColors.textSecondary,
        error: FieldColors.danger,
        outline: FieldColors.borderSubtle,
      ),
      textTheme: const TextTheme(
        displaySmall: FieldType.display,
        headlineMedium: FieldType.title,
        titleLarge: FieldType.section,
        bodyLarge: FieldType.body,
        bodyMedium: FieldType.supporting,
        bodySmall: FieldType.caption,
        titleMedium: FieldType.label,
        labelLarge: FieldType.label,
      ).apply(
          bodyColor: FieldColors.textPrimary,
          displayColor: FieldColors.textPrimary),
      appBarTheme: const AppBarTheme(
        backgroundColor: FieldColors.background,
        foregroundColor: FieldColors.textPrimary,
        elevation: FieldShape.flat,
        scrolledUnderElevation: FieldShape.flat,
        titleTextStyle: FieldType.label,
      ),
      iconButtonTheme: IconButtonThemeData(
          style: IconButton.styleFrom(
              minimumSize: const Size.square(FieldSize.control))),
      filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
        minimumSize: const Size(0, FieldSize.control),
        padding: const EdgeInsets.symmetric(
            horizontal: FieldSpace.gutter, vertical: FieldSpace.md),
        shape: shape,
        textStyle: FieldType.label,
      ).copyWith(
              overlayColor: WidgetStateProperty.resolveWith((states) =>
                  states.contains(WidgetState.pressed)
                      ? FieldColors.primaryPressed
                      : null))),
      textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
        minimumSize: const Size(FieldSize.control, FieldSize.control),
        textStyle: FieldType.label,
        shape: shape,
      )),
      outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, FieldSize.control),
              shape: shape,
              textStyle: FieldType.label)),
      elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
              minimumSize: const Size(0, FieldSize.control),
              shape: shape,
              elevation: 0)),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: FieldColors.surface,
        contentPadding: const EdgeInsets.all(FieldSpace.lg),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(FieldShape.control)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(FieldShape.control),
            borderSide: const BorderSide(color: FieldColors.borderSubtle)),
      ),
      dividerTheme: const DividerThemeData(
          color: FieldColors.borderSubtle, thickness: 1, space: 1),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: FieldColors.surface,
        elevation: FieldShape.overlay,
        shape: RoundedRectangleBorder(
            borderRadius:
                BorderRadius.vertical(top: Radius.circular(FieldShape.sheet))),
      ),
    );
  }
}
