import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_provider.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/status_pill.dart';
import '../fleet_provider.dart';

/// The plant and fleet logbook — what ran today, for how long, on how much
/// diesel, and whether it broke down.
///
/// The form carried five rules and enforced all of them with a SnackBar after
/// the submit button was pressed: a missing machine, a missing operator, a
/// closing reading below the start, negative fuel, and a breakdown with no
/// description. Each one meant tapping submit, reading a message that covers
/// the bottom of the screen for four seconds, and hunting for the field it
/// meant. They are validators now, so the message sits under the field it is
/// about and the form scrolls there on its own.
///
/// The Plant / Vehicle switch was two InkWells labelled "🚜 Plant & Machinery"
/// and "🚐 Site Vehicle". Emoji are not interface icons — they render
/// differently on every Android skin, they are read aloud as "tractor" by a
/// screen reader, and they do not inherit a text colour. It is a
/// SegmentedButton now, which is the Material 3 control this was imitating.
class FleetScreen extends ConsumerStatefulWidget {
  const FleetScreen({super.key});

  @override
  ConsumerState<FleetScreen> createState() => _FleetScreenState();
}

class _FleetScreenState extends ConsumerState<FleetScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  final _formKey = GlobalKey<FormState>();

  /// 'plant' or 'vehicle'. Every label on this form switches on it.
  String _logType = 'plant';
  String? _selectedMachineId;
  String? _selectedMachineType;

  final _operatorController = TextEditingController();
  final _manualIdController = TextEditingController();
  final _hourStartController = TextEditingController();
  final _hourCloseController = TextEditingController();
  final _fuelController = TextEditingController();
  final _workZoneController = TextEditingController();
  final _workDescController = TextEditingController();
  final _breakdownDetailsController = TextEditingController();

  final _manualIdFocus = FocusNode();
  final _operatorFocus = FocusNode();
  final _hourStartFocus = FocusNode();
  final _hourCloseFocus = FocusNode();
  final _fuelFocus = FocusNode();
  final _workZoneFocus = FocusNode();
  final _workDescFocus = FocusNode();

  bool _breakdown = false;

  bool get _isPlant => _logType == 'plant';

  /// Closing minus start, when both are readable and the pair makes sense.
  double get _netRun {
    final start = double.tryParse(_hourStartController.text.trim());
    final close = double.tryParse(_hourCloseController.text.trim());
    if (start == null || close == null || close < start) return 0;
    return double.parse((close - start).toStringAsFixed(1));
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    for (final c in [
      _operatorController,
      _manualIdController,
      _hourStartController,
      _hourCloseController,
      _fuelController,
      _workZoneController,
      _workDescController,
      _breakdownDetailsController,
    ]) {
      c.dispose();
    }
    for (final f in [
      _manualIdFocus,
      _operatorFocus,
      _hourStartFocus,
      _hourCloseFocus,
      _fuelFocus,
      _workZoneFocus,
      _workDescFocus,
    ]) {
      f.dispose();
    }
    super.dispose();
  }

  void _onMachineSelected(MachineSummary machine) {
    setState(() {
      _selectedMachineId = machine.machineId;
      _selectedMachineType = machine.machineType;
      _manualIdController.text = machine.machineId;
      // Roll the previous day's closing reading forward. A meter does not
      // reset overnight, and re-typing it is how transposition errors get into
      // a plant log that is billed against.
      _hourStartController.text =
          machine.lastReading > 0 ? machine.lastReading.toStringAsFixed(1) : '';
    });
  }

  void _switchLogType(String type) {
    if (_logType == type) return;
    setState(() {
      _logType = type;
      _selectedMachineId = null;
      _selectedMachineType = null;
      _manualIdController.clear();
      _operatorController.clear();
      _hourStartController.clear();
      _hourCloseController.clear();
      _breakdown = false;
      _breakdownDetailsController.clear();
    });
    // The two modes have different rules; anything the old ones flagged is no
    // longer about the form in front of them.
    _formKey.currentState?.reset();
  }

  // ------------------------------------------------------------ validation

  String? _required(String? v, String what) =>
      (v?.trim().isEmpty ?? true) ? 'Enter the $what' : null;

  String? _validateStart(String? raw) {
    final text = raw?.trim() ?? '';
    if (text.isEmpty) return 'Enter the starting reading';
    final value = double.tryParse(text);
    if (value == null) return 'Enter a number, e.g. 1240.5';
    if (value < 0) return 'A reading cannot be negative';
    return null;
  }

  String? _validateClose(String? raw) {
    final text = raw?.trim() ?? '';
    if (text.isEmpty) return 'Enter the closing reading';
    final value = double.tryParse(text);
    if (value == null) return 'Enter a number, e.g. 1248.0';

    final start = double.tryParse(_hourStartController.text.trim());
    // A meter only counts up. A closing reading below the start is either a
    // typo or a reading taken off the wrong machine, and either way it would
    // post negative hours against the plant register.
    if (start != null && value < start) {
      return _isPlant
          ? 'Closing hours cannot be below the start'
          : 'End odometer cannot be below the start';
    }
    return null;
  }

  String? _validateFuel(String? raw) {
    final text = raw?.trim() ?? '';
    if (text.isEmpty) return null;
    final value = double.tryParse(text);
    if (value == null) return 'Enter a number, e.g. 45';
    if (value < 0) return 'Fuel issued cannot be negative';
    return null;
  }

  Future<void> _handleSubmit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final start = double.tryParse(_hourStartController.text.trim());
    final close = double.tryParse(_hourCloseController.text.trim());
    final fuel = double.tryParse(_fuelController.text.trim());
    final net = _netRun;

    final payload = <String, dynamic>{
      'logType': _logType,
      'date': DateFormatters.toApiDate(DateTime.now()),
      if (_isPlant) ...{
        'machineId': _selectedMachineId,
        'machineType': _selectedMachineType ?? 'Plant',
        'operator': _operatorController.text.trim(),
        'hourStart': start,
        'hourClose': close,
        'hoursWorked': net > 0 ? net : null,
        'workZone': _workZoneController.text.trim(),
        'workDescription': _workDescController.text.trim(),
      } else ...{
        'vehicle': _selectedMachineId ?? 'Site Vehicle',
        'driver': _operatorController.text.trim(),
        'meterStart': start,
        'meterEnd': close,
        'purpose': _workDescController.text.trim(),
        'fromLocation': _workZoneController.text.trim(),
      },
      'fuelLitres': fuel,
      'breakdown': _breakdown,
      'breakdownDetails':
          _breakdown ? _breakdownDetailsController.text.trim() : null,
    };

    final success = await ref.read(fleetProvider.notifier).submitLog(payload);
    if (!success || !mounted) return;

    _hourCloseController.clear();
    _fuelController.clear();
    _workDescController.clear();
    _breakdownDetailsController.clear();
    setState(() => _breakdown = false);
    _formKey.currentState?.reset();
    _tabController.animateTo(1);
  }

  // ----------------------------------------------------------------- build

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(fleetProvider);
    final notifier = ref.read(fleetProvider.notifier);
    final canManage =
        ref.watch(currentUserProvider)?.canManageFieldOperations == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Plant & Fleet Logbook'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'New log'),
            Tab(text: 'Recent'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _formTab(state, canManage),
          _historyTab(state, notifier),
        ],
      ),
    );
  }

  Widget _formTab(FleetState state, bool canManage) {
    final theme = Theme.of(context);
    final status = context.status;
    final net = _netRun;

    return Form(
      key: _formKey,
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
              text: 'You have read-only access to fleet records.',
            ),
            const SizedBox(height: Space.lg),
          ],

          // SegmentedButton, not two InkWells labelled with emoji.
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(
                value: 'plant',
                label: Text('Plant'),
                icon: Icon(Icons.agriculture_outlined),
              ),
              ButtonSegment(
                value: 'vehicle',
                label: Text('Vehicle'),
                icon: Icon(Icons.local_shipping_outlined),
              ),
            ],
            selected: {_logType},
            onSelectionChanged:
                canManage ? (s) => _switchLogType(s.first) : null,
            showSelectedIcon: false,
          ),

          if (_isPlant && state.machines.isNotEmpty) ...[
            const SizedBox(height: Space.xl),
            Text('Machine', style: theme.textTheme.titleSmall),
            const SizedBox(height: Space.xs),
            Text(
              'Picking one rolls its last closing reading into the start.',
              style: theme.textTheme.labelMedium,
            ),
            const SizedBox(height: Space.sm),
            // No fixed height: the old row was a SizedBox(height: 64), which
            // clipped its second line the moment the system font grew.
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final m in state.machines) ...[
                    ChoiceChip(
                      selected: _selectedMachineId == m.machineId,
                      onSelected:
                          canManage ? (_) => _onMachineSelected(m) : null,
                      label: Text(
                        m.lastReading > 0
                            ? '${m.machineId}  ${m.lastReading.toStringAsFixed(1)}h'
                            : m.machineId,
                      ),
                    ),
                    if (m != state.machines.last)
                      const SizedBox(width: Space.sm),
                  ],
                ],
              ),
            ),
          ],

          const SizedBox(height: Space.xl),
          KiplTextField(
            controller: _manualIdController,
            focusNode: _manualIdFocus,
            label: _isPlant ? 'Machine ID' : 'Vehicle registration',
            hint: _isPlant ? 'e.g. EX-01, BP-01' : 'e.g. JK01-AB-1234',
            enabled: canManage,
            textCapitalization: TextCapitalization.characters,
            textInputAction: TextInputAction.next,
            onSubmitted: (_) => _operatorFocus.requestFocus(),
            onChanged: (v) => _selectedMachineId = v.trim(),
            validator: (v) =>
                _required(v, _isPlant ? 'machine ID' : 'vehicle registration'),
          ),

          const SizedBox(height: Space.lg),
          KiplTextField(
            controller: _operatorController,
            focusNode: _operatorFocus,
            label: _isPlant ? 'Operator' : 'Driver',
            hint: 'e.g. Ghulam Nabi',
            enabled: canManage,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
            onSubmitted: (_) => _hourStartFocus.requestFocus(),
            validator: (v) =>
                _required(v, _isPlant ? 'operator name' : 'driver name'),
          ),

          const SizedBox(height: Space.lg),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: KiplTextField(
                  controller: _hourStartController,
                  focusNode: _hourStartFocus,
                  label: _isPlant ? 'Start (h)' : 'Start (km)',
                  hint: '0.0',
                  enabled: canManage,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  textInputAction: TextInputAction.next,
                  onSubmitted: (_) => _hourCloseFocus.requestFocus(),
                  onChanged: (_) => setState(() {}),
                  validator: _validateStart,
                ),
              ),
              const SizedBox(width: Space.md),
              Expanded(
                child: KiplTextField(
                  controller: _hourCloseController,
                  focusNode: _hourCloseFocus,
                  label: _isPlant ? 'Close (h)' : 'End (km)',
                  hint: '0.0',
                  enabled: canManage,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  textInputAction: TextInputAction.next,
                  onSubmitted: (_) => _fuelFocus.requestFocus(),
                  onChanged: (_) => setState(() {}),
                  validator: _validateClose,
                ),
              ),
            ],
          ),

          // The figure the log is actually for, computed as they type.
          if (net > 0) ...[
            const SizedBox(height: Space.md),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: Space.md,
                vertical: Space.sm,
              ),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: Radii.controlAll,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _isPlant ? 'Hours worked' : 'Distance run',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  Text(
                    _isPlant ? '$net h' : '$net km',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: Space.lg),
          KiplTextField(
            controller: _fuelController,
            focusNode: _fuelFocus,
            label: 'Diesel issued (litres)',
            helper: 'Leave blank if none was issued',
            hint: 'e.g. 45',
            enabled: canManage,
            prefixIcon: Icons.local_gas_station_outlined,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textInputAction: TextInputAction.next,
            onSubmitted: (_) => _workZoneFocus.requestFocus(),
            validator: _validateFuel,
          ),

          const SizedBox(height: Space.lg),
          KiplTextField(
            controller: _workZoneController,
            focusNode: _workZoneFocus,
            label: _isPlant ? 'Work zone' : 'Route',
            hint: _isPlant
                ? 'e.g. Aeration Tank, Zone 2 trench'
                : 'e.g. Nishat STP to UEED office',
            enabled: canManage,
            textCapitalization: TextCapitalization.sentences,
            textInputAction: TextInputAction.next,
            onSubmitted: (_) => _workDescFocus.requestFocus(),
          ),

          const SizedBox(height: Space.lg),
          KiplTextField(
            controller: _workDescController,
            focusNode: _workDescFocus,
            label: _isPlant ? 'Work done' : 'Purpose',
            hint: _isPlant
                ? 'e.g. Earthwork excavation for chamber 14'
                : 'e.g. Collected mill test certificates',
            enabled: canManage,
            maxLines: 2,
            textCapitalization: TextCapitalization.sentences,
          ),

          const SizedBox(height: Space.lg),
          SwitchListTile(
            value: _breakdown,
            onChanged: canManage
                ? (v) => setState(() {
                      _breakdown = v;
                      if (!v) _breakdownDetailsController.clear();
                    })
                : null,
            contentPadding: EdgeInsets.zero,
            title: Text(
              _isPlant ? 'Machine broke down' : 'Vehicle broke down',
              style: theme.textTheme.bodyMedium,
            ),
            subtitle: Text(
              'Downtime is deducted from the billable hours',
              style: theme.textTheme.labelMedium,
            ),
            secondary: Icon(
              Icons.warning_amber_rounded,
              color: _breakdown ? status.warning : theme.colorScheme.outline,
            ),
          ),

          if (_breakdown) ...[
            const SizedBox(height: Space.sm),
            KiplTextField(
              controller: _breakdownDetailsController,
              label: 'What happened, and for how long',
              hint: 'e.g. Hydraulic hose leak, 2.5h down, repaired on site',
              enabled: canManage,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              // Only required while the switch is on — a validator on a field
              // that is not on screen would block every other submission.
              validator: (v) => (v?.trim().isEmpty ?? true)
                  ? 'Describe the breakdown and its downtime'
                  : null,
            ),
          ],

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
                  : const Icon(Icons.check_circle_outline),
              label: const Text('Submit log'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _historyTab(FleetState state, FleetNotifier notifier) {
    if (state.isLoading && state.recentLogs.isEmpty) {
      return const LoadingState(message: 'Loading recent logs…');
    }

    if (state.recentLogs.isEmpty) {
      if (state.error != null) {
        return ErrorState(message: state.error!, onRetry: notifier.init);
      }
      return RefreshIndicator(
        onRefresh: notifier.init,
        child: LayoutBuilder(
          builder: (context, constraints) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: EmptyState(
                  icon: Icons.agriculture_outlined,
                  title: 'No logs yet',
                  message: 'Every plant and vehicle log submitted on the New '
                      'log tab appears here, newest first.',
                  actionLabel: 'Record the first log',
                  onAction: () => _tabController.animateTo(0),
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
        itemCount: state.recentLogs.length,
        separatorBuilder: (_, __) =>
            const Divider(indent: Space.gutter, endIndent: Space.gutter),
        itemBuilder: (context, i) => _LogRow(log: state.recentLogs[i]),
      ),
    );
  }
}

/// One machine or vehicle, one day.
class _LogRow extends StatelessWidget {
  const _LogRow({required this.log});

  final FleetLogItem log;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;
    final isPlant = log.logType == 'plant';

    final title = isPlant
        ? '${log.machineId ?? 'Plant'}'
            '${log.machineType == null ? '' : ' · ${log.machineType}'}'
        : (log.vehicle ?? 'Site vehicle');
    final where = isPlant ? log.workZone : log.fromLocation;
    final what = isPlant ? log.workDescription : log.purpose;
    final who = log.operator ?? log.driver;

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
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall,
                ),
              ),
              const SizedBox(width: Space.sm),
              Text(
                DateFormatters.formatIndian(DateTime.tryParse(log.date)),
                style: theme.textTheme.labelMedium,
              ),
            ],
          ),
          const SizedBox(height: Space.sm),

          // The run, the fuel, and whether it failed — the three numbers this
          // log exists to carry.
          Wrap(
            spacing: Space.md,
            runSpacing: Space.xs,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (log.hoursWorked != null)
                Text(
                  '${log.hoursWorked} h',
                  style: theme.textTheme.titleSmall
                      ?.copyWith(color: theme.colorScheme.primary),
                ),
              if (log.distanceKm != null)
                Text(
                  '${log.distanceKm} km',
                  style: theme.textTheme.titleSmall
                      ?.copyWith(color: theme.colorScheme.primary),
                ),
              if ((log.fuelLitres ?? 0) > 0)
                Text(
                  '${log.fuelLitres} L diesel',
                  style: theme.textTheme.labelMedium
                      ?.copyWith(color: status.warning),
                ),
              if (who?.isNotEmpty == true)
                Text(who!, style: theme.textTheme.labelMedium),
              if (log.breakdown)
                const StatusPill(
                  label: 'BREAKDOWN',
                  type: StatusPillType.error,
                ),
            ],
          ),

          if (where?.isNotEmpty == true || what?.isNotEmpty == true) ...[
            const SizedBox(height: Space.xs),
            Text(
              [
                if (where?.isNotEmpty == true) where!,
                if (what?.isNotEmpty == true) what!,
              ].join(' — '),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall,
            ),
          ],

          if (log.breakdown && log.breakdownDetails?.isNotEmpty == true) ...[
            const SizedBox(height: Space.xs),
            Text(
              log.breakdownDetails!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(color: status.danger),
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
