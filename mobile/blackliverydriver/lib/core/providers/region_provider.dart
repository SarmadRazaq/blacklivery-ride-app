import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Region codes matching backend region.config.ts
enum RegionCode { ng, usChi }

/// Region configuration mirroring backend REGIONS map.
class RegionSettings {
  final RegionCode code;
  final String label;
  final String currency;
  final String symbol;
  final String phoneCode;
  final String unitSystem; // 'metric' or 'imperial'
  final String timezone;
  final String apiRegionKey; // key sent to backend ('nigeria' or 'chicago')

  const RegionSettings({
    required this.code,
    required this.label,
    required this.currency,
    required this.symbol,
    required this.phoneCode,
    required this.unitSystem,
    required this.timezone,
    required this.apiRegionKey,
  });
}

/// Manages the active region at runtime for the driver app.
///
/// - Auto-detects from GPS on first launch.
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
      phoneCode: '+234',
      unitSystem: 'metric',
      timezone: 'Africa/Lagos',
      apiRegionKey: 'nigeria',
    ),
    RegionCode.usChi: RegionSettings(
      code: RegionCode.usChi,
      label: 'Chicago, US',
      currency: 'USD',
      symbol: '\$',
      phoneCode: '+1',
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
  String get phoneCode => current.phoneCode;
  String get apiRegionKey => current.apiRegionKey;
  bool get isNigeria => _currentCode == RegionCode.ng;
  bool get isChicago => _currentCode == RegionCode.usChi;
  String get backendCode => _currentCode == RegionCode.ng ? 'NG' : 'US-CHI';

  List<RegionSettings> get allRegions => regions.values.toList();

  static RegionCode? fromBackendCode(String? code) {
    final normalized = (code ?? '').trim().toUpperCase();
    if (normalized == 'NG' || normalized == 'NIGERIA') return RegionCode.ng;
    if (normalized == 'US-CHI' || normalized == 'US' || normalized == 'CHICAGO') {
      return RegionCode.usChi;
    }
    return null;
  }

  static String toBackendCode(RegionCode code) {
    return code == RegionCode.ng ? 'NG' : 'US-CHI';
  }

  // ─── Setters ──────────────────────────────────────────────────────────

  Future<void> setRegion(RegionCode code) async {
    if (_currentCode == code) return;
    _currentCode = code;
    notifyListeners();
    _save();
  }

  /// Auto-detect region from latitude/longitude.
  /// Chicago metro bounding box: ~41.6–42.1 N, 87.5–88.0 W.
  void detectFromLocation(double lat, double lng) {
    final isChicagoArea =
        lat >= 41.5 && lat <= 42.2 && lng >= -88.1 && lng <= -87.4;
    final detected = isChicagoArea ? RegionCode.usChi : RegionCode.ng;
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
