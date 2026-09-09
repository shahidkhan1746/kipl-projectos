import 'package:flutter/material.dart';

import '../theme/status_colors.dart';
import '../theme/tokens.dart';

/// The three things a data screen can be showing instead of data.
///
/// Eleven of the twelve screens hand-rolled a centred spinner, ten hand-rolled
/// an error box out of a Container and a red border, and every list screen
/// wrote its own "No X found" column. None of them agreed on spacing, icon
/// size or wording, and every empty state said only what was missing — never
/// why, and never what to do about it.

/// Work in progress, with room to say what kind.
///
/// Use this only when there is genuinely nothing to show yet. A refresh of a
/// list that already has rows belongs in [RefreshIndicator]; a submit belongs
/// inside the button. Blanking a populated screen to redraw it is worse than
/// showing slightly stale data.
class LoadingState extends StatelessWidget {
  const LoadingState({super.key, this.message});

  /// Worth setting when the wait has a known cause the person can understand
  /// — "Waking the server" beats an unexplained spinner on a free tier that
  /// cold-starts for the best part of a minute.
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: Sizes.iconAction,
            height: Sizes.iconAction,
            child: CircularProgressIndicator(strokeWidth: 2.5),
          ),
          if (message != null) ...[
            const SizedBox(height: Space.lg),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

/// Nothing here — and why, and what to do next.
///
/// The third of those is the part the app was missing. "No tasks found" tells
/// a foreman nothing; "No tasks are assigned to you in this filter — try All"
/// tells them where to go.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;

  /// What is missing, as a short statement.
  final String title;

  /// Why they are seeing this, and what would change it.
  final String? message;

  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: Space.huge,
          vertical: Space.xxl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: Sizes.iconState,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: Space.lg),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleSmall,
            ),
            if (message != null) ...[
              const SizedBox(height: Space.sm),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: Space.xl),
              OutlinedButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Something failed, in language the person can act on.
///
/// [message] must already be user-facing. Raw exception text ("DioException
/// [connection error]: ...") is not an error message, it is a stack trace with
/// a friendly font, and it tells a site supervisor nothing they can use.
class ErrorState extends StatelessWidget {
  const ErrorState({
    super.key,
    required this.message,
    this.title = 'Could not load this',
    this.onRetry,
    this.icon = Icons.cloud_off_rounded,
  });

  final String title;
  final String message;
  final VoidCallback? onRetry;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: Space.huge,
          vertical: Space.xxl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: Sizes.iconState, color: context.status.danger),
            const SizedBox(height: Space.lg),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleSmall,
            ),
            const SizedBox(height: Space.sm),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: Space.xl),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh, size: Sizes.icon),
                label: const Text('Try again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// An error on a screen that still has content worth showing.
///
/// The full-screen [ErrorState] is wrong when a cached list is already on
/// screen — replacing real data with an apology loses the worker the numbers
/// they came for. This sits above the list instead.
class InlineErrorBanner extends StatelessWidget {
  const InlineErrorBanner({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final status = context.status;
    return Container(
      margin:
          const EdgeInsets.fromLTRB(Space.gutter, Space.md, Space.gutter, 0),
      padding: const EdgeInsets.symmetric(
        horizontal: Space.md,
        vertical: Space.sm,
      ),
      decoration: BoxDecoration(
        color: status.dangerContainer,
        borderRadius: Radii.controlAll,
        border: Border.all(color: status.danger.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_outline,
            size: Sizes.iconInline,
            color: status.onDangerContainer,
          ),
          const SizedBox(width: Space.sm),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: status.onDangerContainer),
            ),
          ),
          if (onRetry != null)
            TextButton(
              onPressed: onRetry,
              style: TextButton.styleFrom(
                foregroundColor: status.onDangerContainer,
                padding: const EdgeInsets.symmetric(horizontal: Space.sm),
              ),
              child: const Text('Retry'),
            ),
        ],
      ),
    );
  }
}
