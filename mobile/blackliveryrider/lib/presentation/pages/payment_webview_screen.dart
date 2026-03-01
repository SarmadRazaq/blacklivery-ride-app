import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/payment_service.dart';

/// Result returned from the payment WebView flow.
class PaymentWebViewResult {
  final bool success;
  final String? reference;
  final String? transactionId;

  const PaymentWebViewResult({
    required this.success,
    this.reference,
    this.transactionId,
  });
}

/// Opens a WebView for 3DS / redirect-based payment flows
/// (Paystack, Flutterwave, Monnify).
///
/// Usage:
/// ```dart
/// final result = await Navigator.push<PaymentWebViewResult>(
///   context,
///   MaterialPageRoute(
///     builder: (_) => PaymentWebViewScreen(
///       authorizationUrl: 'https://checkout.paystack.com/...',
///       reference: 'TOPUP-...',
///       callbackUrl: 'https://blacklivery.com/payment/callback',
///     ),
///   ),
/// );
/// ```
class PaymentWebViewScreen extends StatefulWidget {
  /// The authorization URL obtained from the payment provider.
  final String authorizationUrl;

  /// The payment reference for verification.
  final String? reference;

  /// Optional callback URL to detect payment completion.
  /// When the WebView navigates to this URL, we treat payment as done.
  final String? callbackUrl;

  /// Title shown on the AppBar.
  final String title;

  const PaymentWebViewScreen({
    super.key,
    required this.authorizationUrl,
    this.reference,
    this.callbackUrl,
    this.title = 'Complete Payment',
  });

  @override
  State<PaymentWebViewScreen> createState() => _PaymentWebViewScreenState();
}

class _PaymentWebViewScreenState extends State<PaymentWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _isVerifying = false;
  double _loadingProgress = 0;

  // Known callback/success patterns from payment providers
  static const _successPatterns = [
    'payment/callback',
    'payment/verify',
    'paystack.co/close',
    'flutterwave.com/complete',
    'checkout.paystack.com/close',
    'blacklivery.com/payment',
  ];

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (mounted) {
              setState(() => _loadingProgress = progress / 100.0);
            }
          },
          onPageStarted: (_) {
            if (mounted) setState(() => _isLoading = true);
          },
          onPageFinished: (url) {
            if (mounted) setState(() => _isLoading = false);
            _checkForCompletion(url);
          },
          onNavigationRequest: (request) {
            final url = request.url.toLowerCase();

            // Intercept callback URL navigations
            if (widget.callbackUrl != null &&
                url.startsWith(widget.callbackUrl!.toLowerCase())) {
              _handlePaymentComplete(request.url);
              return NavigationDecision.prevent;
            }

            // Check for known success URL patterns
            for (final pattern in _successPatterns) {
              if (url.contains(pattern)) {
                _handlePaymentComplete(request.url);
                return NavigationDecision.prevent;
              }
            }

            return NavigationDecision.navigate;
          },
          onWebResourceError: (error) {
            debugPrint('WebView error: ${error.description}');
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.authorizationUrl));
  }

  void _checkForCompletion(String url) {
    final lowerUrl = url.toLowerCase();

    // Check if we're on a success page
    if (widget.callbackUrl != null &&
        lowerUrl.startsWith(widget.callbackUrl!.toLowerCase())) {
      _handlePaymentComplete(url);
      return;
    }

    for (final pattern in _successPatterns) {
      if (lowerUrl.contains(pattern)) {
        _handlePaymentComplete(url);
        return;
      }
    }
  }

  Future<void> _handlePaymentComplete(String returnUrl) async {
    if (_isVerifying) return;

    setState(() => _isVerifying = true);

    // Extract reference from URL query params if available
    final uri = Uri.tryParse(returnUrl);
    final ref = uri?.queryParameters['reference'] ??
        uri?.queryParameters['trxref'] ??
        uri?.queryParameters['transaction_id'] ??
        widget.reference;

    // Verify the payment on the backend
    bool verified = false;
    if (ref != null && ref.isNotEmpty) {
      try {
        final result = await PaymentService().verifyPayment(reference: ref);
        verified = result != null;
      } catch (e) {
        debugPrint('Payment verification error: $e');
      }
    }

    if (mounted) {
      Navigator.pop(
        context,
        PaymentWebViewResult(
          success: verified,
          reference: ref,
          transactionId: uri?.queryParameters['transaction_id'],
        ),
      );
    }
  }

  Future<bool> _onWillPop() async {
    // Show confirmation dialog when user tries to go back
    final shouldLeave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.bgSec,
        title: Text(
          'Cancel Payment?',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        content: Text(
          'Are you sure you want to cancel this payment? The transaction may still be processing.',
          style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Stay',
              style: AppTextStyles.body.copyWith(color: AppColors.yellow90),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Leave',
              style: AppTextStyles.body.copyWith(color: Colors.red),
            ),
          ),
        ],
      ),
    );

    if (shouldLeave == true && mounted) {
      Navigator.pop(
        context,
        const PaymentWebViewResult(success: false),
      );
    }
    return false; // We handle navigation ourselves
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _onWillPop();
      },
      child: Scaffold(
        backgroundColor: AppColors.bgPri,
        appBar: AppBar(
          backgroundColor: AppColors.bgPri,
          elevation: 0,
          leading: GestureDetector(
            onTap: _onWillPop,
            child: Container(
              margin: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.inputBg,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.inputBorder),
              ),
              child: const Icon(Icons.close, color: Colors.white),
            ),
          ),
          title: Text(
            widget.title,
            style: AppTextStyles.heading3.copyWith(fontSize: 18),
          ),
          centerTitle: true,
        ),
        body: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_isLoading)
              LinearProgressIndicator(
                value: _loadingProgress,
                backgroundColor: AppColors.inputBg,
                valueColor: const AlwaysStoppedAnimation(AppColors.yellow90),
              ),
            if (_isVerifying)
              Container(
                color: Colors.black54,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(
                        valueColor:
                            AlwaysStoppedAnimation(AppColors.yellow90),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Verifying payment...',
                        style: AppTextStyles.body.copyWith(
                          color: Colors.white,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
