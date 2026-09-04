import 'dart:math';
import 'package:geolocator/geolocator.dart';

class GeofenceResult {
  final double distanceMeters;
  final bool isInside;
  final double accuracyMeters;
  final bool isMocked;
  final Position? position;
  final String? errorMessage;

  /// The device has not granted location access yet and the caller did not
  /// permit a system prompt. The UI must show the location disclosure and then
  /// call [GeofenceHelper.requestAccessAfterDisclosure].
  final bool needsPermission;

  const GeofenceResult({
    required this.distanceMeters,
    required this.isInside,
    required this.accuracyMeters,
    required this.isMocked,
    this.position,
    this.errorMessage,
    this.needsPermission = false,
  });

  factory GeofenceResult.error(String message) {
    return GeofenceResult(
      distanceMeters: double.infinity,
      isInside: false,
      accuracyMeters: 0,
      isMocked: false,
      errorMessage: message,
    );
  }

  /// Not an error the worker caused — the app simply has not asked yet.
  factory GeofenceResult.permissionRequired() {
    return const GeofenceResult(
      distanceMeters: double.infinity,
      isInside: false,
      accuracyMeters: 0,
      isMocked: false,
      needsPermission: true,
    );
  }
}

class GeofenceHelper {
  // Official Coordinates for Dal Lake Sewerage Scheme — 38.5 MLD STP Srinagar
  static const double dalLakeStpLat = 34.0920;
  static const double dalLakeStpLng = 74.8740;
  static const double defaultGeofenceRadiusMeters = 500.0;

  /// Calculate distance in meters between two lat/lng coordinates via Haversine formula
  static double calculateDistanceMeters({
    required double startLatitude,
    required double startLongitude,
    required double endLatitude,
    required double endLongitude,
  }) {
    const double earthRadiusMeters = 6371000.0;
    final double dLat = _degToRad(endLatitude - startLatitude);
    final double dLon = _degToRad(endLongitude - startLongitude);

    final double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degToRad(startLatitude)) *
            cos(_degToRad(endLatitude)) *
            sin(dLon / 2) *
            sin(dLon / 2);

    final double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  static double _degToRad(double deg) => deg * (pi / 180.0);

  /// Requests location access. Call ONLY after the worker has been shown the
  /// disclosure describing what is collected and why, and has agreed to it.
  static Future<GeofenceResult> requestAccessAfterDisclosure({
    double siteLat = dalLakeStpLat,
    double siteLng = dalLakeStpLng,
    double radiusMeters = defaultGeofenceRadiusMeters,
  }) {
    return evaluateProximity(
      siteLat: siteLat,
      siteLng: siteLng,
      radiusMeters: radiusMeters,
      mayRequestPermission: true,
    );
  }

  /// Check GPS permissions, fetch current position, and calculate proximity to site
  /// Reads the current position and measures it against the site.
  ///
  /// This NEVER shows the system location prompt on its own. Google Play's
  /// prominent-disclosure policy requires the app to explain why it collects
  /// location before that dialog appears, so when access has not been granted
  /// this returns [GeofenceResult.permissionRequired] and the UI is expected
  /// to show the disclosure and call [requestAccessAfterDisclosure].
  static Future<GeofenceResult> evaluateProximity({
    double siteLat = dalLakeStpLat,
    double siteLng = dalLakeStpLng,
    double radiusMeters = defaultGeofenceRadiusMeters,
    bool mayRequestPermission = false,
  }) async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return GeofenceResult.error('Device location services (GPS) are disabled. Please enable GPS in device settings.');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        // Only reachable once the worker has read the disclosure and agreed.
        if (!mayRequestPermission) return GeofenceResult.permissionRequired();
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return GeofenceResult.error('Location permission was denied. Site attendance requires GPS access.');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return GeofenceResult.error('Location permissions are permanently denied. Please enable them in app settings.');
      }

      final Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );

      final double distance = calculateDistanceMeters(
        startLatitude: position.latitude,
        startLongitude: position.longitude,
        endLatitude: siteLat,
        endLongitude: siteLng,
      );

      final bool isInside = distance <= radiusMeters;

      return GeofenceResult(
        distanceMeters: distance,
        isInside: isInside,
        accuracyMeters: position.accuracy,
        isMocked: position.isMocked,
        position: position,
      );
    } catch (e) {
      return GeofenceResult.error('Failed to acquire GPS location: $e');
    }
  }
}
