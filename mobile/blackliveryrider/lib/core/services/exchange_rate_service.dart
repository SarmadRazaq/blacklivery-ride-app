import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Fetches live exchange rates from the internet and caches them locally.
///
/// Uses the free Open Exchange Rates API (open.er-api.com) which requires
/// no API key. Rates are cached in SharedPreferences with a 1-hour TTL
/// so the app doesn't hit the network on every launch.
class ExchangeRateService {
  static const String _cacheKey = 'cached_exchange_rates';
  static const String _cacheTimestampKey = 'exchange_rates_timestamp';
  static const Duration _cacheTTL = Duration(hours: 1);

  /// The base URL for the free exchange-rate API (no key needed).
  static const String _apiUrl = 'https://open.er-api.com/v6/latest/USD';

  static final ExchangeRateService _instance = ExchangeRateService._internal();
  factory ExchangeRateService() => _instance;
  ExchangeRateService._internal();

  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  /// Fetch rates from the API or return cached rates if still fresh.
  /// Returns a map like `{ 'USD': 1.0, 'NGN': 1580.5, ... }`.
  ///
  /// Returns `null` if both the network call and cache miss.
  Future<Map<String, double>?> getRates({bool forceRefresh = false}) async {
    // 1. Try cache first (unless forced refresh)
    if (!forceRefresh) {
      final cached = await _loadFromCache();
      if (cached != null) return cached;
    }

    // 2. Fetch from network
    try {
      final response = await _dio.get(_apiUrl);
      if (response.statusCode == 200) {
        final data = response.data;
        final rawRates = data['rates'];
        if (rawRates is Map) {
          final rates = <String, double>{};
          rawRates.forEach((key, value) {
            if (value is num) {
              rates[key.toString().toUpperCase()] = value.toDouble();
            }
          });
          if (rates.isNotEmpty) {
            await _saveToCache(rates);
            debugPrint('ExchangeRateService: Fetched ${rates.length} live rates');
            return rates;
          }
        }
      }
    } catch (e) {
      debugPrint('ExchangeRateService: Network error — $e');
    }

    // 3. Fallback to stale cache (ignore TTL)
    return _loadFromCache(ignoreExpiry: true);
  }

  Future<Map<String, double>?> _loadFromCache({bool ignoreExpiry = false}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final timestamp = prefs.getInt(_cacheTimestampKey);
      if (timestamp == null) return null;

      if (!ignoreExpiry) {
        final cachedAt = DateTime.fromMillisecondsSinceEpoch(timestamp);
        if (DateTime.now().difference(cachedAt) > _cacheTTL) return null;
      }

      final jsonStr = prefs.getString(_cacheKey);
      if (jsonStr == null) return null;

      final decoded = json.decode(jsonStr) as Map<String, dynamic>;
      return decoded.map((k, v) => MapEntry(k, (v as num).toDouble()));
    } catch (e) {
      debugPrint('ExchangeRateService: Cache read error — $e');
      return null;
    }
  }

  Future<void> _saveToCache(Map<String, double> rates) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, json.encode(rates));
      await prefs.setInt(
        _cacheTimestampKey,
        DateTime.now().millisecondsSinceEpoch,
      );
    } catch (e) {
      debugPrint('ExchangeRateService: Cache write error — $e');
    }
  }
}
