import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/payment_service.dart';
import '../../core/services/wallet_service.dart';
import '../../core/utils/currency_utils.dart';
import 'add_payment_method_screen.dart';
import 'payment_webview_screen.dart';

class AddFundsScreen extends StatefulWidget {
  const AddFundsScreen({super.key});

  @override
  State<AddFundsScreen> createState() => _AddFundsScreenState();
}

class _AddFundsScreenState extends State<AddFundsScreen> {
  final WalletService _walletService = WalletService();
  final PaymentService _paymentService = PaymentService();

  int _selectedAmount = 50;
  String _customAmount = '';
  // String _selectedPaymentMethod = 'mastercard'; // Removed default
  String? _selectedPaymentMethod;

  final List<int> _presetAmounts = [20, 50, 100];

  List<PaymentMethodOption> _paymentMethods = [];
  bool _isLoading = true;
  bool _isProcessing = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _loadPaymentMethods();
  }

  Future<void> _loadPaymentMethods() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });
    try {
      final methods = await _paymentService.getPaymentMethods();
      setState(() {
        _paymentMethods = methods.map((json) {
          // Map backend response to local model
          return PaymentMethodOption(
            id: json['id'] ?? json['_id'] ?? '',
            name: json['brand'] ?? json['type'] ?? 'Card',
            lastFour: json['last4'] ?? json['lastFour'] ?? '',
            type: json['brand'] ?? 'card',
          );
        }).toList();

        if (_paymentMethods.isNotEmpty) {
          _selectedPaymentMethod = _paymentMethods.first.id;
        }
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading methods: $e');
      setState(() {
        _isLoading = false;
        _loadError = 'Failed to load payment methods. Pull down to retry.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
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
          'Add Funds',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadPaymentMethods,
              color: AppColors.yellow90,
              child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Load error banner
                  if (_loadError != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _loadError!,
                              style: AppTextStyles.caption.copyWith(
                                color: Colors.red,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  // Amount selection
                  Text(
                    'How much do you want to add?',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Preset amounts
                  Row(
                    children: _presetAmounts.map((amount) {
                      final isSelected =
                          _selectedAmount == amount && _customAmount.isEmpty;
                      return Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedAmount = amount;
                              _customAmount = '';
                            });
                          },
                          child: Container(
                            margin: EdgeInsets.only(
                              right: amount != _presetAmounts.last ? 8 : 0,
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.yellow90.withOpacity(0.2)
                                  : AppColors.inputBg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.yellow90
                                    : AppColors.inputBorder,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                '${CurrencyUtils.symbol()}$amount',
                                style: AppTextStyles.body.copyWith(
                                  color: isSelected
                                      ? AppColors.yellow90
                                      : Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 12),

                  // Custom amount input
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.inputBorder),
                    ),
                    child: TextField(
                      style: AppTextStyles.body.copyWith(color: Colors.white),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'Enter a custom amount',
                        hintStyle: AppTextStyles.body.copyWith(
                          color: AppColors.txtInactive,
                          fontSize: 13,
                        ),
                        border: InputBorder.none,
                        prefixText: '${CurrencyUtils.symbol()} ',
                        prefixStyle: AppTextStyles.body.copyWith(
                          color: AppColors.yellow90,
                        ),
                      ),
                      onChanged: (value) {
                        setState(() {
                          _customAmount = value;
                          if (value.isNotEmpty) {
                            _selectedAmount = int.tryParse(value) ?? 0;
                          }
                        });
                      },
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Payment methods section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Select payment methods',
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.txtInactive,
                          fontSize: 13,
                        ),
                      ),
                      Icon(
                        Icons.chevron_right,
                        color: AppColors.txtInactive,
                        size: 18,
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Payment method options
                  if (_paymentMethods.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Text(
                        'No payment methods found.',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.txtInactive,
                        ),
                      ),
                    )
                  else
                    ..._paymentMethods.map(
                      (method) => _buildPaymentMethodOption(method),
                    ),

                  // Add payment method
                  GestureDetector(
                    onTap: () async {
                      final result = await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const AddPaymentMethodScreen(),
                        ),
                      );
                      if (result == true) {
                        _loadPaymentMethods();
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: Row(
                        children: [
                          Text(
                            'Add payment method',
                            style: AppTextStyles.body.copyWith(
                              color: AppColors.yellow90,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            Icons.chevron_right,
                            color: AppColors.yellow90,
                            size: 18,
                          ),
                        ],
                      ),
                    ),
                  ),

                  const Spacer(),

                  // Add funds button
                  GestureDetector(
                    onTap: _isProcessing ? null : _handleAddFunds,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: _isProcessing
                            ? AppColors.yellow90.withOpacity(0.5)
                            : AppColors.yellow90,
                        borderRadius: BorderRadius.circular(12),
                        // border: Border.all(color: AppColors.inputBorder),
                      ),
                      child: Center(
                        child: _isProcessing
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation(
                                    Colors.black,
                                  ),
                                ),
                              )
                            : Text(
                                'Add funds',
                                style: AppTextStyles.body.copyWith(
                                  color: Colors.black, // Dark text on yellow
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
          ),
    );
  }

  Widget _buildPaymentMethodOption(PaymentMethodOption method) {
    final isSelected = _selectedPaymentMethod == method.id;

    return GestureDetector(
      onTap: () {
        setState(() => _selectedPaymentMethod = method.id);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: const BoxDecoration(
          border: Border(
            bottom: BorderSide(color: AppColors.inputBorder, width: 0.5),
          ),
        ),
        child: Row(
          children: [
            _buildPaymentIcon(method.type),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                method.lastFour.isNotEmpty
                    ? '${method.name} ${method.lastFour}'
                    : method.name,
                style: AppTextStyles.body.copyWith(
                  color: Colors.white,
                  fontSize: 13,
                ),
              ),
            ),
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected
                      ? AppColors.yellow90
                      : AppColors.inputBorder,
                  width: 2,
                ),
              ),
              child: isSelected
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
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentIcon(String type) {
    IconData icon;
    Color color;

    final lowerType = type.toLowerCase();
    if (lowerType.contains('master')) {
      icon = Icons.credit_card;
      color = Colors.orange;
    } else if (lowerType.contains('visa')) {
      icon = Icons.credit_card;
      color = Colors.blue;
    } else if (lowerType.contains('apple')) {
      icon = Icons.apple;
      color = Colors.white;
    } else if (lowerType.contains('google')) {
      icon = Icons.g_mobiledata; // Approximation
      color = Colors.white;
    } else {
      icon = Icons.credit_card;
      color = Colors.white;
    }

    return Container(
      width: 32,
      height: 22,
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Icon(icon, color: color, size: 16),
    );
  }

  Future<void> _handleAddFunds() async {
    final amount = _customAmount.isNotEmpty
        ? int.tryParse(_customAmount) ?? _selectedAmount
        : _selectedAmount;

    // Minimum top-up validation
    const minAmount = 5; // $5 / ₦500 minimum
    if (amount < minAmount) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Minimum top-up is ${CurrencyUtils.format(minAmount.toDouble())}',
          ),
        ),
      );
      return;
    }

    if (_selectedPaymentMethod == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a payment method')),
      );
      return;
    }

    setState(() => _isProcessing = true);

    final result = await _walletService.addFunds(
      amount: amount.toDouble(),
      paymentMethodId: _selectedPaymentMethod!,
      currency: CurrencyUtils.activeCurrency,
    );

    setState(() => _isProcessing = false);

    if (result == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to add funds')),
        );
      }
      return;
    }

    // Check if the response contains an authorization URL (3DS / redirect flow)
    final authUrl = result['authorizationUrl'] ??
        result['authorization_url'] ??
        result['link'] ??
        result['checkout_url'];

    if (authUrl != null && authUrl is String && authUrl.isNotEmpty) {
      // Open payment WebView for 3DS / redirect-based payment
      if (!mounted) return;
      final webViewResult = await Navigator.push<PaymentWebViewResult>(
        context,
        MaterialPageRoute(
          builder: (_) => PaymentWebViewScreen(
            authorizationUrl: authUrl,
            reference: result['reference']?.toString(),
            callbackUrl: result['callbackUrl']?.toString() ??
                result['callback_url']?.toString(),
          ),
        ),
      );

      if (mounted) {
        if (webViewResult?.success == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Successfully added ${CurrencyUtils.symbol()}$amount to wallet',
              ),
            ),
          );
          Navigator.pop(context, true);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment was not completed')),
          );
        }
      }
    } else {
      // Direct charge succeeded (e.g., Stripe with saved card)
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Successfully added ${CurrencyUtils.symbol()}$amount to wallet',
            ),
          ),
        );
        Navigator.pop(context, true);
      }
    }
  }
}

class PaymentMethodOption {
  final String id;
  final String name;
  final String lastFour;
  final String type;

  PaymentMethodOption({
    required this.id,
    required this.name,
    required this.lastFour,
    required this.type,
  });
}
