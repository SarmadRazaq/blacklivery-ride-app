import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import '../config/env_config.dart';
import 'payment_gateway.dart';

/// Stripe native SDK gateway using `flutter_stripe`.
///
/// Requires the backend to return a `clientSecret` from a Stripe PaymentIntent
/// (set `sdkMode: true` in the initiate request).  The Stripe Payment Sheet
/// handles card input, 3DS verification, Apple Pay / Google Pay natively —
/// no WebView required.
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
      // Present the Stripe Payment Sheet (handles card input + 3DS)
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'BlackLivery',
          style: ThemeMode.dark,
          appearance: const PaymentSheetAppearance(
            colors: PaymentSheetAppearanceColors(
              background: Color(0xFF1A1A2E),
              primary: Color(0xFFFFD700),
              componentBackground: Color(0xFF16213E),
              componentText: Color(0xFFFFFFFF),
              primaryText: Color(0xFFFFFFFF),
              secondaryText: Color(0xFFB0B0B0),
              placeholderText: Color(0xFF6C6C6C),
              icon: Color(0xFFFFD700),
            ),
            shapes: PaymentSheetShape(
              borderRadius: 12,
            ),
          ),
          billingDetails: BillingDetails(email: email),
        ),
      );

      await Stripe.instance.presentPaymentSheet();

      return NativePaymentResult(
        success: true,
        reference: reference,
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
        errorMessage: e.error.localizedMessage ?? e.error.message ?? 'Stripe error',
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
