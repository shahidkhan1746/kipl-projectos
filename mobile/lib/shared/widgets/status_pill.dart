import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum StatusPillType { success, warning, error, info, neutral }

class StatusPill extends StatelessWidget {
  final String label;
  final StatusPillType type;
  final IconData? icon;

  const StatusPill({
    super.key,
    required this.label,
    this.type = StatusPillType.neutral,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Color border;

    switch (type) {
      case StatusPillType.success:
        bg = AppColors.greenBg;
        fg = AppColors.green;
        border = AppColors.green.withOpacity(0.3);
        break;
      case StatusPillType.warning:
        bg = AppColors.amberBg;
        fg = AppColors.amber;
        border = AppColors.amber.withOpacity(0.3);
        break;
      case StatusPillType.error:
        bg = AppColors.redBg;
        fg = AppColors.red;
        border = AppColors.red.withOpacity(0.3);
        break;
      case StatusPillType.info:
        bg = AppColors.accentBg;
        fg = AppColors.accent;
        border = AppColors.accent.withOpacity(0.3);
        break;
      case StatusPillType.neutral:
        bg = AppColors.bgSubtle;
        fg = AppColors.textMuted;
        border = AppColors.borderDim;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: border, width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: fg,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
