import 'package:flutter/foundation.dart';
import 'payment_gateway.dart';
import 'stripe_native_gateway.dart';
import 'paystack_native_gateway.dart';
import 'flutterwave_native_gateway.dart';
import 'monnify_native_gateway.dart';

/// Factory that vends the correct [PaymentGateway] based on gateway ID.
///
/// Gateways are lazily created and cached for the lifetime of the app.
///
/// Usage:
/// ```dart
/// final gw = PaymentGatewayFactory.get('stripe');
/// await gw.initialize();
/// final result = await gw.processPayment(...);
/// ```
class PaymentGatewayFactory {
  PaymentGatewayFactory._();

  static final Map<String, PaymentGateway> _cache = {};

  /// Returns a cached [PaymentGateway] for the given [gatewayId].
  ///
  /// Recognized IDs: `stripe`, `paystack`, `flutterwave`, `monnify`.
  /// Returns an unsupported stub for unknown IDs so callers can
  /// gracefully fall through to WebView.
  static PaymentGateway get(String gatewayId) {
    return _cache.putIfAbsent(gatewayId.toLowerCase(), () {
      switch (gatewayId.toLowerCase()) {
        case 'stripe':
        case 'apple_pay': // Apple Pay is handled via Stripe SDK
          return StripeNativeGateway();
        case 'paystack':
          return PaystackNativeGateway();
        case 'flutterwave':
          return FlutterwaveNativeGateway();
        case 'monnify':
          return MonnifyNativeGateway();
        default:
          return _UnsupportedGateway(gatewayId);
      }
    });
  }

  /// Pre-initializes gateways for a given region so the first payment
  /// doesn't incur SDK boot latency.
  ///
  /// * Chicago / US → Stripe
  /// * Nigeria → Paystack (primary), Flutterwave, Monnify
  static Future<void> initializeForRegion({required bool isChicago}) async {
    try {
      if (isChicago) {
        await get('stripe').initialize();
      } else {
        await get('paystack').initialize();
        // Flutterwave & Monnify are lazy — no init needed
      }
    } catch (e) {
      debugPrint('PaymentGatewayFactory.initializeForRegion error: $e');
    }
  }
}

/// Stub gateway returned for unrecognized IDs.
/// [isSupported] is always `false`, so callers fall through to WebView.
class _UnsupportedGateway extends PaymentGateway {
  final String _id;
  _UnsupportedGateway(this._id);

  @override
  String get displayName => _id;

  @override
  bool get isSupported => false;

  @override
  Future<void> initialize() async {}

  @override
  Future<NativePaymentResult> processPayment({
    required dynamic context,
    required Map<String, dynamic> backendData,
    required double amount,
    required String currency,
    required String email,
  }) async {
    return NativePaymentResult(
      success: false,
      errorMessage: 'Gateway "$_id" does not have a native SDK integration.',
    );
  }
}
