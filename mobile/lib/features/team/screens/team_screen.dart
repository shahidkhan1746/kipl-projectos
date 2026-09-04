import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/status_pill.dart';
import '../team_provider.dart';

class TeamScreen extends ConsumerStatefulWidget {
  const TeamScreen({super.key});

  @override
  ConsumerState<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends ConsumerState<TeamScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _makeCall(String phone) async {
    try {
      final cleanPhone = phone.replaceAll(RegExp(r'[^0-9+]'), '');
      final uri = Uri.parse('tel:$cleanPhone');
      if (cleanPhone.isEmpty || !await launchUrl(uri)) {
        _showLaunchError('No phone application is available.');
      }
    } catch (_) {
      _showLaunchError('No phone application is available.');
    }
  }

  Future<void> _openWhatsApp(String phone) async {
    try {
      final cleanPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
      final localPhone = cleanPhone.startsWith('0')
          ? cleanPhone.substring(1)
          : cleanPhone;
      final fullPhone = localPhone.length == 10 ? '91$localPhone' : localPhone;
      final uri = Uri.parse('https://wa.me/$fullPhone');
      if (fullPhone.isEmpty ||
          !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        _showLaunchError('WhatsApp could not be opened.');
      }
    } catch (_) {
      _showLaunchError('WhatsApp could not be opened.');
    }
  }

  void _showLaunchError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(teamProvider);
    final notifier = ref.read(teamProvider.notifier);
    final members = state.filteredMembers;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Site Team Directory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: state.isLoading ? null : () => notifier.fetchTeam(),
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Search Bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            color: AppColors.bgCard,
            child: TextField(
              controller: _searchController,
              onChanged: (v) => notifier.setSearch(v),
              style: const TextStyle(color: AppColors.textBase, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search by name, designation, or code...',
                hintStyle: const TextStyle(color: AppColors.textFaint),
                prefixIcon: const Icon(Icons.search, color: AppColors.textMuted, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          notifier.setSearch('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppColors.bgSubtle,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),

          // 2. Department Horizontal Filter
          if (state.availableDepartments.length > 1)
            Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              color: AppColors.bgCard,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: state.availableDepartments.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (ctx, i) {
                  final dept = state.availableDepartments[i];
                  final isSel = state.selectedDept.toLowerCase() == dept.toLowerCase();
                  final label = dept == 'all' ? 'All Departments' : dept;

                  return Center(
                    child: InkWell(
                      onTap: () => notifier.setDepartment(dept),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: isSel ? AppColors.accent : AppColors.bgSubtle,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          label,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSel ? FontWeight.w600 : FontWeight.normal,
                            color: isSel ? Colors.white : AppColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

          // 3. Team List
          if (state.error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(
                state.error!,
                style: const TextStyle(color: AppColors.red, fontSize: 13),
              ),
            ),
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                : members.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.people_outline, size: 48, color: AppColors.textFaint),
                            const SizedBox(height: 12),
                            const Text('No team members found.', style: TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => notifier.fetchTeam(),
                        color: AppColors.accent,
                        backgroundColor: AppColors.bgCard,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: members.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (ctx, i) => _buildContactCard(context, members[i]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactCard(BuildContext context, TeamMember member) {
    final initials = member.name.isNotEmpty
        ? member.name.split(' ').map((s) => s.isNotEmpty ? s[0] : '').take(2).join('').toUpperCase()
        : 'KP';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderDim),
      ),
      child: Row(
        children: [
          // Initials Avatar
          CircleAvatar(
            radius: 24,
            backgroundColor: AppColors.accentBg,
            child: Text(
              initials,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.accent),
            ),
          ),
          const SizedBox(width: 14),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        member.name,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textBase),
                      ),
                    ),
                    if (member.empCode != null)
                      Text(
                        member.empCode!,
                        style: const TextStyle(fontSize: 11, color: AppColors.textFaint, fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  member.designation,
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    StatusPill(label: member.department.toUpperCase(), type: StatusPillType.neutral),
                  ],
                ),
              ],
            ),
          ),

          // Actions: Call & WhatsApp
          if (member.phone != null && member.phone!.isNotEmpty) ...[
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.call, color: AppColors.green, size: 20),
              tooltip: 'Call ${member.name}',
              onPressed: () => _makeCall(member.phone!),
            ),
            IconButton(
              icon: const Icon(Icons.chat, color: AppColors.teal, size: 20),
              tooltip: 'WhatsApp ${member.name}',
              onPressed: () => _openWhatsApp(member.phone!),
            ),
          ],
        ],
      ),
    );
  }
}
