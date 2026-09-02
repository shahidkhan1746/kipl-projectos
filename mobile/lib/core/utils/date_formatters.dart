import 'package:intl/intl.dart';

class DateFormatters {
  // Standard Indian Date: DD/MM/YYYY
  static final DateFormat indianDate = DateFormat('dd/MM/yyyy');

  // Short Date with Month Name: 31 Aug 2026
  static final DateFormat shortDate = DateFormat('dd MMM yyyy');

  // Time in 12-hour AM/PM: 09:30 AM
  static final DateFormat time12 = DateFormat('hh:mm a');

  // Full Timestamp: 31/08/2026, 09:30 AM
  static final DateFormat fullTimestamp = DateFormat('dd/MM/yyyy, hh:mm a');

  // ISO Date for API requests: YYYY-MM-DD
  static final DateFormat apiDate = DateFormat('yyyy-MM-dd');

  static String formatIndian(DateTime? date, {String fallback = '—'}) {
    if (date == null) return fallback;
    return indianDate.format(date);
  }

  static String formatTime(DateTime? date, {String fallback = '—'}) {
    if (date == null) return fallback;
    return time12.format(date);
  }

  static String formatTimestamp(DateTime? date, {String fallback = '—'}) {
    if (date == null) return fallback;
    return fullTimestamp.format(date);
  }

  static String toApiDate(DateTime date) {
    return apiDate.format(date);
  }

  static DateTime? parseApiDate(String? str) {
    if (str == null || str.isEmpty) return null;
    try {
      return DateTime.parse(str);
    } catch (_) {
      return null;
    }
  }
}
