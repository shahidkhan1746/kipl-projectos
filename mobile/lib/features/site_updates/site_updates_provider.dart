import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/utils/date_formatters.dart';
import '../../core/utils/json_parsers.dart';

class UpdatePhotoItem {
  final String url;
  final String? key;
  final String? caption;

  const UpdatePhotoItem({
    required this.url,
    this.key,
    this.caption,
  });

  factory UpdatePhotoItem.fromJson(Map<String, dynamic> json) {
    return UpdatePhotoItem(
      url: jsonString(json['url'], fallback: ''),
      key: jsonStringOrNull(json['key']),
      caption: jsonStringOrNull(json['caption']),
    );
  }
}

class UpdateVideoItem {
  final String url;
  final String? key;
  final String? title;
  final String? thumbnail;
  final String? provider;

  const UpdateVideoItem({
    required this.url,
    this.key,
    this.title,
    this.thumbnail,
    this.provider,
  });

  factory UpdateVideoItem.fromJson(Map<String, dynamic> json) {
    return UpdateVideoItem(
      url: jsonString(json['url'], fallback: ''),
      key: jsonStringOrNull(json['key']),
      title: jsonStringOrNull(json['title']),
      thumbnail: jsonStringOrNull(json['thumbnail']),
      provider: jsonStringOrNull(json['provider']),
    );
  }
}

class SiteUpdateItem {
  final String id;
  final String? projectId;
  final DateTime? date;
  final String title;
  final String description;
  final String category;
  final List<UpdatePhotoItem> photos;
  final List<UpdateVideoItem> videos;
  final bool isPublished;
  final String? createdBy;
  final DateTime? createdAt;

  const SiteUpdateItem({
    required this.id,
    this.projectId,
    this.date,
    required this.title,
    required this.description,
    this.category = 'general',
    this.photos = const [],
    this.videos = const [],
    this.isPublished = true,
    this.createdBy,
    this.createdAt,
  });

  String get formattedDate {
    return DateFormatters.formatIndian(date);
  }

  String get categoryDisplay {
    if (category.isEmpty) return 'General';
    return category[0].toUpperCase() + category.substring(1).toLowerCase();
  }

  factory SiteUpdateItem.fromJson(Map<String, dynamic> json) {
    final rawPhotos = jsonList(json['photos']);
    final photoList = rawPhotos
        .whereType<Map<String, dynamic>>()
        .map((p) => UpdatePhotoItem.fromJson(p))
        .where((p) => p.url.isNotEmpty)
        .toList();

    final rawVideos = jsonList(json['videos']);
    final videoList = rawVideos
        .whereType<Map<String, dynamic>>()
        .map((v) => UpdateVideoItem.fromJson(v))
        .where((v) => v.url.isNotEmpty)
        .toList();

    return SiteUpdateItem(
      id: jsonString(json['id'], fallback: ''),
      projectId: jsonStringOrNull(json['projectId'] ?? json['project_id']),
      date: jsonDate(json['date']),
      title: jsonString(json['title'], fallback: 'Untitled Update'),
      description: jsonString(json['description'], fallback: ''),
      category: jsonString(json['category'], fallback: 'general').toLowerCase(),
      photos: photoList,
      videos: videoList,
      isPublished:
          jsonBool(json['isPublished'] ?? json['is_published'], fallback: true),
      createdBy: jsonStringOrNull(json['createdBy'] ?? json['created_by']),
      createdAt: jsonDate(json['createdAt'] ?? json['created_at']),
    );
  }
}

class SiteUpdatesState {
  final List<SiteUpdateItem> updates;
  final bool isLoading;
  final String? error;
  final String selectedCategory;
  final String searchQuery;

  const SiteUpdatesState({
    this.updates = const [],
    this.isLoading = false,
    this.error,
    this.selectedCategory = 'ALL',
    this.searchQuery = '',
  });

  SiteUpdatesState copyWith({
    List<SiteUpdateItem>? updates,
    bool? isLoading,
    String? error,
    String? selectedCategory,
    String? searchQuery,
  }) {
    return SiteUpdatesState(
      updates: updates ?? this.updates,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      selectedCategory: selectedCategory ?? this.selectedCategory,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }

  List<SiteUpdateItem> get filteredUpdates {
    return updates.where((item) {
      if (selectedCategory != 'ALL' &&
          item.category.toLowerCase() != selectedCategory.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim().isNotEmpty) {
        final q = searchQuery.toLowerCase();
        final matchTitle = item.title.toLowerCase().contains(q);
        final matchDesc = item.description.toLowerCase().contains(q);
        final matchCategory = item.category.toLowerCase().contains(q);
        if (!matchTitle && !matchDesc && !matchCategory) {
          return false;
        }
      }
      return true;
    }).toList();
  }
}

class SiteUpdatesNotifier extends StateNotifier<SiteUpdatesState> {
  final Dio _dio;

  SiteUpdatesNotifier(this._dio) : super(const SiteUpdatesState()) {
    fetchUpdates();
  }

  Future<void> fetchUpdates() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _dio.get(ApiEndpoints.projectUpdates);
      final raw = jsonList(res.data);
      final items = raw
          .whereType<Map<String, dynamic>>()
          .map((j) => SiteUpdateItem.fromJson(j))
          .toList();

      items.sort((a, b) {
        final ad =
            a.date ?? a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bd =
            b.date ?? b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bd.compareTo(ad);
      });

      state = state.copyWith(
        isLoading: false,
        updates: items,
        error: null,
      );
    } on DioException catch (e) {
      final msg =
          (e.response?.data is Map && e.response?.data['message'] != null)
              ? e.response?.data['message'].toString()
              : 'Failed to load project updates. Check your connection.';
      state = state.copyWith(isLoading: false, error: msg);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setCategory(String category) {
    state = state.copyWith(selectedCategory: category);
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  Future<void> refresh() async {
    await fetchUpdates();
  }
}

final siteUpdatesProvider =
    StateNotifierProvider<SiteUpdatesNotifier, SiteUpdatesState>((ref) {
  final client = ref.watch(apiClientProvider);
  return SiteUpdatesNotifier(client.dio);
});
