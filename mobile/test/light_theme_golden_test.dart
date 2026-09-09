import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/auth/auth_provider.dart';
import 'package:kipl_projectos/core/auth/user_model.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:kipl_projectos/features/tasks/screens/tasks_screen.dart';
import 'package:kipl_projectos/features/tasks/tasks_provider.dart';
import 'package:kipl_projectos/features/team/screens/team_screen.dart';
import 'package:kipl_projectos/features/team/team_provider.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

import 'support/platform_mocks.dart';

/// The light theme, actually painted.
///
/// It was written at the start of this work and pinned off, because eleven
/// screens still read AppColors' fixed dark hex values directly and would have
/// rendered near-white text on near-white paper. Those screens have since been
/// migrated to the ColorScheme, so this is the check that the claim is true:
/// if any of them had been missed, the text in these goldens would be invisible
/// against the ground rather than merely wrong.
class _SeededTasks extends TasksNotifier {
  _SeededTasks(super.dio, super.userId, super.projectId, super.sync, this._seed);
  final TasksState _seed;
  @override
  Future<void> fetchTasks() async => state = _seed;
}

class _SeededTeam extends TeamNotifier {
  _SeededTeam(super.dio, super.projectId, this._seed);
  final TeamState _seed;
  @override
  Future<void> fetchTeam() async => state = _seed;
}

void main() {
  setUp(installPlatformMocks);

  const manager = UserModel(
    id: 'u1',
    name: 'Shahid Parvez Khan',
    email: 'shahid@kipl.com',
    role: 'project_manager',
    projectId: 'p1',
  );

  final tasks = TasksState(
    tasks: [
      TaskItem(
        id: 't1',
        title: 'Complete excavation for inlet chamber up to founding level',
        priority: 'critical',
        status: 'todo',
        assignedName: 'Bilal Ahmad',
        dueDate:
            DateTime.now().subtract(const Duration(days: 3)).toIso8601String(),
        wbsCode: 'STP-CIV-1.2.4',
      ),
      TaskItem(
        id: 't2',
        title: 'RCC raft pour — Aeration Tank 1',
        priority: 'high',
        status: 'in_progress',
        assignedName: 'Mudasir Khan',
        dueDate: DateTime.now().add(const Duration(days: 1)).toIso8601String(),
      ),
      TaskItem(
        id: 't3',
        title: 'Submit weekly progress photographs to UEED',
        priority: 'low',
        status: 'done',
        assignedName: 'Shahid Parvez Khan',
      ),
    ],
  );

  const team = TeamState(
    members: [
      TeamMember(
        id: 'm1',
        name: 'Bilal Ahmad',
        designation: 'Site Engineer',
        department: 'Civil',
        empCode: 'KIPL-014',
        phone: '9419001234',
      ),
      TeamMember(
        id: 'm2',
        name: 'Mudasir Khan',
        designation: 'Foreman',
        department: 'Civil',
        empCode: 'KIPL-022',
        phone: '9419005678',
      ),
      TeamMember(
        id: 'm3',
        name: 'Irfan Bhat',
        designation: 'Store Keeper',
        department: 'Stores',
        empCode: 'KIPL-031',
      ),
    ],
  );

  Future<void> shoot(
    WidgetTester tester,
    Widget screen,
    List<Override> overrides,
    String name,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          currentUserProvider.overrideWith((ref) => manager),
          ...overrides,
        ],
        child: MaterialApp(
          // The real app passes both and follows the system; this pins light
          // so the golden is deterministic.
          theme: AppTheme.light,
          debugShowCheckedModeBanner: false,
          home: screen,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 400));

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/light_$name.png'),
    );
  }

  testWidgets('light — tasks', (t) async {
    await shoot(
      t,
      const TasksScreen(),
      [
        tasksProvider.overrideWith((ref) => _SeededTasks(Dio(), 'u1', 'p1',
            ref.watch(syncServiceProvider.notifier), tasks)),
      ],
      'tasks',
    );
  });

  testWidgets('light — team directory', (t) async {
    await shoot(
      t,
      const TeamScreen(),
      [teamProvider.overrideWith((ref) => _SeededTeam(Dio(), 'p1', team))],
      'team',
    );
  });
}
