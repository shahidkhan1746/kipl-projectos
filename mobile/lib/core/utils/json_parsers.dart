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

// Site Updates' optional JSON fields. Reject non-scalar shapes rather than
// displaying a Dart map/list representation as user-facing text.
String? jsonStringOrNull(Object? value) => value is String ? value : null;

String jsonString(Object? value, {required String fallback}) =>
    jsonStringOrNull(value) ?? fallback;

List<dynamic> jsonList(Object? value) => value is List ? value : const [];

DateTime? jsonDate(Object? value) =>
    value is String ? DateTime.tryParse(value) : null;

bool jsonBool(Object? value, {required bool fallback}) =>
    value is bool ? value : fallback;
