import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/kipl_button.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/status_pill.dart';
import '../qa_provider.dart';

class QaScreen extends ConsumerStatefulWidget {
  const QaScreen({super.key});

  @override
  ConsumerState<QaScreen> createState() => _QaScreenState();
}

class _QaScreenState extends ConsumerState<QaScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  QaChecklistModel? _selectedChecklist;
  final Map<String, String> _questionResponses =
      {}; // itemId -> 'pass' | 'fail' | 'na'

  final _locationController = TextEditingController();
  final _chainageController = TextEditingController();
  final _remarksController = TextEditingController();

  // NCR form controllers
  final _ncrTitleController = TextEditingController();
  final _ncrDescController = TextEditingController();
  final _ncrLocationController = TextEditingController();
  String _ncrSeverity = 'minor'; // 'minor', 'major', 'critical'

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _locationController.dispose();
    _chainageController.dispose();
    _remarksController.dispose();
    _ncrTitleController.dispose();
    _ncrDescController.dispose();
    _ncrLocationController.dispose();
    super.dispose();
  }

  void _onSelectChecklist(QaChecklistModel cl) {
    setState(() {
      _selectedChecklist = cl;
      _questionResponses.clear();
    });
  }

  Future<void> _submitInspection() async {
    if (_selectedChecklist == null) return;
    final notifier = ref.read(qaProvider.notifier);
    final unanswered = _selectedChecklist!.items
        .where(
            (item) => item.required && !_questionResponses.containsKey(item.id))
        .length;
    if (unanswered > 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Answer all required checklist items ($unanswered remaining).'),
          backgroundColor: AppColors.red,
        ),
      );
      return;
    }

    final responses = _selectedChecklist!.items
        .where((item) => _questionResponses.containsKey(item.id))
        .map((item) {
      return {
        'itemId': item.id,
        'question': item.question,
        'result': _questionResponses[item.id],
      };
    }).toList();

    final payload = {
      'date': DateFormatters.toApiDate(DateTime.now()),
      'workItem': _selectedChecklist!.workItem,
      'checklistId': _selectedChecklist!.id,
      'location': _locationController.text,
      'chainage': _chainageController.text,
      'responses': responses,
      'remarks': _remarksController.text,
    };

    final success = await notifier.submitInspection(payload);
    if (success && mounted) {
      _locationController.clear();
      _chainageController.clear();
      _remarksController.clear();
      _tabController.animateTo(0);
    }
  }

  Future<void> _submitNcr(BuildContext sheetContext) async {
    final notifier = ref.read(qaProvider.notifier);

    if (_ncrTitleController.text.trim().isEmpty ||
        _ncrDescController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Enter an NCR work item and description'),
            backgroundColor: AppColors.red),
      );
      return;
    }

    final payload = {
      'date': DateFormatters.toApiDate(DateTime.now()),
      'workItem': _ncrTitleController.text.trim(),
      'description': _ncrDescController.text.trim(),
      'severity': _ncrSeverity,
      'location': _ncrLocationController.text.trim(),
      'targetDate':
          DateFormatters.toApiDate(DateTime.now().add(const Duration(days: 7))),
      'status': 'open',
    };

    final success = await notifier.createNcr(payload);
    if (success && mounted && sheetContext.mounted) {
      _ncrTitleController.clear();
      _ncrDescController.clear();
      _ncrLocationController.clear();
      Navigator.pop(sheetContext); // close sheet
    } else if (!success && mounted) {
      final message =
          ref.read(qaProvider).error ?? 'The NCR could not be submitted.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: AppColors.red),
      );
    }
  }

  void _showRaiseNcrSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => SafeArea(
          child: SingleChildScrollView(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Raise Non-Conformance Report (NCR)',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textBase)),
                const SizedBox(height: 14),
                KiplTextField(
                  controller: _ncrTitleController,
                  label: 'Defect Title / Non-Conformance',
                  hint: 'e.g. Honeycombing in RCC wall, compaction failure',
                ),
                const SizedBox(height: 12),
                KiplTextField(
                  controller: _ncrDescController,
                  label: 'Description & Root Cause',
                  hint: 'e.g. Inadequate vibration during concrete pour...',
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                KiplTextField(
                  controller: _ncrLocationController,
                  label: 'Location / Chainage',
                  hint: 'e.g. Aeration Tank Wall 3, Zone B',
                ),
                const SizedBox(height: 12),
                const Text('Severity Level:',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                const SizedBox(height: 6),
                LayoutBuilder(
                  builder: (context, constraints) {
                    final optionWidth = constraints.maxWidth >= 300
                        ? (constraints.maxWidth - 16) / 3
                        : constraints.maxWidth;
                    return Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        SizedBox(
                            width: optionWidth,
                            child: _buildSevOption(
                                'minor', AppColors.amber, setSheetState)),
                        SizedBox(
                            width: optionWidth,
                            child: _buildSevOption(
                                'major', AppColors.red, setSheetState)),
                        SizedBox(
                            width: optionWidth,
                            child: _buildSevOption('critical',
                                const Color(0xFF991B1B), setSheetState)),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 20),
                KiplButton(
                  label: 'Submit NCR',
                  icon: Icons.warning_amber_rounded,
                  variant: KiplButtonVariant.danger,
                  onPressed: () => _submitNcr(ctx),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _showCloseNcrDialog(NcrItem ncr) async {
    final controller = TextEditingController();
    final action = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        scrollable: true,
        backgroundColor: AppColors.bgCard,
        title: Text('Close ${ncr.ncrNo}',
            style: const TextStyle(color: AppColors.textBase)),
        content: TextField(
          controller: controller,
          minLines: 3,
          maxLines: 5,
          autofocus: true,
          style: const TextStyle(color: AppColors.textBase),
          decoration: const InputDecoration(
            labelText: 'Corrective action completed',
            hintText: 'Describe the correction and verification performed…',
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () =>
                Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Close NCR'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (action == null || action.isEmpty || !mounted) return;
    await ref.read(qaProvider.notifier).closeNcr(ncr.id, action);
  }

  Widget _buildSevOption(String val, Color col, StateSetter setSheetState) {
    final isSel = _ncrSeverity == val;
    return InkWell(
      onTap: () => setSheetState(() => _ncrSeverity = val),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSel ? col.withValues(alpha: 0.25) : AppColors.bgSubtle,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
              color: isSel ? col : AppColors.borderDim, width: isSel ? 1.5 : 1),
        ),
        child: Center(
          child: Text(
            val.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isSel ? col : AppColors.textMuted),
          ),
        ),
      ),
    );
  }

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
          indicatorColor: AppColors.accent,
          labelColor: AppColors.accent,
          unselectedLabelColor: AppColors.textMuted,
          tabs: const [
            Tab(icon: Icon(Icons.fact_check_outlined), text: 'Inspections'),
            Tab(icon: Icon(Icons.checklist_outlined), text: 'New Check'),
            Tab(icon: Icon(Icons.report_problem_outlined), text: 'NCR Log'),
          ],
        ),
      ),
      body: Column(
        children: [
          if (state.error != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              color: AppColors.redBg,
              child: Text(state.error!,
                  style: const TextStyle(color: AppColors.red, fontSize: 12)),
            ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildInspectionsTab(context, state, notifier),
                _buildNewInspectionTab(context, state, canManage),
                _buildNcrsTab(context, state, notifier, canManage),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInspectionsTab(
      BuildContext context, QaState state, QaNotifier notifier) {
    if (state.isLoading) {
      return const Center(
          child: CircularProgressIndicator(color: AppColors.accent));
    }

    return RefreshIndicator(
      onRefresh: () => notifier.init(),
      color: AppColors.accent,
      backgroundColor: AppColors.bgCard,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    Text('COMPLETED INSPECTIONS (${state.inspections.length})',
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textMuted)),
                    TextButton.icon(
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('New Check',
                          style: TextStyle(fontSize: 12)),
                      onPressed: () => _tabController.animateTo(1),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (state.inspections.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 40),
                      child: Column(
                        children: [
                          const Icon(Icons.assignment_turned_in_outlined,
                              size: 48, color: AppColors.textFaint),
                          const SizedBox(height: 12),
                          const Text('No field inspections logged yet.',
                              style: TextStyle(color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                  ),
              ]),
            ),
          ),

          // Built lazily. This list grows with the job, and a plain
          // children list would construct every card up front.
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            sliver: SliverList.builder(
              itemCount: state.inspections.length,
              itemBuilder: (context, index) =>
                  _buildInspectionCard(state.inspections[index]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNewInspectionTab(
      BuildContext context, QaState state, bool canManage) {
    final notifier = ref.read(qaProvider.notifier);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!canManage) ...[
            const Text(
              'You have read-only access to QA records.',
              style: TextStyle(color: AppColors.amber, fontSize: 13),
            ),
            const SizedBox(height: 12),
          ],
          // 1. Checklist Selector
          const Text('SELECT CHECKLIST TEMPLATE:',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textMuted)),
          const SizedBox(height: 8),

          if (state.checklists.isEmpty)
            const Text(
              'No checklist templates are available for this project. Ask an authorised QA manager to configure them.',
              style: TextStyle(color: AppColors.textMuted),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: state.checklists.map((cl) {
                final isSel = _selectedChecklist?.id == cl.id;
                return ChoiceChip(
                  label: Text(cl.title),
                  selected: isSel,
                  selectedColor: AppColors.accentBg,
                  backgroundColor: AppColors.bgCard,
                  side: BorderSide(
                      color: isSel ? AppColors.accent : AppColors.borderDim),
                  labelStyle: TextStyle(
                    color: isSel ? AppColors.accent : AppColors.textBase,
                    fontSize: 12,
                    fontWeight: isSel ? FontWeight.w600 : FontWeight.normal,
                  ),
                  onSelected: (_) => _onSelectChecklist(cl),
                );
              }).toList(),
            ),

          const SizedBox(height: 16),

          if (_selectedChecklist != null) ...[
            // Location and Chainage
            Row(
              children: [
                Expanded(
                  child: KiplTextField(
                    controller: _locationController,
                    label: 'Location / Zone',
                    hint: 'e.g. Nishat STP, Zone 2',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: KiplTextField(
                    controller: _chainageController,
                    label: 'Chainage',
                    hint: 'e.g. 1+250',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // 2. Interactive Questions
            Text(
              'CHECKLIST ITEMS (${_selectedChecklist!.items.length} QUESTIONS):',
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textMuted),
            ),
            const SizedBox(height: 10),

            ..._selectedChecklist!.items.asMap().entries.map((entry) {
              final idx = entry.key;
              final q = entry.value;
              final currentAns = _questionResponses[q.id] ?? '';

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.bgCard,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.borderDim),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${idx + 1}. ${q.question}',
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textBase),
                    ),
                    if (q.referenceSpec != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Ref: ${q.referenceSpec}',
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textFaint),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        _buildAnswerBtn(
                            q.id, 'pass', 'PASS', AppColors.green, currentAns),
                        const SizedBox(width: 8),
                        _buildAnswerBtn(
                            q.id, 'fail', 'FAIL', AppColors.red, currentAns),
                        const SizedBox(width: 8),
                        _buildAnswerBtn(
                            q.id, 'na', 'N/A', AppColors.textMuted, currentAns),
                      ],
                    ),
                  ],
                ),
              );
            }),

            const SizedBox(height: 14),

            KiplTextField(
              controller: _remarksController,
              label: 'General Remarks / Inspection Notes',
              hint:
                  'e.g. All slump test readings verified within 120±25mm tolerance...',
              maxLines: 2,
            ),

            const SizedBox(height: 16),
            Text(
              'SITE PHOTOS (${state.photoUrls.length + state.pendingPhotos.length})',
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textMuted),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: canManage
                        ? () => notifier.capturePhoto(ImageSource.camera)
                        : null,
                    icon: const Icon(Icons.photo_camera_outlined, size: 16),
                    label: const Text('Camera'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: canManage
                        ? () => notifier.capturePhoto(ImageSource.gallery)
                        : null,
                    icon: const Icon(Icons.photo_library_outlined, size: 16),
                    label: const Text('Gallery'),
                  ),
                ),
              ],
            ),
            if (state.pendingPhotos.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '${state.pendingPhotos.length} photo(s) saved on this device and will upload with the inspection.',
                  style: const TextStyle(fontSize: 12, color: AppColors.amber),
                ),
              ),

            const SizedBox(height: 24),

            KiplButton(
              label: 'Submit Inspection Report',
              icon: Icons.check_circle_outline,
              isLoading: state.isSubmitting,
              onPressed: canManage ? _submitInspection : null,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAnswerBtn(
      String qId, String val, String label, Color col, String currentAns) {
    final isSel = currentAns == val;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _questionResponses[qId] = val),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: isSel ? col.withValues(alpha: 0.2) : AppColors.bgSubtle,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
                color: isSel ? col : AppColors.borderDim,
                width: isSel ? 1.5 : 1),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isSel ? col : AppColors.textMuted,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNcrsTab(
    BuildContext context,
    QaState state,
    QaNotifier notifier,
    bool canManage,
  ) {
    if (state.isLoading) {
      return const Center(
          child: CircularProgressIndicator(color: AppColors.accent));
    }

    final openCount = state.ncrs.where((n) => n.isOpen).length;

    return RefreshIndicator(
      onRefresh: () => notifier.init(),
      color: AppColors.accent,
      backgroundColor: AppColors.bgCard,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    Text('NON-CONFORMANCE REPORTS ($openCount OPEN)',
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textMuted)),
                    if (canManage)
                      TextButton.icon(
                        icon: const Icon(Icons.add_alert_outlined,
                            size: 16, color: AppColors.red),
                        label: const Text('Raise NCR',
                            style:
                                TextStyle(fontSize: 12, color: AppColors.red)),
                        onPressed: _showRaiseNcrSheet,
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                if (state.ncrs.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 40),
                      child: Column(
                        children: [
                          const Icon(Icons.verified_outlined,
                              size: 48, color: AppColors.green),
                          const SizedBox(height: 12),
                          const Text(
                              'No NCRs raised. Quality compliance is intact!',
                              style: TextStyle(color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                  ),
              ]),
            ),
          ),

          // Built lazily. This list grows with the job, and a plain
          // children list would construct every card up front.
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            sliver: SliverList.builder(
              itemCount: state.ncrs.length,
              itemBuilder: (context, index) => _buildNcrCard(state.ncrs[index],
                  isSubmitting: state.isSubmitting, canManage: canManage),
            ),
          ),
        ],
      ),
    );
  }

  /// One card in the list. Extracted from an inline map so the list is
  /// built lazily instead of all at once.
  Widget _buildNcrCard(NcrItem n,
      {required bool isSubmitting, required bool canManage}) {
    StatusPillType sevType;
    if (n.severity == 'critical') {
      sevType = StatusPillType.error;
    } else if (n.severity == 'major') {
      sevType = StatusPillType.warning;
    } else {
      sevType = StatusPillType.info;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: n.isOpen
                ? AppColors.red.withValues(alpha: 0.3)
                : AppColors.borderDim),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              Text(n.ncrNo,
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.accent)),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  StatusPill(label: n.severity.toUpperCase(), type: sevType),
                  StatusPill(
                    label: n.status.toUpperCase(),
                    type: n.isOpen
                        ? StatusPillType.error
                        : StatusPillType.success,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(n.title,
              style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textBase)),
          if (n.description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(n.description,
                style:
                    const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ],
          const SizedBox(height: 8),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            spacing: 12,
            runSpacing: 4,
            children: [
              if (n.location != null)
                Text('Loc: ${n.location}',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textFaint)),
              if (n.targetDate != null)
                Text(
                    'Target: ${DateFormatters.formatIndian(DateTime.tryParse(n.targetDate!))}',
                    style:
                        const TextStyle(fontSize: 11, color: AppColors.amber)),
            ],
          ),
          if (canManage && n.isOpen) ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: isSubmitting ? null : () => _showCloseNcrDialog(n),
                icon: const Icon(Icons.task_alt, size: 16),
                label: const Text('Record correction & close'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// One card in the list. Extracted from an inline map so the list is
  /// built lazily instead of all at once.
  Widget _buildInspectionCard(QaInspectionItem i) {
    StatusPillType pillType;
    if (i.overallResult == 'passed') {
      pillType = StatusPillType.success;
    } else if (i.overallResult == 'conditional') {
      pillType = StatusPillType.warning;
    } else {
      pillType = StatusPillType.error;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderDim),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  i.workItem,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textBase),
                ),
              ),
              const SizedBox(width: 8),
              StatusPill(label: i.overallResult.toUpperCase(), type: pillType),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(DateFormatters.formatIndian(DateTime.tryParse(i.date)),
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textMuted)),
              const SizedBox(width: 10),
              if (i.chainage != null && i.chainage!.isNotEmpty)
                Text('Ch: ${i.chainage}',
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 6,
            children: [
              Text('✓ ${i.passCount} Passed',
                  style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.green,
                      fontWeight: FontWeight.w600)),
              Text('✗ ${i.failCount} Failed',
                  style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.red,
                      fontWeight: FontWeight.w600)),
              Text('— ${i.naCount} N/A',
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textFaint)),
            ],
          ),
        ],
      ),
    );
  }
}
