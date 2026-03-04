import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/region_geofence.dart';

/// Region codes matching backend region.config.ts
enum RegionCode { ng, usChi }

/// Region configuration mirroring backend REGIONS map.
class RegionSettings {
  final RegionCode code;
  final String label;
  final String currency;
  final String symbol;
  final String unitSystem; // 'metric' or 'imperial'
  final String timezone;
  final String apiRegionKey; // key sent to backend ('nigeria' or 'chicago')

  const RegionSettings({
    required this.code,
    required this.label,
    required this.currency,
    required this.symbol,
    required this.unitSystem,
    required this.timezone,
    required this.apiRegionKey,
  });
}

/// Manages the active region at runtime.
///
/// - Auto-detects from GPS on first launch (by checking if lat/lng is in
///   Chicago metro area).
/// - Persists user selection in SharedPreferences.
/// - Exposes currency, symbol, unit system used throughout the app.
class RegionProvider extends ChangeNotifier {
  static const String _prefKey = 'selected_region';

  static const Map<RegionCode, RegionSettings> regions = {
    RegionCode.ng: RegionSettings(
      code: RegionCode.ng,
      label: 'Nigeria',
      currency: 'NGN',
      symbol: '₦',
      unitSystem: 'metric',
      timezone: 'Africa/Lagos',
      apiRegionKey: 'nigeria',
    ),
    RegionCode.usChi: RegionSettings(
      code: RegionCode.usChi,
      label: 'Chicago, US',
      currency: 'USD',
      symbol: '\$',
      unitSystem: 'imperial',
      timezone: 'America/Chicago',
      apiRegionKey: 'chicago',
    ),
  };

  RegionCode _currentCode = RegionCode.ng;

  RegionProvider() {
    _loadSaved();
  }

  // ─── Getters ──────────────────────────────────────────────────────────

  RegionCode get code => _currentCode;
  RegionSettings get current => regions[_currentCode]!;
  String get currency => current.currency;
  String get symbol => current.symbol;
  String get unitSystem => current.unitSystem;
  String get apiRegionKey => current.apiRegionKey;
  bool get isNigeria => _currentCode == RegionCode.ng;
  bool get isChicago => _currentCode == RegionCode.usChi;

  List<RegionSettings> get allRegions => regions.values.toList();

  // ─── Setters ──────────────────────────────────────────────────────────

  Future<void> setRegion(RegionCode code) async {
    if (_currentCode == code) return;
    _currentCode = code;
    notifyListeners();
    _save();
  }

  RegionCode fromBackendCode(String? raw) {
    final normalized = (raw ?? '').trim().toLowerCase();
    if (normalized == 'us-chi' ||
        normalized == 'chicago' ||
        normalized == 'us' ||
        normalized == 'usa') {
      return RegionCode.usChi;
    }
    if (normalized == 'ng' || normalized == 'nigeria') {
      return RegionCode.ng;
    }
    return RegionCode.ng;
  }

  /// Auto-detect region from latitude/longitude using real service-area
  /// geofences (Chicago metro and Nigeria). Falls back to Nigeria for
  /// locations outside both areas.
  void detectFromLocation(double lat, double lng) {
    final regionKey = RegionGeofence.regionOf(lat, lng);
    final detected = regionKey == RegionGeofence.chicago
        ? RegionCode.usChi
        : RegionCode.ng;
    if (_currentCode != detected) {
      _currentCode = detected;
      notifyListeners();
      _save();
    }
  }

  // ─── Persistence ─────────────────────────────────────────────────────

  Future<void> _loadSaved() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null) {
        final code = RegionCode.values.firstWhere(
          (c) => c.name == saved,
          orElse: () => RegionCode.ng,
        );
        if (_currentCode != code) {
          _currentCode = code;
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('RegionProvider: failed to load saved region: $e');
    }
  }

  Future<void> _save() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, _currentCode.name);
    } catch (e) {
      debugPrint('RegionProvider: failed to save region: $e');
    }
  }
}
