import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Manages driver preferences (ride types, trip settings, communication, accessibility).
/// All preferences are persisted locally via SharedPreferences.
class DriverPreferencesProvider with ChangeNotifier {
  static const _keyAcceptRides = 'pref_accept_rides';
  static const _keyAcceptDeliveries = 'pref_accept_deliveries';
  static const _keyAcceptScheduled = 'pref_accept_scheduled';
  static const _keyLongTrips = 'pref_long_trips';
  static const _keyShortTrips = 'pref_short_trips';
  static const _keyAirportRides = 'pref_airport_rides';
  static const _keyAutoGreeting = 'pref_auto_greeting';
  static const _keyQuietMode = 'pref_quiet_mode';
  static const _keyWheelchairAccessible = 'pref_wheelchair';
  static const _keyPetFriendly = 'pref_pet_friendly';
  static const _keyDestination = 'pref_destination_name';
  static const _keyDestinationAddress = 'pref_destination_address';
  static const _keyHomeAddress = 'pref_home_address';
  static const _keyWorkAddress = 'pref_work_address';

  // Ride type preferences
  bool _acceptRides = true;
  bool _acceptDeliveries = true;
  bool _acceptScheduled = true;

  // Trip preferences
  bool _longTrips = true;
  bool _shortTrips = true;
  bool _airportRides = true;

  // Communication
  bool _autoGreeting = true;
  bool _quietMode = false;

  // Accessibility
  bool _wheelchairAccessible = false;
  bool _petFriendly = false;

  // Active destination
  String? _destinationName;
  String? _destinationAddress;

  // Saved places
  String? _homeAddress;
  String? _workAddress;

  bool _isLoaded = false;

  // Getters
  bool get acceptRides => _acceptRides;
  bool get acceptDeliveries => _acceptDeliveries;
  bool get acceptScheduled => _acceptScheduled;
  bool get longTrips => _longTrips;
  bool get shortTrips => _shortTrips;
  bool get airportRides => _airportRides;
  bool get autoGreeting => _autoGreeting;
  bool get quietMode => _quietMode;
  bool get wheelchairAccessible => _wheelchairAccessible;
  bool get petFriendly => _petFriendly;
  String? get destinationName => _destinationName;
  String? get destinationAddress => _destinationAddress;
  bool get hasActiveDestination => _destinationName != null;
  String? get homeAddress => _homeAddress;
  String? get workAddress => _workAddress;
  bool get isLoaded => _isLoaded;

  /// Load all preferences from SharedPreferences
  Future<void> loadPreferences() async {
    if (_isLoaded) return;
    final prefs = await SharedPreferences.getInstance();

    _acceptRides = prefs.getBool(_keyAcceptRides) ?? true;
    _acceptDeliveries = prefs.getBool(_keyAcceptDeliveries) ?? true;
    _acceptScheduled = prefs.getBool(_keyAcceptScheduled) ?? true;
    _longTrips = prefs.getBool(_keyLongTrips) ?? true;
    _shortTrips = prefs.getBool(_keyShortTrips) ?? true;
    _airportRides = prefs.getBool(_keyAirportRides) ?? true;
    _autoGreeting = prefs.getBool(_keyAutoGreeting) ?? true;
    _quietMode = prefs.getBool(_keyQuietMode) ?? false;
    _wheelchairAccessible = prefs.getBool(_keyWheelchairAccessible) ?? false;
    _petFriendly = prefs.getBool(_keyPetFriendly) ?? false;
    _destinationName = prefs.getString(_keyDestination);
    _destinationAddress = prefs.getString(_keyDestinationAddress);
    _homeAddress = prefs.getString(_keyHomeAddress);
    _workAddress = prefs.getString(_keyWorkAddress);

    _isLoaded = true;
    notifyListeners();
  }

  // ── Setters that persist immediately ──────────────────────────────

  Future<void> setAcceptRides(bool value) async {
    _acceptRides = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAcceptRides, value);
  }

  Future<void> setAcceptDeliveries(bool value) async {
    _acceptDeliveries = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAcceptDeliveries, value);
  }

  Future<void> setAcceptScheduled(bool value) async {
    _acceptScheduled = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAcceptScheduled, value);
  }

  Future<void> setLongTrips(bool value) async {
    _longTrips = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyLongTrips, value);
  }

  Future<void> setShortTrips(bool value) async {
    _shortTrips = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyShortTrips, value);
  }

  Future<void> setAirportRides(bool value) async {
    _airportRides = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAirportRides, value);
  }

  Future<void> setAutoGreeting(bool value) async {
    _autoGreeting = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAutoGreeting, value);
  }

  Future<void> setQuietMode(bool value) async {
    _quietMode = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyQuietMode, value);
  }

  Future<void> setWheelchairAccessible(bool value) async {
    _wheelchairAccessible = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyWheelchairAccessible, value);
  }

  Future<void> setPetFriendly(bool value) async {
    _petFriendly = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyPetFriendly, value);
  }

  Future<void> setDestination(String? name, String? address) async {
    _destinationName = name;
    _destinationAddress = address;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    if (name != null) {
      await prefs.setString(_keyDestination, name);
      await prefs.setString(_keyDestinationAddress, address ?? '');
    } else {
      await prefs.remove(_keyDestination);
      await prefs.remove(_keyDestinationAddress);
    }
  }

  Future<void> clearDestination() async {
    _destinationName = null;
    _destinationAddress = null;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyDestination);
    await prefs.remove(_keyDestinationAddress);
  }

  Future<void> setHomeAddress(String address) async {
    _homeAddress = address;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyHomeAddress, address);
  }

  Future<void> setWorkAddress(String address) async {
    _workAddress = address;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyWorkAddress, address);
  }
}
