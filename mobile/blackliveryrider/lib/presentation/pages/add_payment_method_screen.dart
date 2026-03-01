import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/payment_service.dart';
import '../../core/providers/region_provider.dart';
import '../../core/utils/currency_utils.dart';
import 'payment_webview_screen.dart';

class AddPaymentMethodScreen extends StatefulWidget {
  const AddPaymentMethodScreen({super.key});

  @override
  State<AddPaymentMethodScreen> createState() => _AddPaymentMethodScreenState();
}

class _AddPaymentMethodScreenState extends State<AddPaymentMethodScreen> {
  final PaymentService _paymentService = PaymentService();
  bool _isCashOnHand = false;
  bool _isLoading = false;
  late String _selectedGateway;

  @override
  void initState() {
    super.initState();
    // Default gateway based on region — set in didChangeDependencies
    _selectedGateway = 'paystack';
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final region = Provider.of<RegionProvider>(context, listen: false);
    if (region.isChicago && _selectedGateway == 'paystack') {
      _selectedGateway = 'stripe';
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  // ─── Available gateways per region ──────────────────────────────────────────

  /// Returns the list of gateway options for the current region.
  List<_GatewayOption> _gatewaysForRegion(RegionProvider region) {
    if (region.isChicago) {
      return [
        _GatewayOption(
          id: 'stripe',
          label: 'Credit Card (Stripe)',
          icon: Icons.credit_card,
        ),
        _GatewayOption(
          id: 'apple_pay',
          label: 'Apple Pay',
          icon: Icons.phone_iphone,
        ),
      ];
    }
    // Nigeria (default)
    return [
      _GatewayOption(id: 'paystack', label: 'Paystack', icon: Icons.payment),
      _GatewayOption(
        id: 'flutterwave',
        label: 'Flutterwave',
        icon: Icons.account_balance_wallet,
      ),
    ];
  }

  // ─── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final region = Provider.of<RegionProvider>(context);
    final gateways = _gatewaysForRegion(region);

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
        backgroundColor: AppColors.bgPri,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.inputBg,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.inputBorder),
            ),
            child: const Icon(Icons.chevron_left, color: Colors.white),
          ),
        ),
        title: Text(
          'Add payment method',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Cash on hand toggle ──────────────────────────────────────
                GestureDetector(
                  onTap: () {
                    setState(() => _isCashOnHand = !_isCashOnHand);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.inputBorder),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: _isCashOnHand
                                  ? AppColors.yellow90
                                  : AppColors.inputBorder,
                              width: 2,
                            ),
                          ),
                          child: _isCashOnHand
                              ? Center(
                                  child: Container(
                                    width: 10,
                                    height: 10,
                                    decoration: const BoxDecoration(
                                      color: AppColors.yellow90,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Cash on rider',
                          style: AppTextStyles.body.copyWith(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                if (!_isCashOnHand) ...[
                  // ── Payment gateway selector ────────────────────────────
                  Text(
                    'Payment Provider',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: gateways
                        .map(
                          (gw) => Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(
                                left: gateways.indexOf(gw) == 0 ? 0 : 6,
                                right:
                                    gateways.indexOf(gw) == gateways.length - 1
                                    ? 0
                                    : 6,
                              ),
                              child: _buildGatewayTile(gw),
                            ),
                          ),
                        )
                        .toList(),
                  ),

                  const SizedBox(height: 16),

                  // ── Secure card setup info ──────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.inputBorder),
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.lock_outline,
                          color: AppColors.yellow90,
                          size: 48,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Secure Card Setup',
                          style: AppTextStyles.heading3.copyWith(fontSize: 18),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'You will be securely redirected to '
                          '${_gatewayDisplayName()} '
                          'to add your card. Your card details never '
                          'touch our servers.',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 13,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _buildBrandIcon(Icons.credit_card, 'Visa'),
                            const SizedBox(width: 16),
                            _buildBrandIcon(Icons.credit_card, 'Mastercard'),
                            const SizedBox(width: 16),
                            _buildBrandIcon(Icons.account_balance, 'Bank'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],

                const Spacer(),

                // ── Action button ─────────────────────────────────────────
                GestureDetector(
                  onTap: _isLoading ? null : _addPaymentMethod,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: _isLoading
                          ? AppColors.yellow90.withValues(alpha: 0.5)
                          : AppColors.yellow90,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.black,
                                ),
                              ),
                            )
                          : Text(
                              _isCashOnHand
                                  ? 'Confirm Cash'
                                  : 'Add Card Securely',
                              style: AppTextStyles.body.copyWith(
                                color: Colors.black,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ),

                const SizedBox(height: 20),
              ],
            ),
          ),
          if (_isLoading)
            Container(
              color: Colors.black.withValues(alpha: 0.3),
              child: const Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /// Returns human-readable name for the currently selected gateway.
  String _gatewayDisplayName() {
    switch (_selectedGateway) {
      case 'paystack':
        return 'Paystack';
      case 'flutterwave':
        return 'Flutterwave';
      case 'stripe':
        return 'Stripe';
      case 'apple_pay':
        return 'Apple Pay';
      default:
        return _selectedGateway;
    }
  }

  Widget _buildGatewayTile(_GatewayOption gw) {
    final selected = _selectedGateway == gw.id;
    return GestureDetector(
      onTap: () => setState(() => _selectedGateway = gw.id),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.yellow90.withValues(alpha: 0.15)
              : AppColors.inputBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppColors.yellow90 : AppColors.inputBorder,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(
              gw.icon,
              color: selected ? AppColors.yellow90 : Colors.white70,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              gw.label,
              style: AppTextStyles.body.copyWith(
                color: selected ? AppColors.yellow90 : Colors.white70,
                fontSize: 13,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBrandIcon(IconData icon, String label) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 28),
        const SizedBox(height: 4),
        Text(
          label,
          style: AppTextStyles.caption.copyWith(
            color: AppColors.txtInactive,
            fontSize: 10,
          ),
        ),
      ],
    );
  }

  // ─── Payment action ─────────────────────────────────────────────────────────

  Future<void> _addPaymentMethod() async {
    if (_isCashOnHand) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Cash payment selected')));
      Navigator.pop(context, true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Ask the backend to create a payment setup session
      final result = await _paymentService.initiatePayment(
        amount: 100, // Small charge for card validation (refundable)
        currency: CurrencyUtils.activeCurrency,
        purpose: 'card_setup',
        rideId: 'SETUP-${DateTime.now().millisecondsSinceEpoch}',
        gateway: _selectedGateway,
      );

      setState(() => _isLoading = false);

      if (mounted) {
        if (result != null) {
          final redirectUrl =
              result['authorizationUrl'] ?? result['authorization_url'] ?? result['redirectUrl'];
          if (redirectUrl != null && redirectUrl is String && redirectUrl.isNotEmpty) {
            // Open in-app WebView for 3DS / card setup
            final webViewResult = await Navigator.push<PaymentWebViewResult>(
              context,
              MaterialPageRoute(
                builder: (_) => PaymentWebViewScreen(
                  authorizationUrl: redirectUrl,
                  reference: result['reference']?.toString(),
                  title: 'Card Setup',
                ),
              ),
            );

            if (mounted) {
              if (webViewResult?.success == true) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Card added successfully!')),
                );
                Navigator.pop(context, true);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Card setup was not completed')),
                );
              }
            }
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Card added successfully!')),
            );
            Navigator.pop(context, true);
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to add card. Please try again.'),
            ),
          );
        }
      }
    } on DioException catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;

      // Map backend error codes to user-friendly messages
      final errorCode = e.response?.data?['error'] ?? '';
      if (errorCode == 'insufficient_funds') {
        _showErrorDialog('Your transaction failed. Please try another card.');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.response?.data?['message'] ??
                  'Failed to add card. Please try again.',
            ),
          ),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  /// Shows a user-friendly error dialog for payment failures.
  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgSec,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Payment Failed', style: AppTextStyles.heading3),
        content: Text(
          message,
          style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'OK',
              style: AppTextStyles.body.copyWith(color: AppColors.yellow90),
            ),
          ),
        ],
      ),
    );
  }
}

/// Lightweight data class for a selectable gateway tile.
class _GatewayOption {
  final String id;
  final String label;
  final IconData icon;

  const _GatewayOption({
    required this.id,
    required this.label,
    required this.icon,
  });
}
