// API Endpoints for KIPL ProjectOS Mobile App

class ApiEndpoints {
  // Authentication
  static const String login          = '/auth/login';
  static const String refresh        = '/auth/refresh';
  static const String logout         = '/auth/logout';
  static const String me             = '/auth/me';

  // HR & Attendance
  static const String attendance     = '/hr/attendance';
  static const String bulkAttendance = '/hr/attendance/bulk';
  static const String myAttendance   = '/hr/attendance/mine';
  static const String employees      = '/hr/employees';

  // Site Diary & Operations
  static const String diary          = '/diary';
  static const String diaryToday     = '/diary/today';

  // Tasks
  static const String tasks          = '/tasks';
  static const String myTasks        = '/tasks/assigned';

  // Fleet & Machinery
  static const String fleet          = '/fleet';
  static const String fleetLogs      = '/fleet/logs';

  // Projects
  static const String projects       = '/projects';

  // Media & Uploads
  static const String upload         = '/storage/upload';
}
