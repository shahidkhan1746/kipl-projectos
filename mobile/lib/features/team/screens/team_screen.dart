import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/filter_bar.dart';
import '../../../shared/widgets/state_views.dart';
import '../team_provider.dart';

/// The site directory — who is on the job and how to reach them.
///
/// A directory is read to find one person and call them, so it is a list of
/// rows with a call button, not a list of cards. Each entry was a bordered card
/// carrying an avatar, name, employee code, designation, a department pill and
/// two icon buttons: about four entries per screen on a project with sixty
/// people on site.
///
/// It is a ListTile now, which is the Material component this was rebuilding by
/// hand — and brings its own 48dp targets, ink and semantics with it.
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
      final localPhone =
          cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
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
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(teamProvider);
    final notifier = ref.read(teamProvider.notifier);
    final members = state.filteredMembers;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Site Team'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload the directory',
            onPressed: state.isLoading ? null : notifier.fetchTeam,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              Space.gutter,
              Space.md,
              Space.gutter,
              Space.sm,
            ),
            child: TextField(
              controller: _searchController,
              onChanged: notifier.setSearch,
              textInputAction: TextInputAction.search,
              autocorrect: false,
              decoration: InputDecoration(
                hintText: 'Search by name, role or code',
                prefixIcon: const Icon(Icons.search, size: Sizes.icon),
                suffixIcon: state.searchQuery.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear, size: Sizes.icon),
                        tooltip: 'Clear the search',
                        onPressed: () {
                          _searchController.clear();
                          notifier.setSearch('');
                        },
                      ),
              ),
            ),
          ),
          if (state.availableDepartments.length > 1)
            FilterBar<String>(
              options: [
                for (final dept in state.availableDepartments)
                  FilterOption(
                    value: dept,
                    label: dept == 'all' ? 'Everyone' : dept,
                    count: dept == 'all'
                        ? state.members.length
                        : state.members
                            .where((m) =>
                                m.department.toLowerCase() ==
                                dept.toLowerCase())
                            .length,
                  ),
              ],
              selected: state.selectedDept,
              onSelected: notifier.setDepartment,
            ),
          const Divider(),
          if (state.error != null && members.isNotEmpty)
            InlineErrorBanner(
              message: state.error!,
              onRetry: notifier.fetchTeam,
            ),
          Expanded(child: _body(state, members, notifier)),
        ],
      ),
    );
  }

  Widget _body(
    TeamState state,
    List<TeamMember> members,
    TeamNotifier notifier,
  ) {
    if (state.isLoading && state.members.isEmpty) {
      return const LoadingState(message: 'Loading the directory…');
    }

    if (state.error != null && members.isEmpty) {
      return ErrorState(message: state.error!, onRetry: notifier.fetchTeam);
    }

    if (members.isEmpty) {
      final searching = state.searchQuery.isNotEmpty;
      return RefreshIndicator(
        onRefresh: notifier.fetchTeam,
        child: LayoutBuilder(
          builder: (context, constraints) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: searching
                    ? EmptyState(
                        icon: Icons.person_search_outlined,
                        title: 'Nobody matches "${state.searchQuery}"',
                        message: 'Search runs over names, designations and '
                            'employee codes.',
                        actionLabel: 'Clear the search',
                        onAction: () {
                          _searchController.clear();
                          notifier.setSearch('');
                        },
                      )
                    : const EmptyState(
                        icon: Icons.people_outline,
                        title: 'Nobody in this department',
                        message: 'Team members appear here once HR has added '
                            'them against this project.',
                      ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: notifier.fetchTeam,
      child: ListView.separated(
        padding: const EdgeInsets.only(bottom: Space.huge),
        itemCount: members.length,
        separatorBuilder: (_, __) =>
            const Divider(indent: 72, endIndent: Space.gutter),
        itemBuilder: (context, i) => _MemberRow(
          member: members[i],
          onCall: _makeCall,
          onWhatsApp: _openWhatsApp,
        ),
      ),
    );
  }
}

class _MemberRow extends StatelessWidget {
  const _MemberRow({
    required this.member,
    required this.onCall,
    required this.onWhatsApp,
  });

  final TeamMember member;
  final ValueChanged<String> onCall;
  final ValueChanged<String> onWhatsApp;

  /// Up to two initials, or KP when the name is unusable.
  String get _initials {
    if (member.name.trim().isEmpty) return 'KP';
    return member.name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .map((part) => part[0])
        .take(2)
        .join()
        .toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;
    final phone = member.phone;
    final hasPhone = phone != null && phone.isNotEmpty;

    return ListTile(
      leading: CircleAvatar(
        radius: 22,
        backgroundColor: theme.colorScheme.primaryContainer,
        child: Text(
          _initials,
          style: theme.textTheme.labelMedium?.copyWith(
            color: theme.colorScheme.onPrimaryContainer,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      title: Text(member.name, maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Text(
        [
          member.designation,
          member.department,
          if (member.empCode?.isNotEmpty == true) member.empCode!,
        ].where((s) => s.trim().isNotEmpty).join(' · '),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      // Call and WhatsApp only. Everything else about a person on a site
      // directory is something you read, not something you press.
      trailing: !hasPhone
          ? null
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: Icon(Icons.call, color: status.success),
                  tooltip: 'Call ${member.name}',
                  onPressed: () => onCall(phone),
                ),
                IconButton(
                  icon: Icon(Icons.chat_outlined,
                      color: theme.colorScheme.secondary),
                  tooltip: 'WhatsApp ${member.name}',
                  onPressed: () => onWhatsApp(phone),
                ),
              ],
            ),
    );
  }
}
