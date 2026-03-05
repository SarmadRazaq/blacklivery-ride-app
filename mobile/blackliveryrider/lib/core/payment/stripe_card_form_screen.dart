import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

/// A full-screen card form that uses Stripe's native [CardFormField] widget
/// embedded directly in the Flutter widget tree.
///
/// This avoids the well-known Android emulator bug where the Payment Sheet
/// BottomSheet's card-number field is untappable.  The widget still uses
/// Stripe's native card input (PCI-compliant) and handles 3DS automatically
/// via [Stripe.instance.confirmPayment].
class StripeCardFormScreen extends StatefulWidget {
  final String clientSecret;
  final String? email;
  final double amount;
  final String currency;

  const StripeCardFormScreen({
    super.key,
    required this.clientSecret,
    this.email,
    required this.amount,
    required this.currency,
  });

  @override
  State<StripeCardFormScreen> createState() => _StripeCardFormScreenState();
}

class _StripeCardFormScreenState extends State<StripeCardFormScreen> {
  final _controller = CardFormEditController();
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onCardChanged);
  }

  void _onCardChanged() {
    // Rebuild to update button state when card completeness changes.
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _controller.removeListener(_onCardChanged);
    _controller.dispose();
    super.dispose();
  }

  bool get _cardComplete => _controller.details.complete == true;

  Future<void> _confirmPayment() async {
    if (!_cardComplete || _isProcessing) return;
    setState(() => _isProcessing = true);

    try {
      final paymentIntent = await Stripe.instance.confirmPayment(
        paymentIntentClientSecret: widget.clientSecret,
        data: PaymentMethodParams.card(
          paymentMethodData: PaymentMethodData(
            billingDetails: BillingDetails(email: widget.email),
          ),
        ),
      );

      if (!mounted) return;

      if (paymentIntent.status == PaymentIntentsStatus.Succeeded ||
          paymentIntent.status == PaymentIntentsStatus.RequiresCapture) {
        Navigator.pop(context, true);
      } else {
        setState(() => _isProcessing = false);
        _showError('Payment was not completed. Status: ${paymentIntent.status}');
      }
    } on StripeException catch (e) {
      setState(() => _isProcessing = false);
      if (e.error.code == FailureCode.Canceled) {
        // User cancelled 3DS — stay on form
        return;
      }
      _showError(
        e.error.localizedMessage ?? e.error.message ?? 'Payment failed',
      );
    } catch (e) {
      setState(() => _isProcessing = false);
      _showError(e.toString());
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFFE53935),
      ),
    );
  }

  String get _formattedAmount {
    final symbol = widget.currency == 'USD' ? '\$' : '₦';
    final formatted = widget.amount.toStringAsFixed(
      widget.amount.truncateToDouble() == widget.amount ? 0 : 2,
    );
    return '$symbol$formatted';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF181818),
      appBar: AppBar(
        backgroundColor: const Color(0xFF181818),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context, false),
        ),
        title: const Text(
          'Add Card',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),

              const Text(
                'Card information',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),

              const SizedBox(height: 12),

              // ── Stripe CardFormField — native, PCI-compliant input ──
              CardFormField(
                controller: _controller,
                enablePostalCode: true,
                countryCode: widget.currency == 'USD' ? 'US' : 'NG',
                style: CardFormStyle(
                  backgroundColor: const Color(0xFF222222),
                  textColor: Colors.white,
                  placeholderColor: const Color(0xFF7C7C7C),
                  borderColor: const Color(0xFF333333),
                  cursorColor: const Color(0xFFD2BF9F),
                  borderRadius: 12,
                  borderWidth: 1,
                  fontSize: 16,
                  textErrorColor: const Color(0xFFE53935),
                ),
              ),

              const SizedBox(height: 8),

              Text(
                'Your card details are handled securely by Stripe. '
                'They never touch our servers.',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.5),
                  fontSize: 12,
                ),
              ),

              const Spacer(),

              // ── Pay button ──────────────────────────────────────────
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _cardComplete && !_isProcessing
                      ? _confirmPayment
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD2BF9F),
                    disabledBackgroundColor:
                        const Color(0xFFD2BF9F).withValues(alpha: 0.4),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: _isProcessing
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.black),
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Pay $_formattedAmount',
                              style: const TextStyle(
                                color: Colors.black,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.lock_outline,
                              color: Colors.black,
                              size: 18,
                            ),
                          ],
                        ),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
