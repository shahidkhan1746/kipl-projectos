import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_provider.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/filter_bar.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/status_pill.dart';
import '../site_orders_provider.dart';

/// The site order book — instructions issued by the Engineer-in-Charge, and
/// what was done about them.
///
/// Under Tender Clause 42.3 an unacknowledged instruction is a live contractual
/// exposure, so the state that matters on every row is *pending or not*. The
/// old list buried that: each order was a bordered card whose loudest element
/// was its reference number in blue, with the full instruction text always
/// expanded, a divider, and up to two action buttons — about three orders per
/// screen, and no way to see at a glance how many were still open.
///
///   the goal      find the instructions still owed a response
///   primary       the instruction itself
///   secondary     who issued it, when, and its reference
///   primary act   the ONE next step: acknowledge it, then comply
///   secondary     the full text and history, behind a tap on the row
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

  final _orderNoFocus = FocusNode();
  final _issuedByFocus = FocusNode();
  final _instructionFocus = FocusNode();

  final _newOrderFormKey = GlobalKey<FormState>();
  final _complyFormKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _orderNoController.dispose();
    _issuedByController.dispose();
    _instructionController.dispose();
    _complianceRemarksController.dispose();
    _orderNoFocus.dispose();
    _issuedByFocus.dispose();
    _instructionFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(siteOrdersProvider);
    final notifier = ref.read(siteOrdersProvider.notifier);
    final orders = state.filteredOrders;
    final canManage =
        ref.watch(currentUserProvider)?.canManageSiteOrders == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Site Order Book'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload orders',
            onPressed: state.isLoading ? null : notifier.fetchOrders,
          ),
        ],
      ),
      floatingActionButton: !canManage
          ? null
          : FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('Record order'),
              onPressed: _showNewOrderSheet,
            ),
      body: Column(
        children: [
          FilterBar<String>(
            options: _filterOptions(state),
            selected: state.filter,
            onSelected: notifier.setFilter,
          ),
          const Divider(),
          if (state.error != null && orders.isNotEmpty)
            InlineErrorBanner(
              message: state.error!,
              onRetry: notifier.fetchOrders,
            ),
          Expanded(child: _body(state, orders, notifier, canManage)),
        ],
      ),
    );
  }

  List<FilterOption<String>> _filterOptions(SiteOrdersState state) {
    // Pending carries a count because it is the number the site is judged on:
    // an instruction with no recorded response is a contractual exposure, and
    // the filter row is where that total belongs.
    return [
      FilterOption(value: 'all', label: 'All', count: state.orders.length),
      FilterOption(
        value: 'pending',
        label: 'Pending',
        count: state.orders.where((o) => o.isPending).length,
      ),
      FilterOption(
        value: 'complied',
        label: 'Complied',
        count: state.orders.where((o) => o.isComplied).length,
      ),
    ];
  }

  Widget _body(
    SiteOrdersState state,
    List<SiteOrderItem> orders,
    SiteOrdersNotifier notifier,
    bool canManage,
  ) {
    if (state.isLoading && state.orders.isEmpty) {
      return const LoadingState(message: 'Loading the order book…');
    }

    if (state.error != null && orders.isEmpty) {
      return ErrorState(message: state.error!, onRetry: notifier.fetchOrders);
    }

    if (orders.isEmpty) {
      return RefreshIndicator(
        onRefresh: notifier.fetchOrders,
        child: LayoutBuilder(
          builder: (context, constraints) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: state.filter == 'pending'
                    ? const EmptyState(
                        icon: Icons.verified_outlined,
                        title: 'Nothing pending',
                        message: 'Every instruction in the book has been '
                            'acknowledged and closed out.',
                      )
                    : state.filter == 'complied'
                        ? EmptyState(
                            icon: Icons.rule_folder_outlined,
                            title: 'Nothing closed out yet',
                            message: 'Orders appear here once compliance has '
                                'been recorded against them.',
                            actionLabel: 'Show all orders',
                            onAction: () => notifier.setFilter('all'),
                          )
                        : EmptyState(
                            icon: Icons.menu_book_outlined,
                            title: 'The order book is empty',
                            message:
                                'Instructions issued by the Engineer-in-Charge '
                                'during a site inspection are recorded here '
                                'under Tender Clause 42.3.',
                            actionLabel: canManage ? 'Record an order' : null,
                            onAction: canManage ? _showNewOrderSheet : null,
                          ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: notifier.fetchOrders,
      child: ListView.separated(
        // Clears the extended FAB, which would otherwise sit on the last row.
        padding: const EdgeInsets.only(bottom: 88),
        itemCount: orders.length,
        separatorBuilder: (_, __) =>
            const Divider(indent: Space.gutter, endIndent: Space.gutter),
        itemBuilder: (context, i) => _OrderRow(
          order: orders[i],
          canManage: canManage,
          onOpen: () => _showOrderDetail(orders[i], canManage),
          onAcknowledge: () => notifier.acknowledgeOrder(orders[i].id),
          onComply: () => _showComplyDialog(orders[i].id),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------- detail

  void _showOrderDetail(SiteOrderItem order, bool canManage) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) {
        final theme = Theme.of(sheetContext);
        return SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(Space.xl, 0, Space.xl, Space.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                StatusPill(
                  label: order.isComplied ? 'COMPLIED' : 'PENDING ACTION',
                  type: order.isComplied
                      ? StatusPillType.success
                      : StatusPillType.warning,
                ),
                const SizedBox(height: Space.md),
                Text(order.instruction, style: theme.textTheme.bodyMedium),
                const SizedBox(height: Space.xl),
                _Fact(label: 'Reference', value: order.orderNo),
                _Fact(label: 'Issued by', value: order.issuedBy),
                _Fact(
                  label: 'Issued on',
                  value: DateFormatters.formatIndian(
                      DateTime.tryParse(order.date)),
                ),
                _Fact(
                  label: 'Acknowledged',
                  value: order.isAcknowledged
                      ? '${order.acknowledgedBy ?? 'yes'}'
                          '${order.acknowledgedDate == null ? '' : ' · ${order.acknowledgedDate}'}'
                      : null,
                ),
                _Fact(label: 'Action taken', value: order.remarks),
                if (canManage && !order.isComplied) ...[
                  const SizedBox(height: Space.md),
                  const Divider(),
                  const SizedBox(height: Space.md),
                  if (!order.isAcknowledged)
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.done_all, size: Sizes.icon),
                        label: const Text('Acknowledge receipt'),
                        onPressed: () {
                          Navigator.pop(sheetContext);
                          ref
                              .read(siteOrdersProvider.notifier)
                              .acknowledgeOrder(order.id);
                        },
                      ),
                    ),
                  if (!order.isAcknowledged) const SizedBox(height: Space.sm),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      icon: const Icon(Icons.verified, size: Sizes.icon),
                      label: const Text('Record compliance'),
                      onPressed: () {
                        Navigator.pop(sheetContext);
                        _showComplyDialog(order.id);
                      },
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  // ------------------------------------------------------------- new order

  void _showNewOrderSheet() {
    _newOrderFormKey.currentState?.reset();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        child: Form(
          key: _newOrderFormKey,
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              Space.xl,
              0,
              Space.xl,
              // The sheet sits over the keyboard, so its own padding has to
              // grow by the inset or the save button is unreachable behind it.
              Space.xl + MediaQuery.viewInsetsOf(sheetContext).bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Record a site order',
                  style: Theme.of(sheetContext).textTheme.titleMedium,
                ),
                const SizedBox(height: Space.xs),
                Text(
                  'Tender Clause 42.3',
                  style: Theme.of(sheetContext).textTheme.labelMedium,
                ),
                const SizedBox(height: Space.xl),
                KiplTextField(
                  controller: _orderNoController,
                  focusNode: _orderNoFocus,
                  label: 'Reference number',
                  hint: 'e.g. SOB-2026-0012',
                  helper: 'Optional',
                  textCapitalization: TextCapitalization.characters,
                  textInputAction: TextInputAction.next,
                  onSubmitted: (_) => _issuedByFocus.requestFocus(),
                ),
                const SizedBox(height: Space.lg),
                KiplTextField(
                  controller: _issuedByController,
                  focusNode: _issuedByFocus,
                  label: 'Issued by',
                  hint: 'e.g. Er. Zahoor Ahmad (Executive Engineer, UEED)',
                  helper: 'Defaults to Engineer-in-Charge',
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  onSubmitted: (_) => _instructionFocus.requestFocus(),
                ),
                const SizedBox(height: Space.lg),
                KiplTextField(
                  controller: _instructionController,
                  focusNode: _instructionFocus,
                  label: 'Instruction',
                  hint: 'e.g. Deep trench shoring required at Ch. 2+100 due '
                      'to loose strata',
                  maxLines: 4,
                  textCapitalization: TextCapitalization.sentences,
                  validator: (v) => (v?.trim().isEmpty ?? true)
                      ? 'The instruction is what the order records — it '
                          'cannot be blank.'
                      : null,
                ),
                const SizedBox(height: Space.xxl),
                SizedBox(
                  height: Sizes.control,
                  child: FilledButton.icon(
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Save site order'),
                    onPressed: () => _saveOrder(sheetContext),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _saveOrder(BuildContext sheetContext) async {
    if (!(_newOrderFormKey.currentState?.validate() ?? false)) return;

    final orderNo = _orderNoController.text.trim();
    final issuedBy = _issuedByController.text.trim();

    final payload = {
      'date': DateFormatters.toApiDate(DateTime.now()),
      'orderNo': orderNo.isEmpty ? null : orderNo,
      'issuedBy': issuedBy.isEmpty ? 'Engineer-in-Charge' : issuedBy,
      'instruction': _instructionController.text.trim(),
      'complianceStatus': 'pending',
    };

    final success =
        await ref.read(siteOrdersProvider.notifier).createOrder(payload);
    if (!mounted) return;

    if (success) {
      _orderNoController.clear();
      _issuedByController.clear();
      _instructionController.clear();
      if (sheetContext.mounted) Navigator.pop(sheetContext);
      return;
    }

    _report(ref.read(siteOrdersProvider).error ??
        'The site order could not be saved.');
  }

  // -------------------------------------------------------------- comply

  void _showComplyDialog(String orderId) {
    _complianceRemarksController.clear();
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Record compliance'),
        content: Form(
          key: _complyFormKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'What was done on site to close this instruction?',
                  style: Theme.of(dialogContext).textTheme.bodySmall,
                ),
                const SizedBox(height: Space.lg),
                KiplTextField(
                  controller: _complianceRemarksController,
                  label: 'Action taken',
                  hint: 'e.g. Timber shoring installed, compaction re-tested '
                      'and passed',
                  maxLines: 3,
                  textCapitalization: TextCapitalization.sentences,
                  // This sentence is the contractual record of compliance, so
                  // an empty one closes an instruction with no evidence.
                  validator: (v) => (v?.trim().isEmpty ?? true)
                      ? 'Describe the action taken — this is the compliance '
                          'record.'
                      : null,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => _confirmComply(dialogContext, orderId),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmComply(
      BuildContext dialogContext, String orderId) async {
    if (!(_complyFormKey.currentState?.validate() ?? false)) return;

    final success = await ref.read(siteOrdersProvider.notifier).markComplied(
          orderId,
          _complianceRemarksController.text.trim(),
        );
    if (!mounted) return;

    if (success) {
      if (dialogContext.mounted) Navigator.pop(dialogContext);
      return;
    }

    _report(ref.read(siteOrdersProvider).error ??
        'Compliance could not be recorded.');
  }

  void _report(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}

/// One instruction, and the single next step it is owed.
class _OrderRow extends StatelessWidget {
  const _OrderRow({
    required this.order,
    required this.canManage,
    required this.onOpen,
    required this.onAcknowledge,
    required this.onComply,
  });

  final SiteOrderItem order;
  final bool canManage;
  final VoidCallback onOpen;
  final VoidCallback onAcknowledge;
  final VoidCallback onComply;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Acknowledge, then comply. Offering both at once made the sequence look
    // like a choice, and an order can only ever be at one of those two points.
    final ({String label, IconData icon, VoidCallback action})? next =
        !canManage || order.isComplied
            ? null
            : order.isAcknowledged
                ? (
                    label: 'Comply',
                    icon: Icons.verified_outlined,
                    action: onComply
                  )
                : (
                    label: 'Acknowledge',
                    icon: Icons.done_all,
                    action: onAcknowledge
                  );

    return Semantics(
      button: true,
      label: '${order.instruction}. '
          '${order.isComplied ? 'Complied' : 'Pending action'}.',
      child: InkWell(
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: Space.gutter,
            vertical: Space.md,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                order.instruction,
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
                  StatusPill(
                    label: order.isComplied ? 'Complied' : 'Pending',
                    type: order.isComplied
                        ? StatusPillType.success
                        : StatusPillType.warning,
                    emphasis: StatusEmphasis.subtle,
                  ),
                  Text(order.issuedBy, style: theme.textTheme.labelMedium),
                  Text(
                    DateFormatters.formatIndian(DateTime.tryParse(order.date)),
                    style: theme.textTheme.labelMedium,
                  ),
                  if (order.orderNo?.isNotEmpty == true)
                    Text(order.orderNo!, style: theme.textTheme.labelMedium),
                ],
              ),
              if (next != null) ...[
                const SizedBox(height: Space.md),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton.icon(
                    onPressed: next.action,
                    icon: Icon(next.icon, size: Sizes.iconInline),
                    label: Text(next.label),
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
        ),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: Space.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 104,
            child: Text(label, style: theme.textTheme.labelMedium),
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Text(
              value == null || value!.isEmpty ? '—' : value!,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurface),
            ),
          ),
        ],
      ),
    );
  }
}
