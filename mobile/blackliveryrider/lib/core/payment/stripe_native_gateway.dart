import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import '../config/env_config.dart';
import 'payment_gateway.dart';
import 'stripe_card_form_screen.dart';

/// Stripe native SDK gateway using `flutter_stripe`.
///
/// Uses an in-app [CardFormField] screen instead of [presentPaymentSheet] to
/// avoid a known Android bug where the Payment Sheet BottomSheet's card-number
/// field is untappable on certain devices / emulators.
class StripeNativeGateway extends PaymentGateway {
  bool _initialized = false;

  @override
  String get displayName => 'Stripe';

  @override
  bool get isSupported => true;

  @override
  Future<void> initialize() async {
    if (_initialized) return;
    final key = EnvConfig.stripePublishableKey;
    if (key.isEmpty) {
      debugPrint('StripeNativeGateway: STRIPE_PUBLISHABLE_KEY not set');
      return;
    }
    Stripe.publishableKey = key;
    Stripe.merchantIdentifier = 'merchant.com.blacklivery';
    Stripe.urlScheme = 'blacklivery';
    await Stripe.instance.applySettings();
    _initialized = true;
  }

  @override
  Future<NativePaymentResult> processPayment({
    required BuildContext context,
    required Map<String, dynamic> backendData,
    required double amount,
    required String currency,
    required String email,
  }) async {
    if (!_initialized) await initialize();

    final clientSecret = backendData['clientSecret'] as String?;
    if (clientSecret == null || clientSecret.isEmpty) {
      return const NativePaymentResult(
        success: false,
        errorMessage: 'Missing Stripe client secret from backend',
      );
    }

    final reference = backendData['reference'] as String?;

    try {
      // Navigate to an in-app card form (CardFormField) instead of the
      // Payment Sheet BottomSheet — avoids the Android touch-target bug.
      final result = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (_) => StripeCardFormScreen(
            clientSecret: clientSecret,
            email: email,
            amount: amount,
            currency: currency,
          ),
        ),
      );

      if (result == true) {
        return NativePaymentResult(
          success: true,
          reference: reference,
        );
      }

      return NativePaymentResult(
        success: false,
        reference: reference,
        errorMessage: 'Payment was not completed',
      );
    } on StripeException catch (e) {
      final code = e.error.code;
      if (code == FailureCode.Canceled) {
        return NativePaymentResult(
          success: false,
          reference: reference,
          errorMessage: 'Payment cancelled',
        );
      }
      return NativePaymentResult(
        success: false,
        reference: reference,
        errorMessage:
            e.error.localizedMessage ?? e.error.message ?? 'Stripe error',
      );
    } catch (e) {
      return NativePaymentResult(
        success: false,
        reference: reference,
        errorMessage: e.toString(),
      );
    }
  }
}
