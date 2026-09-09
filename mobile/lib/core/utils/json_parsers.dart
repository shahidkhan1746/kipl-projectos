/// Tolerant readers for API payloads.
///
/// The backend is TypeScript and serialises numbers, dates and booleans
/// inconsistently across endpoints — `toFixed()` returns strings, TypeORM
/// returns numerics as strings over JSON, and some columns are nullable in the
/// database but not in the DTO. Every reader here takes `dynamic` and returns
/// something safe rather than throwing mid-parse, because a single unexpected
/// null in one row should not blank an entire screen.
library;

double? jsonDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value.trim());
  return null;
}

int? jsonInt(dynamic value) {
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value.trim());
  return null;
}

/// A string that is always present. Numbers are accepted because ids and
/// codes arrive as either, depending on the endpoint.
String jsonString(dynamic value, {required String fallback}) {
  if (value is String) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? fallback : trimmed;
  }
  if (value is num || value is bool) return value.toString();
  return fallback;
}

/// A string, or null when the field is absent or blank.
///
/// An empty string is treated as null on purpose: an optional caption that
/// came back as "" is not a caption, and callers that render it would print an
/// empty line rather than skipping the field.
String? jsonStringOrNull(dynamic value) {
  if (value is String) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  if (value is num || value is bool) return value.toString();
  return null;
}

/// Accepts real booleans and the strings and numbers that stand in for them.
///
/// Postgres over JSON can hand back 't'/'f', and some DTOs send 0/1.
bool jsonBool(dynamic value, {required bool fallback}) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    switch (value.trim().toLowerCase()) {
      case 'true':
      case 't':
      case 'yes':
      case '1':
        return true;
      case 'false':
      case 'f':
      case 'no':
      case '0':
        return false;
    }
  }
  return fallback;
}

/// Always a list, so callers can map over it without a null check.
///
/// Some endpoints return a bare array, others wrap it, and a few return a
/// single object where a list was expected — that last case is wrapped rather
/// than dropped, since losing a record silently is worse than showing one.
List<dynamic> jsonList(dynamic value) {
  if (value is List) return value;
  if (value is Map<String, dynamic>) {
    for (final key in const ['data', 'items', 'results', 'rows']) {
      final nested = value[key];
      if (nested is List) return nested;
    }
    return [value];
  }
  return const [];
}

/// A date, or null. Never throws on a malformed value.
///
/// Accepts ISO-8601 strings and epoch milliseconds. A date that cannot be
/// parsed becomes null so the caller can fall back, rather than crashing the
/// list it appears in.
DateTime? jsonDate(dynamic value) {
  if (value is DateTime) return value;
  if (value is num) {
    return DateTime.fromMillisecondsSinceEpoch(value.toInt(), isUtc: true).toLocal();
  }
  if (value is String) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    return DateTime.tryParse(trimmed)?.toLocal();
  }
  return null;
}
