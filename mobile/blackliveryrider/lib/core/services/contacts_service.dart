import 'package:dio/dio.dart';
import '../network/api_client.dart';
import '../models/emergency_contact_model.dart';

class ContactsService {
  final Dio _dio = ApiClient().dio;

  /// Get emergency contacts
  Future<List<EmergencyContact>> getEmergencyContacts() async {
    try {
      final response = await _dio.get('/api/v1/contacts/emergency');
      final List<dynamic> contactsJson = response.data['data'] ?? [];
      return contactsJson.map((json) => EmergencyContact.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Add emergency contact
  Future<EmergencyContact?> addEmergencyContact(EmergencyContact contact) async {
    try {
      final response = await _dio.post(
        '/api/v1/contacts/emergency',
        data: contact.toJson(),
      );
      return EmergencyContact.fromJson(response.data['data']);
    } catch (e) {
      return null;
    }
  }

  /// Remove emergency contact
  Future<bool> removeEmergencyContact(String contactId) async {
    try {
      await _dio.delete('/api/v1/contacts/emergency/$contactId');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get all phone contacts (from device + synced)
  Future<List<EmergencyContact>> getAllContacts() async {
    try {
      final response = await _dio.get('/api/v1/contacts');
      final List<dynamic> contactsJson = response.data['data'] ?? [];
      return contactsJson.map((json) => EmergencyContact.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }
}
