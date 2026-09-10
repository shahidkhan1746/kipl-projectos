import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';

class TeamMember {
  final String id;
  final String? empCode;
  final String name;
  final String designation;
  final String department;
  final String? phone;
  final String? email;
  final String status;

  const TeamMember({
    required this.id,
    this.empCode,
    required this.name,
    required this.designation,
    required this.department,
    this.phone,
    this.email,
    this.status = 'active',
  });

  factory TeamMember.fromJson(Map<String, dynamic> json) {
    final first = json['firstName'] as String? ?? '';
    final last = json['lastName'] as String? ?? '';
    final fullName = json['name'] as String? ?? ('$first $last').trim();

    return TeamMember(
      id: json['id'] as String? ?? '',
      empCode: json['empCode'] as String?,
      name: fullName.isNotEmpty ? fullName : 'Site Personnel',
      designation: json['designation'] as String? ?? 'Field Staff',
      department: json['department'] as String? ?? 'Operations',
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      status: json['status'] as String? ?? 'active',
    );
  }
}

class TeamState {
  final bool isLoading;
  final List<TeamMember> members;
  final String selectedDept; // 'all' or department name
  final String searchQuery;
  final String? error;

  const TeamState({
    this.isLoading = false,
    this.members = const [],
    this.selectedDept = 'all',
    this.searchQuery = '',
    this.error,
  });

  List<TeamMember> get filteredMembers {
    return members.where((m) {
      final matchesDept = selectedDept == 'all' ||
          m.department.toLowerCase() == selectedDept.toLowerCase();
      final matchesQuery = searchQuery.isEmpty ||
          m.name.toLowerCase().contains(searchQuery.toLowerCase()) ||
          m.designation.toLowerCase().contains(searchQuery.toLowerCase()) ||
          (m.empCode?.toLowerCase().contains(searchQuery.toLowerCase()) ??
              false);
      return matchesDept && matchesQuery;
    }).toList();
  }

  List<String> get availableDepartments {
    final set = <String>{'all'};
    for (final m in members) {
      if (m.department.isNotEmpty) set.add(m.department);
    }
    return set.toList();
  }

  TeamState copyWith({
    bool? isLoading,
    List<TeamMember>? members,
    String? selectedDept,
    String? searchQuery,
    String? error,
  }) =>
      TeamState(
        isLoading: isLoading ?? this.isLoading,
        members: members ?? this.members,
        selectedDept: selectedDept ?? this.selectedDept,
        searchQuery: searchQuery ?? this.searchQuery,
        error: error,
      );
}

final teamProvider = StateNotifierProvider<TeamNotifier, TeamState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  return TeamNotifier(dio, user?.projectId);
});

class TeamNotifier extends StateNotifier<TeamState> {
  final Dio _dio;
  final String? _projectId;

  TeamNotifier(this._dio, this._projectId) : super(const TeamState()) {
    fetchTeam();
  }

  void setDepartment(String dept) => state = state.copyWith(selectedDept: dept);
  void setSearch(String query) => state = state.copyWith(searchQuery: query);

  Future<void> fetchTeam() async {
    state = state.copyWith(isLoading: true, error: null);
    if (_projectId == null || _projectId.isEmpty) {
      state = state.copyWith(
        isLoading: false,
        error: 'Your project assignment is missing. Contact an administrator.',
      );
      return;
    }
    try {
      final res = await _dio.get(ApiEndpoints.teamDirectory, queryParameters: {
        'projectId': _projectId,
      });

      final List raw = res.data is List
          ? res.data
          : (res.data?['data'] is List ? res.data['data'] : []);
      final list = raw.map((i) => TeamMember.fromJson(i)).toList();
      state = state.copyWith(isLoading: false, members: list);
    } catch (e) {
      state = state.copyWith(
          isLoading: false, error: 'Failed to load team directory: $e');
    }
  }
}
