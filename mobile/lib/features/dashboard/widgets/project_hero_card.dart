import 'package:flutter/material.dart';
import '../../../core/project_info.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/field_theme.dart';
import '../../../shared/widgets/field_components.dart';
import '../project_summary_provider.dart';

/// Public contract retained; the former hero is now a compact project snapshot.
class ProjectHeroCard extends StatelessWidget {
  const ProjectHeroCard(
      {super.key,
      required this.summary,
      required this.locationStatus,
      required this.isInsideGeofence});
  final ProjectSummary summary;
  final String locationStatus;
  final bool isInsideGeofence;

  String _percent(double? value) =>
      value == null || !value.isFinite ? '—' : '${value.toStringAsFixed(1)}%';
  String _count(int? value) => value?.toString() ?? '—';
  String _date(String? value) => DateFormatters.formatIndian(
      value == null ? null : DateTime.tryParse(value));

  @override
  Widget build(BuildContext context) {
    final variance = summary.variancePoints;
    final knownVariance = variance != null && variance.isFinite;
    final varianceText = !knownVariance
        ? 'Schedule comparison unavailable'
        : variance == 0
            ? 'Work progress matches elapsed contract time'
            : '${variance.abs().toStringAsFixed(1)} percentage points ${variance < 0 ? 'behind' : 'ahead of'} elapsed contract time';
    return Container(
      decoration: BoxDecoration(
          color: FieldColors.surface,
          borderRadius: BorderRadius.circular(FieldShape.surface)),
      padding: const EdgeInsets.all(FieldSpace.lg),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text(ProjectInfo.schemeName, style: FieldType.label),
        const SizedBox(height: FieldSpace.xs),
        const Text(
            '${ProjectInfo.stpCapacity} STP · ${ProjectInfo.siteLocation}',
            style: FieldType.supporting),
        const SizedBox(height: FieldSpace.gutter),
        FieldAdaptiveGroup(minimumWidth: 112, children: [
          _Stat(label: 'Work completed', value: _percent(summary.workDonePct)),
          _Stat(
              label: 'Contract time elapsed',
              value: _percent(summary.timeElapsedPct)),
        ]),
        const SizedBox(height: FieldSpace.lg),
        Text(varianceText,
            style: FieldType.supporting.copyWith(
                color: knownVariance && variance < 0
                    ? FieldColors.warning
                    : FieldColors.textSecondary)),
        const SizedBox(height: FieldSpace.md),
        const Divider(),
        ExpansionTile(
          key: const PageStorageKey('project-details'),
          tilePadding: EdgeInsets.zero,
          childrenPadding: const EdgeInsets.only(bottom: FieldSpace.sm),
          minTileHeight: FieldSize.control,
          shape: const Border(),
          collapsedShape: const Border(),
          expansionAnimationStyle: AnimationStyle(
              duration: FieldMotion.duration(context),
              curve: FieldMotion.curve),
          title: const Text('Project details', style: FieldType.label),
          children: [
            FieldAdaptiveGroup(minimumWidth: 120, children: [
              _Fact(
                  label: 'Contract start', value: _date(summary.contractStart)),
              _Fact(label: 'Contract end', value: _date(summary.contractEnd)),
              _Fact(
                  label: 'Days remaining',
                  value: _count(summary.daysRemaining)),
              _Fact(
                  label: 'Milestones reached',
                  value:
                      '${_count(summary.milestonesHit)} / ${_count(summary.milestones)}'),
              _Fact(
                  label: 'Tasks completed',
                  value:
                      '${_count(summary.completed)} / ${_count(summary.totalTasks)}'),
              _Fact(
                  label: 'Tasks in progress',
                  value: _count(summary.inProgress)),
              _Fact(label: 'Delayed tasks', value: _count(summary.delayed)),
              _Fact(
                  label: 'Critical tasks',
                  value: _count(summary.criticalTasks)),
            ]),
            const SizedBox(height: FieldSpace.lg),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(
                  isInsideGeofence
                      ? Icons.location_on
                      : Icons.location_on_outlined,
                  size: FieldSize.iconSmall,
                  color: FieldColors.textSecondary),
              const SizedBox(width: FieldSpace.sm),
              Expanded(
                  child: Text(locationStatus, style: FieldType.supporting)),
            ]),
            const SizedBox(height: FieldSpace.lg),
            const Text(
                'Survey, Design & Execution of Sewerage Scheme Dal Lake (${ProjectInfo.stpCapacity} STP Srinagar)',
                style: FieldType.supporting),
            const SizedBox(height: FieldSpace.sm),
            const Text(
                'Employer: J&K Urban Environmental Engineering Department (UEED)\nContractor: M/S Khilari Infrastructure Pvt. Ltd.',
                style: FieldType.supporting),
          ],
        ),
      ]),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Semantics(
        label: '$label: ${value == '—' ? 'unavailable' : value}',
        excludeSemantics: true,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: FieldType.stat),
          const SizedBox(height: FieldSpace.xs),
          Text(label, style: FieldType.supporting),
        ]),
      );
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: FieldType.supporting),
        const SizedBox(height: FieldSpace.xs),
        Text(value, style: FieldType.label),
      ]);
}
