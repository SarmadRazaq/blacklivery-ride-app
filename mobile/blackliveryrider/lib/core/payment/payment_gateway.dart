import 'package:flutter/widgets.dart';

/// Result from a native payment SDK checkout.
class NativePaymentResult {
  final bool success;
  final String? reference;
  final String? transactionId;
  final String? errorMessage;

  const NativePaymentResult({
    required this.success,
    this.reference,
    this.transactionId,
    this.errorMessage,
  });

  @override
  String toString() =>
      'NativePaymentResult(success=$success, ref=$reference, txId=$transactionId, err=$errorMessage)';
}

/// Abstract base for native payment gateway SDKs.
///
/// Each provider (Stripe, Paystack, Flutterwave, Monnify) implements this
/// interface. The [PaymentGatewayFactory] selects the correct gateway at
/// runtime based on the user's region / chosen provider.
abstract class PaymentGateway {
  /// Human-readable gateway name (e.g. "Stripe", "Paystack").
  String get displayName;

  /// Initializes the underlying SDK.  Call once (idempotent).
  Future<void> initialize();

  /// Processes a payment using the native SDK UI.
  ///
  /// * [context]     — for SDKs that present a bottom-sheet or full-screen UI.
  /// * [backendData] — the JSON from `POST /api/v1/payments/initiate`.
  ///   Contains provider-specific fields: `clientSecret` (Stripe),
  ///   `accessCode` (Paystack), `authorizationUrl` (Flutterwave/Monnify), etc.
  /// * [amount], [currency], [email] — echoed for SDKs that need them locally.
  Future<NativePaymentResult> processPayment({
    required BuildContext context,
    required Map<String, dynamic> backendData,
    required double amount,
    required String currency,
    required String email,
  });

  /// Whether this gateway is available on the current platform.
  bool get isSupported;
}
