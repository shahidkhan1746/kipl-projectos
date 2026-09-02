import 'dart:math';
import 'package:geolocator/geolocator.dart';

class GeofenceResult {
  final double distanceMeters;
  final bool isInside;
  final double accuracyMeters;
  final bool isMocked;
  final Position? position;
  final String? errorMessage;

  const GeofenceResult({
    required this.distanceMeters,
    required this.isInside,
    required this.accuracyMeters,
    required this.isMocked,
    this.position,
    this.errorMessage,
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

  /// Check GPS permissions, fetch current position, and calculate proximity to site
  static Future<GeofenceResult> evaluateProximity({
    double siteLat = dalLakeStpLat,
    double siteLng = dalLakeStpLng,
    double radiusMeters = defaultGeofenceRadiusMeters,
  }) async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return GeofenceResult.error('Device location services (GPS) are disabled. Please enable GPS in device settings.');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
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
