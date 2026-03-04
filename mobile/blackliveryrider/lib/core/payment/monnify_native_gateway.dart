import 'package:flutter/material.dart';
import '../../presentation/pages/payment_webview_screen.dart';
import 'payment_gateway.dart';

/// Monnify gateway — falls back to WebView since the Monnify Flutter SDK
/// is less mature.  The backend already returns `authorizationUrl` (Monnify
/// checkout page), so we reuse [PaymentWebViewScreen] as the UI.
///
/// If a stable `monnify_payment_sdk` package becomes available, this can
/// be swapped to a fully native implementation.
class MonnifyNativeGateway extends PaymentGateway {
  @override
  String get displayName => 'Monnify';

  @override
  bool get isSupported => true;

  @override
  Future<void> initialize() async {
    // No SDK init needed — using WebView approach.
  }

  @override
  Future<NativePaymentResult> processPayment({
    required BuildContext context,
    required Map<String, dynamic> backendData,
    required double amount,
    required String currency,
    required String email,
  }) async {
    final authUrl = backendData['authorizationUrl'] as String? ??
        backendData['authorization_url'] as String?;
    final reference = backendData['reference'] as String?;

    if (authUrl == null || authUrl.isEmpty) {
      return NativePaymentResult(
        success: false,
        reference: reference,
        errorMessage: 'No checkout URL returned from Monnify',
      );
    }

    try {
      // Open the familiar WebView + verify flow
      final webViewResult = await Navigator.push<PaymentWebViewResult>(
        context,
        MaterialPageRoute(
          builder: (_) => PaymentWebViewScreen(
            authorizationUrl: authUrl,
            reference: reference,
            title: 'Monnify Payment',
          ),
        ),
      );

      if (webViewResult == null) {
        return NativePaymentResult(
          success: false,
          reference: reference,
          errorMessage: 'Payment cancelled',
        );
      }

      return NativePaymentResult(
        success: webViewResult.success,
        reference: webViewResult.reference ?? reference,
        transactionId: webViewResult.transactionId,
        errorMessage: webViewResult.success ? null : 'Payment not completed',
      );
    } catch (e) {
      debugPrint('MonnifyNativeGateway error: $e');
      return NativePaymentResult(
        success: false,
        reference: reference,
        errorMessage: e.toString(),
      );
    }
  }
}
