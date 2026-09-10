import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/utils/json_parsers.dart';
import 'package:kipl_projectos/features/site_updates/site_updates_provider.dart';

void main() {
  test('missing Site Updates scalar and collection helpers are conservative',
      () {
    expect(jsonString('text', fallback: ''), 'text');
    expect(jsonString({'secret': 'not a title'}, fallback: 'Untitled'),
        'Untitled');
    expect(jsonStringOrNull(null), isNull);
    // A map or list is what this guards against — rendering "{secret: ...}" at
    // a reader. A scalar is not that: ids and codes come back as a number from
    // some endpoints and a string from others, and twelve screens read them
    // through these helpers, so refusing numbers here blanks real fields.
    expect(jsonStringOrNull({'secret': 'not a caption'}), isNull);
    expect(jsonStringOrNull([1, 2]), isNull);
    expect(jsonStringOrNull(42), '42');
    expect(jsonStringOrNull('  '), isNull);
    expect(jsonList(null), isEmpty);
    expect(jsonList({'items': []}), isEmpty);
    expect(jsonList([1, 2]), [1, 2]);
    expect(jsonDate('2026-09-09'), DateTime(2026, 9, 9));
    expect(jsonDate('invalid'), isNull);
    expect(jsonBool(false, fallback: true), isFalse);
    expect(jsonBool(null, fallback: true), isTrue);
  });

  test('malformed optional attachments do not break a feed item', () {
    final item = SiteUpdateItem.fromJson({
      'id': 'fixture',
      'date': 'invalid',
      'photos': [
        null,
        42,
        {'url': null},
        {'url': 'https://example.test/photo'}
      ],
      'videos': null,
      'isPublished': false,
    });
    expect(item.title, 'Untitled Update');
    expect(item.date, isNull);
    expect(item.photos.length, 1);
    expect(item.videos, isEmpty);
    expect(item.isPublished, isFalse);
  });
}
