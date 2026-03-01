import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CacheService {
  static final CacheService _instance = CacheService._internal();
  factory CacheService() => _instance;
  CacheService._internal();

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  Future<void> setString(String key, String value) async {
    await _prefs?.setString(key, value);
  }

  String? getString(String key) {
    return _prefs?.getString(key);
  }

  Future<void> setJson(String key, Map<String, dynamic> json) async {
    await _prefs?.setString(key, jsonEncode(json));
  }

  Map<String, dynamic>? getJson(String key) {
    final str = _prefs?.getString(key);
    if (str != null) {
      try {
        return jsonDecode(str) as Map<String, dynamic>;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  Future<void> setJsonList(String key, List<dynamic> list) async {
    await _prefs?.setString(key, jsonEncode(list));
  }

  List<dynamic>? getJsonList(String key) {
    final str = _prefs?.getString(key);
    if (str != null) {
      try {
        return jsonDecode(str) as List<dynamic>;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  Future<void> remove(String key) async {
    await _prefs?.remove(key);
  }

  Future<void> clear() async {
    await _prefs?.clear();
  }
}
