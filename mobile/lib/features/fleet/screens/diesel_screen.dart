import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_provider.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/state_views.dart';
import '../diesel_provider.dart';
import '../widgets/diesel_visuals.dart';

/// The site's diesel register on the phone: issue to a machine at the tank,
/// enter a purchase, and see what is left.
///
/// It replaces the Diesel_Log spreadsheet. The spreadsheet kept a running
/// balance with hand-written formulas that changed meaning half-way down,
/// named machines and operators in one free-text column ("Yasir JCB",
/// "JCB Yasir"), and never asked for the hour meter, so nobody could say
/// whether 400 litres in three days was work or leakage. Here the machine is
/// picked, the operator is separate, the meter is asked for every time, and
/// the balance is worked out by the server.
class DieselScreen extends ConsumerStatefulWidget {
  const DieselScreen({super.key});

  @override
  ConsumerState<DieselScreen> createState() => _DieselScreenState();
}

class _DieselScreenState extends ConsumerState<DieselScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  final _formKey = GlobalKey<FormState>();

  /// 'issue' or 'receipt'.
  String _kind = 'issue';
  String? _machineId;
  DateTime _date = DateTime.now();
  bool _noMeter = false;

  final _litres = TextEditingController();
  final _operator = TextEditingController();
  final _meter = TextEditingController();
  final _rate = TextEditingController();
  final _amount = TextEditingController();
  final _supplier = TextEditingController();
  final _billNo = TextEditingController();
  final _remarks = TextEditingController();

  @override
  void dispose() {
    _tabs.dispose();
    for (final c in [_litres, _operator, _meter, _rate, _amount, _supplier, _billNo, _remarks]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _isIssue => _kind == 'issue';

  /// A purchase is from the usual pump at its price, unless changed: fill
  /// both in so the bill works itself out.
  void _fillFromPump() {
    final pump = ref.read(dieselProvider).pump;
    if (pump == null) return;
    if (_supplier.text.trim().isEmpty) _supplier.text = pump.supplierName;
    if (_rate.text.trim().isEmpty && pump.rate != null) {
      final r = pump.rate!;
      _rate.text = r == r.roundToDouble() ? r.toStringAsFixed(0) : r.toStringAsFixed(2);
    }
  }

  void _pickMachine(FuelMachine m) => setState(() {
        _machineId = m.id;
        _operator.text = m.operator ?? '';
      });

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(now.year - 1),
      lastDate: now,
    );
    if (picked != null) setState(() => _date = picked);
  }

  String? _positive(String? v, String what) {
    final n = double.tryParse((v ?? '').trim());
    if (n == null || n <= 0) return 'Enter the $what';
    return null;
  }

  String? _optionalNumber(String? v) {
    if ((v ?? '').trim().isEmpty) return null;
    final n = double.tryParse(v!.trim());
    return n == null || n < 0 ? 'Enter a number' : null;
  }

  double? _num(TextEditingController c) => double.tryParse(c.text.trim());
  String? _text(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  Future<void> _submit() async {
    if (_isIssue && _machineId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pick the machine the diesel went into.')));
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    final machine = ref.read(dieselProvider).machine(_machineId);
    final ok = await ref.read(dieselProvider.notifier).submit({
      'entryType': _kind,
      'date': DateFormatters.toApiDate(_date),
      'litres': _num(_litres),
      'fuelType': _isIssue ? machine?.fuelType ?? 'diesel' : 'diesel',
      'remarks': _text(_remarks),
      if (_isIssue) ...{
        'machineId': _machineId,
        'operator': _text(_operator),
        'meterReading': _noMeter ? null : _num(_meter),
      } else ...{
        'rate': _num(_rate),
        'amount': _num(_amount),
        'supplier': _text(_supplier),
        'billNo': _text(_billNo),
      },
    });
    if (!ok || !mounted) return;
    setState(() {
      for (final c in [_litres, _meter, _rate, _amount, _supplier, _billNo, _remarks]) {
        c.clear();
      }
      _noMeter = false;
      if (!_isIssue) _fillFromPump();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dieselProvider);
    final canRecord =
        ref.watch(currentUserProvider)?.canManageFieldOperations == true;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Diesel register'),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [Tab(text: 'Record'), Tab(text: 'Stock')],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [_recordTab(state, canRecord), _stockTab(state)],
      ),
    );
  }

  Widget _recordTab(DieselState state, bool canRecord) {
    final theme = Theme.of(context);
    final status = context.status;
    final machine = state.machine(_machineId);
    final active = state.machines.where((m) => m.active).toList();

    return Form(
      key: _formKey,
      child: ListView(
        padding: EdgeInsets.fromLTRB(Space.gutter, Space.lg, Space.gutter,
            Space.giant + MediaQuery.viewInsetsOf(context).bottom),
        children: [
          DieselStockBanner(state: state),
          const SizedBox(height: Space.lg),
          if (!canRecord) ...[
            _Note(
              icon: Icons.lock_outline,
              tone: status.warning,
              text: 'You can see the register, but only supervisors, '
                  'engineers and managers record diesel.',
            ),
            const SizedBox(height: Space.lg),
          ],
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(
                value: 'issue',
                label: Text('Issue'),
                icon: Icon(Icons.local_gas_station_outlined),
              ),
              ButtonSegment(
                value: 'receipt',
                label: Text('Purchase'),
                icon: Icon(Icons.shopping_cart_outlined),
              ),
            ],
            selected: {_kind},
            onSelectionChanged: canRecord
                ? (s) => setState(() {
                      _kind = s.first;
                      if (!_isIssue) _fillFromPump();
                    })
                : null,
            showSelectedIcon: false,
          ),
          if (_isIssue) ...[
            const SizedBox(height: Space.xl),
            Text('Machine', style: theme.textTheme.titleSmall),
            const SizedBox(height: Space.sm),
            if (active.isEmpty && !state.isLoading)
              Text('No machines are set up yet. A manager adds them on the '
                  'website, under Fleet & Plant, Diesel register.',
                  style: theme.textTheme.bodySmall),
            Wrap(
              spacing: Space.sm,
              runSpacing: Space.sm,
              children: [
                for (final m in active)
                  ChoiceChip(
                    selected: _machineId == m.id,
                    onSelected: canRecord ? (_) => _pickMachine(m) : null,
                    label: Text(m.name),
                  ),
              ],
            ),
            if (machine != null) ...[
              const SizedBox(height: Space.xs),
              Text(machine.subtitle, style: theme.textTheme.labelMedium),
            ],
          ],
          const SizedBox(height: Space.lg),
          // Keyed, like every field below: picking a machine or switching to a
          // purchase adds and removes lines above them, and an unkeyed field
          // would inherit the state of whichever field used to sit in its slot
          // (the Litres box showed the Operator box's "edited" flag and
          // flagged itself empty before anything was typed).
          _DateRow(key: const ValueKey('date'), date: _date, enabled: canRecord, onTap: _pickDate),
          const SizedBox(height: Space.lg),
          KiplTextField(
            key: const ValueKey('litres'),
            controller: _litres,
            label: 'Litres',
            hint: 'e.g. 200',
            enabled: canRecord,
            prefixIcon: Icons.water_drop_outlined,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textInputAction: TextInputAction.next,
            validator: (v) => _positive(v, 'litres'),
          ),
          if (_isIssue) ...[
            const SizedBox(height: Space.lg),
            KiplTextField(
              key: const ValueKey('operator'),
              controller: _operator,
              label: 'Operator',
              hint: machine?.operator ?? 'Who took the diesel',
              enabled: canRecord,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: Space.lg),
            KiplTextField(
              key: const ValueKey('meter'),
              controller: _meter,
              label: machine?.usesKm == true ? 'Odometer (km)' : 'Hour meter (hours)',
              helper: 'The reading when the diesel went in',
              hint: 'e.g. 6935.2',
              enabled: canRecord && !_noMeter,
              prefixIcon: Icons.speed_outlined,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                if (_noMeter) return null;
                if ((v ?? '').trim().isEmpty) return 'Enter the meter reading, or tick "Meter not read"';
                return _optionalNumber(v);
              },
            ),
            SwitchListTile(
              key: const ValueKey('noMeter'),
              contentPadding: EdgeInsets.zero,
              title: const Text('Meter not read'),
              subtitle: const Text('Say why in the remarks'),
              value: _noMeter,
              onChanged: canRecord ? (v) => setState(() => _noMeter = v) : null,
            ),
            if (machine?.hired == true)
              _Note(
                icon: Icons.handshake_outlined,
                tone: status.warning,
                text: '${machine!.name} is hired from ${machine.ownerName}. '
                    'This diesel is listed against their machines, to check '
                    'against their bill.',
              ),
          ] else ...[
            const SizedBox(height: Space.lg),
            KiplTextField(
              key: const ValueKey('rate'),
              controller: _rate,
              label: 'Rate (₹ per litre)',
              hint: 'e.g. 92.50',
              enabled: canRecord,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: _optionalNumber,
            ),
            const SizedBox(height: Space.lg),
            KiplTextField(
              key: const ValueKey('amount'),
              controller: _amount,
              label: 'Bill amount (₹)',
              helper: 'Leave blank to work it out from the rate',
              enabled: canRecord,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: _optionalNumber,
            ),
            const SizedBox(height: Space.lg),
            KiplTextField(
              key: const ValueKey('supplier'),
              controller: _supplier,
              label: 'Pump or supplier',
              helper: state.pump == null
                  ? null
                  : 'Paid from the pump advance: ${rupeesLabel(state.pump!.balance)} left',
              enabled: canRecord,
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: Space.lg),
            KiplTextField(
              key: const ValueKey('billNo'),
              controller: _billNo,
              label: 'Bill number',
              enabled: canRecord,
            ),
          ],
          const SizedBox(height: Space.lg),
          KiplTextField(
            key: const ValueKey('remarks'),
            controller: _remarks,
            label: _isIssue && _noMeter ? 'Why the meter was not read' : 'Remarks',
            enabled: canRecord,
            maxLines: 2,
            textCapitalization: TextCapitalization.sentences,
            validator: (v) => _isIssue && _noMeter && (v ?? '').trim().isEmpty
                ? 'Say why the meter was not read'
                : null,
          ),
          if (state.message != null) ...[
            const SizedBox(height: Space.lg),
            _Note(icon: Icons.check_circle_outline, tone: status.success, text: state.message!),
          ],
          if (state.error != null) ...[
            const SizedBox(height: Space.lg),
            _Note(icon: Icons.error_outline, tone: status.danger, text: state.error!),
          ],
          const SizedBox(height: Space.xxl),
          SizedBox(
            height: Sizes.control,
            child: FilledButton.icon(
              onPressed: canRecord && !state.isSubmitting ? _submit : null,
              icon: state.isSubmitting
                  ? const SizedBox(
                      width: Sizes.icon,
                      height: Sizes.icon,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.check_circle_outline),
              label: Text(_isIssue ? 'Save issue' : 'Save purchase'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stockTab(DieselState state) {
    final notifier = ref.read(dieselProvider.notifier);
    final theme = Theme.of(context);
    final status = context.status;
    if (state.isLoading && state.entries.isEmpty && state.machines.isEmpty) {
      return const LoadingState(message: 'Loading the diesel register…');
    }
    if (state.error != null && state.entries.isEmpty && state.machines.isEmpty) {
      return ErrorState(message: state.error!, onRetry: notifier.init);
    }
    return RefreshIndicator(
      onRefresh: notifier.init,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(Space.gutter, Space.lg, Space.gutter, Space.huge),
        children: [
          DieselStockHero(state: state),
          for (final w in state.warnings) ...[
            const SizedBox(height: Space.md),
            _Note(icon: Icons.warning_amber_rounded, tone: status.warning, text: w),
          ],
          for (final f in state.hiredByFirm.entries) ...[
            const SizedBox(height: Space.md),
            _Note(
              icon: Icons.handshake_outlined,
              tone: status.neutral,
              text: '${litresLabel(f.value)} went into ${f.key}\'s machines this '
                  'month. Check it against their bill.',
            ),
          ],
          if (state.pump != null) ...[
            const SizedBox(height: Space.xl),
            Text('Pump account', style: theme.textTheme.titleSmall),
            const SizedBox(height: Space.sm),
            PumpCard(pump: state.pump!),
          ],
          const SizedBox(height: Space.xl),
          Text('By machine this month', style: theme.textTheme.titleSmall),
          const SizedBox(height: Space.sm),
          for (final m in state.machineUse.where((m) => m.fills > 0)) ...[
            MachineUseCard(use: m, totalIssued: state.issuedThisMonth),
            const SizedBox(height: Space.sm),
          ],
          if (state.machineUse.every((m) => m.fills == 0))
            Text('No diesel issued this month yet.', style: theme.textTheme.bodySmall),
          const SizedBox(height: Space.xl),
          Text('Entries this month', style: theme.textTheme.titleSmall),
          const SizedBox(height: Space.xs),
          for (final e in state.entries) _EntryTile(entry: e, machine: state.machine(e.machineId)),
          if (state.entries.isEmpty)
            Text('Nothing recorded this month yet.', style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _DateRow extends StatelessWidget {
  const _DateRow({super.key, required this.date, required this.enabled, required this.onTap});

  final DateTime date;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: Radii.controlAll,
      child: InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Date',
          prefixIcon: Icon(Icons.event_outlined),
          suffixIcon: Icon(Icons.edit_calendar_outlined),
        ),
        child: Text(DateFormatters.shortDate.format(date), style: theme.textTheme.bodyLarge),
      ),
    );
  }
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({required this.entry, required this.machine});

  final FuelEntryRow entry;
  final FuelMachine? machine;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;
    final title = switch (entry.entryType) {
      'issue' => machine?.name ?? entry.logbookMachine ?? 'Machine not named',
      'receipt' => 'Purchase${entry.supplier == null ? '' : ' · ${entry.supplier}'}',
      _ => entry.remarks ?? 'Stock adjustment',
    };
    final details = [
      DateFormatters.shortDate.format(DateTime.parse(entry.date)),
      if (entry.operator != null && entry.operator!.isNotEmpty) entry.operator!,
      if (entry.meterReading != null) 'meter ${entry.meterReading}',
      if (entry.fromLogbook) 'from the logbook',
    ].join(' · ');
    final change = '${entry.isOut ? '−' : '+'}${litresLabel(entry.litres.abs())}';
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(
        entry.isIssue ? Icons.local_gas_station_outlined : Icons.shopping_cart_outlined,
        color: entry.isOut ? theme.colorScheme.primary : status.success,
      ),
      title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Text(details, maxLines: 2, overflow: TextOverflow.ellipsis),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(change,
              style: theme.textTheme.titleSmall?.copyWith(
                  color: entry.isOut ? theme.colorScheme.onSurface : status.success)),
          Text('left ${litresLabel(entry.balance)}', style: theme.textTheme.labelSmall),
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
            child: Text(text,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface)),
          ),
        ],
      ),
    );
  }
}
