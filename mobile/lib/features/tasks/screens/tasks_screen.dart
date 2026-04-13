import 'package:flutter/material.dart';

// TasksScreen — will be fully built in later phases
class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TasksScreen')),
      body: const Center(
        child: Text('Coming soon', style: TextStyle(color: Colors.white54)),
      ),
    );
  }
}
