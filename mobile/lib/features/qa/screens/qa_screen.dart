import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_provider.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/status_pill.dart';
import '../qa_provider.dart';

/// Quality inspections and non-conformance reports.
///
/// The New Check tab is a form whose length is decided by the checklist: it can
/// be twenty questions, each needing pass, fail or not-applicable. The only
/// feedback on progress used to arrive after the submit button was pressed —
/// a SnackBar reading "Answer all required checklist items (7 remaining)" —
/// which named a number but not which seven, on a form long enough that
/// finding them meant scrolling the whole thing twice.
///
/// A progress line now sits above the questions, the submit button states what
/// is outstanding instead of hiding it, and any required question left blank
/// after an attempt is marked where it sits. Same rule as the punch button on
/// Attendance: say what is wrong before the tap, not after it.
///
/// The three answer buttons per question were hand-built InkWells, as was the
/// NCR severity picker, complete with LayoutBuilder width arithmetic. Both are
/// SegmentedButton — the Material 3 control they were imitating.
class QaScreen extends ConsumerStatefulWidget {
  const QaScreen({super.key});

  @override
  ConsumerState<QaScreen> createState() => _QaScreenState();
}

class _QaScreenState extends ConsumerState<QaScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  QaChecklistModel? _selectedChecklist;

  /// itemId -> 'pass' | 'fail' | 'na'
  final Map<String, String> _answers = {};

  /// Set once a submit has been attempted, so unanswered questions are only
  /// marked after the inspector has actually tried — flagging them from the
  /// first frame would paint a fresh checklist entirely red.
  bool _showMissing = false;

  final _inspectionFormKey = GlobalKey<FormState>();
  final _locationController = TextEditingController();
  final _chainageController = TextEditingController();
  final _remarksController = TextEditingController();
  final _locationFocus = FocusNode();
  final _chainageFocus = FocusNode();

  final _ncrFormKey = GlobalKey<FormState>();
  final _ncrTitleController = TextEditingController();
  final _ncrDescController = TextEditingController();
  final _ncrLocationController = TextEditingController();
  final _ncrTitleFocus = FocusNode();
  final _ncrDescFocus = FocusNode();
  final _ncrLocationFocus = FocusNode();
  String _ncrSeverity = 'minor';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    for (final c in [
      _locationController,
      _chainageController,
      _remarksController,
      _ncrTitleController,
      _ncrDescController,
      _ncrLocationController,
    ]) {
      c.dispose();
    }
    for (final f in [
      _locationFocus,
      _chainageFocus,
      _ncrTitleFocus,
      _ncrDescFocus,
      _ncrLocationFocus,
    ]) {
      f.dispose();
    }
    super.dispose();
  }

  // ------------------------------------------------------------- inspection

  /// Required questions with no answer yet.
  List<QaChecklistQuestion> get _unanswered {
    final checklist = _selectedChecklist;
    if (checklist == null) return const [];
    return checklist.items
        .where((q) => q.required && !_answers.containsKey(q.id))
        .toList();
  }

  Future<void> _submitInspection() async {
    final checklist = _selectedChecklist;
    if (checklist == null) return;

    setState(() => _showMissing = true);
    if (!(_inspectionFormKey.currentState?.validate() ?? false)) return;
    if (_unanswered.isNotEmpty) return;

    final responses = checklist.items
        .where((q) => _answers.containsKey(q.id))
        .map((q) => {
              'itemId': q.id,
              'question': q.question,
              'result': _answers[q.id],
            })
        .toList();

    final success = await ref.read(qaProvider.notifier).submitInspection({
      'date': DateFormatters.toApiDate(DateTime.now()),
      'workItem': checklist.workItem,
      'checklistId': checklist.id,
      'location': _locationController.text.trim(),
      'chainage': _chainageController.text.trim(),
      'responses': responses,
      'remarks': _remarksController.text.trim(),
    });

    if (!success || !mounted) return;

    setState(() {
      _answers.clear();
      _showMissing = false;
      _selectedChecklist = null;
    });
    _locationController.clear();
    _chainageController.clear();
    _remarksController.clear();
    _inspectionFormKey.currentState?.reset();
    _tabController.animateTo(0);
  }

  // -------------------------------------------------------------------- NCR

  void _showRaiseNcrSheet() {
    _ncrFormKey.currentState?.reset();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) => SafeArea(
          child: Form(
            key: _ncrFormKey,
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                Space.xl,
                0,
                Space.xl,
                Space.xl + MediaQuery.viewInsetsOf(sheetContext).bottom,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Raise a non-conformance report',
                    style: Theme.of(sheetContext).textTheme.titleMedium,
                  ),
                  const SizedBox(height: Space.xl),
                  KiplTextField(
                    controller: _ncrTitleController,
                    focusNode: _ncrTitleFocus,
                    label: 'What is non-conforming',
                    hint: 'e.g. Honeycombing in RCC wall',
                    textCapitalization: TextCapitalization.sentences,
                    textInputAction: TextInputAction.next,
                    onSubmitted: (_) => _ncrDescFocus.requestFocus(),
                    validator: (v) => (v?.trim().isEmpty ?? true)
                        ? 'Name the non-conformance'
                        : null,
                  ),
                  const SizedBox(height: Space.lg),
                  KiplTextField(
                    controller: _ncrDescController,
                    focusNode: _ncrDescFocus,
                    label: 'Description and root cause',
                    hint: 'e.g. Inadequate vibration during the pour',
                    maxLines: 3,
                    textCapitalization: TextCapitalization.sentences,
                    // An NCR with no description is a record that something
                    // was wrong and no account of what.
                    validator: (v) => (v?.trim().isEmpty ?? true)
                        ? 'Describe the defect and what caused it'
                        : null,
                  ),
                  const SizedBox(height: Space.lg),
                  KiplTextField(
                    controller: _ncrLocationController,
                    focusNode: _ncrLocationFocus,
                    label: 'Location or chainage',
                    hint: 'e.g. Aeration Tank wall 3, Ch. 1+250',
                    textCapitalization: TextCapitalization.sentences,
                  ),
                  const SizedBox(height: Space.xl),
                  Text(
                    'Severity',
                    style: Theme.of(sheetContext).textTheme.titleSmall,
                  ),
                  const SizedBox(height: Space.sm),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'minor', label: Text('Minor')),
                      ButtonSegment(value: 'major', label: Text('Major')),
                      ButtonSegment(value: 'critical', label: Text('Critical')),
                    ],
                    selected: {_ncrSeverity},
                    onSelectionChanged: (s) =>
                        setSheetState(() => _ncrSeverity = s.first),
                    showSelectedIcon: false,
                  ),
                  const SizedBox(height: Space.xxl),
                  SizedBox(
                    height: Sizes.control,
                    child: FilledButton.icon(
                      icon: const Icon(Icons.warning_amber_rounded),
                      label: const Text('Raise NCR'),
                      onPressed: () => _submitNcr(sheetContext),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submitNcr(BuildContext sheetContext) async {
    if (!(_ncrFormKey.currentState?.validate() ?? false)) return;

    final success = await ref.read(qaProvider.notifier).createNcr({
      'date': DateFormatters.toApiDate(DateTime.now()),
      'workItem': _ncrTitleController.text.trim(),
      'description': _ncrDescController.text.trim(),
      'severity': _ncrSeverity,
      'location': _ncrLocationController.text.trim(),
      'targetDate':
          DateFormatters.toApiDate(DateTime.now().add(const Duration(days: 7))),
      'status': 'open',
    });

    if (!mounted) return;
    if (success) {
      _ncrTitleController.clear();
      _ncrDescController.clear();
      _ncrLocationController.clear();
      if (sheetContext.mounted) Navigator.pop(sheetContext);
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          ref.read(qaProvider).error ?? 'The NCR could not be submitted.',
        ),
      ),
    );
  }

  Future<void> _showCloseNcrDialog(NcrItem ncr) async {
    final controller = TextEditingController();
    final formKey = GlobalKey<FormState>();

    final action = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        scrollable: true,
        title: Text('Close ${ncr.ncrNo}'),
        content: Form(
          key: formKey,
          child: KiplTextField(
            controller: controller,
            label: 'Corrective action completed',
            hint: 'Describe the correction and the verification performed',
            maxLines: 4,
            textCapitalization: TextCapitalization.sentences,
            // Closing an NCR with no corrective action recorded leaves the
            // quality file saying a defect was resolved and not how.
            validator: (v) => (v?.trim().isEmpty ?? true)
                ? 'Record what was done to correct it'
                : null,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (!(formKey.currentState?.validate() ?? false)) return;
              Navigator.pop(dialogContext, controller.text.trim());
            },
            child: const Text('Close NCR'),
          ),
        ],
      ),
    );

    controller.dispose();
    if (action == null || action.isEmpty || !mounted) return;
    await ref.read(qaProvider.notifier).closeNcr(ncr.id, action);
  }

  // ------------------------------------------------------------------ build

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(qaProvider);
    final notifier = ref.read(qaProvider.notifier);
    final canManage = ref.watch(currentUserProvider)?.canManageQuality == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('QA & Site Safety'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            const Tab(text: 'Inspections'),
            const Tab(text: 'New check'),
            Tab(
              text: state.ncrs.where((n) => n.isOpen).isEmpty
                  ? 'NCRs'
                  : 'NCRs (${state.ncrs.where((n) => n.isOpen).length})',
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          if (state.error != null)
            InlineErrorBanner(message: state.error!, onRetry: notifier.init),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _inspectionsTab(state, notifier),
                _newCheckTab(state, canManage),
                _ncrTab(state, notifier, canManage),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _inspectionsTab(QaState state, QaNotifier notifier) {
    if (state.isLoading && state.inspections.isEmpty) {
      return const LoadingState(message: 'Loading inspections…');
    }

    if (state.inspections.isEmpty) {
      return RefreshIndicator(
        onRefresh: notifier.init,
        child: LayoutBuilder(
          builder: (context, constraints) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: EmptyState(
                  icon: Icons.assignment_turned_in_outlined,
                  title: 'No inspections logged yet',
                  message: 'Completed checklists appear here with their pass '
                      'and fail counts, newest first.',
                  actionLabel: 'Start a check',
                  onAction: () => _tabController.animateTo(1),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: notifier.init,
      child: ListView.separated(
        padding: const EdgeInsets.only(bottom: Space.huge),
        itemCount: state.inspections.length,
        separatorBuilder: (_, __) =>
            const Divider(indent: Space.gutter, endIndent: Space.gutter),
        itemBuilder: (context, i) =>
            _InspectionRow(inspection: state.inspections[i]),
      ),
    );
  }

  Widget _newCheckTab(QaState state, bool canManage) {
    final theme = Theme.of(context);
    final status = context.status;
    final checklist = _selectedChecklist;

    return Form(
      key: _inspectionFormKey,
      child: ListView(
        padding: EdgeInsets.fromLTRB(
          Space.gutter,
          Space.lg,
          Space.gutter,
          Space.giant + MediaQuery.viewInsetsOf(context).bottom,
        ),
        children: [
          if (!canManage) ...[
            _Note(
              icon: Icons.lock_outline,
              tone: status.warning,
              text: 'You have read-only access to QA records.',
            ),
            const SizedBox(height: Space.lg),
          ],
          Text('Checklist', style: theme.textTheme.titleSmall),
          const SizedBox(height: Space.sm),
          if (state.checklists.isEmpty)
            Text(
              'No checklist templates are configured for this project. A QA '
              'manager can add them from the web dashboard.',
              style: theme.textTheme.bodySmall,
            )
          else
            Wrap(
              spacing: Space.sm,
              runSpacing: Space.sm,
              children: [
                for (final cl in state.checklists)
                  ChoiceChip(
                    label: Text(cl.title),
                    selected: checklist?.id == cl.id,
                    onSelected: canManage
                        ? (_) => setState(() {
                              _selectedChecklist = cl;
                              _answers.clear();
                              _showMissing = false;
                            })
                        : null,
                  ),
              ],
            ),
          if (checklist != null) ...[
            const SizedBox(height: Space.xl),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: KiplTextField(
                    controller: _locationController,
                    focusNode: _locationFocus,
                    label: 'Location',
                    hint: 'e.g. Zone 2',
                    enabled: canManage,
                    textCapitalization: TextCapitalization.sentences,
                    textInputAction: TextInputAction.next,
                    onSubmitted: (_) => _chainageFocus.requestFocus(),
                  ),
                ),
                const SizedBox(width: Space.md),
                Expanded(
                  child: KiplTextField(
                    controller: _chainageController,
                    focusNode: _chainageFocus,
                    label: 'Chainage',
                    hint: 'e.g. 1+250',
                    enabled: canManage,
                  ),
                ),
              ],
            ),

            const SizedBox(height: Space.xl),
            _ChecklistProgress(
              total: checklist.items.length,
              answered: _answers.length,
              failed: _answers.values.where((v) => v == 'fail').length,
            ),

            const SizedBox(height: Space.md),
            for (var i = 0; i < checklist.items.length; i++)
              _QuestionTile(
                index: i + 1,
                question: checklist.items[i],
                answer: _answers[checklist.items[i].id],
                enabled: canManage,
                // Marked only after a submit attempt.
                missing: _showMissing &&
                    checklist.items[i].required &&
                    !_answers.containsKey(checklist.items[i].id),
                onAnswer: (value) => setState(() {
                  _answers[checklist.items[i].id] = value;
                }),
              ),

            const SizedBox(height: Space.lg),
            KiplTextField(
              controller: _remarksController,
              label: 'Inspection notes',
              hint: 'e.g. Slump readings within 120±25mm tolerance',
              enabled: canManage,
              maxLines: 3,
              textCapitalization: TextCapitalization.sentences,
            ),

            const SizedBox(height: Space.xxl),
            SizedBox(
              height: Sizes.control,
              child: FilledButton.icon(
                onPressed:
                    canManage && !state.isSubmitting && _unanswered.isEmpty
                        ? _submitInspection
                        : null,
                icon: state.isSubmitting
                    ? const SizedBox(
                        width: Sizes.icon,
                        height: Sizes.icon,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.check_circle_outline),
                label: const Text('Submit inspection'),
              ),
            ),

            // The blocker under the button it disables, naming the count —
            // the old SnackBar said the same number and then vanished.
            if (_unanswered.isNotEmpty) ...[
              const SizedBox(height: Space.md),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline,
                      size: Sizes.iconInline, color: theme.colorScheme.outline),
                  const SizedBox(width: Space.sm),
                  Expanded(
                    child: Text(
                      _unanswered.length == 1
                          ? 'One required question is still unanswered.'
                          : '${_unanswered.length} required questions are '
                              'still unanswered.',
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _ncrTab(QaState state, QaNotifier notifier, bool canManage) {
    if (state.isLoading && state.ncrs.isEmpty) {
      return const LoadingState(message: 'Loading NCRs…');
    }

    final body = state.ncrs.isEmpty
        ? RefreshIndicator(
            onRefresh: notifier.init,
            child: LayoutBuilder(
              builder: (context, constraints) => ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  ConstrainedBox(
                    constraints:
                        BoxConstraints(minHeight: constraints.maxHeight),
                    child: const EmptyState(
                      icon: Icons.verified_outlined,
                      title: 'No non-conformances raised',
                      message: 'Nothing on this project has been recorded as '
                          'failing to meet specification.',
                    ),
                  ),
                ],
              ),
            ),
          )
        : RefreshIndicator(
            onRefresh: notifier.init,
            child: ListView.separated(
              padding: const EdgeInsets.only(bottom: 88),
              itemCount: state.ncrs.length,
              separatorBuilder: (_, __) =>
                  const Divider(indent: Space.gutter, endIndent: Space.gutter),
              itemBuilder: (context, i) => _NcrRow(
                ncr: state.ncrs[i],
                canManage: canManage,
                isSubmitting: state.isSubmitting,
                onClose: () => _showCloseNcrDialog(state.ncrs[i]),
              ),
            ),
          );

    if (!canManage) return body;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: body,
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add_alert_outlined),
        label: const Text('Raise NCR'),
        onPressed: _showRaiseNcrSheet,
      ),
    );
  }
}

/// How far through the checklist the inspector is, before they submit it.
class _ChecklistProgress extends StatelessWidget {
  const _ChecklistProgress({
    required this.total,
    required this.answered,
    required this.failed,
  });

  final int total;
  final int answered;
  final int failed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;
    final fraction = total == 0 ? 0.0 : answered / total;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                '$answered of $total answered',
                style: theme.textTheme.titleSmall,
              ),
            ),
            if (failed > 0)
              Text(
                failed == 1 ? '1 fail' : '$failed fails',
                style: theme.textTheme.labelMedium?.copyWith(
                    color: status.danger, fontWeight: FontWeight.w600),
              ),
          ],
        ),
        const SizedBox(height: Space.sm),
        ClipRRect(
          borderRadius: Radii.fullAll,
          child: LinearProgressIndicator(
            value: fraction,
            minHeight: 6,
            backgroundColor: theme.colorScheme.surfaceContainer,
          ),
        ),
      ],
    );
  }
}

/// One checklist question and its answer.
class _QuestionTile extends StatelessWidget {
  const _QuestionTile({
    required this.index,
    required this.question,
    required this.answer,
    required this.enabled,
    required this.missing,
    required this.onAnswer,
  });

  final int index;
  final QaChecklistQuestion question;
  final String? answer;
  final bool enabled;
  final bool missing;
  final ValueChanged<String> onAnswer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;

    return Container(
      margin: const EdgeInsets.only(bottom: Space.sm),
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: Radii.cardAll,
        border: Border.all(
          color: missing ? status.danger : theme.colorScheme.outlineVariant,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$index. ${question.question}',
            style: theme.textTheme.bodyMedium,
          ),
          if (question.referenceSpec != null) ...[
            const SizedBox(height: Space.xs),
            Text(
              question.referenceSpec!,
              style: theme.textTheme.labelSmall,
            ),
          ],
          const SizedBox(height: Space.md),
          // SegmentedButton, not three hand-built InkWells. It brings its own
          // 48dp targets, pressed states and "selected" semantics.
          SizedBox(
            width: double.infinity,
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'pass', label: Text('Pass')),
                ButtonSegment(value: 'fail', label: Text('Fail')),
                ButtonSegment(value: 'na', label: Text('N/A')),
              ],
              selected: answer == null ? const {} : {answer!},
              emptySelectionAllowed: true,
              showSelectedIcon: false,
              onSelectionChanged: enabled ? (s) => onAnswer(s.first) : null,
              style: SegmentedButton.styleFrom(
                selectedBackgroundColor: switch (answer) {
                  'pass' => status.successContainer,
                  'fail' => status.dangerContainer,
                  _ => theme.colorScheme.surfaceContainerHigh,
                },
                selectedForegroundColor: switch (answer) {
                  'pass' => status.onSuccessContainer,
                  'fail' => status.onDangerContainer,
                  _ => theme.colorScheme.onSurface,
                },
                textStyle: theme.textTheme.labelMedium,
              ),
            ),
          ),
          if (missing) ...[
            const SizedBox(height: Space.sm),
            Text(
              'This one is required',
              style: theme.textTheme.labelSmall?.copyWith(color: status.danger),
            ),
          ],
        ],
      ),
    );
  }
}

class _InspectionRow extends StatelessWidget {
  const _InspectionRow({required this.inspection});

  final QaInspectionItem inspection;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;

    final tone = switch (inspection.overallResult) {
      'passed' => StatusPillType.success,
      'conditional' => StatusPillType.warning,
      _ => StatusPillType.error,
    };

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: Space.gutter,
        vertical: Space.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  inspection.workItem,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall,
                ),
              ),
              const SizedBox(width: Space.sm),
              StatusPill(
                label: inspection.overallResult.toUpperCase(),
                type: tone,
              ),
            ],
          ),
          const SizedBox(height: Space.sm),
          Wrap(
            spacing: Space.md,
            runSpacing: Space.xs,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              // Words, not '✓' and '✗' glyphs — those are text pretending to
              // be icons, and a screen reader reads them as "check mark".
              Text(
                '${inspection.passCount} passed',
                style: theme.textTheme.labelMedium
                    ?.copyWith(color: status.success),
              ),
              if (inspection.failCount > 0)
                Text(
                  '${inspection.failCount} failed',
                  style: theme.textTheme.labelMedium?.copyWith(
                      color: status.danger, fontWeight: FontWeight.w600),
                ),
              if (inspection.naCount > 0)
                Text(
                  '${inspection.naCount} n/a',
                  style: theme.textTheme.labelMedium,
                ),
              Text(
                DateFormatters.formatIndian(DateTime.tryParse(inspection.date)),
                style: theme.textTheme.labelMedium,
              ),
              if (inspection.chainage?.isNotEmpty == true)
                Text('Ch. ${inspection.chainage}',
                    style: theme.textTheme.labelMedium),
            ],
          ),
        ],
      ),
    );
  }
}

class _NcrRow extends StatelessWidget {
  const _NcrRow({
    required this.ncr,
    required this.canManage,
    required this.isSubmitting,
    required this.onClose,
  });

  final NcrItem ncr;
  final bool canManage;
  final bool isSubmitting;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;

    final severityTone = switch (ncr.severity) {
      'critical' => StatusPillType.error,
      'major' => StatusPillType.warning,
      _ => StatusPillType.neutral,
    };

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: Space.gutter,
        vertical: Space.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            ncr.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.titleSmall,
          ),
          const SizedBox(height: Space.sm),
          Wrap(
            spacing: Space.sm,
            runSpacing: Space.xs,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              // Open vs closed as the quiet dot, severity as the badge. Two
              // filled pills side by side made neither of them the headline.
              StatusPill(
                label: ncr.isOpen ? 'Open' : 'Closed',
                type:
                    ncr.isOpen ? StatusPillType.error : StatusPillType.success,
                emphasis: StatusEmphasis.subtle,
              ),
              StatusPill(
                label: ncr.severity.toUpperCase(),
                type: severityTone,
              ),
              Text(ncr.ncrNo, style: theme.textTheme.labelMedium),
              if (ncr.location?.isNotEmpty == true)
                Text(ncr.location!, style: theme.textTheme.labelMedium),
              if (ncr.isOpen && ncr.targetDate != null)
                Text(
                  'Target ${DateFormatters.formatIndian(DateTime.tryParse(ncr.targetDate!))}',
                  style: theme.textTheme.labelMedium
                      ?.copyWith(color: status.warning),
                ),
            ],
          ),
          if (ncr.description.isNotEmpty) ...[
            const SizedBox(height: Space.xs),
            Text(
              ncr.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall,
            ),
          ],
          if (!ncr.isOpen && ncr.correctiveAction?.isNotEmpty == true) ...[
            const SizedBox(height: Space.xs),
            Text(
              ncr.correctiveAction!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(color: status.success),
            ),
          ],
          if (canManage && ncr.isOpen) ...[
            const SizedBox(height: Space.md),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.icon(
                onPressed: isSubmitting ? null : onClose,
                icon: const Icon(Icons.task_alt, size: Sizes.iconInline),
                label: const Text('Record correction'),
                style: FilledButton.styleFrom(
                  backgroundColor: theme.colorScheme.surfaceContainerHigh,
                  foregroundColor: theme.colorScheme.primary,
                  minimumSize: const Size(0, 40),
                  padding: const EdgeInsets.symmetric(horizontal: Space.md),
                  textStyle: theme.textTheme.labelMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.tone, required this.text});

  final IconData icon;
  final Color tone;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.10),
        borderRadius: Radii.controlAll,
        border: Border.all(color: tone.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: Sizes.iconInline, color: tone),
          const SizedBox(width: Space.sm),
          Expanded(
            child: Text(
              text,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurface),
            ),
          ),
        ],
      ),
    );
  }
}
