import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/status_pill.dart';
import '../leave_provider.dart';

/// Applying for leave, and seeing where earlier applications stand.
///
///   the goal      get one application submitted correctly, first time
///   primary       the form
///   secondary     what has already been applied for, and its verdict
///   primary act   submit
///
/// The screen is used twice a year by someone who has not seen it since the
/// last time, so nothing here is remembered between visits and every rule is
/// stated at the field it applies to rather than after the submit button.
class LeaveScreen extends ConsumerStatefulWidget {
  const LeaveScreen({super.key});

  @override
  ConsumerState<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends ConsumerState<LeaveScreen> {
  static const _types = <String, String>{
    'casual': 'Casual',
    'sick': 'Sick',
    'earned': 'Earned',
    'unpaid': 'Unpaid',
  };

  final _formKey = GlobalKey<FormState>();
  final _reason = TextEditingController();
  String _type = 'casual';
  DateTime _from = DateTime.now();
  DateTime _to = DateTime.now();

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  /// The span in days, counting both end dates — one day off is one day.
  int get _days => _to.difference(_from).inDays + 1;

  Future<void> _pick({required bool isFrom}) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? _from : _to,
      // A leave application is forward-looking. Allowing 2024 let someone file
      // for a week two years gone, which HR can only reject.
      firstDate: DateTime(now.year, now.month, now.day)
          .subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 365)),
      helpText: isFrom ? 'First day of leave' : 'Last day of leave',
    );
    if (picked == null) return;
    setState(() {
      if (isFrom) {
        _from = picked;
        // Dragging the start past the end is a slip, not an intention.
        if (_to.isBefore(_from)) _to = _from;
      } else {
        _to = picked;
      }
    });
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    FocusScope.of(context).unfocus();
    await ref.read(leaveProvider.notifier).apply(
          type: _type,
          from: DateFormatters.toApiDate(_from),
          to: DateFormatters.toApiDate(_to),
          reason: _reason.text.trim(),
        );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(leaveProvider);
    final notifier = ref.read(leaveProvider.notifier);
    final endsBeforeItStarts = _to.isBefore(_from);

    return Scaffold(
      appBar: AppBar(title: const Text('Leave')),
      body: RefreshIndicator(
        onRefresh: notifier.refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            Space.gutter,
            Space.lg,
            Space.gutter,
            Space.huge,
          ),
          children: [
            if (state.error != null) ...[
              InlineErrorBanner(
                  message: state.error!, onRetry: notifier.refresh),
              const SizedBox(height: Space.lg),
            ],
            if (state.message != null) ...[
              _Note(state.message!),
              const SizedBox(height: Space.lg),
            ],
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _type,
                    decoration: const InputDecoration(labelText: 'Leave type'),
                    items: [
                      for (final entry in _types.entries)
                        DropdownMenuItem(
                            value: entry.key, child: Text(entry.value)),
                    ],
                    onChanged: (value) =>
                        setState(() => _type = value ?? 'casual'),
                  ),
                  const SizedBox(height: Space.md),

                  // Side by side while a date still fits half the width. At
                  // large system text "14/09/2026" wraps onto four lines in
                  // that space, so the pair stacks instead — the same rule the
                  // attendance rows use.
                  Builder(builder: (context) {
                    final from = _DateField(
                      label: 'From',
                      date: _from,
                      onTap: () => _pick(isFrom: true),
                    );
                    final to = _DateField(
                      label: 'To',
                      date: _to,
                      onTap: () => _pick(isFrom: false),
                      error: endsBeforeItStarts,
                    );
                    final stacked =
                        MediaQuery.textScalerOf(context).scale(14) > 20;
                    return stacked
                        ? Column(
                            children: [
                              from,
                              const SizedBox(height: Space.md),
                              to,
                            ],
                          )
                        : Row(
                            children: [
                              Expanded(child: from),
                              const SizedBox(width: Space.md),
                              Expanded(child: to),
                            ],
                          );
                  }),
                  const SizedBox(height: Space.sm),
                  Text(
                    endsBeforeItStarts
                        ? 'The last day is before the first day.'
                        : _days == 1
                            ? '1 day'
                            : '$_days days',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: endsBeforeItStarts
                          ? theme.colorScheme.error
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: Space.md),

                  KiplTextField(
                    controller: _reason,
                    label: 'Reason',
                    hint: 'What the leave is for',
                    maxLines: 3,
                    textCapitalization: TextCapitalization.sentences,
                    validator: (value) {
                      final text = (value ?? '').trim();
                      if (text.isEmpty) return 'A reason is required.';
                      if (text.length < 4)
                        return 'Say a little more than that.';
                      return null;
                    },
                  ),
                  const SizedBox(height: Space.lg),

                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: state.isSubmitting || endsBeforeItStarts
                          ? null
                          : _submit,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(Sizes.control),
                      ),
                      child: state.isSubmitting
                          ? const SizedBox(
                              width: Sizes.icon,
                              height: Sizes.icon,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Submit application'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.xxl),
            Text('Your applications', style: theme.textTheme.titleSmall),
            const SizedBox(height: Space.sm),
            _History(state: state, onRetry: notifier.refresh),
          ],
        ),
      ),
    );
  }
}

class _History extends StatelessWidget {
  const _History({required this.state, required this.onRetry});

  final LeaveState state;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    if (state.isLoading && state.items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: Space.xxl),
        child: LoadingState(message: 'Loading your applications…'),
      );
    }

    if (state.items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: Space.lg),
        child: EmptyState(
          icon: Icons.event_available_outlined,
          title: 'No applications yet',
          message: 'Anything you apply for above appears here with '
              'its approval status.',
        ),
      );
    }

    return Column(
      children: [
        for (final record in state.items) _LeaveRow(record: record),
      ],
    );
  }
}

class _LeaveRow extends StatelessWidget {
  const _LeaveRow({required this.record});

  final LeaveRecord record;

  /// The verdict, in the one colour language the rest of the app uses.
  StatusPillType get _tone => switch (record.status.toLowerCase()) {
        'approved' => StatusPillType.success,
        'rejected' => StatusPillType.error,
        'cancelled' => StatusPillType.neutral,
        _ => StatusPillType.warning,
      };

  String get _span {
    final from =
        DateFormatters.formatIndian(DateTime.tryParse(record.fromDate));
    final to = DateFormatters.formatIndian(DateTime.tryParse(record.toDate));
    return from == to ? from : '$from → $to';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final type = record.leaveType.isEmpty
        ? 'Leave'
        : record.leaveType[0].toUpperCase() + record.leaveType.substring(1);

    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(type),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_span),
          if (record.reason?.trim().isNotEmpty == true)
            Text(
              record.reason!.trim(),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall,
            ),
        ],
      ),
      trailing: StatusPill(
        label: record.status,
        type: _tone,
        emphasis: StatusEmphasis.subtle,
      ),
    );
  }
}

/// A submission result, which is not an error and should not look like one.
class _Note extends StatelessWidget {
  const _Note(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;
    return Container(
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        color: status.successContainer,
        borderRadius: Radii.controlAll,
        border: Border.all(color: status.success.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.check_circle_outline,
              size: Sizes.iconInline, color: status.onSuccessContainer),
          const SizedBox(width: Space.sm),
          Expanded(
            child: Text(
              text,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: status.onSuccessContainer),
            ),
          ),
        ],
      ),
    );
  }
}

/// A date, shown the way it will be read rather than the way it is sent.
class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.date,
    required this.onTap,
    this.error = false,
  });

  final String label;
  final DateTime date;
  final VoidCallback onTap;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: Radii.controlAll,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          errorText: error ? '' : null,
          errorStyle: const TextStyle(height: 0),
          suffixIcon:
              const Icon(Icons.calendar_today_outlined, size: Sizes.icon),
        ),
        child: Text(
          DateFormatters.formatIndian(date),
          style: theme.textTheme.bodyMedium,
        ),
      ),
    );
  }
}
