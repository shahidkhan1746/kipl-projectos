import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/kipl_button.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/status_pill.dart';
import '../fleet_provider.dart';

class FleetScreen extends ConsumerStatefulWidget {
  const FleetScreen({super.key});

  @override
  ConsumerState<FleetScreen> createState() => _FleetScreenState();
}

class _FleetScreenState extends ConsumerState<FleetScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  String _logType = 'plant'; // 'plant' or 'vehicle'
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

  bool _breakdown = false;
  double _calculatedHours = 0.0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _operatorController.dispose();
    _manualIdController.dispose();
    _hourStartController.dispose();
    _hourCloseController.dispose();
    _fuelController.dispose();
    _workZoneController.dispose();
    _workDescController.dispose();
    _breakdownDetailsController.dispose();
    super.dispose();
  }

  void _onMachineSelected(MachineSummary machine) {
    setState(() {
      _selectedMachineId = machine.machineId;
      _selectedMachineType = machine.machineType;
      _manualIdController.text = machine.machineId;
      // Auto-rollover: prefill starting hour from previous day's closing hour!
      _hourStartController.text = machine.lastReading > 0 ? machine.lastReading.toStringAsFixed(1) : '';
      _recalcHours();
    });
  }

  void _recalcHours() {
    final start = double.tryParse(_hourStartController.text);
    final close = double.tryParse(_hourCloseController.text);
    if (start != null && close != null && close >= start) {
      setState(() {
        _calculatedHours = double.parse((close - start).toStringAsFixed(1));
      });
    } else {
      setState(() {
        _calculatedHours = 0.0;
      });
    }
  }

  Future<void> _handleSubmit() async {
    final notifier = ref.read(fleetProvider.notifier);

    if (_logType == 'plant' && (_selectedMachineId == null || _selectedMachineId!.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select or enter a Machine ID'), backgroundColor: AppColors.red),
      );
      return;
    }

    final payload = <String, dynamic>{
      'logType': _logType,
      'date': DateFormatters.toApiDate(DateTime.now()),
      if (_logType == 'plant') ...{
        'machineId': _selectedMachineId,
        'machineType': _selectedMachineType ?? 'Plant',
        'operator': _operatorController.text,
        'hourStart': double.tryParse(_hourStartController.text),
        'hourClose': double.tryParse(_hourCloseController.text),
        'hoursWorked': _calculatedHours > 0 ? _calculatedHours : null,
        'workZone': _workZoneController.text,
        'workDescription': _workDescController.text,
        'breakdown': _breakdown,
        'breakdownDetails': _breakdown ? _breakdownDetailsController.text : null,
      } else ...{
        'vehicle': _selectedMachineId ?? 'Site Vehicle',
        'driver': _operatorController.text,
        'meterStart': double.tryParse(_hourStartController.text),
        'meterEnd': double.tryParse(_hourCloseController.text),
        'purpose': _workDescController.text,
      },
      'fuelLitres': double.tryParse(_fuelController.text),
    };

    final success = await notifier.submitLog(payload);
    if (success && mounted) {
      _hourCloseController.clear();
      _fuelController.clear();
      _workDescController.clear();
      _breakdownDetailsController.clear();
      setState(() {
        _calculatedHours = 0.0;
        _breakdown = false;
      });
      _tabController.animateTo(1); // switch to history tab
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(fleetProvider);
    final notifier = ref.read(fleetProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Plant & Fleet Logbook'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.accent,
          labelColor: AppColors.accent,
          unselectedLabelColor: AppColors.textMuted,
          tabs: const [
            Tab(icon: Icon(Icons.edit_note), text: 'New Entry'),
            Tab(icon: Icon(Icons.history), text: 'Recent Logs'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Log Entry Form
          _buildFormTab(context, state),

          // Tab 2: Recent History
          _buildHistoryTab(context, state, notifier),
        ],
      ),
    );
  }

  Widget _buildFormTab(BuildContext context, FleetState state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Log Type Selector (Plant vs Vehicle)
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.bgCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.borderDim),
            ),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _logType = 'plant'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _logType == 'plant' ? AppColors.accent : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          '🚜 Plant & Machinery',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: _logType == 'plant' ? FontWeight.w600 : FontWeight.normal,
                            color: _logType == 'plant' ? Colors.white : AppColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _logType = 'vehicle'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _logType == 'vehicle' ? AppColors.accent : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          '🚐 Site Vehicle',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: _logType == 'vehicle' ? FontWeight.w600 : FontWeight.normal,
                            color: _logType == 'vehicle' ? Colors.white : AppColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          if (state.message != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.greenBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.green.withOpacity(0.4)),
              ),
              child: Text(state.message!, style: const TextStyle(color: AppColors.textBase, fontSize: 13)),
            ),
            const SizedBox(height: 16),
          ],

          // 2. Select Machine from Fleet
          if (_logType == 'plant' && state.machines.isNotEmpty) ...[
            const Text(
              'SELECT MACHINE (AUTO-ROLLS PREVIOUS HOUR):',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 64,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: state.machines.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (ctx, i) {
                  final m = state.machines[i];
                  final isSel = _selectedMachineId == m.machineId;
                  return InkWell(
                    onTap: () => _onMachineSelected(m),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSel ? AppColors.accentBg : AppColors.bgCard,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSel ? AppColors.accent : AppColors.borderDim,
                          width: isSel ? 1.5 : 1,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            m.machineId,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: isSel ? AppColors.accent : AppColors.textBase,
                            ),
                          ),
                          Text(
                            'Last: ${m.lastReading > 0 ? m.lastReading.toStringAsFixed(1) : '0.0'}h',
                            style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Manual Machine/Vehicle ID if not selected
          if (_selectedMachineId == null || _logType == 'vehicle') ...[
            KiplTextField(
              controller: _manualIdController,
              label: _logType == 'plant' ? 'Machine ID / Asset Code' : 'Vehicle Reg / Asset',
              hint: _logType == 'plant' ? 'e.g. EX-01, BP-01, TM-02' : 'e.g. JK01-AB-1234, Bolero',
              onChanged: (val) {
                setState(() {
                  _selectedMachineId = val.trim();
                });
              },
            ),
            const SizedBox(height: 14),
          ],

          // Operator / Driver
          KiplTextField(
            controller: _operatorController,
            label: _logType == 'plant' ? 'Operator Name' : 'Driver Name',
            hint: 'e.g. Ghulam Nabi, Tariq Ahmad',
          ),

          const SizedBox(height: 14),

          // Start & Close Hour Readings
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _logType == 'plant' ? 'Start Reading (h)' : 'Start Odometer (km)',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textBase),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _hourStartController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: AppColors.textBase, fontSize: 14),
                      onChanged: (_) => _recalcHours(),
                      decoration: InputDecoration(
                        hintText: '0.0',
                        hintStyle: const TextStyle(color: AppColors.textFaint),
                        filled: true,
                        fillColor: AppColors.bgCard,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: AppColors.borderDim),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: AppColors.accent),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _logType == 'plant' ? 'Closing Reading (h)' : 'End Odometer (km)',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textBase),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _hourCloseController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: AppColors.textBase, fontSize: 14),
                      onChanged: (_) => _recalcHours(),
                      decoration: InputDecoration(
                        hintText: '0.0',
                        hintStyle: const TextStyle(color: AppColors.textFaint),
                        filled: true,
                        fillColor: AppColors.bgCard,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: AppColors.borderDim),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: AppColors.accent),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (_calculatedHours > 0) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.accentBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _logType == 'plant' ? 'Net Worked Hours:' : 'Net Distance Run:',
                    style: const TextStyle(fontSize: 12, color: AppColors.textBase),
                  ),
                  Text(
                    _logType == 'plant' ? '$_calculatedHours hrs' : '$_calculatedHours km',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.accent),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 14),

          // Diesel / Fuel Intake
          KiplTextField(
            controller: _fuelController,
            label: 'Diesel / Fuel Issued (Litres)',
            hint: 'e.g. 45.0 (leave blank if none)',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            prefixIcon: Icons.local_gas_station_outlined,
          ),

          const SizedBox(height: 14),

          // Work Zone & Description
          KiplTextField(
            controller: _workZoneController,
            label: 'Work Zone',
            hint: 'e.g. Aeration Tank, Nishat STP, Zone 2 Trench',
          ),

          const SizedBox(height: 14),

          KiplTextField(
            controller: _workDescController,
            label: 'Work Description',
            hint: 'e.g. Earthwork excavation for chamber 14, concrete transport...',
            maxLines: 2,
          ),

          const SizedBox(height: 16),

          // Breakdown Switch
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.bgCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.borderDim),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, size: 18, color: AppColors.amber),
                        SizedBox(width: 8),
                        Text('Machine Breakdown Occurred', style: TextStyle(fontSize: 13, color: AppColors.textBase)),
                      ],
                    ),
                    Switch(
                      value: _breakdown,
                      activeColor: AppColors.red,
                      onChanged: (v) => setState(() => _breakdown = v),
                    ),
                  ],
                ),
                if (_breakdown) ...[
                  const SizedBox(height: 10),
                  KiplTextField(
                    controller: _breakdownDetailsController,
                    label: 'Breakdown Description & Duration',
                    hint: 'e.g. Hydraulic hose leak, downtime 2.5h, repaired on site',
                    maxLines: 2,
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Submit
          KiplButton(
            label: 'Submit Fleet Log',
            icon: Icons.check_circle_outline,
            isLoading: state.isSubmitting,
            onPressed: _handleSubmit,
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab(BuildContext context, FleetState state, FleetNotifier notifier) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.accent));
    }

    if (state.recentLogs.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.agriculture_outlined, size: 48, color: AppColors.textFaint),
            const SizedBox(height: 12),
            const Text('No fleet logs recorded yet.', style: TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => notifier.init(),
              child: const Text('Refresh'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => notifier.init(),
      color: AppColors.accent,
      backgroundColor: AppColors.bgCard,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: state.recentLogs.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (ctx, i) {
          final log = state.recentLogs[i];
          final title = log.logType == 'plant'
              ? '${log.machineId ?? 'Plant'} (${log.machineType ?? 'Machine'})'
              : (log.vehicle ?? 'Site Vehicle');

          return Container(
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
                    Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textBase)),
                    StatusPill(
                      label: log.logType.toUpperCase(),
                      type: log.logType == 'plant' ? StatusPillType.info : StatusPillType.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(DateFormatters.formatIndian(DateTime.tryParse(log.date)), style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    const SizedBox(width: 12),
                    if (log.operator != null && log.operator!.isNotEmpty)
                      Text('By: ${log.operator}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (log.hoursWorked != null)
                      Text('Worked: ${log.hoursWorked}h', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.accent)),
                    if (log.distanceKm != null)
                      Text('Distance: ${log.distanceKm} km', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.teal)),
                    if (log.fuelLitres != null && log.fuelLitres! > 0) ...[
                      const SizedBox(width: 12),
                      Text('Fuel: ${log.fuelLitres}L', style: const TextStyle(fontSize: 12, color: AppColors.amber)),
                    ],
                    if (log.breakdown) ...[
                      const Spacer(),
                      const StatusPill(label: 'BREAKDOWN', type: StatusPillType.error),
                    ],
                  ],
                ),
                if (log.workZone != null && log.workZone!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('Zone: ${log.workZone}', style: const TextStyle(fontSize: 11, color: AppColors.textFaint)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
