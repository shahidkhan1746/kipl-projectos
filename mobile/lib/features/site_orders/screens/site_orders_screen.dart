import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/kipl_button.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/status_pill.dart';
import '../site_orders_provider.dart';

class SiteOrdersScreen extends ConsumerStatefulWidget {
  const SiteOrdersScreen({super.key});

  @override
  ConsumerState<SiteOrdersScreen> createState() => _SiteOrdersScreenState();
}

class _SiteOrdersScreenState extends ConsumerState<SiteOrdersScreen> {
  final _orderNoController = TextEditingController();
  final _issuedByController = TextEditingController();
  final _instructionController = TextEditingController();
  final _complianceRemarksController = TextEditingController();

  @override
  void dispose() {
    _orderNoController.dispose();
    _issuedByController.dispose();
    _instructionController.dispose();
    _complianceRemarksController.dispose();
    super.dispose();
  }

  void _showNewOrderSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
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
            const Text(
              'Record Works Site Order (Clause 42.3)',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textBase),
            ),
            const SizedBox(height: 14),
            KiplTextField(
              controller: _orderNoController,
              label: 'Order Reference No.',
              hint: 'e.g. SOB-2026-0012, EIC/Site/45',
            ),
            const SizedBox(height: 12),
            KiplTextField(
              controller: _issuedByController,
              label: 'Issued By (EIC / Officer Designation)',
              hint: 'e.g. Er. Zahoor Ahmad (Executive Engineer, UEED)',
            ),
            const SizedBox(height: 12),
            KiplTextField(
              controller: _instructionController,
              label: 'Site Instruction / Directive',
              hint: 'e.g. Deep trench shoring required at Chainage 2+100 due to loose strata...',
              maxLines: 3,
            ),
            const SizedBox(height: 20),
            KiplButton(
              label: 'Save Site Order',
              icon: Icons.save_outlined,
              onPressed: () async {
                if (_instructionController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Instruction text is required'), backgroundColor: AppColors.red),
                  );
                  return;
                }

                final payload = {
                  'date': DateFormatters.toApiDate(DateTime.now()),
                  'orderNo': _orderNoController.text.trim().isNotEmpty ? _orderNoController.text.trim() : null,
                  'issuedBy': _issuedByController.text.trim().isNotEmpty ? _issuedByController.text.trim() : 'Engineer-in-Charge',
                  'instruction': _instructionController.text.trim(),
                  'complianceStatus': 'pending',
                };

                final success = await ref.read(siteOrdersProvider.notifier).createOrder(payload);
                if (success && mounted && ctx.mounted) {
                  _orderNoController.clear();
                  _issuedByController.clear();
                  _instructionController.clear();
                  Navigator.pop(ctx);
                } else if (!success && mounted) {
                  final message = ref.read(siteOrdersProvider).error ?? 'The site order could not be saved.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(message), backgroundColor: AppColors.red),
                  );
                }
              },
            ),
            ],
          ),
        ),
      ),
    );
  }

  void _showComplyDialog(String orderId) {
    _complianceRemarksController.clear();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgCard,
        title: const Text('Mark Order Complied', style: TextStyle(color: AppColors.textBase)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Enter compliance action taken on site to close this instruction:',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
              const SizedBox(height: 12),
              KiplTextField(
                controller: _complianceRemarksController,
                label: 'Compliance Remarks / Action Taken',
                hint: 'e.g. Timber shoring installed, compaction re-tested and passed',
                maxLines: 3,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.green),
            onPressed: () async {
              final remarks = _complianceRemarksController.text.trim();
              if (remarks.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Compliance remarks are required'), backgroundColor: AppColors.red),
                );
                return;
              }
              final success = await ref.read(siteOrdersProvider.notifier).markComplied(orderId, remarks);
              if (success && mounted && ctx.mounted) {
                Navigator.pop(ctx);
              } else if (!success && mounted) {
                final message = ref.read(siteOrdersProvider).error ?? 'Compliance could not be recorded.';
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(message), backgroundColor: AppColors.red),
                );
              }
            },
            child: const Text('Confirm Compliance', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(siteOrdersProvider);
    final notifier = ref.read(siteOrdersProvider.notifier);
    final orders = state.filteredOrders;
    final canManage = ref.watch(currentUserProvider)?.canManageSiteOrders == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Site Order Book'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: state.isLoading ? null : () => notifier.fetchOrders(),
          ),
        ],
      ),
      floatingActionButton: !canManage ? null : FloatingActionButton.extended(
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Record Order'),
        onPressed: _showNewOrderSheet,
      ),
      body: Column(
        children: [
          // Filter Tabs
          _buildFilterBar(state, notifier),

          // Clause 42.3 Notice
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.bgCard,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.borderDim),
            ),
            child: const Row(
              children: [
                Icon(Icons.gavel_outlined, size: 16, color: AppColors.accent),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Tender Clause 42.3: Instructions issued by EIC during site inspection must be acknowledged & complied.',
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                ),
              ],
            ),
          ),

          if (state.message != null) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.greenBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.green.withValues(alpha: 0.4)),
                ),
                child: Text(state.message!, style: const TextStyle(color: AppColors.textBase, fontSize: 12)),
              ),
            ),
          ],

          if (state.error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Text(state.error!, style: const TextStyle(color: AppColors.red, fontSize: 13)),
            ),

          // Orders List
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                : orders.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.menu_book_outlined, size: 48, color: AppColors.textFaint),
                            const SizedBox(height: 12),
                            Text('No site orders found for ${state.filter}', style: const TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => notifier.fetchOrders(),
                        color: AppColors.accent,
                        backgroundColor: AppColors.bgCard,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                          itemCount: orders.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (ctx, i) =>
                              _buildOrderCard(context, orders[i], notifier, canManage),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(SiteOrdersState state, SiteOrdersNotifier notifier) {
    final filters = [
      {'val': 'all', 'label': 'All Orders'},
      {'val': 'pending', 'label': 'Pending Action'},
      {'val': 'complied', 'label': 'Complied'},
    ];

    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      color: AppColors.bgCard,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final f = filters[i];
          final isSel = state.filter == f['val'];
          return Center(
            child: InkWell(
              onTap: () => notifier.setFilter(f['val']!),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: isSel ? AppColors.accent : AppColors.bgSubtle,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  f['label']!,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSel ? FontWeight.w600 : FontWeight.normal,
                    color: isSel ? Colors.white : AppColors.textMuted,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildOrderCard(
    BuildContext context,
    SiteOrderItem order,
    SiteOrdersNotifier notifier,
    bool canManage,
  ) {
    final formattedDate = DateFormatters.formatIndian(DateTime.tryParse(order.date));

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: order.isPending ? AppColors.amber.withValues(alpha: 0.3) : AppColors.borderDim,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  order.orderNo ?? 'Site Order',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.accent),
                ),
              ),
              const SizedBox(width: 8),
              StatusPill(
                label: order.isComplied ? 'COMPLIED' : 'PENDING ACTION',
                type: order.isComplied ? StatusPillType.success : StatusPillType.warning,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.person_pin_outlined, size: 14, color: AppColors.textFaint),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  order.issuedBy,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textBase),
                ),
              ),
              Text(formattedDate, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            order.instruction,
            style: const TextStyle(fontSize: 13, color: AppColors.textBase, height: 1.3),
          ),
          const SizedBox(height: 10),
          if (order.isAcknowledged)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.bgSubtle,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check, size: 12, color: AppColors.green),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      'Acknowledged by ${order.acknowledgedBy} (${order.acknowledgedDate ?? ''})',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ),
                ],
              ),
            ),
          if (order.remarks != null && order.remarks!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Action Taken: ${order.remarks}',
              style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.green),
            ),
          ],
          const SizedBox(height: 10),
          const Divider(height: 1, color: AppColors.borderDim),
          const SizedBox(height: 6),
          Wrap(
            alignment: WrapAlignment.end,
            spacing: 8,
            runSpacing: 6,
            children: [
              if (canManage && !order.isAcknowledged)
                TextButton.icon(
                  icon: const Icon(Icons.done_all, size: 14),
                  label: const Text('Acknowledge Receipt', style: TextStyle(fontSize: 12, color: AppColors.accent)),
                  onPressed: () => notifier.acknowledgeOrder(order.id),
                ),
              if (canManage && order.isPending)
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.greenBg,
                    foregroundColor: AppColors.green,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    side: BorderSide(color: AppColors.green.withValues(alpha: 0.4)),
                  ),
                  icon: const Icon(Icons.verified, size: 14),
                  label: const Text('Mark Complied', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () => _showComplyDialog(order.id),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
