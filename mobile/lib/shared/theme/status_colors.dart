import 'package:flutter/material.dart';

/// Success, warning and danger — the three meanings Material's [ColorScheme]
/// has no slot for.
///
/// The app needs them constantly (a task is blocked, a punch is outside the
/// geofence, an approval is overdue) and previously reached for
/// `AppColors.green` / `.amber` / `.red` directly. Those are fixed dark-mode
/// hex values: on a white ground `#3FB950` fails contrast badly, so the moment
/// a light theme exists every status in the app becomes unreadable.
///
/// Carrying them as a [ThemeExtension] means a widget asks for "danger" and
/// gets whichever red is correct for the theme it is being painted into.
///
/// Each role carries three colours, so nothing has to guess:
///   [danger]           the ink — text and icons on a plain surface
///   [dangerContainer]  a tinted ground for badges and banners
///   [onDangerContainer] the ink to use on that ground
@immutable
class AppStatusColors extends ThemeExtension<AppStatusColors> {
  const AppStatusColors({
    required this.success,
    required this.successContainer,
    required this.onSuccessContainer,
    required this.warning,
    required this.warningContainer,
    required this.onWarningContainer,
    required this.danger,
    required this.dangerContainer,
    required this.onDangerContainer,
    required this.neutral,
    required this.neutralContainer,
    required this.onNeutralContainer,
  });

  final Color success;
  final Color successContainer;
  final Color onSuccessContainer;

  final Color warning;
  final Color warningContainer;
  final Color onWarningContainer;

  final Color danger;
  final Color dangerContainer;
  final Color onDangerContainer;

  /// Not a status — the absence of one. "To do", "unassigned", "no reading".
  final Color neutral;
  final Color neutralContainer;
  final Color onNeutralContainer;

  /// Dark: the GitHub-dark values the app and the web dashboard already share.
  static const dark = AppStatusColors(
    success: Color(0xFF3FB950),
    successContainer: Color(0xFF1A3028),
    onSuccessContainer: Color(0xFF56D364),
    warning: Color(0xFFD29922),
    warningContainer: Color(0xFF2F2208),
    onWarningContainer: Color(0xFFE3B341),
    danger: Color(0xFFF85149),
    dangerContainer: Color(0xFF3A1F1E),
    onDangerContainer: Color(0xFFFF7B72),
    neutral: Color(0xFF8B949E),
    neutralContainer: Color(0xFF1C2128),
    onNeutralContainer: Color(0xFF8B949E),
  );

  /// Light: deliberately darker hues, not the dark ones inverted.
  ///
  /// The dark palette's green and amber are tuned to glow on #0D1117 and both
  /// fall below 4.5:1 on white. These are the darker equivalents, which is
  /// also what the app needs most — it is read outdoors in Srinagar daylight.
  static const light = AppStatusColors(
    success: Color(0xFF1A7F37),
    successContainer: Color(0xFFDAFBE1),
    onSuccessContainer: Color(0xFF0A5122),
    warning: Color(0xFF9A6700),
    warningContainer: Color(0xFFFFF8C5),
    onWarningContainer: Color(0xFF6C4A00),
    danger: Color(0xFFCF222E),
    dangerContainer: Color(0xFFFFEBE9),
    onDangerContainer: Color(0xFF8B1A21),
    neutral: Color(0xFF59636E),
    neutralContainer: Color(0xFFEFF2F5),
    onNeutralContainer: Color(0xFF424A53),
  );

  @override
  AppStatusColors copyWith({
    Color? success,
    Color? successContainer,
    Color? onSuccessContainer,
    Color? warning,
    Color? warningContainer,
    Color? onWarningContainer,
    Color? danger,
    Color? dangerContainer,
    Color? onDangerContainer,
    Color? neutral,
    Color? neutralContainer,
    Color? onNeutralContainer,
  }) {
    return AppStatusColors(
      success: success ?? this.success,
      successContainer: successContainer ?? this.successContainer,
      onSuccessContainer: onSuccessContainer ?? this.onSuccessContainer,
      warning: warning ?? this.warning,
      warningContainer: warningContainer ?? this.warningContainer,
      onWarningContainer: onWarningContainer ?? this.onWarningContainer,
      danger: danger ?? this.danger,
      dangerContainer: dangerContainer ?? this.dangerContainer,
      onDangerContainer: onDangerContainer ?? this.onDangerContainer,
      neutral: neutral ?? this.neutral,
      neutralContainer: neutralContainer ?? this.neutralContainer,
      onNeutralContainer: onNeutralContainer ?? this.onNeutralContainer,
    );
  }

  @override
  AppStatusColors lerp(covariant AppStatusColors? other, double t) {
    if (other == null) return this;
    return AppStatusColors(
      success: Color.lerp(success, other.success, t)!,
      successContainer:
          Color.lerp(successContainer, other.successContainer, t)!,
      onSuccessContainer:
          Color.lerp(onSuccessContainer, other.onSuccessContainer, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningContainer:
          Color.lerp(warningContainer, other.warningContainer, t)!,
      onWarningContainer:
          Color.lerp(onWarningContainer, other.onWarningContainer, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      dangerContainer: Color.lerp(dangerContainer, other.dangerContainer, t)!,
      onDangerContainer:
          Color.lerp(onDangerContainer, other.onDangerContainer, t)!,
      neutral: Color.lerp(neutral, other.neutral, t)!,
      neutralContainer:
          Color.lerp(neutralContainer, other.neutralContainer, t)!,
      onNeutralContainer:
          Color.lerp(onNeutralContainer, other.onNeutralContainer, t)!,
    );
  }
}

/// `context.status.danger` instead of `Theme.of(context).extension<...>()!`.
extension AppStatusColorsX on BuildContext {
  AppStatusColors get status =>
      Theme.of(this).extension<AppStatusColors>() ?? AppStatusColors.dark;
}
