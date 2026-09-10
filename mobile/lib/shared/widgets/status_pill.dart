import 'package:flutter/material.dart';

import '../theme/status_colors.dart';
import '../theme/tokens.dart';

enum StatusPillType { success, warning, error, info, neutral }

/// How loudly the status should speak.
enum StatusEmphasis {
  /// A tinted capsule. Reads from across the screen — right when the status is
  /// the reason the row exists (a blocked task, a rejected approval), wrong
  /// when it is one attribute among several.
  filled,

  /// A coloured dot and a label in the surrounding text colour. Carries the
  /// same meaning at a fraction of the visual weight, so a list of thirty rows
  /// stays scannable instead of becoming a bag of sweets.
  subtle,
}

/// One status, rendered against whichever theme it lands in.
///
/// This used to hold six fixed dark-mode hex values, which meant a light theme
/// would have made every status in the app illegible — #3FB950 on white is
/// about 2.3:1. Colours now come from [AppStatusColors], so each theme
/// supplies a hue that actually passes on its own ground.
///
/// The public API is unchanged; all 49 existing call sites keep working.
class StatusPill extends StatelessWidget {
  const StatusPill({
    super.key,
    required this.label,
    this.type = StatusPillType.neutral,
    this.icon,
    this.emphasis = StatusEmphasis.filled,
  });

  final String label;
  final StatusPillType type;
  final IconData? icon;
  final StatusEmphasis emphasis;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;

    final (Color ink, Color ground, Color onGround) = switch (type) {
      StatusPillType.success => (
          status.success,
          status.successContainer,
          status.onSuccessContainer
        ),
      StatusPillType.warning => (
          status.warning,
          status.warningContainer,
          status.onWarningContainer
        ),
      StatusPillType.error => (
          status.danger,
          status.dangerContainer,
          status.onDangerContainer
        ),
      StatusPillType.info => (
          theme.colorScheme.primary,
          theme.colorScheme.primaryContainer,
          theme.colorScheme.onPrimaryContainer
        ),
      StatusPillType.neutral => (
          status.neutral,
          status.neutralContainer,
          status.onNeutralContainer
        ),
    };

    final labelStyle = theme.textTheme.labelSmall?.copyWith(
      fontWeight: FontWeight.w600,
      color: emphasis == StatusEmphasis.filled ? onGround : ink,
    );

    if (emphasis == StatusEmphasis.subtle) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null)
            Icon(icon, size: Sizes.iconInline, color: ink)
          else
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(color: ink, shape: BoxShape.circle),
            ),
          const SizedBox(width: Space.xs + 2),
          // Flexible, or the ellipsis never engages: in a Row the Text is
          // otherwise measured at its full intrinsic width, so a long label
          // overflows instead of being trimmed. That was the "RIGHT OVERFLOWED
          // BY 20 PIXELS" stripe on the attendance card.
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: labelStyle,
            ),
          ),
        ],
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: Space.sm,
        vertical: Space.xs,
      ),
      decoration: BoxDecoration(
        color: ground,
        borderRadius: Radii.badgeAll,
        border: Border.all(color: ink.withValues(alpha: 0.3), width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: Sizes.iconInline - 2, color: onGround),
            const SizedBox(width: Space.xs),
          ],
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: labelStyle,
            ),
          ),
        ],
      ),
    );
  }
}
