import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/utils/date_formatters.dart';

class DiaryState {
  final bool isLoading;
  final bool isSaving;
  final String date;
  final String weather;
  final double hoursLost;
  final int skilledLabour;
  final int unskilledLabour;
  final int supervisoryLabour;
  final String workDone;
  final String issuesFaced;
  final List<String> photoUrls;
  final String? message;
  final String? error;

  const DiaryState({
    this.isLoading = false,
    this.isSaving = false,
    required this.date,
    this.weather = 'sunny',
    this.hoursLost = 0.0,
    this.skilledLabour = 0,
    this.unskilledLabour = 0,
    this.supervisoryLabour = 0,
    this.workDone = '',
    this.issuesFaced = '',
    this.photoUrls = const [],
    this.message,
    this.error,
  });

  int get totalLabour => skilledLabour + unskilledLabour + supervisoryLabour;

  DiaryState copyWith({
    bool? isLoading,
    bool? isSaving,
    String? date,
    String? weather,
    double? hoursLost,
    int? skilledLabour,
    int? unskilledLabour,
    int? supervisoryLabour,
    String? workDone,
    String? issuesFaced,
    List<String>? photoUrls,
    String? message,
    String? error,
  }) {
    return DiaryState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      date: date ?? this.date,
      weather: weather ?? this.weather,
      hoursLost: hoursLost ?? this.hoursLost,
      skilledLabour: skilledLabour ?? this.skilledLabour,
      unskilledLabour: unskilledLabour ?? this.unskilledLabour,
      supervisoryLabour: supervisoryLabour ?? this.supervisoryLabour,
      workDone: workDone ?? this.workDone,
      issuesFaced: issuesFaced ?? this.issuesFaced,
      photoUrls: photoUrls ?? this.photoUrls,
      message: message,
      error: error,
    );
  }
}

final diaryProvider = StateNotifierProvider<DiaryNotifier, DiaryState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  return DiaryNotifier(dio, user?.projectId);
});

class DiaryNotifier extends StateNotifier<DiaryState> {
  final Dio _dio;
  final String? _projectId;
  final ImagePicker _picker = ImagePicker();

  DiaryNotifier(this._dio, this._projectId)
      : super(DiaryState(date: DateFormatters.toApiDate(DateTime.now()))) {
    loadTodayDiary();
  }

  Future<void> loadTodayDiary() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.get(
        '/diary/by-date',
        queryParameters: {
          'date': state.date,
          if (_projectId != null) 'projectId': _projectId,
        },
      );

      if (response.data != null && response.data is Map<String, dynamic>) {
        final d = response.data as Map<String, dynamic>;
        state = state.copyWith(
          isLoading: false,
          weather: d['weatherMorning'] ?? 'sunny',
          hoursLost: (d['hoursLost'] as num?)?.toDouble() ?? 0.0,
          skilledLabour: d['labourSkilled'] ?? 0,
          unskilledLabour: d['labourUnskilled'] ?? 0,
          supervisoryLabour: d['labourSupervisory'] ?? 0,
          workDone: (d['work_done'] is List && (d['work_done'] as List).isNotEmpty)
              ? (d['work_done'] as List).map((i) => i['activity'] ?? '').join('\n')
              : (d['work_done']?.toString() ?? ''),
          issuesFaced: d['issues_faced'] ?? '',
          photoUrls: (d['photos'] as List?)
                  ?.map((p) => (p is Map ? p['url'] : p).toString())
                  .toList() ??
              [],
        );
        return;
      }
      state = state.copyWith(isLoading: false);
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }
  }

  void updateWeather(String w) => state = state.copyWith(weather: w);
  void updateHoursLost(double h) => state = state.copyWith(hoursLost: h);
  void updateSkilled(int val) => state = state.copyWith(skilledLabour: val.clamp(0, 9999));
  void updateUnskilled(int val) => state = state.copyWith(unskilledLabour: val.clamp(0, 9999));
  void updateSupervisory(int val) => state = state.copyWith(supervisoryLabour: val.clamp(0, 9999));
  void updateWorkDone(String txt) => state = state.copyWith(workDone: txt);
  void updateIssuesFaced(String txt) => state = state.copyWith(issuesFaced: txt);

  Future<void> capturePhoto(ImageSource source) async {
    try {
      final XFile? file = await _picker.pickImage(
        source: source,
        imageQuality: 80,
        maxWidth: 1920,
      );
      if (file == null) return;

      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: 'site_diary_${DateTime.now().millisecondsSinceEpoch}.jpg'),
      });

      final uploadRes = await _dio.post(
        '/diary/upload',
        data: formData,
      );

      final url = uploadRes.data['url'] as String?;
      if (url != null) {
        state = state.copyWith(
          photoUrls: [...state.photoUrls, url],
          message: 'Photo uploaded successfully',
        );
      }
    } catch (e) {
      state = state.copyWith(error: 'Failed to upload photo: $e');
    }
  }

  Future<bool> saveDiary() async {
    state = state.copyWith(isSaving: true, error: null, message: null);
    try {
      final payload = {
        if (_projectId != null) 'projectId': _projectId,
        'date': state.date,
        'weatherMorning': state.weather,
        'weatherAfternoon': state.weather,
        'hoursLost': state.hoursLost,
        'workStoppedWeather': state.hoursLost > 0,
        'labourSkilled': state.skilledLabour,
        'labourUnskilled': state.unskilledLabour,
        'labourSupervisory': state.supervisoryLabour,
        'labourTotal': state.totalLabour,
        'work_done': [
          {'activity': state.workDone, 'zone': 'STP Area', 'quantity': 1, 'unit': 'LS'}
        ],
        'issues_faced': state.issuesFaced,
        'photos': state.photoUrls.map((u) => {'url': u, 'caption': 'Mobile Site Photo'}).toList(),
        'status': 'submitted',
      };

      await _dio.post(ApiEndpoints.diary, data: payload);
      state = state.copyWith(
        isSaving: false,
        message: '✓ Daily Site Diary submitted successfully!',
      );
      return true;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to submit site diary.';
      state = state.copyWith(isSaving: false, error: msg.toString());
      return false;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: 'Unexpected error: $e');
      return false;
    }
  }
}
