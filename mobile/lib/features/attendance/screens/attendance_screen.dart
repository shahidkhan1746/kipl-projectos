import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/kipl_button.dart';
import '../../../shared/widgets/status_pill.dart';
import '../../../shared/widgets/location_disclosure.dart';
import '../attendance_provider.dart';

class AttendanceScreen extends ConsumerWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(attendanceProvider);
    final notifier = ref.read(attendanceProvider.notifier);

    final record = state.todayRecord;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Field Attendance'),
        actions: [
          IconButton(
            icon: state.isCheckingProximity
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
                  )
                : const Icon(Icons.refresh, size: 22),
            onPressed: state.isCheckingProximity ? null : () => notifier.refreshProximity(),
            tooltip: 'Refresh GPS Proximity',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => notifier.init(),
        color: AppColors.accent,
        backgroundColor: AppColors.bgCard,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 0. Prominent disclosure gate — shown before any system
              //    location prompt can be reached (Play policy).
              if (state.geofence?.needsPermission == true) ...[
                _buildLocationDisclosureCard(context, ref, state),
                const SizedBox(height: 16),
              ],

              // 1. Geofence Site Proximity Card
              _buildGeofenceRadarCard(context, state),

              const SizedBox(height: 16),

              // Feedback alerts
              if (state.message != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.greenBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.green.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: AppColors.green, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          state.message!,
                          style: const TextStyle(color: AppColors.textBase, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              if (state.error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.redBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.red.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.red, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          state.error!,
                          style: const TextStyle(color: AppColors.textBase, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // 2. Punch Actions
              _buildPunchActionCard(context, ref, state),

              const SizedBox(height: 20),

              // 3. Today's Attendance Record Details
              _buildTodaySummaryCard(context, record),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLocationDisclosureCard(
    BuildContext context,
    WidgetRef ref,
    AttendanceState state,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.accentBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.accent.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.location_on_outlined, color: AppColors.accent, size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Site location not enabled',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textBase,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Attendance has to be confirmed against the STP site. Review what '
            'is collected, then enable location access.',
            style: TextStyle(fontSize: 12.5, color: AppColors.textMuted, height: 1.45),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.shield_outlined, size: 18),
              label: const Text(
                'Enable site location',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              onPressed: state.isCheckingProximity
                  ? null
                  : () async {
                      // The disclosure must be accepted before the system
                      // prompt is reachable; grantLocationAccess is the only
                      // path that may raise it.
                      final agreed = await showLocationDisclosure(context);
                      if (!agreed) return;
                      await ref.read(attendanceProvider.notifier).grantLocationAccess();
                    },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGeofenceRadarCard(BuildContext context, AttendanceState state) {
    final geo = state.geofence;
    final isInside = geo?.isInside ?? false;
    final distance = geo?.distanceMeters ?? double.infinity;

    String statusText = 'Acquiring GPS...';

    if (geo != null) {
      if (geo.errorMessage != null) {
        statusText = 'GPS Error';
      } else if (isInside) {
        statusText = 'Inside Site Geofence (${distance.toInt()}m)';
      } else {
        final kmStr = distance >= 1000
            ? '${(distance / 1000).toStringAsFixed(1)} km'
            : '${distance.toInt()}m';
        statusText = 'Outside Geofence ($kmStr away)';
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
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
              const Row(
                children: [
                  Icon(Icons.radar, color: AppColors.accent, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'SITE RADAR',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: StatusPill(
                    label: statusText,
                    type: isInside
                        ? StatusPillType.success
                        : (geo?.errorMessage != null
                            ? StatusPillType.error
                            : StatusPillType.warning),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Dal Lake Sewerage Scheme — 38.5 MLD STP',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textBase,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Nishat, Srinagar (Geofence radius: 500m)',
            style: TextStyle(fontSize: 12, color: AppColors.textFaint),
          ),
          if (geo?.position != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.bgSubtle,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'GPS: ${geo!.position!.latitude.toStringAsFixed(4)}, ${geo.position!.longitude.toStringAsFixed(4)} (±${geo.position!.accuracy.toInt()}m)',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPunchActionCard(BuildContext context, WidgetRef ref, AttendanceState state) {
    final notifier = ref.read(attendanceProvider.notifier);
    final record = state.todayRecord;
    final isCheckedIn = record?.isCheckedIn ?? false;
    final isCheckedOut = record?.isCheckedOut ?? false;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderDim),
      ),
      child: Column(
        children: [
          Icon(
            isCheckedOut
                ? Icons.check_circle_outline
                : (isCheckedIn ? Icons.login_outlined : Icons.touch_app_outlined),
            size: 48,
            color: isCheckedOut ? AppColors.green : AppColors.accent,
          ),
          const SizedBox(height: 12),
          Text(
            isCheckedOut
                ? 'Work Completed for Today'
                : (isCheckedIn ? 'Currently Checked In' : 'Ready to Punch In'),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textBase,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            DateFormatters.formatIndian(DateTime.now()),
            style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
          ),
          const SizedBox(height: 20),
          if (!isCheckedIn) ...[
            KiplButton(
              label: 'Punch Check-In',
              icon: Icons.login,
              isLoading: state.isSubmitting,
              onPressed: () => notifier.punchCheckIn(),
            ),
          ] else if (!isCheckedOut) ...[
            KiplButton(
              label: 'Punch Check-Out',
              icon: Icons.logout,
              variant: KiplButtonVariant.danger,
              isLoading: state.isSubmitting,
              onPressed: () => notifier.punchCheckOut(),
            ),
          ] else ...[
            const Text(
              '✓ You have logged your full day on site.',
              style: TextStyle(color: AppColors.green, fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTodaySummaryCard(BuildContext context, AttendanceRecord? record) {
    return Container(
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
            "TODAY'S LOG",
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 24,
            runSpacing: 16,
            children: [
              _buildStatItem('Check In', DateFormatters.formatTime(record?.checkInTime)),
              _buildStatItem('Check Out', DateFormatters.formatTime(record?.checkOutTime)),
              _buildStatItem(
                'Total Hours',
                record?.hoursWorked != null ? '${record!.hoursWorked!.toStringAsFixed(1)}h' : '—',
              ),
              _buildStatItem(
                'GPS Status',
                record?.geoVerified == true ? 'Verified' : (record?.isCheckedIn == true ? 'Unverified' : '—'),
                color: record?.geoVerified == true ? AppColors.green : AppColors.amber,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: color ?? AppColors.textBase,
          ),
        ),
      ],
    );
  }
}
