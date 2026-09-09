import 'package:flutter/material.dart';
import '../../../core/project_info.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../project_summary_provider.dart';

/// The project banner from the web dashboard, built for a phone.
///
/// This is the one surface in the app that deliberately keeps reading
/// [AppColors] directly rather than the ColorScheme. It is a fixed dark navy
/// banner — the same #1a2540 the web dashboard uses — so its ink has to stay
/// light whichever theme it is painted into. Migrating textBase to onSurface
/// here would give it near-black text on navy the moment light mode is turned
/// on, which is the opposite of what the migration is for.
///
/// Same information architecture, not a copied layout: the web puts work
/// done, time elapsed and the variance in one row because it has 1600px. Here
/// they share a row too, but at three equal thirds so the widest figure
/// ("100.0%") still fits a 320dp screen, and the six-column fact strip below
/// wraps to two rows of three.
///
/// The bar is the point of the card. It fills to work COMPLETED and carries a
/// marker at contract time elapsed, so the gap between them is a shape rather
/// than a subtraction somebody has to perform.
class ProjectHeroCard extends StatelessWidget {
  const ProjectHeroCard({
    super.key,
    required this.summary,
    required this.locationStatus,
    required this.isInsideGeofence,
  });

  final ProjectSummary summary;

  /// Where the worker is standing. Has no web equivalent — it is the one part
  /// of this card that only makes sense on a phone, so it stays.
  final String locationStatus;
  final bool isInsideGeofence;

  /// A percentage, or an em dash. Never a substituted zero.
  static String _pct(double? value) =>
      value == null ? '—' : '${value.toStringAsFixed(1)}%';

  static String _count(int? value) => value == null ? '—' : '$value';

  @override
  Widget build(BuildContext context) {
    final variance = summary.variancePoints;
    final behind = summary.isBehind;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.navy, AppColors.navyDeep],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderDim),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'ACTIVE PROJECT',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
              color: AppColors.textFaint,
            ),
          ),
          const SizedBox(height: 5),
          const Text(
            ProjectInfo.schemeWithCapacity,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: AppColors.textBase,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            '${ProjectInfo.clientName} · ${ProjectInfo.siteLocation}',
            style: TextStyle(fontSize: 11.5, color: AppColors.textMuted),
          ),

          const SizedBox(height: 16),

          // Work / time / variance, as three equal figures.
          Row(
            children: [
              Expanded(
                child: _HeroFigure(
                  value: _pct(summary.workDonePct),
                  label: 'Work done',
                  tone: AppColors.heroText,
                ),
              ),
              Expanded(
                child: _HeroFigure(
                  value: _pct(summary.timeElapsedPct),
                  label: 'Time elapsed',
                  tone: AppColors.textMuted,
                ),
              ),
              Expanded(
                child: _HeroFigure(
                  value: variance == null
                      ? '—'
                      : '${variance > 0 ? '+' : ''}${variance.toStringAsFixed(1)}%',
                  label: variance == null
                      ? 'Schedule'
                      : behind
                          ? 'Schedule Lag'
                          : 'Schedule Lead',
                  tone: variance == null
                      ? AppColors.textMuted
                      : behind
                          ? AppColors.heroBehind
                          : AppColors.heroAhead,
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          _ProgressAgainstProgramme(
            workDonePct: summary.workDonePct,
            timeElapsedPct: summary.timeElapsedPct,
            behind: behind,
          ),
          const SizedBox(height: 6),
          const Text(
            'Bar is work completed. Marker is contract time elapsed.',
            style: TextStyle(fontSize: 10, color: AppColors.textFaint),
          ),

          const SizedBox(height: 14),
          // Six facts, wrapping to two rows of three on a narrow screen.
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _HeroFact(
                label: 'Start',
                value: DateFormatters.formatIndian(
                    DateTime.tryParse(summary.contractStart ?? '')),
              ),
              _HeroFact(
                label: 'End',
                value: DateFormatters.formatIndian(
                    DateTime.tryParse(summary.contractEnd ?? '')),
              ),
              _HeroFact(
                  label: 'Days left', value: _count(summary.daysRemaining)),
              _HeroFact(
                label: 'Milestones',
                value:
                    '${_count(summary.milestonesHit)} / ${_count(summary.milestones)}',
              ),
              _HeroFact(
                  label: 'Critical', value: _count(summary.criticalTasks)),
              _HeroFact(
                label: 'Tasks done',
                value:
                    '${_count(summary.completed)} / ${_count(summary.totalTasks)}',
              ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.borderDim),
          const SizedBox(height: 12),

          Row(
            children: [
              Icon(
                isInsideGeofence
                    ? Icons.verified_rounded
                    : Icons.location_on_outlined,
                size: 16,
                color: isInsideGeofence ? AppColors.green : AppColors.amber,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  locationStatus,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: isInsideGeofence ? AppColors.green : AppColors.amber,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroFigure extends StatelessWidget {
  const _HeroFigure(
      {required this.value, required this.label, required this.tone});

  final String value;
  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            maxLines: 1,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w900,
              color: tone,
              height: 1,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label.toUpperCase(),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 9,
            letterSpacing: 0.7,
            color: AppColors.textFaint,
          ),
        ),
      ],
    );
  }
}

/// Work completed as a filled bar, contract time as a marker over it.
///
/// Animated on width via [TweenAnimationBuilder] rather than an
/// AnimationController: there is nothing to dispose, and the bar is a single
/// short bounded run on data arrival, not a loop.
class _ProgressAgainstProgramme extends StatelessWidget {
  const _ProgressAgainstProgramme({
    required this.workDonePct,
    required this.timeElapsedPct,
    required this.behind,
  });

  final double? workDonePct;
  final double? timeElapsedPct;
  final bool behind;

  static double _clamp(double v) => v.isFinite ? v.clamp(0, 100) / 100 : 0;

  @override
  Widget build(BuildContext context) {
    final work = workDonePct == null ? 0.0 : _clamp(workDonePct!);
    final time = timeElapsedPct == null ? null : _clamp(timeElapsedPct!);

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        return SizedBox(
          height: 12,
          child: Stack(
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  height: 10,
                  decoration: BoxDecoration(
                    color: AppColors.bgPage,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: work),
                duration: const Duration(milliseconds: 700),
                curve: Curves.easeOutCubic,
                builder: (context, value, _) => Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    height: 10,
                    width: width * value,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: behind
                            ? const [AppColors.amber, AppColors.red]
                            : const [AppColors.accent, AppColors.green],
                      ),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
              ),
              if (time != null)
                Positioned(
                  left: (width * time).clamp(0.0, width - 2),
                  top: 0,
                  bottom: 0,
                  child: Container(width: 2, color: AppColors.textBase),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _HeroFact extends StatelessWidget {
  const _HeroFact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 96,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 9,
              letterSpacing: 0.7,
              color: AppColors.textFaint,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: AppColors.textBase,
            ),
          ),
        ],
      ),
    );
  }
}
