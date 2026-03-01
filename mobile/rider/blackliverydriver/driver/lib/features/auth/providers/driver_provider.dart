import 'dart:io';
import 'package:flutter/material.dart';
import '../data/models/vehicle_model.dart';
import '../data/services/driver_service.dart';

class DriverProvider with ChangeNotifier {
  final DriverService _driverService = DriverService();

  List<Vehicle> _vehicles = [];
  bool _isLoading = false;
  String? _error;

  List<Vehicle> get vehicles => _vehicles;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadVehicles() async {
    _isLoading = true;
    notifyListeners();
    try {
      _vehicles = await _driverService.getVehicles();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addVehicle(Map<String, dynamic> vehicleData) async {
    _isLoading = true;
    notifyListeners();
    try {
      final vehicle = await _driverService.addVehicle(vehicleData);
      _vehicles.add(vehicle);
    } catch (e) {
      _error = e.toString();
      rethrow; // Let UI handle success/fail flow
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> uploadDocument(
    String docType,
    File file, {
    String? vehicleType,
    String? liveryPlateNumber,
    void Function(int, int)? onSendProgress,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      await _driverService.uploadDocument(
        docType,
        file,
        vehicleType: vehicleType,
        liveryPlateNumber: liveryPlateNumber,
        onSendProgress: onSendProgress,
      );
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  List<dynamic> _documents = [];
  List<dynamic> get documents => _documents;

  Future<void> loadDocuments() async {
    _isLoading = true;
    notifyListeners();
    try {
      _documents = await _driverService.getDocuments();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
