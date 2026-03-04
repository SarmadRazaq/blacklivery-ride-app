import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_paystack_plus/flutter_paystack_plus.dart';
import '../config/env_config.dart';
import 'payment_gateway.dart';

/// Paystack native SDK gateway using `flutter_paystack_plus`.
///
/// The backend already returns an `authorizationUrl` from
/// `POST /api/v1/payments/initiate`. We pass it to the Paystack plugin's
/// `openPaystackPopup()` which opens a managed WebView with proper callbacks
/// for success and close — no raw WebView needed.
class PaystackNativeGateway extends PaymentGateway {
  @override
  String get displayName => 'Paystack';

  @override
  bool get isSupported => true;

  @override
  Future<void> initialize() async {
    // flutter_paystack_plus doesn't require explicit initialization.
  }

  @override
  Future<NativePaymentResult> processPayment({
    required BuildContext context,
    required Map<String, dynamic> backendData,
    required double amount,
    required String currency,
    required String email,
  }) async {
    final reference = (backendData['reference'] as String?) ?? '';
    final authorizationUrl =
        backendData['authorizationUrl'] as String? ??
        backendData['authorization_url'] as String?;

    // Paystack expects amount in kobo (×100)
    final koboAmount = (amount * 100).toInt().toString();

    // Completer bridges the callback-style API to our Future-based interface
    final completer = Completer<NativePaymentResult>();

    try {
      await FlutterPaystackPlus.openPaystackPopup(
        customerEmail: email,
        amount: koboAmount,
        reference: reference,
        currency: currency.toUpperCase(),
        context: context,
        publicKey: EnvConfig.paystackPublicKey,
        // If the backend already generated an authorization URL, use it
        // so we skip the client-side /transaction/initialize call.
        authorizationUrl: authorizationUrl,
        callBackUrl: 'https://blacklivery.com/payment/callback',
        onSuccess: () {
          if (!completer.isCompleted) {
            completer.complete(NativePaymentResult(
              success: true,
              reference: reference,
            ));
          }
        },
        onClosed: () {
          if (!completer.isCompleted) {
            completer.complete(NativePaymentResult(
              success: false,
              reference: reference,
              errorMessage: 'Payment cancelled',
            ));
          }
        },
      );

      // If openPaystackPopup returns without firing callbacks, await them
      if (!completer.isCompleted) {
        return completer.future.timeout(
          const Duration(minutes: 10),
          onTimeout: () => NativePaymentResult(
            success: false,
            reference: reference,
            errorMessage: 'Payment timed out',
          ),
        );
      }

      return completer.future;
    } catch (e) {
      debugPrint('PaystackNativeGateway error: $e');
      if (!completer.isCompleted) {
        return NativePaymentResult(
          success: false,
          reference: reference,
          errorMessage: e.toString(),
        );
      }
      return completer.future;
    }
  }
}
