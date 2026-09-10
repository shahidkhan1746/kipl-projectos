import 'dart:io';
import 'package:flutter/services.dart';

/// Readable, reproducible previews using the fonts bundled with Flutter.
/// Run golden comparisons with the same Flutter SDK and host platform.
Future<void> loadDesignFonts() async {
  final cache = File(Platform.resolvedExecutable).parent.parent.parent.parent;
  final font =
      File('${cache.path}/artifacts/material_fonts/roboto-regular.ttf');
  await (FontLoader('Roboto')
        ..addFont(
            font.readAsBytes().then((bytes) => ByteData.sublistView(bytes))))
      .load();
  await (FontLoader('MaterialIcons')
        ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf')))
      .load();
}
