import 'package:flutter/material.dart';
import '../../../shared/theme/status_colors.dart';

/// One thing that needs a decision, with a count.
class AttentionItem {
  const AttentionItem({
    required this.count,
    required this.label,
    required this.tone,
    required this.icon,
    this.onTap,
  });

  final int? count;
  final String label;
  final Color tone;
  final IconData icon;
  final VoidCallback? onTap;
}

/// Only what needs acting on, and only when there is any.
///
/// Carried over from the web dashboard, where eight equal-sized cards meant
/// "1 overdue file" and "0 letters sent" occupied identical space and neither
/// stood out. Zero is not news, so zero is not shown; when everything is
/// clear the strip collapses to a single line saying so.
class AttentionStrip extends StatelessWidget {
  const AttentionStrip({super.key, required this.items});

  final List<AttentionItem> items;

  @override
  Widget build(BuildContext context) {
    final live = items.where((i) => (i.count ?? 0) > 0).toList();

    if (live.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: context.status.successContainer,
          borderRadius: BorderRadius.circular(10),
          border:
              Border.all(color: context.status.success.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Icon(Icons.check_circle_outline,
                size: 16, color: context.status.success),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Nothing needs your attention right now',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: context.status.success,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final item in live) _AttentionChip(item: item),
      ],
    );
  }
}

class _AttentionChip extends StatelessWidget {
  const _AttentionChip({required this.item});

  final AttentionItem item;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          // 44dp tall so it clears the minimum touch target.
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: item.tone.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: item.tone.withValues(alpha: 0.35)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(item.icon, size: 15, color: item.tone),
              const SizedBox(width: 7),
              Text(
                '${item.count}',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: item.tone,
                  height: 1,
                ),
              ),
              const SizedBox(width: 5),
              Text(
                item.label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
