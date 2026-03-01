import 'dart:io';
import 'package:dio/dio.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/firebase_storage_service.dart';
import '../models/vehicle_model.dart';

class DriverService {
  final ApiClient _apiClient = ApiClient();
  final FirebaseStorageService _firebaseStorageService = FirebaseStorageService();

  // Vehicles
  Future<List<Vehicle>> getVehicles() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.vehicles);
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((json) => Vehicle.fromJson(json)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<Vehicle> addVehicle(Map<String, dynamic> vehicleData) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.vehicles,
        data: vehicleData,
      );
      return Vehicle.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  // Documents
  Future<List<dynamic>> getDocuments() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.driverDocuments);
      return response.data['data'] ?? response.data['documents'] ?? [];
    } catch (e) {
      // If 404, return empty list (no documents yet)
      if (e is DioException && e.response?.statusCode == 404) return [];
      rethrow;
    }
  }

  Future<void> uploadDocument(
    String docType,
    File file, {
    String? vehicleType,
    String? liveryPlateNumber,
    void Function(int, int)? onSendProgress,
  }) async {
    try {
      final fileName = file.path.split('/').last;
      final extension =
          fileName.contains('.') ? fileName.split('.').last.toLowerCase() : 'jpg';
      final mimeType = _mimeTypeFromExtension(extension);

      final formData = FormData.fromMap({
        'type': docType,
        if (vehicleType != null && vehicleType.trim().isNotEmpty)
          'vehicleType': vehicleType.trim(),
        if (liveryPlateNumber != null && liveryPlateNumber.trim().isNotEmpty)
          'liveryPlateNumber': liveryPlateNumber.trim().toUpperCase(),
        'file': await MultipartFile.fromFile(
          file.path,
          filename: fileName,
          contentType: DioMediaType.parse(mimeType),
        ),
      });

      await _apiClient.dio.post(
        ApiConstants.driverDocuments,
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
        onSendProgress: onSendProgress,
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getDocumentVerificationState() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.driverDocuments);
      final data = response.data as Map<String, dynamic>;
      return {
        'documents': data['data'] ?? data['documents'] ?? <dynamic>[],
        'vehicleType': (data['verificationDetails']?['vehicleType'] ?? '')
            .toString(),
        'liveryPlateNumber':
            (data['verificationDetails']?['liveryPlateNumber'] ?? '')
                .toString(),
      };
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 404) {
        return {
          'documents': <dynamic>[],
          'vehicleType': '',
          'liveryPlateNumber': '',
        };
      }
      rethrow;
    }
  }

  Future<void> saveVerificationDetails({
    required String vehicleType,
    required String liveryPlateNumber,
  }) async {
    try {
      await _apiClient.dio.patch(
        ApiConstants.driverVerificationDetails,
        data: {
          'vehicleType': vehicleType.trim(),
          'liveryPlateNumber': liveryPlateNumber.trim().toUpperCase(),
        },
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<List<dynamic>> getNotifications({int limit = 30}) async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.driverNotifications,
        queryParameters: {'limit': limit},
      );
      return response.data['data'] ?? [];
    } catch (e) {
      rethrow;
    }
  }

  Future<void> markAllNotificationsRead() async {
    try {
      await _apiClient.dio.patch(ApiConstants.driverNotificationsReadAll);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> markNotificationRead(String id) async {
    try {
      await _apiClient.dio.patch(
        ApiConstants.driverNotificationRead.replaceAll('{id}', id),
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getLoyaltyOverview() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.driverLoyalty);
      return response.data['data'] ?? {};
    } catch (e) {
      rethrow;
    }
  }

  Future<List<dynamic>> getDemandZones({
    required String filter,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.driverDemandZones,
        queryParameters: {'filter': filter},
      );
      return response.data['data'] ?? [];
    } catch (e) {
      rethrow;
    }
  }

  Future<void> uploadProfileImage(File file) async {
    try {
      final imageUrl = await _firebaseStorageService.uploadDriverProfileImage(
        file,
      );
      await updateProfileField('profileImage', imageUrl);
    } catch (e) {
      rethrow;
    }
  }

  String _mimeTypeFromExtension(String ext) {
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'heic':
        return 'image/heic';
      case 'heif':
        return 'image/heif';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'image/jpeg';
    }
  }

  // Bank Info
  Future<void> updateBankInfo(Map<String, dynamic> bankData) async {
    try {
      await _apiClient.dio.post(ApiConstants.driverBank, data: bankData);
    } catch (e) {
      rethrow;
    }
  }

  // Earnings
  Future<Map<String, dynamic>> getEarnings({String period = 'week'}) async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.earnings,
        queryParameters: {'period': period},
      );
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  // Payouts
  Future<void> requestPayout(
    double amount, {
    String? accountNumber,
    String? bankCode,
  }) async {
    try {
      final data = <String, dynamic>{'amount': amount};
      if (accountNumber != null) data['accountNumber'] = accountNumber;
      if (bankCode != null) data['bankCode'] = bankCode;
      await _apiClient.dio.post(ApiConstants.payoutRequest, data: data);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<dynamic>> getPayoutHistory() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.payouts);
      return response.data['data'] ?? [];
    } catch (e) {
      rethrow;
    }
  }

  /// Get rating distribution from backend
  Future<Map<String, dynamic>> getRatingDistribution() async {
    try {
      final response = await _apiClient.dio.get('/api/v1/driver/ratings');
      return response.data['data'] ?? {};
    } catch (e) {
      rethrow;
    }
  }

  /// Save emergency contact to profile
  Future<void> saveEmergencyContact(Map<String, dynamic> contact) async {
    try {
      await _apiClient.dio.patch(
        ApiConstants.profile,
        data: {
          'emergencyContacts': [
            {
              'name': contact['name'],
              'phoneNumber': contact['phone'],
              'relationship': contact['relationship'],
            },
          ],
        },
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Update profile fields (payoutPreference, rideMode, etc.)
  Future<void> updateProfileField(String field, dynamic value) async {
    try {
      await _apiClient.dio.patch(ApiConstants.profile, data: {field: value});
    } catch (e) {
      rethrow;
    }
  }

  /// Get list of banks (Nigeria specific)
  Future<List<dynamic>> getBanks() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.payoutBanks);
      return (response.data as List?) ?? [];
    } catch (e) {
      rethrow;
    }
  }

  /// Verify bank account name (Nigeria specific)
  Future<String> verifyBankAccount(
    String accountNumber,
    String bankCode,
  ) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.validateAccount,
        data: {'accountNumber': accountNumber, 'bankCode': bankCode},
      );
      return response.data['data']['accountName'] ?? '';
    } catch (e) {
      rethrow;
    }
  }

  /// Get Stripe Express onboarding/dashboard link (Chicago specific)
  Future<String> getStripeDashboardLink() async {
    try {
      final response = await _apiClient.dio.post(ApiConstants.stripeOnboarding);
      return response.data['url'] ?? '';
    } catch (e) {
      rethrow;
    }
  }
}
