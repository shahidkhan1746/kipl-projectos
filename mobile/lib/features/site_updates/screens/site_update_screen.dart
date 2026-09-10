import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/widgets/status_pill.dart';
import '../site_updates_provider.dart';

class SiteUpdateScreen extends ConsumerStatefulWidget {
  const SiteUpdateScreen({super.key});

  @override
  ConsumerState<SiteUpdateScreen> createState() => _SiteUpdateScreenState();
}

class _SiteUpdateScreenState extends ConsumerState<SiteUpdateScreen> {
  final _searchController = TextEditingController();
  final Set<String> _expandedDescriptions = {};

  static const _categories = [
    'ALL',
    'MILESTONE',
    'CIVIL',
    'SURVEY',
    'MECHANICAL',
    'ELECTRICAL',
    'SAFETY',
    'GENERAL',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  StatusPillType _categoryPillType(String category) {
    switch (category.toLowerCase()) {
      case 'milestone':
        return StatusPillType.warning;
      case 'civil':
      case 'mechanical':
      case 'electrical':
        return StatusPillType.info;
      case 'safety':
        return StatusPillType.error;
      default:
        return StatusPillType.neutral;
    }
  }

  void _showPhotoDialog(BuildContext context, UpdatePhotoItem photo) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
              child: CachedNetworkImage(
                imageUrl: photo.url,
                fit: BoxFit.contain,
                placeholder: (context, url) => Container(
                  height: 240,
                  color: Theme.of(context).colorScheme.surfaceContainer,
                  child: Center(
                    child: CircularProgressIndicator(
                        color: Theme.of(context).colorScheme.primary),
                  ),
                ),
                errorWidget: (context, url, error) => Container(
                  height: 240,
                  color: Theme.of(context).colorScheme.surfaceContainer,
                  child: Center(
                    child: Icon(Icons.broken_image_outlined,
                        size: 48, color: Theme.of(context).colorScheme.outline),
                  ),
                ),
              ),
            ),
            if (photo.caption != null && photo.caption!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.all(14),
                child: Text(
                  photo.caption!,
                  style: TextStyle(
                      fontSize: 13,
                      color: Theme.of(context).colorScheme.onSurface),
                ),
              ),
            Padding(
              padding: const EdgeInsets.only(bottom: 8, right: 8),
              child: Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text('Close',
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.primary)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(siteUpdatesProvider);
    final notifier = ref.read(siteUpdatesProvider.notifier);
    final items = state.filteredUpdates;

    return Scaffold(
      // bgPage, not bgSurface: every card, chip and field on this screen is
      // bgCard, and bgSurface IS bgCard — set as the scaffold it made them the
      // same colour as the ground behind them, visible only by their 1px
      // border. Every other screen in the app sits on bgPage.
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Site Updates & Milestones',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              '${state.updates.length} total updates',
              style: TextStyle(
                  fontSize: 11,
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh updates',
            onPressed: () => notifier.refresh(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search box
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: (val) => notifier.setSearchQuery(val),
              style: TextStyle(
                  fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
              decoration: InputDecoration(
                hintText: 'Search updates, works, milestones...',
                hintStyle: TextStyle(
                    fontSize: 13, color: Theme.of(context).colorScheme.outline),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surfaceContainerLow,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                prefixIcon: Icon(Icons.search,
                    size: 18,
                    color: Theme.of(context).colorScheme.onSurfaceVariant),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: Icon(Icons.clear,
                            size: 16,
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant),
                        onPressed: () {
                          _searchController.clear();
                          notifier.setSearchQuery('');
                        },
                      )
                    : null,
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(
                      color: Theme.of(context).colorScheme.outlineVariant),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(
                      color: Theme.of(context).colorScheme.primary, width: 1.5),
                ),
              ),
            ),
          ),

          // Category filter chip scroll
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final cat = _categories[i];
                final isSelected = state.selectedCategory.toUpperCase() == cat;
                return ChoiceChip(
                  label: Text(
                    cat == 'ALL'
                        ? 'All Updates'
                        : cat[0] + cat.substring(1).toLowerCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected
                          ? Colors.white
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: Theme.of(context).colorScheme.primary,
                  backgroundColor:
                      Theme.of(context).colorScheme.surfaceContainerLow,
                  showCheckmark: false,
                  side: BorderSide(
                    color: isSelected
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).colorScheme.outlineVariant,
                  ),
                  onSelected: (selected) {
                    if (selected) {
                      notifier.setCategory(cat);
                    }
                  },
                );
              },
            ),
          ),

          const SizedBox(height: 8),

          // Main body
          Expanded(
            child: RefreshIndicator(
              color: Theme.of(context).colorScheme.primary,
              backgroundColor:
                  Theme.of(context).colorScheme.surfaceContainerLow,
              onRefresh: () => notifier.refresh(),
              child: state.isLoading && state.updates.isEmpty
                  ? Center(
                      child: CircularProgressIndicator(
                          color: Theme.of(context).colorScheme.primary),
                    )
                  : state.error != null && state.updates.isEmpty
                      ? ListView(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.cloud_off_rounded,
                                      size: 48, color: context.status.danger),
                                  const SizedBox(height: 12),
                                  Text(
                                    state.error!,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                        fontSize: 13,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurfaceVariant),
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton.icon(
                                    onPressed: () => notifier.refresh(),
                                    icon: const Icon(Icons.refresh, size: 16),
                                    label: const Text('Try Again'),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        )
                      : items.isEmpty
                          ? ListView(
                              children: [
                                Padding(
                                  padding: EdgeInsets.all(48),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.newspaper_outlined,
                                          size: 48,
                                          color: Theme.of(context)
                                              .colorScheme
                                              .outline),
                                      SizedBox(height: 12),
                                      Text(
                                        'No project updates found',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurface,
                                        ),
                                      ),
                                      SizedBox(height: 4),
                                      Text(
                                        'Try adjusting your search or category filter.',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                            fontSize: 12,
                                            color: Theme.of(context)
                                                .colorScheme
                                                .onSurfaceVariant),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                              itemCount: items.length,
                              separatorBuilder: (context, index) =>
                                  const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final item = items[index];
                                final isExpanded =
                                    _expandedDescriptions.contains(item.id);
                                final isLongDesc =
                                    item.description.length > 160;

                                return Container(
                                  decoration: BoxDecoration(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .surfaceContainerLow,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .outlineVariant),
                                  ),
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      // Header: Date & Category Pill
                                      Wrap(
                                        alignment: WrapAlignment.spaceBetween,
                                        crossAxisAlignment:
                                            WrapCrossAlignment.center,
                                        spacing: 8,
                                        runSpacing: 6,
                                        children: [
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                Icons.calendar_today_outlined,
                                                size: 13,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurfaceVariant,
                                              ),
                                              const SizedBox(width: 5),
                                              Text(
                                                item.formattedDate,
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: Theme.of(context)
                                                      .colorScheme
                                                      .onSurfaceVariant,
                                                ),
                                              ),
                                            ],
                                          ),
                                          StatusPill(
                                            label: item.categoryDisplay,
                                            type: _categoryPillType(
                                                item.category),
                                          ),
                                        ],
                                      ),

                                      const SizedBox(height: 10),

                                      // Title
                                      Text(
                                        item.title,
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurface,
                                        ),
                                      ),

                                      if (item.description.isNotEmpty) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          isLongDesc && !isExpanded
                                              ? '${item.description.substring(0, 160)}...'
                                              : item.description,
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: Theme.of(context)
                                                .colorScheme
                                                .onSurfaceVariant,
                                            height: 1.4,
                                          ),
                                        ),
                                        if (isLongDesc)
                                          GestureDetector(
                                            onTap: () {
                                              setState(() {
                                                if (isExpanded) {
                                                  _expandedDescriptions
                                                      .remove(item.id);
                                                } else {
                                                  _expandedDescriptions
                                                      .add(item.id);
                                                }
                                              });
                                            },
                                            child: Padding(
                                              padding:
                                                  const EdgeInsets.only(top: 4),
                                              child: Text(
                                                isExpanded
                                                    ? 'Show less'
                                                    : 'Read more',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                  color: Theme.of(context)
                                                      .colorScheme
                                                      .primary,
                                                ),
                                              ),
                                            ),
                                          ),
                                      ],

                                      // Photo gallery
                                      if (item.photos.isNotEmpty) ...[
                                        const SizedBox(height: 12),
                                        SizedBox(
                                          height: 90,
                                          child: ListView.separated(
                                            scrollDirection: Axis.horizontal,
                                            itemCount: item.photos.length,
                                            separatorBuilder:
                                                (context, index) =>
                                                    const SizedBox(width: 8),
                                            itemBuilder: (context, pIdx) {
                                              final photo = item.photos[pIdx];
                                              return GestureDetector(
                                                onTap: () => _showPhotoDialog(
                                                    context, photo),
                                                child: ClipRRect(
                                                  borderRadius:
                                                      BorderRadius.circular(8),
                                                  child: Container(
                                                    width: 120,
                                                    color: Theme.of(context)
                                                        .colorScheme
                                                        .surfaceContainer,
                                                    child: CachedNetworkImage(
                                                      imageUrl: photo.url,
                                                      fit: BoxFit.cover,
                                                      placeholder:
                                                          (context, url) =>
                                                              Container(
                                                        color: Theme.of(context)
                                                            .colorScheme
                                                            .surfaceContainer,
                                                        child: Center(
                                                          child: SizedBox(
                                                            width: 20,
                                                            height: 20,
                                                            child:
                                                                CircularProgressIndicator(
                                                              strokeWidth: 2,
                                                              color: Theme.of(
                                                                      context)
                                                                  .colorScheme
                                                                  .primary,
                                                            ),
                                                          ),
                                                        ),
                                                      ),
                                                      errorWidget: (context,
                                                              url, error) =>
                                                          Center(
                                                        child: Icon(
                                                          Icons
                                                              .image_not_supported_outlined,
                                                          color:
                                                              Theme.of(context)
                                                                  .colorScheme
                                                                  .outline,
                                                          size: 24,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              );
                                            },
                                          ),
                                        ),
                                      ],

                                      // Videos notice
                                      if (item.videos.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            Icon(Icons.video_library_outlined,
                                                size: 14,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .primary),
                                            const SizedBox(width: 6),
                                            Text(
                                              '${item.videos.length} video attached',
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .primary,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],

                                      // Footer author
                                      if (item.createdBy != null &&
                                          item.createdBy!.isNotEmpty) ...[
                                        const SizedBox(height: 10),
                                        Divider(
                                            color: Theme.of(context)
                                                .colorScheme
                                                .outlineVariant,
                                            height: 1,
                                            thickness: 0.8),
                                        const SizedBox(height: 8),
                                        Text(
                                          'Posted by ${item.createdBy}',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: Theme.of(context)
                                                .colorScheme
                                                .outline,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }
}
