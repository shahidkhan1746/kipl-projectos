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
