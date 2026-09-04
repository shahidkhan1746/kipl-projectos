import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/kipl_button.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/status_pill.dart';
import '../materials_provider.dart';

class MaterialsScreen extends ConsumerStatefulWidget {
  const MaterialsScreen({super.key});

  @override
  ConsumerState<MaterialsScreen> createState() => _MaterialsScreenState();
}

class _MaterialsScreenState extends ConsumerState<MaterialsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  String _selectedMaterial = 'Cement (OPC 43/53)';
  String _selectedUnit = 'Bags';

  final _receivedQtyController = TextEditingController();
  final _consumedQtyController = TextEditingController();
  final _contractorRepController = TextEditingController();
  final _ueedRepController = TextEditingController();
  final _remarksController = TextEditingController();

  final List<Map<String, String>> _materials = [
    {'name': 'Cement (OPC 43/53)', 'unit': 'Bags'},
    {'name': 'Steel / TMT Fe 500D', 'unit': 'MT'},
    {'name': 'River Sand (Coarse)', 'unit': 'CuM'},
    {'name': 'Coarse Aggregate (20mm)', 'unit': 'CuM'},
    {'name': 'Coarse Aggregate (10mm)', 'unit': 'CuM'},
    {'name': 'HDPE Pipes (160mm - 400mm)', 'unit': 'Rmt'},
    {'name': 'DWC Corrugated Pipes', 'unit': 'Rmt'},
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
    super.dispose();
  }

  void _onMaterialSelected(String name, String unit) {
    setState(() {
      _selectedMaterial = name;
      _selectedUnit = unit;
    });
  }

  Future<void> _handleSubmit() async {
    final notifier = ref.read(materialsProvider.notifier);

    final received = double.tryParse(_receivedQtyController.text) ?? 0;
    final consumed = double.tryParse(_consumedQtyController.text) ?? 0;

    if (received < 0 || consumed < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Quantities cannot be negative'), backgroundColor: AppColors.red),
      );
      return;
    }

    if (received == 0 && consumed == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter either Received Qty or Consumed Qty'), backgroundColor: AppColors.red),
      );
      return;
    }

    final payload = {
      'date': DateFormatters.toApiDate(DateTime.now()),
      'material': _selectedMaterial,
      'unit': _selectedUnit,
      'receivedQty': received,
      'consumedQty': consumed,
      'contractorRep': _contractorRepController.text,
      'ueedRep': _ueedRepController.text,
      'remarks': _remarksController.text,
    };

    final success = await notifier.createRecord(payload);
    if (success && mounted) {
      _receivedQtyController.clear();
      _consumedQtyController.clear();
      _remarksController.clear();
      _tabController.animateTo(1);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(materialsProvider);
    final notifier = ref.read(materialsProvider.notifier);
    final canManage = ref.watch(currentUserProvider)?.canManageFieldOperations == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Material Register'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.accent,
          labelColor: AppColors.accent,
          unselectedLabelColor: AppColors.textMuted,
          tabs: const [
            Tab(icon: Icon(Icons.inventory_2_outlined), text: 'Gate Entry'),
            Tab(icon: Icon(Icons.format_list_bulleted), text: 'Register Logs'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildEntryTab(context, state, canManage),
          _buildLogsTab(context, state, notifier),
        ],
      ),
    );
  }

  Widget _buildEntryTab(BuildContext context, MaterialsState state, bool canManage) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!canManage) ...[
            const Text(
              'You have read-only access to material records.',
              style: TextStyle(color: AppColors.amber, fontSize: 13),
            ),
            const SizedBox(height: 12),
          ],
          // Header note (Tender Clause 55)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.bgCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.borderDim),
            ),
            child: const Row(
              children: [
                Icon(Icons.verified_outlined, color: AppColors.accent, size: 20),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Tender Clause 55: Daily record of material receipt, consumption & balance verified with UEED.',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted),
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

          if (state.error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.redBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.red.withOpacity(0.4)),
              ),
              child: Text(state.error!, style: const TextStyle(color: AppColors.textBase, fontSize: 13)),
            ),
            const SizedBox(height: 16),
          ],

          // 1. Material Selector
          const Text(
            'SELECT MATERIAL:',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted),
          ),
          const SizedBox(height: 8),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _materials.map((m) {
              final isSel = _selectedMaterial == m['name'];
              return ChoiceChip(
                label: Text(m['name']!),
                selected: isSel,
                selectedColor: AppColors.accentBg,
                backgroundColor: AppColors.bgCard,
                side: BorderSide(color: isSel ? AppColors.accent : AppColors.borderDim),
                labelStyle: TextStyle(
                  color: isSel ? AppColors.accent : AppColors.textBase,
                  fontSize: 12,
                  fontWeight: isSel ? FontWeight.w600 : FontWeight.normal,
                ),
                onSelected: (_) => _onMaterialSelected(m['name']!, m['unit']!),
              );
            }).toList(),
          ),

          const SizedBox(height: 16),

          // 2. Unit & Quantities
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Received Qty ($_selectedUnit)',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textBase)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _receivedQtyController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: AppColors.textBase, fontSize: 14),
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
                    Text('Consumed Qty ($_selectedUnit)',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textBase)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _consumedQtyController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: AppColors.textBase, fontSize: 14),
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

          const SizedBox(height: 16),

          // 3. Representatives
          KiplTextField(
            controller: _contractorRepController,
            label: 'Contractor Representative (KIPL)',
            hint: 'e.g. Shahid Khan (Site Engineer)',
          ),

          const SizedBox(height: 14),

          KiplTextField(
            controller: _ueedRepController,
            label: 'Client Representative (UEED / LCMA)',
            hint: 'e.g. AEE / JE in-charge',
          ),

          const SizedBox(height: 14),

          // 4. Challan & Vehicle remarks
          KiplTextField(
            controller: _remarksController,
            label: 'Challan / Vehicle No / Remarks',
            hint: 'e.g. Challan #9821, Truck JK01-1234, Manufacturer test cert verified',
            maxLines: 2,
          ),

          const SizedBox(height: 24),

          KiplButton(
            label: 'Save Material Register Entry',
            icon: Icons.save_outlined,
            isLoading: state.isSubmitting,
            onPressed: canManage ? _handleSubmit : null,
          ),
        ],
      ),
    );
  }

  Widget _buildLogsTab(BuildContext context, MaterialsState state, MaterialsNotifier notifier) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.accent));
    }

    if (state.records.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                state.error == null ? Icons.inventory_2_outlined : Icons.cloud_off_outlined,
                size: 48,
                color: state.error == null ? AppColors.textFaint : AppColors.red,
              ),
              const SizedBox(height: 12),
              Text(
                state.error ?? 'No material entries recorded yet.',
                textAlign: TextAlign.center,
                style: TextStyle(color: state.error == null ? AppColors.textMuted : AppColors.red),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => notifier.fetchMaterials(),
                child: const Text('Refresh'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => notifier.fetchMaterials(),
      color: AppColors.accent,
      backgroundColor: AppColors.bgCard,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: state.records.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (ctx, i) {
          final r = state.records[i];
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
                    Expanded(
                      child: Text(
                        r.material,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textBase),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      DateFormatters.formatIndian(DateTime.tryParse(r.date)),
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    if (r.receivedQty > 0) ...[
                      StatusPill(label: 'Recv: ${r.receivedQty} ${r.unit ?? ''}', type: StatusPillType.success),
                    ],
                    if (r.consumedQty > 0) ...[
                      StatusPill(label: 'Used: ${r.consumedQty} ${r.unit ?? ''}', type: StatusPillType.warning),
                    ],
                    Text(
                      'Bal: ${r.balanceQty >= 0 ? '+' : ''}${r.balanceQty} ${r.unit ?? ''}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.accent),
                    ),
                  ],
                ),
                if (r.contractorRep != null && r.contractorRep!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('KIPL: ${r.contractorRep} · UEED: ${r.ueedRep ?? '—'}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                ],
                if (r.remarks != null && r.remarks!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text('Remarks: ${r.remarks}', style: const TextStyle(fontSize: 11, color: AppColors.textFaint)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
