import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/sync/sync_service.dart';
import '../../core/utils/date_formatters.dart';
import '../../core/utils/json_parsers.dart';

class DiaryState {
  final bool isLoading;
  final bool isSaving;
  final String? diaryId;
  final String status;
  final String date;
  final String weather;
  final double hoursLost;
  final int skilledLabour;
  final int unskilledLabour;
  final int supervisoryLabour;
  final String workDone;
  final String issuesFaced;
  final List<String> photoUrls;

  /// Photos the worker captured that could NOT be uploaded. A site diary's
  /// evidentiary value is its photographs, so a diary must never report a
  /// clean save while silently dropping them.
  final int failedPhotoCount;

  final String? message;
  final String? error;

  const DiaryState({
    this.isLoading = false,
    this.isSaving = false,
    this.diaryId,
    this.status = 'draft',
    required this.date,
    this.weather = 'sunny',
    this.hoursLost = 0.0,
    this.skilledLabour = 0,
    this.unskilledLabour = 0,
    this.supervisoryLabour = 0,
    this.workDone = '',
    this.issuesFaced = '',
    this.photoUrls = const [],
    this.failedPhotoCount = 0,
    this.message,
    this.error,
  });

  int get totalLabour => skilledLabour + unskilledLabour + supervisoryLabour;

  DiaryState copyWith({
    bool? isLoading,
    bool? isSaving,
    String? diaryId,
    String? status,
    String? date,
    String? weather,
    double? hoursLost,
    int? skilledLabour,
    int? unskilledLabour,
    int? supervisoryLabour,
    String? workDone,
    String? issuesFaced,
    List<String>? photoUrls,
    int? failedPhotoCount,
    String? message,
    String? error,
  }) {
    return DiaryState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      diaryId: diaryId ?? this.diaryId,
      status: status ?? this.status,
      date: date ?? this.date,
      weather: weather ?? this.weather,
      hoursLost: hoursLost ?? this.hoursLost,
      skilledLabour: skilledLabour ?? this.skilledLabour,
      unskilledLabour: unskilledLabour ?? this.unskilledLabour,
      supervisoryLabour: supervisoryLabour ?? this.supervisoryLabour,
      workDone: workDone ?? this.workDone,
      issuesFaced: issuesFaced ?? this.issuesFaced,
      photoUrls: photoUrls ?? this.photoUrls,
      failedPhotoCount: failedPhotoCount ?? this.failedPhotoCount,
      message: message,
      error: error,
    );
  }
}

final diaryProvider = StateNotifierProvider<DiaryNotifier, DiaryState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  final syncService = ref.watch(syncServiceProvider.notifier);
  return DiaryNotifier(dio, user?.projectId, syncService);
});

class DiaryNotifier extends StateNotifier<DiaryState> {
  final Dio _dio;
  final String? _projectId;
  final SyncService _syncService;
  final ImagePicker _picker = ImagePicker();

  DiaryNotifier(this._dio, this._projectId, this._syncService)
      : super(DiaryState(date: DateFormatters.toApiDate(DateTime.now()))) {
    loadTodayDiary();
  }

  Future<void> loadTodayDiary() async {
    state = state.copyWith(isLoading: true, error: null);
    if (_projectId == null || _projectId.isEmpty) {
      state = state.copyWith(
        isLoading: false,
        error: 'Your project assignment is missing. Contact an administrator.',
      );
      return;
    }
    try {
      final response = await _dio.get(
        '/diary/by-date',
        queryParameters: {
          'date': state.date,
          'projectId': _projectId,
        },
      );

      if (response.data != null && response.data is Map<String, dynamic>) {
        final d = response.data as Map<String, dynamic>;
        state = state.copyWith(
          isLoading: false,
          diaryId: d['id'] as String?,
          status: d['status'] as String? ?? 'draft',
          weather: d['weatherMorning'] ?? 'sunny',
          hoursLost: jsonDouble(d['hoursLost']) ?? 0.0,
          skilledLabour: jsonInt(d['labourSkilled']) ?? 0,
          unskilledLabour: jsonInt(d['labourUnskilled']) ?? 0,
          supervisoryLabour: jsonInt(d['labourSupervisory']) ?? 0,
          workDone: (d['workDone'] is List &&
                  (d['workDone'] as List).isNotEmpty)
              ? (d['workDone'] as List)
                  .map((item) => item is Map ? item['activity'] ?? '' : item)
                  .join('\n')
              : (d['workDone']?.toString() ?? ''),
          issuesFaced: d['issuesFaced']?.toString() ?? '',
          photoUrls: (d['photos'] as List?)
                  ?.map((p) => (p is Map ? p['url'] : p).toString())
                  .toList() ??
              [],
        );
        return;
      }
      state = state.copyWith(isLoading: false);
    } on DioException catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: shouldQueueOffline(error)
            ? 'Today\'s diary could not be loaded while offline.'
            : dioErrorMessage(error, 'Failed to load today\'s diary.'),
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load today\'s diary: $error',
      );
    }
  }

  void updateWeather(String w) => state = state.copyWith(weather: w);
  void updateHoursLost(double h) => state = state.copyWith(hoursLost: h);
  void updateSkilled(int val) =>
      state = state.copyWith(skilledLabour: val.clamp(0, 9999).toInt());
  void updateUnskilled(int val) =>
      state = state.copyWith(unskilledLabour: val.clamp(0, 9999).toInt());
  void updateSupervisory(int val) =>
      state = state.copyWith(supervisoryLabour: val.clamp(0, 9999).toInt());
  void updateWorkDone(String txt) => state = state.copyWith(workDone: txt);
  void updateIssuesFaced(String txt) =>
      state = state.copyWith(issuesFaced: txt);

  Future<void> capturePhoto(ImageSource source) async {
    try {
      final XFile? file = await _picker.pickImage(
        source: source,
        imageQuality: 80,
        maxWidth: 1920,
      );
      if (file == null) return;

      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path,
            filename:
                'site_diary_${DateTime.now().millisecondsSinceEpoch}.jpg'),
      });

      final uploadRes = await _dio.post(
        '/diary/upload',
        data: formData,
      );

      final url = uploadRes.data['url'] as String?;
      if (url == null) {
        state = state.copyWith(
          failedPhotoCount: state.failedPhotoCount + 1,
          error:
              'The server accepted the photo but returned no link. It was not attached.',
        );
        return;
      }
      state = state.copyWith(
        photoUrls: [...state.photoUrls, url],
        message: 'Photo uploaded successfully',
      );
    } on DioException catch (error) {
      // A photo is multipart binary and cannot be queued in the JSON outbox,
      // so it genuinely cannot be saved offline. Say so plainly rather than
      // letting the diary report a clean save without its evidence.
      state = state.copyWith(
        failedPhotoCount: state.failedPhotoCount + 1,
        error: shouldQueueOffline(error)
            ? 'No connection — this photo was not attached. Photos cannot be saved '
                'offline; re-add it once you have signal.'
            : dioErrorMessage(error, 'The photo could not be uploaded.'),
      );
    } catch (_) {
      state = state.copyWith(
        failedPhotoCount: state.failedPhotoCount + 1,
        error: 'The photo could not be uploaded.',
      );
    }
  }

  Future<bool> saveDiary() async {
    state = state.copyWith(isSaving: true, error: null, message: null);
    if (_projectId == null || _projectId.isEmpty) {
      state = state.copyWith(
        isSaving: false,
        error: 'Your project assignment is missing. Contact an administrator.',
      );
      return false;
    }
    if (state.workDone.trim().isEmpty) {
      state = state.copyWith(
        isSaving: false,
        error: 'Describe the work completed before submitting the diary.',
      );
      return false;
    }
    if (state.status == 'approved') {
      state = state.copyWith(
        isSaving: false,
        error: 'An approved diary cannot be edited from the mobile app.',
      );
      return false;
    }

    final payload = _buildPayload();
    final endpoint = state.diaryId == null
        ? ApiEndpoints.diary
        : '${ApiEndpoints.diary}/${state.diaryId}';
    final method = state.diaryId == null ? 'POST' : 'PATCH';
    try {
      final response = method == 'POST'
          ? await _dio.post(endpoint, data: payload)
          : await _dio.patch(endpoint, data: payload);
      final responseData = response.data;
      state = state.copyWith(
        isSaving: false,
        diaryId:
            responseData is Map ? responseData['id'] as String? : state.diaryId,
        status: 'submitted',
        message: 'Daily Site Diary submitted successfully!',
      );
      return true;
    } on DioException catch (error) {
      if (shouldQueueOffline(error)) {
        final queued = await _syncService.enqueue(
          endpoint: endpoint,
          method: method,
          payload: payload,
          // One diary per project per date: saving again while offline
          // replaces the queued entry instead of creating a second diary.
          replaceKey: 'diary:$_projectId:${state.date}',
        );
        if (!queued) {
          state = state.copyWith(
              isSaving: false,
              error:
                  'Could not save offline — you may have been signed out. Reconnect and try again.');
          return false;
        }
        state = state.copyWith(
          isSaving: false,
          status: 'submitted',
          message: state.failedPhotoCount > 0
              ? 'Saved offline. ${state.failedPhotoCount} photo(s) could NOT be '
                  'attached and are not included — re-add them once connected.'
              : 'Saved offline. Daily diary will sync once connected.',
        );
        return true;
      }
      state = state.copyWith(
        isSaving: false,
        error: dioErrorMessage(error, 'Failed to submit the daily diary.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: 'Unexpected error: $e');
      return false;
    }
  }

  Map<String, dynamic> _buildPayload() {
    return {
      'projectId': _projectId,
      'date': state.date,
      'weatherMorning': state.weather,
      'weatherAfternoon': state.weather,
      'hoursLost': state.hoursLost,
      'workStoppedWeather': state.hoursLost > 0,
      'eotClaim': state.hoursLost > 0,
      if (state.hoursLost > 0)
        'eotReason':
            'Inclement weather (${state.weather}) lost ${state.hoursLost} working hours',
      'labourSkilled': state.skilledLabour,
      'labourUnskilled': state.unskilledLabour,
      'labourSupervisory': state.supervisoryLabour,
      'labourTotal': state.totalLabour,
      'workDone': [
        {
          'activity': state.workDone.trim(),
          'zone': 'STP Area',
          'quantity': 1,
          'unit': 'LS',
        }
      ],
      'issuesFaced': state.issuesFaced.trim(),
      'photos': state.photoUrls
          .map((url) => {'url': url, 'caption': 'Mobile Site Photo'})
          .toList(),
      'status': 'submitted',
    };
  }
}
