import 'package:flutter/material.dart';

// DashboardScreen — will be fully built in later phases
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('DashboardScreen')),
      body: const Center(
        child: Text('Coming soon', style: TextStyle(color: Colors.white54)),
      ),
    );
  }
}
