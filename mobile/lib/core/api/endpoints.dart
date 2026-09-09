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
  static const String employees      = '/hr/employees';
  static const String myEmployee     = '/hr/me/employee';
  static const String teamDirectory  = '/hr/team-directory';

  // Site Diary & Operations
  static const String diary          = '/diary';

  // Tasks
  static const String tasks          = '/tasks-board';

  // Fleet & Machinery
  static const String fleet          = '/fleet';

  // Projects
  static const String projects       = '/projects';

  // Schedule — the same payload the web dashboard's hero card reads.
  // JwtAuthGuard only, no role guard, so field staff can read it too.
  static const String wbsDashboard   = '/wbs/dashboard';

}
