import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/project_info.dart';
import '../../core/utils/json_parsers.dart';

/// Where the job stands against its contract, as the web dashboard shows it.
///
/// Every field is nullable on purpose. This is read by people making calls on
/// a live ₹280 Cr contract, so anything the API did not return is rendered as
/// an em dash and never as a plausible default — the same rule the web
/// dashboard now follows after it was caught substituting a hard-coded
/// contract value and project name.
class ProjectSummary {
  const ProjectSummary({
    this.workDonePct,
    this.timeElapsedPct,
    this.daysRemaining,
    this.totalTasks,
    this.completed,
    this.inProgress,
    this.delayed,
    this.milestones,
    this.milestonesHit,
    this.criticalTasks,
    this.contractStart,
    this.contractEnd,
  });

  final double? workDonePct;
  final double? timeElapsedPct;
  final int? daysRemaining;
  final int? totalTasks;
  final int? completed;
  final int? inProgress;
  final int? delayed;
  final int? milestones;
  final int? milestonesHit;
  final int? criticalTasks;
  final String? contractStart;
  final String? contractEnd;

  /// Work done minus contract time elapsed, in percentage points.
  ///
  /// The single most useful number on the dashboard: 4.2% of the work against
  /// 34% of the programme is a 30-point hole, and stating it as one figure
  /// saves everyone doing the subtraction. Null when either side is unknown —
  /// a variance computed from a guess is worse than no variance.
  double? get variancePoints {
    final work = workDonePct;
    final time = timeElapsedPct;
    if (work == null || time == null) return null;
    return work - time;
  }

  bool get isBehind => (variancePoints ?? 0) < 0;

  /// The API returns overallProgress and contractPct as strings (toFixed(1)),
  /// and the counts as numbers. jsonDouble/jsonInt absorb both.
  factory ProjectSummary.fromJson(Map<String, dynamic> json) {
    return ProjectSummary(
      workDonePct: jsonDouble(json['overallProgress']),
      timeElapsedPct: jsonDouble(json['contractPct']),
      daysRemaining: jsonInt(json['daysRemaining']),
      totalTasks: jsonInt(json['totalTasks']),
      completed: jsonInt(json['completed']),
      inProgress: jsonInt(json['inProgress']),
      delayed: jsonInt(json['delayed']),
      milestones: jsonInt(json['milestones']),
      milestonesHit: jsonInt(json['milestonesHit']),
      criticalTasks: jsonInt(json['criticalTasks']),
      contractStart: json['contractStart'] as String?,
      contractEnd: json['contractEnd'] as String?,
    );
  }
}

/// Schedule position for the signed-in user's project.
///
/// Deliberately NOT autoDispose: the dashboard is a persistent tab inside the
/// shell's IndexedStack, so autoDispose would refetch on every tab switch.
/// Pull-to-refresh invalidates it explicitly instead.
final projectSummaryProvider = FutureProvider<ProjectSummary>((ref) async {
  final dio = ref.watch(dioProvider);
  final userProj = ref.watch(currentUserProvider)?.projectId;
  final projectId = (userProj != null && userProj.isNotEmpty)
      ? userProj
      : ProjectInfo.defaultProjectId;

  final response = await dio.get<dynamic>(
    ApiEndpoints.wbsDashboard,
    queryParameters: {'projectId': projectId},
  );
  final data = response.data;
  if (data is! Map) {
    throw DioException(
      requestOptions: response.requestOptions,
      response: response,
      message: 'Schedule summary was not in the expected format.',
    );
  }
  return ProjectSummary.fromJson(Map<String, dynamic>.from(data));
});
