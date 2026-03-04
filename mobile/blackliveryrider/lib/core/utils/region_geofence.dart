/// Geofence boundaries for the two supported service regions.
///
/// Only Chicago metro and Nigeria are active. Locations outside both
/// regions are considered **unsupported** and rides originating/ending
/// there should be blocked.
class RegionGeofence {
  RegionGeofence._();

  // ── Chicago Metro Area ───────────────────────────────────────────────────
  // Covers greater Chicagoland: Waukegan (N), Joliet (S), Lake Michigan (E),
  // Aurora/Naperville (W).
  static const double _chiLatMin = 41.40;
  static const double _chiLatMax = 42.50;
  static const double _chiLngMin = -88.50;
  static const double _chiLngMax = -87.00;

  // ── Nigeria ──────────────────────────────────────────────────────────────
  // Country bounding box — includes Lagos, Abuja, Port Harcourt, Kano, etc.
  static const double _ngLatMin = 4.00;
  static const double _ngLatMax = 14.00;
  static const double _ngLngMin = 2.50;
  static const double _ngLngMax = 15.00;

  /// Supported region identifiers returned by [regionOf].
  static const String chicago = 'chicago';
  static const String nigeria = 'nigeria';

  /// Returns the supported region for the given coordinates, or `null`
  /// if the location is outside all supported service areas.
  static String? regionOf(double lat, double lng) {
    if (_inChicago(lat, lng)) return chicago;
    if (_inNigeria(lat, lng)) return nigeria;
    return null; // unsupported
  }

  /// `true` when [lat]/[lng] falls inside the Chicago metro bounding box.
  static bool _inChicago(double lat, double lng) {
    return lat >= _chiLatMin &&
        lat <= _chiLatMax &&
        lng >= _chiLngMin &&
        lng <= _chiLngMax;
  }

  /// `true` when [lat]/[lng] falls inside the Nigeria bounding box.
  static bool _inNigeria(double lat, double lng) {
    return lat >= _ngLatMin &&
        lat <= _ngLatMax &&
        lng >= _ngLngMin &&
        lng <= _ngLngMax;
  }

  /// `true` when [lat]/[lng] is inside **any** supported region.
  static bool isSupported(double lat, double lng) => regionOf(lat, lng) != null;

  /// Human-readable label for a region key (or fallback).
  static String label(String? regionKey) {
    switch (regionKey) {
      case chicago:
        return 'Chicago';
      case nigeria:
        return 'Nigeria';
      default:
        return 'Unsupported area';
    }
  }
}
