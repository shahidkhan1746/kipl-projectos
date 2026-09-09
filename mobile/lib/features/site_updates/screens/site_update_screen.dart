import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_theme.dart';
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
        backgroundColor: AppColors.bgSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: CachedNetworkImage(
                imageUrl: photo.url,
                fit: BoxFit.contain,
                placeholder: (context, url) => Container(
                  height: 240,
                  color: AppColors.bgCard,
                  child: const Center(
                    child: CircularProgressIndicator(color: AppColors.accent),
                  ),
                ),
                errorWidget: (context, url, error) => Container(
                  height: 240,
                  color: AppColors.bgCard,
                  child: const Center(
                    child: Icon(Icons.broken_image_outlined, size: 48, color: AppColors.textFaint),
                  ),
                ),
              ),
            ),
            if (photo.caption != null && photo.caption!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.all(14),
                child: Text(
                  photo.caption!,
                  style: const TextStyle(fontSize: 13, color: AppColors.textBase),
                ),
              ),
            Padding(
              padding: const EdgeInsets.only(bottom: 8, right: 8),
              child: Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Close', style: TextStyle(color: AppColors.accent)),
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
      backgroundColor: AppColors.bgSurface,
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
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
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
              style: const TextStyle(fontSize: 13, color: AppColors.textBase),
              decoration: InputDecoration(
                hintText: 'Search updates, works, milestones...',
                hintStyle: const TextStyle(fontSize: 13, color: AppColors.textFaint),
                filled: true,
                fillColor: AppColors.bgCard,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.textMuted),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 16, color: AppColors.textMuted),
                        onPressed: () {
                          _searchController.clear();
                          notifier.setSearchQuery('');
                        },
                      )
                    : null,
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.borderDim),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
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
                    cat == 'ALL' ? 'All Updates' : cat[0] + cat.substring(1).toLowerCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? Colors.white : AppColors.textMuted,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: AppColors.accent,
                  backgroundColor: AppColors.bgCard,
                  showCheckmark: false,
                  side: BorderSide(
                    color: isSelected ? AppColors.accent : AppColors.borderDim,
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
              color: AppColors.accent,
              backgroundColor: AppColors.bgCard,
              onRefresh: () => notifier.refresh(),
              child: state.isLoading && state.updates.isEmpty
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.accent),
                    )
                  : state.error != null && state.updates.isEmpty
                      ? ListView(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.cloud_off_rounded, size: 48, color: AppColors.red),
                                  const SizedBox(height: 12),
                                  Text(
                                    state.error!,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
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
                              children: const [
                                Padding(
                                  padding: EdgeInsets.all(48),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.newspaper_outlined, size: 48, color: AppColors.textFaint),
                                      SizedBox(height: 12),
                                      Text(
                                        'No project updates found',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textBase,
                                        ),
                                      ),
                                      SizedBox(height: 4),
                                      Text(
                                        'Try adjusting your search or category filter.',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                              itemCount: items.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final item = items[index];
                                final isExpanded = _expandedDescriptions.contains(item.id);
                                final isLongDesc = item.description.length > 160;

                                return Container(
                                  decoration: BoxDecoration(
                                    color: AppColors.bgCard,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppColors.borderDim),
                                  ),
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Header: Date & Category Pill
                                      Wrap(
                                        alignment: WrapAlignment.spaceBetween,
                                        crossAxisAlignment: WrapCrossAlignment.center,
                                        spacing: 8,
                                        runSpacing: 6,
                                        children: [
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(
                                                Icons.calendar_today_outlined,
                                                size: 13,
                                                color: AppColors.textMuted,
                                              ),
                                              const SizedBox(width: 5),
                                              Text(
                                                item.formattedDate,
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: AppColors.textMuted,
                                                ),
                                              ),
                                            ],
                                          ),
                                          StatusPill(
                                            label: item.categoryDisplay,
                                            type: _categoryPillType(item.category),
                                          ),
                                        ],
                                      ),

                                      const SizedBox(height: 10),

                                      // Title
                                      Text(
                                        item.title,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.textBase,
                                        ),
                                      ),

                                      if (item.description.isNotEmpty) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          isLongDesc && !isExpanded
                                              ? '${item.description.substring(0, 160)}...'
                                              : item.description,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: AppColors.textMuted,
                                            height: 1.4,
                                          ),
                                        ),
                                        if (isLongDesc)
                                          GestureDetector(
                                            onTap: () {
                                              setState(() {
                                                if (isExpanded) {
                                                  _expandedDescriptions.remove(item.id);
                                                } else {
                                                  _expandedDescriptions.add(item.id);
                                                }
                                              });
                                            },
                                            child: Padding(
                                              padding: const EdgeInsets.only(top: 4),
                                              child: Text(
                                                isExpanded ? 'Show less' : 'Read more',
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppColors.accent,
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
                                            separatorBuilder: (context, index) =>
                                                const SizedBox(width: 8),
                                            itemBuilder: (context, pIdx) {
                                              final photo = item.photos[pIdx];
                                              return GestureDetector(
                                                onTap: () => _showPhotoDialog(context, photo),
                                                child: ClipRRect(
                                                  borderRadius: BorderRadius.circular(8),
                                                  child: Container(
                                                    width: 120,
                                                    color: AppColors.bgSurface,
                                                    child: CachedNetworkImage(
                                                      imageUrl: photo.url,
                                                      fit: BoxFit.cover,
                                                      placeholder: (context, url) =>
                                                          Container(
                                                        color: AppColors.bgSurface,
                                                        child: const Center(
                                                          child: SizedBox(
                                                            width: 20,
                                                            height: 20,
                                                            child: CircularProgressIndicator(
                                                              strokeWidth: 2,
                                                              color: AppColors.accent,
                                                            ),
                                                          ),
                                                        ),
                                                      ),
                                                      errorWidget: (context, url, error) =>
                                                          const Center(
                                                        child: Icon(
                                                          Icons.image_not_supported_outlined,
                                                          color: AppColors.textFaint,
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
                                            const Icon(Icons.video_library_outlined,
                                                size: 14, color: AppColors.accent),
                                            const SizedBox(width: 6),
                                            Text(
                                              '${item.videos.length} video attached',
                                              style: const TextStyle(
                                                fontSize: 11,
                                                color: AppColors.accent,
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
                                        const Divider(
                                            color: AppColors.borderDim,
                                            height: 1,
                                            thickness: 0.8),
                                        const SizedBox(height: 8),
                                        Text(
                                          'Posted by ${item.createdBy}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textFaint,
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
