import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/kipl_button.dart';
import '../leave_provider.dart';

class LeaveScreen extends ConsumerStatefulWidget {
  const LeaveScreen({super.key});
  @override
  ConsumerState<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends ConsumerState<LeaveScreen> {
  String _type = 'casual';
  DateTime _from = DateTime.now();
  DateTime _to = DateTime.now();
  final _reason = TextEditingController();

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  String _iso(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(leaveProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Leave')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(leaveProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (state.error != null)
              Text(state.error!, style: const TextStyle(color: AppColors.red)),
            if (state.message != null)
              Text(state.message!, style: const TextStyle(color: AppColors.green)),
            const Text('Apply', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            DropdownButton<String>(
              value: _type,
              isExpanded: true,
              items: const [
                DropdownMenuItem(value: 'casual', child: Text('Casual')),
                DropdownMenuItem(value: 'sick', child: Text('Sick')),
                DropdownMenuItem(value: 'earned', child: Text('Earned')),
                DropdownMenuItem(value: 'unpaid', child: Text('Unpaid')),
              ],
              onChanged: (v) => setState(() => _type = v ?? 'casual'),
            ),
            ListTile(
              title: Text('From ${_iso(_from)}'),
              onTap: () async {
                final d = await showDatePicker(context: context, firstDate: DateTime(2024), lastDate: DateTime(2030), initialDate: _from);
                if (d != null) setState(() => _from = d);
              },
            ),
            ListTile(
              title: Text('To ${_iso(_to)}'),
              onTap: () async {
                final d = await showDatePicker(context: context, firstDate: DateTime(2024), lastDate: DateTime(2030), initialDate: _to);
                if (d != null) setState(() => _to = d);
              },
            ),
            TextField(controller: _reason, decoration: const InputDecoration(labelText: 'Reason')),
            const SizedBox(height: 12),
            KiplButton(
              label: state.isSubmitting ? 'Submitting…' : 'Submit application',
              onPressed: state.isSubmitting
                  ? null
                  : () => ref.read(leaveProvider.notifier).apply(
                        type: _type,
                        from: _iso(_from),
                        to: _iso(_to),
                        reason: _reason.text,
                      ),
            ),
            const SizedBox(height: 24),
            const Text('Your applications', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            if (state.isLoading) const Center(child: CircularProgressIndicator()),
            ...state.items.map((row) => ListTile(
              title: Text('${row.leaveType} · ${row.status}'),
              subtitle: Text('${row.fromDate} → ${row.toDate}\n${row.reason ?? ''}'),
            )),
          ],
        ),
      ),
    );
  }
}
