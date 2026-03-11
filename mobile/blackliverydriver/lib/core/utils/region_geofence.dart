/// Geofence boundaries for the two supported service regions.
class RegionGeofence {
  RegionGeofence._();

  // ── Chicago Metro Area ───────────────────────────────────────────────────
  static const double _chiLatMin = 41.40;
  static const double _chiLatMax = 42.50;
  static const double _chiLngMin = -88.50;
  static const double _chiLngMax = -87.00;

  // ── Nigeria ──────────────────────────────────────────────────────────────
  static const double _ngLatMin = 4.00;
  static const double _ngLatMax = 14.00;
  static const double _ngLngMin = 2.50;
  static const double _ngLngMax = 15.00;

  static const String chicago = 'chicago';
  static const String nigeria = 'nigeria';

  /// Returns the supported region for the given coordinates, or `null`
  /// if the location is outside all supported service areas.
  static String? regionOf(double lat, double lng) {
    if (_inChicago(lat, lng)) return chicago;
    if (_inNigeria(lat, lng)) return nigeria;
    return null;
  }

  static bool _inChicago(double lat, double lng) {
    return lat >= _chiLatMin &&
        lat <= _chiLatMax &&
        lng >= _chiLngMin &&
        lng <= _chiLngMax;
  }

  static bool _inNigeria(double lat, double lng) {
    return lat >= _ngLatMin &&
        lat <= _ngLatMax &&
        lng >= _ngLngMin &&
        lng <= _ngLngMax;
  }

  static bool isSupported(double lat, double lng) => regionOf(lat, lng) != null;
}
