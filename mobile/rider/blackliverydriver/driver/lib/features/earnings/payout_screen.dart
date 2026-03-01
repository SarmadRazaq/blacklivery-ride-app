import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';

import 'package:driver/core/providers/region_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class PayoutScreen extends ConsumerStatefulWidget {
  const PayoutScreen({super.key});

  @override
  ConsumerState<PayoutScreen> createState() => _PayoutScreenState();
}

class _PayoutScreenState extends ConsumerState<PayoutScreen> {
  final _amountController = TextEditingController();
  final _bankNameController =
      TextEditingController(); // Not used for NG (Dropdown)
  final _accountNumberController = TextEditingController();
  final _routingNumberController = TextEditingController(); // Bank Code
  final _accountNameController = TextEditingController(); // Read-only

  String? _selectedBankCode;
  bool _isVerifying = false;
  Timer? _verifyDebounce;

  @override
  void initState() {
    super.initState();
    // Load banks if in Nigeria
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final region = ref.read(regionRiverpodProvider);
      if (region.isNigeria) {
        ref.read(earningsRiverpodProvider).loadBanks();
      }
    });
  }

  @override
  void dispose() {
    _verifyDebounce?.cancel();
    _amountController.dispose();
    _bankNameController.dispose();
    _accountNumberController.dispose();
    _routingNumberController.dispose();
    _accountNameController.dispose();
    super.dispose();
  }

  void _requestPayout() async {
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid amount')),
      );
      return;
    }

    try {
      await ref.read(earningsRiverpodProvider).requestPayout(
        amount,
        accountNumber: _accountNumberController.text.trim().isNotEmpty
            ? _accountNumberController.text.trim()
            : null,
        bankCode: _selectedBankCode,
        currency: CurrencyUtils.activeCurrency,
      );
      // Refresh balance after successful payout
      ref.invalidate(earningsRiverpodProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payout requested successfully!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: ${e.toString()}')));
      }
    }
  }

  Future<void> _verifyAccount() async {
    // Debounce to avoid firing on every keystroke
    _verifyDebounce?.cancel();
    _verifyDebounce = Timer(const Duration(milliseconds: 600), () async {
      final accNum = _accountNumberController.text.trim();
      final bankCode = _selectedBankCode;

      if (accNum.length < 10 || bankCode == null) return;

      setState(() => _isVerifying = true);
      try {
        final name = await ref.read(earningsRiverpodProvider).verifyAccount(
          accNum,
          bankCode,
        );
        if (mounted) {
          setState(() {
            _accountNameController.text = name;
          });
        }
      } catch (e) {
        // Ignore or show inline error
      } finally {
        if (mounted) setState(() => _isVerifying = false);
      }
    });
  }

  void _saveBankDetails() async {
    final accountNumber = _accountNumberController.text.trim();
    // For manual entry (legacy/fallback), use routing controller. For Dropdown, use selectedCode.
    final bankCode = _selectedBankCode ?? _routingNumberController.text.trim();

    if (accountNumber.isEmpty || bankCode.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in default bank details')),
      );
      return;
    }

    try {
      await ref.read(earningsRiverpodProvider).updateBankDetails({
        'bankCode': bankCode,
        'accountNumber': accountNumber,
        'accountName': _accountNameController.text.trim(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bank details updated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _launchStripeDashboard() async {
    try {
      final url = await ref
          .read(earningsRiverpodProvider)
          .fetchStripeDashboardUrl();
      if (await canLaunchUrl(Uri.parse(url))) {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      } else {
        throw 'Could not launch Stripe';
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error launching Stripe: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final region = ref.watch(regionRiverpodProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.cardBackground,
          title: const Text('Payouts', style: TextStyle(color: Colors.white)),
          leading: const BackButton(color: Colors.white),
          bottom: TabBar(
            labelColor: AppColors.primary,
            unselectedLabelColor: Colors.grey,
            indicatorColor: AppColors.primary,
            tabs: [
              const Tab(text: 'Request Payout'),
              Tab(text: region.isChicago ? 'Stripe Setup' : 'Bank Details'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildRequestPayoutTab(region),
            _buildBankDetailsTab(region),
          ],
        ),
      ),
    );
  }

  Widget _buildRequestPayoutTab(RegionProvider region) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Consumer(
            builder: (context, ref, _) {
              final provider = ref.watch(earningsRiverpodProvider);
              return Container(
                padding: const EdgeInsets.all(20),
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primary.withValues(alpha: 0.8),
                      AppColors.primary,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    const Text(
                      'Available Balance',
                      style: TextStyle(color: Colors.black54),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      CurrencyUtils.formatExact(provider.availableBalance),
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 32),
          if (region.isChicago) ...[
            const Center(
              child: Text(
                'Payouts in Chicago are handled automatically via Stripe Express.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 16),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _launchStripeDashboard,
                child: const Text(
                  'Manage Payouts on Stripe',
                  style: TextStyle(
                    color: Color(0xFF635BFF), // Stripe Blurple
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ] else ...[
            const Text(
              'Withdraw Amount',
              style: TextStyle(color: Colors.white, fontSize: 16),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                prefixText: '${CurrencyUtils.defaultSymbol} ',
                prefixStyle: const TextStyle(color: Colors.white),
                filled: true,
                fillColor: AppColors.inputBackground,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _requestPayout,
                child: const Text(
                  'Request Payout',
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBankDetailsTab(RegionProvider region) {
    if (region.isChicago) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.account_balance, size: 64, color: Colors.white54),
            const SizedBox(height: 16),
            const Text(
              'Use Stripe to manage your bank details',
              style: TextStyle(color: Colors.white, fontSize: 18),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF635BFF),
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
              ),
              onPressed: _launchStripeDashboard,
              child: const Text(
                'Open Stripe Dashboard',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      );
    }

    // Nigeria Layout
    return Consumer(
      builder: (context, ref, _) {
        final provider = ref.watch(earningsRiverpodProvider);
        final banks = provider.banks;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Bank Name',
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _selectedBankCode,
              items: banks
                  .where((b) => b['code'] != null && b['name'] != null)
                  .map<DropdownMenuItem<String>>((bank) {
                    return DropdownMenuItem(
                      value: bank['code'].toString(),
                      child: Text(
                        bank['name'].toString(),
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  })
                  .toList(),
              onChanged: (val) {
                setState(() => _selectedBankCode = val);
                _verifyAccount();
              },
              style: const TextStyle(color: Colors.white),
              dropdownColor: AppColors.cardBackground,
              decoration: InputDecoration(
                filled: true,
                fillColor: AppColors.inputBackground,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),

            _buildTextField(
              'Account Number',
              _accountNumberController,
              onChanged: (_) => _verifyAccount(),
            ),

            if (_isVerifying)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: LinearProgressIndicator(),
              ),

            const SizedBox(height: 16),
            _buildTextField(
              'Account Name',
              _accountNameController,
              readOnly: true,
            ),

            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.cardBackground,
                  side: const BorderSide(color: AppColors.primary),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _saveBankDetails,
                child: const Text(
                  'Update Bank Info',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller, {
    bool readOnly = false,
    Function(String)? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          readOnly: readOnly,
          onChanged: onChanged,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            filled: true,
            fillColor: readOnly ? Colors.black12 : AppColors.inputBackground,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }
}
