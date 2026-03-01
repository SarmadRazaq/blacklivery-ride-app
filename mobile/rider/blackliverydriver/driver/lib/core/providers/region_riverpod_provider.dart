import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'region_provider.dart'; // For RegionCode and RegionSettings

class RegionNotifier extends Notifier<RegionCode> {
  static const String _prefKey = 'selected_region';

  @override
  RegionCode build() {
    _loadSaved();
    return RegionCode.ng;
  }

  Future<void> _loadSaved() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null) {
        final code = RegionCode.values.firstWhere(
          (c) => c.name == saved,
          orElse: () => RegionCode.ng,
        );
        if (state != code) {
          state = code;
        }
      }
    } catch (e) {
      debugPrint('RegionNotifier: failed to load saved region: $e');
    }
  }

  Future<void> _save(RegionCode code) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, code.name);
    } catch (e) {
      debugPrint('RegionNotifier: failed to save region: $e');
    }
  }

  Future<void> setRegion(RegionCode code) async {
    if (state == code) return;
    state = code;
    await _save(code);
  }

  void detectFromLocation(double lat, double lng) {
    final isChicagoArea =
        lat >= 41.5 && lat <= 42.2 && lng >= -88.1 && lng <= -87.4;
    final detected = isChicagoArea ? RegionCode.usChi : RegionCode.ng;
    if (state != detected) {
      state = detected;
      _save(detected);
    }
  }
}

final regionRiverpodProvider = NotifierProvider<RegionNotifier, RegionCode>(() {
  return RegionNotifier();
});

final regionSettingsProvider = Provider<RegionSettings>((ref) {
  final code = ref.watch(regionRiverpodProvider);
  return RegionProvider.regions[code]!;
});
