import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// One choice out of a short list, with optional counts.
class FilterOption<T> {
  const FilterOption({required this.value, required this.label, this.count});

  final T value;
  final String label;

  /// Shown after the label when known. A filter that says how much is behind
  /// it saves a tap: "Blocked 3" answers the question the tap was going to ask.
  final int? count;
}

/// The horizontal filter row six screens each wrote separately.
///
/// Every copy was a `Container(height: 48)` wrapping a horizontal ListView of
/// hand-built pills. The fixed height is the real defect: raise the system font
/// size and the pills are cut off, because the box cannot grow. This uses
/// [ChoiceChip] — which brings Material's own state layers, pressed and
/// disabled treatments, semantics and a 48dp target for free — and sizes
/// itself from its content, so large text makes it taller rather than clipped.
class FilterBar<T> extends StatelessWidget {
  const FilterBar({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelected,
    this.padding = const EdgeInsets.symmetric(
      horizontal: Space.gutter,
      vertical: Space.sm,
    ),
  });

  final List<FilterOption<T>> options;
  final T selected;
  final ValueChanged<T> onSelected;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: padding,
      child: Row(
        children: [
          for (final option in options) ...[
            ChoiceChip(
              label: Text(
                option.count == null
                    ? option.label
                    : '${option.label}  ${option.count}',
              ),
              selected: option.value == selected,
              onSelected: (_) => onSelected(option.value),
              labelStyle: theme.textTheme.labelMedium?.copyWith(
                color: option.value == selected
                    ? theme.colorScheme.onPrimaryContainer
                    : theme.colorScheme.onSurfaceVariant,
                fontWeight: option.value == selected
                    ? FontWeight.w600
                    : FontWeight.w500,
              ),
              side: BorderSide(
                color: option.value == selected
                    ? theme.colorScheme.primary.withValues(alpha: 0.5)
                    : theme.colorScheme.outlineVariant,
              ),
            ),
            if (option != options.last) const SizedBox(width: Space.sm),
          ],
        ],
      ),
    );
  }
}
