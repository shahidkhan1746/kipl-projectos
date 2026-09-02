import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/status_pill.dart';
import '../../attendance/attendance_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final authNotifier = ref.read(authStateProvider.notifier);
    final attState = ref.watch(attendanceProvider);

    final geo = attState.geofence;
    final isInside = geo?.isInside ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.accentBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.water_drop, color: AppColors.accent, size: 18),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('KIPL ProjectOS', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                Text('Dal Lake 38.5 MLD STP', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined, size: 20),
            tooltip: 'Sign Out',
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.bgCard,
                  title: const Text('Sign Out', style: TextStyle(color: AppColors.textBase)),
                  content: const Text('Are you sure you want to sign out of KIPL ProjectOS?',
                      style: TextStyle(color: AppColors.textMuted)),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Sign Out', style: TextStyle(color: AppColors.red)),
                    ),
                  ],
                ),
              );
              if (confirm == true) {
                authNotifier.logout();
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.read(attendanceProvider.notifier).init();
        },
        color: AppColors.accent,
        backgroundColor: AppColors.bgCard,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. User welcome banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF161B22), Color(0xFF1F2B3E)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.borderDim),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Welcome back,',
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                        StatusPill(
                          label: user?.roleDisplay ?? 'Field User',
                          type: StatusPillType.info,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.name.isNotEmpty == true ? user!.name : 'Site Engineer',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textBase,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(
                          isInside ? Icons.verified_rounded : Icons.location_on_outlined,
                          size: 16,
                          color: isInside ? AppColors.green : AppColors.amber,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            isInside
                                ? 'Inside Dal Lake STP Boundary (GPS Verified)'
                                : 'Outside STP Site Geofence (${geo?.distanceMeters.toInt() ?? 0}m away)',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: isInside ? AppColors.green : AppColors.amber,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // 2. Today's Date & Quick stats
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      'TODAY',
                      DateFormatters.formatIndian(DateTime.now()),
                      Icons.calendar_today_outlined,
                      AppColors.accent,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      'PUNCH STATUS',
                      attState.todayRecord?.isCheckedIn == true ? 'Active on Site' : 'Not Punched',
                      Icons.timer_outlined,
                      attState.todayRecord?.isCheckedIn == true ? AppColors.green : AppColors.amber,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // 3. Quick Actions
              const Text(
                'QUICK ACTIONS',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 12),

              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: [
                  _buildActionCard(
                    context,
                    title: 'Field Attendance',
                    subtitle: 'GPS Geofence punch',
                    icon: Icons.fingerprint,
                    color: AppColors.teal,
                    onTap: () => context.go('/attendance'),
                  ),
                  _buildActionCard(
                    context,
                    title: 'Site Diary',
                    subtitle: 'Daily progress log',
                    icon: Icons.menu_book_outlined,
                    color: AppColors.accent,
                    onTap: () => context.go('/diary'),
                  ),
                  _buildActionCard(
                    context,
                    title: 'Field Tasks',
                    subtitle: 'Assigned checklists',
                    icon: Icons.assignment_turned_in_outlined,
                    color: AppColors.amber,
                    onTap: () => context.go('/tasks'),
                  ),
                  _buildActionCard(
                    context,
                    title: 'Plant & Fleet',
                    subtitle: 'Hours & fuel intake',
                    icon: Icons.construction_outlined,
                    color: const Color(0xFFA855F7),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Plant & Fleet mobile module ready for Phase 2!'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // 4. Project Reference Details
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.borderDim),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PROJECT REFERENCE',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Survey, Design & Execution of Sewerage Scheme Dal Lake (38.5 MLD STP Srinagar)',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textBase),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Client: J&K Lakes Conservation & Management Authority (LCMA)',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Contractor: M/S Khilari Infrastructure Pvt. Ltd.',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderDim),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
              Icon(icon, size: 16, color: color),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderDim),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textBase),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 11, color: AppColors.textFaint),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
