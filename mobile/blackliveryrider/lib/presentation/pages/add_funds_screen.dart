import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/payment_service.dart';
import '../../core/services/wallet_service.dart';
import '../../core/providers/region_provider.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/payment/gateway_factory.dart';
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

  final List<int> _presetAmounts = [20, 50, 100];

  // Payment mode: 'saved' (use a saved card) or 'direct' (pick a provider)
  String _paymentMode = 'direct';

  // Saved cards
  List<_SavedCard> _savedCards = [];
  String? _selectedCardId;
  bool _isLoading = true;
  bool _isProcessing = false;
  String? _loadError;

  // Direct provider
  late String _selectedGateway;

  @override
  void initState() {
    super.initState();
    _selectedGateway = 'paystack';
    _loadSavedCards();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final region = Provider.of<RegionProvider>(context, listen: false);
    if (region.isChicago && _selectedGateway == 'paystack') {
      _selectedGateway = 'stripe';
    }
  }

  Future<void> _loadSavedCards() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });
    try {
      final methods = await _paymentService.getPaymentMethods();
      // Filter cards to only show gateways valid for the current region
      final region = Provider.of<RegionProvider>(context, listen: false);
      final validGatewayIds =
          _gatewaysForRegion(region).map((g) => g.id).toSet();
      setState(() {
        _savedCards = methods
            .map((json) => _SavedCard(
                  id: json['id'] ?? json['_id'] ?? '',
                  brand: json['brand'] ?? json['type'] ?? 'Card',
                  last4: json['last4'] ?? json['lastFour'] ?? '',
                  gateway: json['gateway'] ?? '',
                ))
            .where((card) => validGatewayIds.contains(card.gateway))
            .toList();
        // Default to saved if there are cards, otherwise direct
        if (_savedCards.isNotEmpty) {
          _paymentMode = 'saved';
          _selectedCardId = _savedCards.first.id;
        } else {
          _paymentMode = 'direct';
        }
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading methods: $e');
      setState(() {
        _isLoading = false;
        _loadError = 'Failed to load payment methods.';
      });
    }
  }

  // ─── Gateway options per region ──────────────────────────────────────────

  List<_GatewayOption> _gatewaysForRegion(RegionProvider region) {
    if (region.isChicago) {
      return const [
        _GatewayOption(id: 'stripe', label: 'Stripe', icon: Icons.credit_card),
      ];
    }
    return const [
      _GatewayOption(id: 'paystack', label: 'Paystack', icon: Icons.payment),
      _GatewayOption(
          id: 'flutterwave',
          label: 'Flutterwave',
          icon: Icons.account_balance_wallet),
      _GatewayOption(
          id: 'monnify', label: 'Monnify', icon: Icons.account_balance),
    ];
  }

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
          'Add Funds',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadSavedCards,
              color: AppColors.yellow90,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: MediaQuery.of(context).size.height - 200,
                  ),
                  child: IntrinsicHeight(
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
                              border: Border.all(
                                  color: Colors.red.withOpacity(0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline,
                                    color: Colors.red, size: 18),
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

                        // ── Amount selection ─────────────────────────────────
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
                            final isSelected = _selectedAmount == amount &&
                                _customAmount.isEmpty;
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
                                    right:
                                        amount != _presetAmounts.last ? 8 : 0,
                                  ),
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 14),
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
                            style:
                                AppTextStyles.body.copyWith(color: Colors.white),
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

                        // ── Payment mode toggle ──────────────────────────────
                        Text(
                          'Payment method',
                          style: AppTextStyles.body.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: _buildModeTab(
                                label: 'Pay directly',
                                isActive: _paymentMode == 'direct',
                                onTap: () =>
                                    setState(() => _paymentMode = 'direct'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildModeTab(
                                label: 'Saved cards (${_savedCards.length})',
                                isActive: _paymentMode == 'saved',
                                onTap: _savedCards.isEmpty
                                    ? null
                                    : () =>
                                        setState(() => _paymentMode = 'saved'),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // ── Mode-specific content ─────────────────────────────
                        if (_paymentMode == 'direct') ...[
                          // Provider picker
                          Row(
                            children: gateways
                                .map((gw) => Expanded(
                                      child: Padding(
                                        padding: EdgeInsets.only(
                                          left: gateways.indexOf(gw) == 0
                                              ? 0
                                              : 6,
                                          right: gateways.indexOf(gw) ==
                                                  gateways.length - 1
                                              ? 0
                                              : 6,
                                        ),
                                        child: _buildGatewayTile(gw),
                                      ),
                                    ))
                                .toList(),
                          ),
                        ] else ...[
                          // Saved cards list
                          ..._savedCards.map((card) => _buildCardOption(card)),

                          // Link to add new card
                          GestureDetector(
                            onTap: () async {
                              final result = await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) =>
                                      const AddPaymentMethodScreen(),
                                ),
                              );
                              if (result == true) _loadSavedCards();
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              child: Row(
                                children: [
                                  Icon(Icons.add,
                                      color: AppColors.yellow90, size: 18),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Link a new card',
                                    style: AppTextStyles.body.copyWith(
                                      color: AppColors.yellow90,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],

                        const Spacer(),

                        // ── Add funds button ──────────────────────────────────
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
                            ),
                            child: Center(
                              child: _isProcessing
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation(
                                            Colors.black),
                                      ),
                                    )
                                  : Text(
                                      'Add funds',
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
                ),
              ),
            ),
    );
  }

  // ─── UI builders ─────────────────────────────────────────────────────────

  Widget _buildModeTab({
    required String label,
    required bool isActive,
    VoidCallback? onTap,
  }) {
    final enabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isActive
              ? AppColors.yellow90.withOpacity(0.15)
              : AppColors.inputBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isActive ? AppColors.yellow90 : AppColors.inputBorder,
            width: isActive ? 2 : 1,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: AppTextStyles.body.copyWith(
              color: isActive
                  ? AppColors.yellow90
                  : enabled
                      ? Colors.white70
                      : AppColors.txtInactive.withOpacity(0.5),
              fontSize: 13,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGatewayTile(_GatewayOption gw) {
    final selected = _selectedGateway == gw.id;
    return GestureDetector(
      onTap: () => setState(() => _selectedGateway = gw.id),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.yellow90.withOpacity(0.15)
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

  Widget _buildCardOption(_SavedCard card) {
    final isSelected = _selectedCardId == card.id;

    return GestureDetector(
      onTap: () => setState(() => _selectedCardId = card.id),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: const BoxDecoration(
          border: Border(
            bottom: BorderSide(color: AppColors.inputBorder, width: 0.5),
          ),
        ),
        child: Row(
          children: [
            _buildPaymentIcon(card.brand),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    card.last4.isNotEmpty
                        ? '${_cardBrandName(card.brand)} ${card.last4}'
                        : _cardBrandName(card.brand),
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 13,
                    ),
                  ),
                  if (card.gatewayDisplayName.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      'via ${card.gatewayDisplayName}',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.txtInactive,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color:
                      isSelected ? AppColors.yellow90 : AppColors.inputBorder,
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

  String _cardBrandName(String brand) {
    final lower = brand.toLowerCase();
    if (lower.contains('master')) return 'Mastercard';
    if (lower.contains('visa')) return 'Visa';
    return brand;
  }

  // ─── Payment handler ────────────────────────────────────────────────────

  Future<void> _handleAddFunds() async {
    final amount = _customAmount.isNotEmpty
        ? int.tryParse(_customAmount) ?? _selectedAmount
        : _selectedAmount;

    const minAmount = 5;
    // Region-aware max: $10,000 USD / ₦5,000,000 NGN
    final region = Provider.of<RegionProvider>(context, listen: false);
    final maxAmount = region.isChicago ? 10000 : 5000000;

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

    if (amount > maxAmount) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Maximum top-up is ${CurrencyUtils.format(maxAmount.toDouble())}',
          ),
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);

    if (_paymentMode == 'saved' && _selectedCardId != null) {
      await _handleSavedCardPayment(amount);
    } else {
      await _handleDirectPayment(amount);
    }
  }

  /// Pay using a saved card via wallet/add endpoint
  Future<void> _handleSavedCardPayment(int amount) async {
    final result = await _walletService.addFunds(
      amount: amount.toDouble(),
      paymentMethodId: _selectedCardId!,
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

    // Off-session charge succeeded directly
    if (result['charged'] == true) {
      if (mounted) _showSuccessAndPop(amount);
      return;
    }

    // Stripe 3DS required — show native SDK
    final clientSecret = result['clientSecret'];
    if (clientSecret != null && clientSecret is String && clientSecret.isNotEmpty) {
      try {
        final gateway = PaymentGatewayFactory.get('stripe');
        final userEmail = FirebaseAuth.instance.currentUser?.email ?? 'user@blacklivery.app';
        final nativeResult = await gateway.processPayment(
          context: context,
          backendData: result,
          amount: amount.toDouble(),
          currency: CurrencyUtils.activeCurrency,
          email: userEmail,
        );

        if (!mounted) return;

        if (nativeResult.success) {
          final ref = nativeResult.reference ?? result['reference']?.toString();
          if (ref != null) {
            await _paymentService.verifyPayment(reference: ref);
          }
          _showSuccessAndPop(amount);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(nativeResult.errorMessage ?? 'Payment was not completed')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Payment error: $e')),
          );
        }
      }
      return;
    }

    // Check if needs 3DS redirect (Paystack / other gateways)
    final authUrl = result['authorizationUrl'] ??
        result['authorization_url'] ??
        result['link'] ??
        result['checkout_url'];

    if (authUrl != null && authUrl is String && authUrl.isNotEmpty) {
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
          _showSuccessAndPop(amount);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment was not completed')),
          );
        }
      }
    } else {
      // Direct charge succeeded
      if (mounted) _showSuccessAndPop(amount);
    }
  }

  /// Pay using a direct provider (Paystack, Flutterwave, Monnify, Stripe)
  Future<void> _handleDirectPayment(int amount) async {
    final region = context.read<RegionProvider>();

    String backendRegionKey;
    switch (_selectedGateway) {
      case 'stripe':
        backendRegionKey = 'US-CHI';
        break;
      case 'flutterwave':
        backendRegionKey = 'NG-FLUTTERWAVE';
        break;
      case 'monnify':
        backendRegionKey = 'NG-MONNIFY';
        break;
      case 'paystack':
      default:
        backendRegionKey = region.isChicago ? 'US-CHI' : 'NG-PAYSTACK';
        break;
    }

    final result = await _paymentService.initiatePayment(
      amount: amount.toDouble(),
      currency: CurrencyUtils.activeCurrency,
      purpose: 'wallet_topup',
      gateway: _selectedGateway,
      region: backendRegionKey,
      sdkMode: true,
    );

    if (result == null) {
      setState(() => _isProcessing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to add funds')),
        );
      }
      return;
    }

    // ── Try native SDK ──────────────────────────────────────────
    final gateway = PaymentGatewayFactory.get(_selectedGateway);
    final hasNativeToken = (result['clientSecret'] != null) ||
        (result['accessCode'] != null) ||
        (result['authorizationUrl'] != null) ||
        (result['reference'] != null);

    if (hasNativeToken && gateway.isSupported) {
      setState(() => _isProcessing = false);

      // Use email from backend response, Firebase Auth, or fallback
      final userEmail = (result['email'] as String?)?.isNotEmpty == true
          ? result['email'] as String
          : FirebaseAuth.instance.currentUser?.email ?? 'user@blacklivery.app';
      final nativeResult = await gateway.processPayment(
        context: context,
        backendData: result,
        amount: amount.toDouble(),
        currency: CurrencyUtils.activeCurrency,
        email: userEmail,
      );

      if (!mounted) return;

      if (nativeResult.success) {
        final ref = nativeResult.reference ?? result['reference']?.toString();
        if (ref != null) {
          await _paymentService.verifyPayment(reference: ref);
        }
        _showSuccessAndPop(amount);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              nativeResult.errorMessage ?? 'Payment was not completed',
            ),
          ),
        );
      }
      return;
    }

    // ── Fallback to WebView ──────────────────────────────────────
    setState(() => _isProcessing = false);

    final authUrl = result['authorizationUrl'] ??
        result['authorization_url'] ??
        result['link'] ??
        result['checkout_url'];

    if (authUrl != null && authUrl is String && authUrl.isNotEmpty) {
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
          _showSuccessAndPop(amount);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment was not completed')),
          );
        }
      }
    } else {
      if (mounted) _showSuccessAndPop(amount);
    }
  }

  void _showSuccessAndPop(int amount) {
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

// ─── Models ──────────────────────────────────────────────────────────────────

class _SavedCard {
  final String id;
  final String brand;
  final String last4;
  final String gateway;

  const _SavedCard({
    required this.id,
    required this.brand,
    required this.last4,
    required this.gateway,
  });

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
