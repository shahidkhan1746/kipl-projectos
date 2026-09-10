import 'package:flutter/material.dart';
import '../theme/field_theme.dart';

class FieldSection extends StatelessWidget {
  const FieldSection(
      {super.key, required this.title, required this.child, this.description});
  final String title;
  final String? description;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(title, style: FieldType.section)),
          if (description != null) ...[
            const SizedBox(height: FieldSpace.xs),
            Text(description!, style: FieldType.supporting),
          ],
          const SizedBox(height: FieldSpace.md),
          child,
        ],
      );
}

/// A navigable row, not a floating card. Text grows with system font size.
class FieldNavigationRow extends StatelessWidget {
  const FieldNavigationRow(
      {super.key,
      required this.title,
      required this.icon,
      required this.onTap,
      this.subtitle});
  final String title;
  final String? subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(FieldShape.control),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: FieldSize.control),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                  vertical: FieldSpace.lg, horizontal: FieldSpace.xs),
              child: Row(children: [
                Icon(icon,
                    size: FieldSize.icon, color: FieldColors.textSecondary),
                const SizedBox(width: FieldSpace.md),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(title, style: FieldType.label),
                      if (subtitle != null) ...[
                        const SizedBox(height: FieldSpace.xs),
                        Text(subtitle!, style: FieldType.supporting),
                      ],
                    ])),
                const SizedBox(width: FieldSpace.sm),
                const Icon(Icons.chevron_right,
                    size: FieldSize.iconSmall, color: FieldColors.textMuted),
              ]),
            ),
          ),
        ),
      );
}

/// Wrapping columns with intrinsic height; never shrink accessibility text.
class FieldAdaptiveGroup extends StatelessWidget {
  const FieldAdaptiveGroup(
      {super.key,
      required this.children,
      this.minimumWidth = 300,
      this.spacing = FieldSpace.lg});
  final List<Widget> children;
  final double minimumWidth;
  final double spacing;

  @override
  Widget build(BuildContext context) =>
      LayoutBuilder(builder: (context, constraints) {
        final scale = MediaQuery.textScalerOf(context).scale(16) / 16;
        final columns =
            constraints.maxWidth >= minimumWidth * scale * 2 + spacing ? 2 : 1;
        final width =
            (constraints.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final child in children) SizedBox(width: width, child: child)
          ],
        );
      });
}

Future<T?> showFieldSheet<T>(BuildContext context, {required Widget child}) =>
    showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) => SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(FieldSpace.gutter, 0, FieldSpace.gutter,
              FieldSpace.section + MediaQuery.viewInsetsOf(context).bottom),
          child: child,
        ),
      ),
    );
