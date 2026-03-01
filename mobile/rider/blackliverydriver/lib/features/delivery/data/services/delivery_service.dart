import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/delivery_model.dart';

/// Service for delivery-specific backend API calls.
class DeliveryService {
  final ApiClient _api = ApiClient();

  /// Get delivery details by ride/delivery ID.
  Future<Delivery?> getDelivery(String deliveryId) async {
    try {
      final response = await _api.dio.get(
        '${ApiConstants.deliveries}/$deliveryId',
      );
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data is Map
            ? response.data as Map<String, dynamic>
            : (response.data['delivery'] ?? response.data['ride']) as Map<String, dynamic>;
        return Delivery.fromJson(data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Upload proof of delivery (base64-encoded photo and/or signature).
  Future<bool> uploadProof({
    required String deliveryId,
    String? photoBase64,
    String? signatureBase64,
    String? notes,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (photoBase64 != null) body['photoBase64'] = photoBase64;
      if (signatureBase64 != null) body['signatureBase64'] = signatureBase64;
      if (notes != null) body['notes'] = notes;

      final response = await _api.dio.post(
        '${ApiConstants.deliveries}/$deliveryId/proof',
        data: body,
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// Get delivery history for the driver.
  Future<List<Delivery>> getDeliveryHistory({int page = 1, int limit = 20}) async {
    try {
      final response = await _api.dio.get(
        '${ApiConstants.deliveryHistory}?page=$page&limit=$limit',
      );
      if (response.statusCode == 200) {
        final list = response.data['data'] as List? ?? [];
        return list
            .map((e) => Delivery.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
