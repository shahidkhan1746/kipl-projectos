import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/project_info.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/location_disclosure.dart';
import '../attendance_provider.dart';

/// Punching in and out, in the order the job actually happens.
///
/// This screen is used twice a day by every worker on site, standing at a
/// gate, usually in a hurry and often in sun. It previously opened with a
/// disclosure card, then a "SITE RADAR" panel, then a success banner, then an
/// error banner — and only then the punch button, at line 288 of 413. The
/// primary action of the most-used screen in the app was below the fold.
///
///   the goal      record that I arrived, or that I left
///   primary       can I punch right now, and what is my state today
///   secondary     hours, check-in time, GPS verification
///   tertiary      coordinates, accuracy, site radius — folded away
///   primary act   ONE punch button, first on the screen, 56dp tall
///
/// The other change is that the button now says what is wrong before it is
/// pressed. Six conditions gate a check-in, and every one of them used to be
/// discovered only after the tap and a fresh GPS read — a red banner arriving
/// several seconds too late to a person who has already put the phone away.
/// [checkInBlocker] is now shared with the provider, so the screen can render
/// the blocker from the fix it already has.
class AttendanceScreen extends ConsumerWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(attendanceProvider);
    final notifier = ref.read(attendanceProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Field Attendance'),
        actions: [
          IconButton(
            icon: state.isCheckingProximity
                ? const SizedBox(
                    width: Sizes.icon,
                    height: Sizes.icon,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.my_location),
            tooltip: 'Re-check my position',
            onPressed:
                state.isCheckingProximity ? null : notifier.refreshProximity,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: notifier.init,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(
            Space.gutter,
            Space.lg,
            Space.gutter,
            Space.giant,
          ),
          children: [
            // The disclosure gate has to precede any system location prompt
            // (Play policy), and it only appears when access has never been
            // granted — so it is above the punch panel, but almost never seen.
            if (state.geofence?.needsPermission == true) ...[
              _LocationDisclosureCard(state: state),
              const SizedBox(height: Space.lg),
            ],

            _PunchPanel(state: state),

            const SizedBox(height: Space.lg),
            _TodayLog(record: state.todayRecord),

            const SizedBox(height: Space.lg),
            _SiteDetails(state: state),
          ],
        ),
      ),
    );
  }
}

/// Where the worker stands, as one line the button can be read against.
class _ReadinessLine extends StatelessWidget {
  const _ReadinessLine({required this.state});

  final AttendanceState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;
    final geo = state.geofence;
    final inside = geo?.isInside ?? false;

    final (Color tone, IconData icon) = state.isCheckingProximity
        ? (status.neutral, Icons.gps_not_fixed)
        : inside
            ? (status.success, Icons.gps_fixed)
            : geo?.errorMessage != null || geo?.needsPermission == true
                ? (status.danger, Icons.gps_off)
                : (status.warning, Icons.gps_not_fixed);

    // statusLabel is the one formatter for this, shared with the dashboard.
    // Both screens used to format distanceMeters themselves and disagreed
    // about the no-fix case: this one printed "Outside Geofence (Infinity km
    // away)" while the dashboard crashed on Infinity.round().
    final label = state.isCheckingProximity
        ? 'Checking your position…'
        : geo?.statusLabel ?? 'Waiting for a GPS position';

    return Row(
      children: [
        Icon(icon, size: Sizes.icon, color: tone),
        const SizedBox(width: Space.sm),
        Expanded(
          child: Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: tone,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

/// The reason this screen exists.
///
/// First on the page, and the only thing on it that is 56dp tall.
class _PunchPanel extends ConsumerWidget {
  const _PunchPanel({required this.state});

  final AttendanceState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final status = context.status;
    final notifier = ref.read(attendanceProvider.notifier);

    final record = state.todayRecord;
    final checkedIn = record?.isCheckedIn ?? false;
    final checkedOut = record?.isCheckedOut ?? false;

    // Only a check-in is gated on position; checking out of a shift you have
    // already started is never blocked by where you are standing.
    final blocker = checkedIn ? null : checkInBlocker(state.geofence);
    final canPunch = !state.isSubmitting && blocker == null;

    return Container(
      padding: const EdgeInsets.all(Space.lg),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: Radii.cardAll,
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!checkedOut) _ReadinessLine(state: state),
          if (!checkedOut) const SizedBox(height: Space.lg),

          // State in one line, not three. The old panel said it with a 48px
          // icon, a heading and the button label — all carrying the same fact.
          Text(
            checkedOut
                ? 'Day recorded'
                : checkedIn
                    ? 'On site since '
                        '${DateFormatters.formatTime(record?.checkInTime)}'
                    : 'Not checked in yet',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: Space.xs),
          Text(
            DateFormatters.shortDate.format(DateTime.now()),
            style: theme.textTheme.labelMedium,
          ),

          const SizedBox(height: Space.xl),

          if (checkedOut)
            Row(
              children: [
                Icon(Icons.check_circle_outline,
                    size: Sizes.icon, color: status.success),
                const SizedBox(width: Space.sm),
                Expanded(
                  child: Text(
                    'You logged a full day on site.',
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(color: status.success),
                  ),
                ),
              ],
            )
          else ...[
            SizedBox(
              height: 56,
              child: FilledButton.icon(
                onPressed: canPunch
                    ? (checkedIn
                        ? notifier.punchCheckOut
                        : notifier.punchCheckIn)
                    : null,
                icon: state.isSubmitting
                    ? const SizedBox(
                        width: Sizes.icon,
                        height: Sizes.icon,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : Icon(checkedIn ? Icons.logout : Icons.login),
                label: Text(checkedIn ? 'Punch out' : 'Punch in'),
                style: FilledButton.styleFrom(
                  backgroundColor:
                      checkedIn ? status.danger : theme.colorScheme.primary,
                  foregroundColor: Colors.white,
                  textStyle: theme.textTheme.titleMedium,
                ),
              ),
            ),

            // The blocker, under the button it disables. Saying this here
            // rather than as a banner after the tap is the whole point: a
            // worker 40m short of the fence can walk the 40m instead of
            // pressing a button that was never going to work.
            if (blocker != null && !state.isSubmitting) ...[
              const SizedBox(height: Space.md),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline,
                      size: Sizes.iconInline, color: theme.colorScheme.outline),
                  const SizedBox(width: Space.sm),
                  Expanded(
                    child: Text(blocker, style: theme.textTheme.bodySmall),
                  ),
                ],
              ),
            ],
          ],

          // The provider still reports what happened after the fact — an
          // offline queue, a server rejection, a successful punch.
          if (state.message != null) ...[
            const SizedBox(height: Space.md),
            _Note(
                text: state.message!,
                tone: status.success,
                icon: Icons.check_circle),
          ],
          if (state.error != null) ...[
            const SizedBox(height: Space.md),
            _Note(
                text: state.error!,
                tone: status.danger,
                icon: Icons.error_outline),
          ],
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.text, required this.tone, required this.icon});

  final String text;
  final Color tone;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: Sizes.iconInline, color: tone),
        const SizedBox(width: Space.sm),
        Expanded(
          child: Text(
            text,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tone),
          ),
        ),
      ],
    );
  }
}

/// What today's record holds, as a table rather than four floating figures.
class _TodayLog extends StatelessWidget {
  const _TodayLog({required this.record});

  final AttendanceRecord? record;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;

    final verified = record?.geoVerified == true;
    final punchedIn = record?.isCheckedIn == true;

    return _Section(
      title: "Today's log",
      child: Column(
        children: [
          _Row(
            label: 'Check in',
            value: DateFormatters.formatTime(record?.checkInTime),
          ),
          _Row(
            label: 'Check out',
            value: DateFormatters.formatTime(record?.checkOutTime),
          ),
          _Row(
            label: 'Hours',
            value: record?.hoursWorked == null
                ? '—'
                : '${record!.hoursWorked!.toStringAsFixed(1)} h',
          ),
          _Row(
            label: 'GPS',
            // Colour is not the only carrier: the words say it too, which is
            // what a colour-blind worker and a screen reader both need.
            value: verified
                ? 'Verified at site'
                : punchedIn
                    ? 'Not verified'
                    : '—',
            valueColor: verified
                ? status.success
                : punchedIn
                    ? status.warning
                    : theme.colorScheme.onSurface,
          ),
        ],
      ),
    );
  }
}

/// Site, radius and raw fix. Collapsed, because a worker checks this roughly
/// never and it cost the punch button its place on the screen.
class _SiteDetails extends StatelessWidget {
  const _SiteDetails({required this.state});

  final AttendanceState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final position = state.geofence?.position;

    return Theme(
      // The default ExpansionTile paints its own divider lines above and
      // below, which fight the section's border.
      data: theme.copyWith(dividerColor: Colors.transparent),
      child: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerLow,
          borderRadius: Radii.cardAll,
          border: Border.all(color: theme.colorScheme.outlineVariant),
        ),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: Space.lg),
          childrenPadding: const EdgeInsets.fromLTRB(
            Space.lg,
            0,
            Space.lg,
            Space.lg,
          ),
          shape: const RoundedRectangleBorder(borderRadius: Radii.cardAll),
          collapsedShape:
              const RoundedRectangleBorder(borderRadius: Radii.cardAll),
          title: Text('Site and position', style: theme.textTheme.titleSmall),
          subtitle: Text(
            ProjectInfo.siteLocation,
            style: theme.textTheme.labelMedium,
          ),
          children: [
            const _Row(label: 'Scheme', value: ProjectInfo.schemeWithCapacity),
            _Row(
              label: 'Geofence',
              value: '${ProjectInfo.defaultGeofenceRadiusMeters.round()} m '
                  'around the site',
            ),
            _Row(
              label: 'Your fix',
              value: position == null
                  ? '—'
                  : '${position.latitude.toStringAsFixed(4)}, '
                      '${position.longitude.toStringAsFixed(4)}',
            ),
            _Row(
              label: 'Accuracy',
              value:
                  position == null ? '—' : '± ${position.accuracy.round()} m',
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(Space.lg),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: Radii.cardAll,
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: theme.textTheme.titleSmall),
          const SizedBox(height: Space.md),
          child,
        ],
      ),
    );
  }
}

/// A label and its value, aligned down a column.
///
/// Side by side at normal text sizes, because a table of four facts is read by
/// scanning the value column. Stacked once the system font is large enough
/// that a fixed label column would leave the value three characters and an
/// ellipsis — the threshold is where a 92dp label stops fitting "Check out".
///
/// A Wrap was the obvious choice here and the wrong one: it lays each child
/// out independently, so a value that did not fit pushed itself to a new run
/// and left its label alone on the line above, and the four rows stopped
/// agreeing on where the label column started.
class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value, this.valueColor});

  final String label;
  final String value;
  final Color? valueColor;

  static const _labelWidth = 92.0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scaler = MediaQuery.textScalerOf(context);
    final stacked = scaler.scale(_labelWidth) > 150;

    final labelWidget = Text(label, style: theme.textTheme.labelMedium);
    final valueWidget = Text(
      value,
      style: theme.textTheme.bodySmall?.copyWith(
        color: valueColor ?? theme.colorScheme.onSurface,
        fontWeight: FontWeight.w600,
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: Space.md),
      child: stacked
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                labelWidget,
                const SizedBox(height: Space.xs),
                valueWidget,
              ],
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(width: _labelWidth, child: labelWidget),
                const SizedBox(width: Space.md),
                Expanded(child: valueWidget),
              ],
            ),
    );
  }
}

/// Prominent disclosure, shown before any system location prompt can be
/// reached. Required by Play policy, and the only path to granting access.
class _LocationDisclosureCard extends ConsumerWidget {
  const _LocationDisclosureCard({required this.state});

  final AttendanceState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final status = context.status;

    return Container(
      padding: const EdgeInsets.all(Space.lg),
      decoration: BoxDecoration(
        color: status.warningContainer,
        borderRadius: Radii.cardAll,
        border: Border.all(color: status.warning.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.shield_outlined,
                  size: Sizes.icon, color: status.onWarningContainer),
              const SizedBox(width: Space.sm),
              Text(
                'Location access needed',
                style: theme.textTheme.titleSmall
                    ?.copyWith(color: status.onWarningContainer),
              ),
            ],
          ),
          const SizedBox(height: Space.sm),
          Text(
            'Attendance is recorded against the site geofence, so the app '
            'needs your position at the moment you punch in. It is not '
            'collected at any other time.',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: status.onWarningContainer),
          ),
          const SizedBox(height: Space.lg),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              icon: const Icon(Icons.shield_outlined, size: Sizes.icon),
              label: const Text('Enable site location'),
              onPressed: state.isCheckingProximity
                  ? null
                  : () async {
                      // The disclosure dialog must be accepted before the
                      // system prompt is reachable — grantLocationAccess is
                      // the only path that may raise it.
                      final agreed = await showLocationDisclosure(context);
                      if (!agreed || !context.mounted) return;
                      await ref
                          .read(attendanceProvider.notifier)
                          .grantLocationAccess();
                    },
            ),
          ),
        ],
      ),
    );
  }
}
