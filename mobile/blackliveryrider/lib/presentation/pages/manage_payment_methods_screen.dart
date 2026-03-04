import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import 'add_payment_method_screen.dart';

import '../../core/services/payment_service.dart';

class ManagePaymentMethodsScreen extends StatefulWidget {
  const ManagePaymentMethodsScreen({super.key});

  @override
  State<ManagePaymentMethodsScreen> createState() =>
      _ManagePaymentMethodsScreenState();
}

class _ManagePaymentMethodsScreenState
    extends State<ManagePaymentMethodsScreen> {
  final PaymentService _paymentService = PaymentService();
  List<SavedPaymentMethod> _paymentMethods = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPaymentMethods();
  }

  Future<void> _loadPaymentMethods() async {
    setState(() => _isLoading = true);
    try {
      final data = await _paymentService.getPaymentMethods();
      setState(() {
        _paymentMethods = data
            .map((json) => SavedPaymentMethod.fromJson(json))
            .toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      debugPrint('Error loading payment methods: $e');
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
          'Manage Payment Methods',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Payment methods list
                  if (_paymentMethods.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text(
                          'No payment methods saved',
                          style: AppTextStyles.body.copyWith(
                            color: AppColors.txtInactive,
                          ),
                        ),
                      ),
                    )
                  else
                    ..._paymentMethods.map(
                      (method) => _buildPaymentMethodCard(method),
                    ),

                  const SizedBox(height: 16),

                  // Add payment method button
                  GestureDetector(
                    onTap: () async {
                      final result = await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const AddPaymentMethodScreen(),
                        ),
                      );
                      if (result == true) {
                        _loadPaymentMethods(); // Refresh list on return
                      }
                    },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: AppColors.inputBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.inputBorder,
                          style: BorderStyle.solid,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add, color: AppColors.yellow90, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Add payment method',
                            style: AppTextStyles.body.copyWith(
                              color: AppColors.yellow90,
                              fontSize: 14,
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

  Widget _buildPaymentMethodCard(SavedPaymentMethod method) {
    return GestureDetector(
      onTap: () => _showCardOptions(method),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Row(
          children: [
            // Card type indicator
            Container(
              width: 50,
              height: 35,
              decoration: BoxDecoration(
                color: AppColors.bgPri,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppColors.inputBorder),
              ),
              child: Center(child: _buildCardTypeIcon(method.type)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${_getCardTypeName(method.type)} ${method.lastFour}',
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                  if (method.gatewayDisplayName.isNotEmpty) ...[                  const SizedBox(height: 2),
                    Text(
                      'via ${method.gatewayDisplayName}',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.txtInactive,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: AppColors.txtInactive, size: 20),
          ],
        ),
      ),
    );
  }

  void _showCardOptions(SavedPaymentMethod method) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSec,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.inputBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            // Card info header
            Row(
              children: [
                Container(
                  width: 50,
                  height: 35,
                  decoration: BoxDecoration(
                    color: AppColors.bgPri,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors.inputBorder),
                  ),
                  child: Center(child: _buildCardTypeIcon(method.type)),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_getCardTypeName(method.type)} ending in ${method.lastFour}',
                        style: AppTextStyles.body.copyWith(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (method.gatewayDisplayName.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          'via ${method.gatewayDisplayName}',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            // Delete option
            GestureDetector(
              onTap: () {
                Navigator.pop(context);
                _deletePaymentMethod(method);
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Remove Card',
                      style: AppTextStyles.body.copyWith(
                        color: Colors.red,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildCardTypeIcon(String type) {
    final lowerType = type.toLowerCase();
    if (lowerType.contains('master')) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.8),
              shape: BoxShape.circle,
            ),
          ),
          Transform.translate(
            offset: const Offset(-6, 0),
            child: Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.8),
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      );
    } else if (lowerType.contains('visa')) {
      return Text(
        'VISA',
        style: AppTextStyles.caption.copyWith(
          color: Colors.blue,
          fontWeight: FontWeight.bold,
          fontSize: 10,
        ),
      );
    } else {
      return Icon(Icons.credit_card, color: Colors.white, size: 20);
    }
  }

  String _getCardTypeName(String type) {
    final lowerType = type.toLowerCase();
    if (lowerType.contains('master')) return 'Mastercard';
    if (lowerType.contains('visa')) return 'Visa';
    return 'Card';
  }

  void _deletePaymentMethod(SavedPaymentMethod method) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.bgSec,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Delete Card?', style: AppTextStyles.heading3),
        content: Text(
          'Are you sure you want to remove this payment method?',
          style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: AppTextStyles.body),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context); // Close dialog

              // Proceed with deletion
              final success = await _paymentService.deletePaymentMethod(
                method.id,
              );
              if (success) {
                if (mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(const SnackBar(content: Text('Card removed')));
                  _loadPaymentMethods(); // Refresh list
                }
              } else {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to remove card')),
                  );
                }
              }
            },
            child: Text(
              'Delete',
              style: AppTextStyles.body.copyWith(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  // void _setAsDefault(SavedPaymentMethod method) {
  //   setState(() {
  //     for (var m in _paymentMethods) {
  //       m.isDefault = m.id == method.id;
  //     }
  //   });
  //   ScaffoldMessenger.of(context).showSnackBar(
  //     const SnackBar(content: Text('Default payment method updated')),
  //   );
  // }
}

class SavedPaymentMethod {
  final String id;
  final String type;
  final String lastFour;
  final String gateway;
  bool isDefault;

  SavedPaymentMethod({
    required this.id,
    required this.type,
    required this.lastFour,
    this.gateway = '',
    this.isDefault = false,
  });

  factory SavedPaymentMethod.fromJson(Map<String, dynamic> json) {
    // Card details may be at top level (new saveCardPaymentMethod)
    // or nested under 'details' (legacy addPaymentMethod)
    final details =
        json['details'] is Map<String, dynamic> ? json['details'] as Map<String, dynamic> : <String, dynamic>{};
    return SavedPaymentMethod(
      id: json['id'] ?? json['_id'] ?? '',
      type:
          json['brand'] ?? details['brand'] ?? json['type'] ?? 'card',
      lastFour: json['last4'] ?? details['last4'] ?? json['lastFour'] ?? details['lastFour'] ?? '****',
      gateway: json['gateway'] ?? details['gateway'] ?? '',
      isDefault: json['isDefault'] ?? false,
    );
  }

  /// Human-readable gateway display name.
  String get gatewayDisplayName {
    switch (gateway.toLowerCase()) {
      case 'paystack':
        return 'Paystack';
      case 'flutterwave':
        return 'Flutterwave';
      case 'monnify':
        return 'Monnify';
      case 'stripe':
        return 'Stripe';
      default:
        return '';
    }
  }
}
