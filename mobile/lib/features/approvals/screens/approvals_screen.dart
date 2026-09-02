import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/kipl_button.dart';
import '../../../shared/widgets/status_pill.dart';
import '../approvals_provider.dart';

class ApprovalsScreen extends ConsumerWidget {
  const ApprovalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(approvalsProvider);
    final notifier = ref.read(approvalsProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Executive Approvals'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: state.isLoading ? null : () => notifier.fetchPendingApprovals(),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
          : RefreshIndicator(
              onRefresh: () => notifier.fetchPendingApprovals(),
              color: AppColors.accent,
              backgroundColor: AppColors.bgCard,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // 1. Executive Summary KPIs
                  Row(
                    children: [
                      Expanded(
                        child: _buildKpiCard(
                          'PENDING DIARIES',
                          state.pendingDiaries.length.toString(),
                          Icons.menu_book,
                          AppColors.accent,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: InkWell(
                          onTap: () => context.push('/qa'),
                          borderRadius: BorderRadius.circular(12),
                          child: _buildKpiCard(
                            'OPEN NCRS',
                            state.openNcrsCount.toString(),
                            Icons.report_problem,
                            AppColors.red,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: InkWell(
                          onTap: () => context.push('/site-orders'),
                          borderRadius: BorderRadius.circular(12),
                          child: _buildKpiCard(
                            'SITE ORDERS',
                            state.pendingOrdersCount.toString(),
                            Icons.gavel,
                            AppColors.amber,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

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

                  // 2. Pending Site Diaries Section
                  const Text(
                    'DAILY SITE DIARIES AWAITING SIGN-OFF',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 10),

                  if (state.pendingDiaries.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppColors.bgCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.borderDim),
                      ),
                      child: const Center(
                        child: Column(
                          children: [
                            Icon(Icons.check_circle_outline, color: AppColors.green, size: 36),
                            SizedBox(height: 8),
                            Text('All submitted diaries are approved & signed!',
                                style: TextStyle(color: AppColors.textBase, fontWeight: FontWeight.w600, fontSize: 13)),
                            SizedBox(height: 4),
                            Text('No pending approval requests in the queue.',
                                style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                          ],
                        ),
                      ),
                    )
                  else
                    ...state.pendingDiaries.map((diary) {
                      final formattedDate = DateFormatters.formatIndian(DateTime.tryParse(diary.date));

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.bgCard,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.accent.withOpacity(0.4)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  formattedDate,
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textBase),
                                ),
                                const StatusPill(label: 'SUBMITTED', type: StatusPillType.warning),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Text('By: ${diary.submittedBy ?? 'Site Engineer'}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                const Spacer(),
                                Text('Manpower: ${diary.totalManpower}',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.accent)),
                              ],
                            ),
                            if (diary.weatherCondition != null || (diary.hoursLostWeather != null && diary.hoursLostWeather! > 0)) ...[
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  if (diary.weatherCondition != null)
                                    Text('Weather: ${diary.weatherCondition}', style: const TextStyle(fontSize: 11, color: AppColors.textFaint)),
                                  if (diary.hoursLostWeather != null && diary.hoursLostWeather! > 0) ...[
                                    const SizedBox(width: 8),
                                    Text('(${diary.hoursLostWeather}h lost)',
                                        style: const TextStyle(fontSize: 11, color: AppColors.amber, fontWeight: FontWeight.w600)),
                                  ],
                                ],
                              ),
                            ],
                            if (diary.workExecuted != null && diary.workExecuted!.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(diary.workExecuted!,
                                  style: const TextStyle(fontSize: 12, color: AppColors.textBase),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis),
                            ],
                            const SizedBox(height: 12),
                            const Divider(height: 1, color: AppColors.borderDim),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.green,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  icon: const Icon(Icons.verified, size: 16),
                                  label: const Text('Approve & Sign', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  onPressed: () async {
                                    final confirm = await showDialog<bool>(
                                      context: context,
                                      builder: (ctx) => AlertDialog(
                                        backgroundColor: AppColors.bgCard,
                                        title: const Text('Confirm Diary Approval', style: TextStyle(color: AppColors.textBase)),
                                        content: Text(
                                          'Approve and sign off daily site diary for $formattedDate?\nThis records your executive digital signature.',
                                          style: const TextStyle(color: AppColors.textMuted),
                                        ),
                                        actions: [
                                          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.green),
                                            onPressed: () => Navigator.pop(ctx, true),
                                            child: const Text('Approve', style: TextStyle(color: Colors.white)),
                                          ),
                                        ],
                                      ),
                                    );

                                    if (confirm == true) {
                                      notifier.approveDiary(diary.id);
                                    }
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),

                  const SizedBox(height: 20),

                  // 3. Quick Action Hubs
                  const Text(
                    'EXECUTIVE AUDIT HUBS',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 10),

                  _buildAuditRow(
                    context,
                    title: 'Quality & Safety Audit (NCRs)',
                    subtitle: 'Review critical site defects & close reports',
                    icon: Icons.fact_check_outlined,
                    color: const Color(0xFF06B6D4),
                    count: state.openNcrsCount,
                    onTap: () => context.push('/qa'),
                  ),
                  const SizedBox(height: 8),
                  _buildAuditRow(
                    context,
                    title: 'Works Site Order Book (Clause 42.3)',
                    subtitle: 'Inspect EIC directives & contractor compliances',
                    icon: Icons.gavel_outlined,
                    color: const Color(0xFFF59E0B),
                    count: state.pendingOrdersCount,
                    onTap: () => context.push('/site-orders'),
                  ),
                  const SizedBox(height: 8),
                  _buildAuditRow(
                    context,
                    title: 'Material Gate Register (Clause 55)',
                    subtitle: 'Verify cement, steel & pipe intake vs consumption',
                    icon: Icons.inventory_2_outlined,
                    color: const Color(0xFFEC4899),
                    count: 0,
                    onTap: () => context.push('/materials'),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildKpiCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderDim),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildAuditRow(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required int count,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.borderDim),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textBase)),
                  Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                ],
              ),
            ),
            if (count > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  count.toString(),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right, size: 18, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
