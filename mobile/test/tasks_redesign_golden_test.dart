import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:kipl_projectos/features/tasks/screens/tasks_screen.dart';
import 'package:kipl_projectos/features/tasks/tasks_provider.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

/// Renders the redesigned Tasks screen so it can be judged as pixels.
///
/// Compiling is not evidence that a screen looks right: overflow, clipping,
/// lost contrast and cramped rows are all invisible to `flutter analyze` and
/// obvious in an image. Each case here is one the screen has to survive — a
/// small phone, doubled system text, and the two states that are not data.
class _SeededTasks extends TasksNotifier {
  _SeededTasks(super.dio, super.userId, super.projectId, super.sync, this._seed);

  final TasksState _seed;

  @override
  Future<void> fetchTasks() async => state = _seed;
}

void main() {
  final populated = TasksState(
    tasks: [
      TaskItem(
        id: 't1',
        title: 'Complete excavation for inlet chamber up to founding level',
        description: 'Excavate to founding level, record levels and get the '
            'section inspected by the site engineer before blinding.',
        priority: 'critical',
        status: 'todo',
        assignedName: 'Bilal Ahmad',
        // Deliberately in the past — this must read as overdue.
        dueDate:
            DateTime.now().subtract(const Duration(days: 3)).toIso8601String(),
        wbsCode: 'STP-CIV-1.2.4',
      ),
      TaskItem(
        id: 't2',
        title: 'RCC raft pour — Aeration Tank 1',
        description:
            'Pour raft in one continuous operation. Arrange 2 vibrators.',
        priority: 'high',
        status: 'in_progress',
        assignedName: 'Mudasir Khan',
        dueDate: DateTime.now().add(const Duration(days: 1)).toIso8601String(),
        wbsCode: 'STP-CIV-2.1.1',
        progressPct: 45,
      ),
      TaskItem(
        id: 't3',
        title: 'Shuttering material inspection',
        priority: 'medium',
        status: 'blocked',
        assignedName: 'Irfan Bhat',
        dueDate: DateTime.now().toIso8601String(),
        wbsCode: 'STP-CIV-2.1.3',
      ),
      TaskItem(
        id: 't4',
        title: 'Submit weekly progress photographs to UEED',
        priority: 'low',
        status: 'done',
        assignedName: 'Shahid Parvez Khan',
        // Past due AND complete: a finished task must not be shown as late.
        dueDate:
            DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
        wbsCode: 'STP-ADM-0.4',
      ),
      TaskItem(
        id: 't5',
        title: 'Barricade the northern approach and post signage before the '
            'night shift begins work near the outfall',
        priority: 'high',
        status: 'todo',
        assignedName: 'Site Safety',
        dueDate: DateTime.now().add(const Duration(days: 6)).toIso8601String(),
        wbsCode: 'STP-HSE-1.1',
      ),
    ],
  );

  Widget harness(TasksState seed) => ProviderScope(
        overrides: [
          tasksProvider.overrideWith(
            (ref) => _SeededTasks(Dio(), 'u1', 'p1',
                ref.watch(syncServiceProvider.notifier), seed),
          ),
        ],
        child: MaterialApp(theme: AppTheme.dark, home: const TasksScreen()),
      );

  Future<void> shoot(
    WidgetTester tester,
    TasksState seed,
    String name, {
    Size size = const Size(390, 844),
    double textScale = 1.0,
  }) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    // Copy the real MediaQueryData and override only the scale. Building a
    // bare MediaQueryData replaces every other field, so size becomes zero and
    // anything that measures the viewport silently renders nothing.
    await tester.pumpWidget(
      Builder(
        builder: (context) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(textScale)),
          child: harness(seed),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 400));

    await expectLater(
      find.byType(TasksScreen),
      matchesGoldenFile('goldens/tasks_$name.png'),
    );
  }

  testWidgets('tasks — populated, 390dp', (t) async {
    await shoot(t, populated, 'after');
  });

  testWidgets('tasks — small phone, 320dp', (t) async {
    await shoot(t, populated, 'small', size: const Size(320, 640));
  });

  testWidgets('tasks — 200% system text', (t) async {
    await shoot(t, populated, 'large_text', textScale: 2.0);
  });

  testWidgets('tasks — empty under a filter', (t) async {
    await shoot(
      t,
      populated.copyWith(filter: 'blocked', tasks: const []),
      'empty',
    );
  });

  testWidgets('tasks — error with nothing cached', (t) async {
    await shoot(
      t,
      const TasksState(
        error: 'Could not load tasks. Check your connection and try again.',
      ),
      'error',
    );
  });
}
