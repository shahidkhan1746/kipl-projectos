import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum KiplButtonVariant { primary, secondary, danger, outline }

class KiplButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final KiplButtonVariant variant;
  final double? width;
  final double height;

  const KiplButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.variant = KiplButtonVariant.primary,
    this.width,
    this.height = 48,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    BorderSide border = BorderSide.none;

    switch (variant) {
      case KiplButtonVariant.primary:
        bg = AppColors.accent;
        fg = Colors.white;
        break;
      case KiplButtonVariant.secondary:
        bg = AppColors.bgSubtle;
        fg = AppColors.textBase;
        border = const BorderSide(color: AppColors.borderDim);
        break;
      case KiplButtonVariant.danger:
        bg = AppColors.red;
        fg = Colors.white;
        break;
      case KiplButtonVariant.outline:
        bg = Colors.transparent;
        fg = AppColors.accent;
        border = const BorderSide(color: AppColors.accent);
        break;
    }

    final bool isDisabled = onPressed == null || isLoading;

    return SizedBox(
      width: width ?? double.infinity,
      height: height,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: isDisabled ? bg.withOpacity(0.5) : bg,
          foregroundColor: fg,
          elevation: 0,
          shadowColor: Colors.transparent,
          side: border,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
        ),
        onPressed: isDisabled ? null : onPressed,
        child: isLoading
            ? SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: fg,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18, color: fg),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: fg,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
