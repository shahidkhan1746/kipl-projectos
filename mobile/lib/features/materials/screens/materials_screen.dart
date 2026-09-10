import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_provider.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/state_views.dart';
import '../materials_provider.dart';

/// The material gate register — what arrived, what was used, what is left.
///
/// This writes the Tender Clause 55 record that is reconciled with UEED, so
/// the entry form is the part that matters and it had no validation at all:
/// nineteen fields across this screen and its three siblings carried zero
/// validators, zero textInputAction and zero focus nodes. The keyboard's Next
/// key did nothing, and quantities were read with
///
///     double.tryParse(text) ?? 0
///
/// which turns "50kg", "12.5.3" and a stray space into a silent zero. A worker
/// who typed "50kg" was then told "Enter either Received Qty or Consumed Qty"
/// — an error about the field they had just filled in.
///
/// Both quantities are now validated where they are typed, the parse failure
/// says what is actually wrong, and the fields are wired into a focus order
/// that ends on the submit button.
class MaterialsScreen extends ConsumerStatefulWidget {
  const MaterialsScreen({super.key});

  @override
  ConsumerState<MaterialsScreen> createState() => _MaterialsScreenState();
}

class _MaterialsScreenState extends ConsumerState<MaterialsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  final _formKey = GlobalKey<FormState>();

  String _selectedMaterial = 'Cement (OPC 43/53)';
  String _selectedUnit = 'Bags';

  final _receivedQtyController = TextEditingController();
  final _consumedQtyController = TextEditingController();
  final _contractorRepController = TextEditingController();
  final _ueedRepController = TextEditingController();
  final _remarksController = TextEditingController();

  final _receivedFocus = FocusNode();
  final _consumedFocus = FocusNode();
  final _contractorFocus = FocusNode();
  final _ueedFocus = FocusNode();
  final _remarksFocus = FocusNode();

  /// Neither quantity was given. Not a per-field rule — it is about the pair —
  /// so it cannot live in a validator and is shown under them instead.
  String? _quantityPairError;

  static const _materials = [
    ('Cement (OPC 43/53)', 'Bags'),
    ('Steel / TMT Fe 500D', 'MT'),
    ('River Sand (Coarse)', 'CuM'),
    ('Coarse Aggregate (20mm)', 'CuM'),
    ('Coarse Aggregate (10mm)', 'CuM'),
    ('HDPE Pipes (160mm - 400mm)', 'Rmt'),
    ('DWC Corrugated Pipes', 'Rmt'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _receivedQtyController.dispose();
    _consumedQtyController.dispose();
    _contractorRepController.dispose();
    _ueedRepController.dispose();
    _remarksController.dispose();
    _receivedFocus.dispose();
    _consumedFocus.dispose();
    _contractorFocus.dispose();
    _ueedFocus.dispose();
    _remarksFocus.dispose();
    super.dispose();
  }

  /// A quantity field: blank is allowed, anything present must be a number
  /// that is not negative.
  ///
  /// Blank is allowed because a delivery with no consumption is a normal day,
  /// and vice versa. "At least one of them" is checked separately.
  String? _validateQuantity(String? raw) {
    final text = raw?.trim() ?? '';
    if (text.isEmpty) return null;
    final value = double.tryParse(text);
    if (value == null) return 'Enter a number, e.g. 250 or 12.5';
    if (value < 0) return 'A quantity cannot be negative';
    return null;
  }

  Future<void> _handleSubmit() async {
    final received = double.tryParse(_receivedQtyController.text.trim()) ?? 0;
    final consumed = double.tryParse(_consumedQtyController.text.trim()) ?? 0;

    setState(() {
      _quantityPairError = received == 0 && consumed == 0
          ? 'Record at least one quantity — received, consumed, or both.'
          : null;
    });

    // Field rules first, then the pair rule. Running the form validator also
    // scrolls the first offending field into view and puts its message under
    // it, which is the whole reason the checks moved out of a SnackBar.
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_quantityPairError != null) return;

    final payload = {
      'date': DateFormatters.toApiDate(DateTime.now()),
      'material': _selectedMaterial,
      'unit': _selectedUnit,
      'receivedQty': received,
      'consumedQty': consumed,
      'contractorRep': _contractorRepController.text.trim(),
      'ueedRep': _ueedRepController.text.trim(),
      'remarks': _remarksController.text.trim(),
    };

    final success =
        await ref.read(materialsProvider.notifier).createRecord(payload);
    if (!success || !mounted) return;

    _receivedQtyController.clear();
    _consumedQtyController.clear();
    _remarksController.clear();
    // The reps usually stay the same across a day's deliveries, so they are
    // deliberately not cleared.
    _formKey.currentState?.reset();
    _tabController.animateTo(1);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(materialsProvider);
    final notifier = ref.read(materialsProvider.notifier);
    final canManage =
        ref.watch(currentUserProvider)?.canManageFieldOperations == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Material Register'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'New entry'),
            Tab(text: 'Register'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _entryTab(state, canManage),
          _registerTab(state, notifier),
        ],
      ),
    );
  }

  Widget _entryTab(MaterialsState state, bool canManage) {
    final theme = Theme.of(context);
    final status = context.status;

    return Form(
      key: _formKey,
      child: ListView(
        padding: EdgeInsets.fromLTRB(
          Space.gutter,
          Space.lg,
          Space.gutter,
          // Clear the keyboard, so the submit button at the foot of the form
          // is reachable while a field is focused rather than sitting under it.
          Space.giant + MediaQuery.viewInsetsOf(context).bottom,
        ),
        children: [
          if (!canManage) ...[
            _Note(
              icon: Icons.lock_outline,
              tone: status.warning,
              text: 'You have read-only access to material records.',
            ),
            const SizedBox(height: Space.lg),
          ],

          _Note(
            icon: Icons.verified_outlined,
            tone: theme.colorScheme.primary,
            text: 'Tender Clause 55: daily record of material receipt, '
                'consumption and balance, verified with UEED.',
          ),

          const SizedBox(height: Space.xl),
          // A dropdown, not a chip per material. Seven chips wrapped to seven
          // rows on a phone and pushed the quantity fields — the only part of
          // this form anyone types into — below the fold. The material is
          // picked once per entry from a list the storekeeper knows by heart,
          // which is what a select is for.
          Text('Material', style: theme.textTheme.titleSmall),
          const SizedBox(height: Space.sm),
          DropdownButtonFormField<String>(
            initialValue: _selectedMaterial,
            isExpanded: true,
            items: [
              for (final (name, _) in _materials)
                DropdownMenuItem(value: name, child: Text(name)),
            ],
            onChanged: canManage
                ? (name) {
                    if (name == null) return;
                    final match = _materials.firstWhere((m) => m.$1 == name);
                    setState(() {
                      _selectedMaterial = match.$1;
                      _selectedUnit = match.$2;
                    });
                  }
                : null,
          ),

          const SizedBox(height: Space.xl),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: KiplTextField(
                  controller: _receivedQtyController,
                  focusNode: _receivedFocus,
                  label: 'Received ($_selectedUnit)',
                  hint: '0',
                  enabled: canManage,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  textInputAction: TextInputAction.next,
                  onSubmitted: (_) => _consumedFocus.requestFocus(),
                  validator: _validateQuantity,
                ),
              ),
              const SizedBox(width: Space.md),
              Expanded(
                child: KiplTextField(
                  controller: _consumedQtyController,
                  focusNode: _consumedFocus,
                  label: 'Consumed ($_selectedUnit)',
                  hint: '0',
                  enabled: canManage,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  textInputAction: TextInputAction.next,
                  onSubmitted: (_) => _contractorFocus.requestFocus(),
                  validator: _validateQuantity,
                ),
              ),
            ],
          ),

          if (_quantityPairError != null) ...[
            const SizedBox(height: Space.sm),
            Text(
              _quantityPairError!,
              style: theme.textTheme.labelSmall?.copyWith(color: status.danger),
            ),
          ],

          const SizedBox(height: Space.lg),
          KiplTextField(
            controller: _contractorRepController,
            focusNode: _contractorFocus,
            label: 'KIPL representative',
            hint: 'e.g. Shahid Khan (Site Engineer)',
            enabled: canManage,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
            onSubmitted: (_) => _ueedFocus.requestFocus(),
          ),

          const SizedBox(height: Space.lg),
          KiplTextField(
            controller: _ueedRepController,
            focusNode: _ueedFocus,
            label: 'UEED / LCMA representative',
            hint: 'e.g. AEE / JE in-charge',
            enabled: canManage,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
            onSubmitted: (_) => _remarksFocus.requestFocus(),
          ),

          const SizedBox(height: Space.lg),
          KiplTextField(
            controller: _remarksController,
            focusNode: _remarksFocus,
            label: 'Challan, vehicle and remarks',
            hint: 'e.g. Challan 9821, JK01-1234, mill test certificate seen',
            enabled: canManage,
            maxLines: 2,
            textCapitalization: TextCapitalization.sentences,
          ),

          if (state.message != null) ...[
            const SizedBox(height: Space.lg),
            _Note(
              icon: Icons.check_circle_outline,
              tone: status.success,
              text: state.message!,
            ),
          ],
          if (state.error != null) ...[
            const SizedBox(height: Space.lg),
            _Note(
              icon: Icons.error_outline,
              tone: status.danger,
              text: state.error!,
            ),
          ],

          const SizedBox(height: Space.xxl),
          SizedBox(
            height: Sizes.control,
            child: FilledButton.icon(
              onPressed:
                  canManage && !state.isSubmitting ? _handleSubmit : null,
              icon: state.isSubmitting
                  ? const SizedBox(
                      width: Sizes.icon,
                      height: Sizes.icon,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.save_outlined),
              label: const Text('Save register entry'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _registerTab(MaterialsState state, MaterialsNotifier notifier) {
    if (state.isLoading && state.records.isEmpty) {
      return const LoadingState(message: 'Loading the register…');
    }

    if (state.records.isEmpty) {
      if (state.error != null) {
        return ErrorState(
          message: state.error!,
          onRetry: notifier.fetchMaterials,
        );
      }
      return RefreshIndicator(
        onRefresh: notifier.fetchMaterials,
        child: LayoutBuilder(
          builder: (context, constraints) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: EmptyState(
                  icon: Icons.inventory_2_outlined,
                  title: 'Nothing in the register yet',
                  message: 'Every delivery and consumption recorded on the New '
                      'entry tab appears here, newest first.',
                  actionLabel: 'Add the first entry',
                  onAction: () => _tabController.animateTo(0),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: notifier.fetchMaterials,
      child: ListView.separated(
        padding: const EdgeInsets.only(bottom: Space.huge),
        itemCount: state.records.length,
        separatorBuilder: (_, __) =>
            const Divider(indent: Space.gutter, endIndent: Space.gutter),
        itemBuilder: (context, i) => _RegisterRow(record: state.records[i]),
      ),
    );
  }
}

/// One day's movement for one material.
///
/// Balance is the figure a storekeeper is actually looking for, so it is the
/// one that gets weight; received and consumed are the arithmetic behind it.
class _RegisterRow extends StatelessWidget {
  const _RegisterRow({required this.record});

  final MaterialRecord record;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;
    final unit = record.unit ?? '';

    final rep = [
      if (record.contractorRep?.isNotEmpty == true)
        'KIPL ${record.contractorRep}',
      if (record.ueedRep?.isNotEmpty == true) 'UEED ${record.ueedRep}',
    ].join(' · ');

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
                  record.material,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall,
                ),
              ),
              const SizedBox(width: Space.sm),
              Text(
                DateFormatters.formatIndian(DateTime.tryParse(record.date)),
                style: theme.textTheme.labelMedium,
              ),
            ],
          ),
          const SizedBox(height: Space.sm),
          Wrap(
            spacing: Space.md,
            runSpacing: Space.xs,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                'Balance ${record.balanceQty >= 0 ? '+' : ''}'
                '${record.balanceQty} $unit',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: record.balanceQty < 0
                      ? status.danger
                      : theme.colorScheme.primary,
                ),
              ),
              if (record.receivedQty > 0)
                Text(
                  'in ${record.receivedQty} $unit',
                  style: theme.textTheme.labelMedium
                      ?.copyWith(color: status.success),
                ),
              if (record.consumedQty > 0)
                Text(
                  'out ${record.consumedQty} $unit',
                  style: theme.textTheme.labelMedium
                      ?.copyWith(color: status.warning),
                ),
            ],
          ),
          if (rep.isNotEmpty) ...[
            const SizedBox(height: Space.xs),
            Text(rep, style: theme.textTheme.labelMedium),
          ],
          if (record.remarks?.isNotEmpty == true) ...[
            const SizedBox(height: Space.xs),
            Text(
              record.remarks!,
              style: theme.textTheme.bodySmall,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

/// A tinted line of context or feedback.
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
