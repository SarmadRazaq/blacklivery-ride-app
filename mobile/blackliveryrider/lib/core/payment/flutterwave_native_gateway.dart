import 'package:flutter/material.dart';
import 'package:flutterwave_standard/flutterwave.dart';
import '../config/env_config.dart';
import 'payment_gateway.dart';

/// Flutterwave native SDK gateway using `flutterwave_standard`.
///
/// The SDK creates its own transaction with Flutterwave and presents a
/// managed WebView for card, bank transfer, USSD, mobile money payments.
class FlutterwaveNativeGateway extends PaymentGateway {
  @override
  String get displayName => 'Flutterwave';

  @override
  bool get isSupported => true;

  @override
  Future<void> initialize() async {
    // Flutterwave SDK doesn't require explicit initialization.
  }

  @override
  Future<NativePaymentResult> processPayment({
    required BuildContext context,
    required Map<String, dynamic> backendData,
    required double amount,
    required String currency,
    required String email,
  }) async {
    final publicKey = EnvConfig.flutterwavePublicKey;
    if (publicKey.isEmpty) {
      return const NativePaymentResult(
        success: false,
        errorMessage: 'FLUTTERWAVE_PUBLIC_KEY not configured',
      );
    }

    final reference = (backendData['reference'] as String?) ?? '';

    try {
      final flutterwave = Flutterwave(
        publicKey: publicKey,
        currency: currency.toUpperCase(),
        amount: amount.toStringAsFixed(2),
        customer: Customer(
          email: email,
          name: '', // optional
          phoneNumber: '', // optional
        ),
        txRef: reference,
        paymentOptions: 'card, banktransfer, ussd',
        customization: Customization(
          title: 'BlackLivery',
          description: 'Payment',
          logo: 'https://blacklivery.com/logo.png',
        ),
        isTestMode: !EnvConfig.isProduction,
        redirectUrl: 'https://blacklivery.com/payment/callback',
      );

      final response = await flutterwave.charge(context);

      final isSuccess = response.success == true ||
          response.status?.toLowerCase() == 'successful' ||
          response.status?.toLowerCase() == 'success';

      return NativePaymentResult(
        success: isSuccess,
        reference: response.txRef ?? reference,
        transactionId: response.transactionId,
        errorMessage: isSuccess ? null : 'Payment ${response.status}',
      );
    } catch (e) {
      debugPrint('FlutterwaveNativeGateway error: $e');
      return NativePaymentResult(
        success: false,
        reference: reference,
        errorMessage: e.toString(),
      );
    }
  }
}
