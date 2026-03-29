import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/models/wallet_transaction_model.dart';
import '../../core/services/wallet_service.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/providers/region_provider.dart';
import 'add_funds_screen.dart';
import 'manage_payment_methods_screen.dart';
import 'loyalty_rewards_screen.dart';
import 'help_support_screen.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final WalletService _walletService = WalletService();
  List<WalletTransaction> _transactions = [];
  List<WalletTransaction> _filteredTransactions = [];
  double _balance = 0.0;
  bool _isLoading = true;
  // 0 = all, 1 = debits only, 2 = credits only
  int _activeFilter = 0;

  /// The currency that was active when we last fetched the balance.
  String _balanceCurrency = CurrencyUtils.activeCurrency;

  @override
  void initState() {
    super.initState();
    // Ensure latest exchange rates are loaded before fetching wallet data.
    CurrencyUtils.syncRates().then((_) => _loadWalletData());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Re-load or convert when the region (and therefore currency) changes.
    final regionCurrency =
        Provider.of<RegionProvider>(context).currency;
    if (regionCurrency != _balanceCurrency && !_isLoading) {
      _convertBalanceForNewCurrency(regionCurrency);
    }
  }

  /// Convert the cached balance to the new currency using exchange rates.
  /// No backend re-fetch — the conversion is authoritative for display.
  void _convertBalanceForNewCurrency(String newCurrency) {
    setState(() {
      _balance = CurrencyUtils.convert(_balance, _balanceCurrency, newCurrency);
      _balanceCurrency = newCurrency;
    });
  }

  Future<void> _loadWalletData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _walletService.getBalanceWithCurrency(),
        _walletService.getTransactions(),
      ]);

      final balanceResult = results[0] as Map<String, dynamic>;
      final serverAmount = balanceResult['amount'] as double;
      final serverCurrency = balanceResult['currency'] as String;
      final displayCurrency = CurrencyUtils.activeCurrency;

      // If the server wallet currency differs from the active display currency
      // (e.g., wallet is NGN but user switched to USD), convert client-side.
      double displayBalance = serverAmount;
      if (serverCurrency != displayCurrency) {
        displayBalance = CurrencyUtils.convert(
          serverAmount,
          serverCurrency,
          displayCurrency,
        );
      }

      setState(() {
        _balance = displayBalance;
        _balanceCurrency = displayCurrency;
        _transactions = results[1] as List<WalletTransaction>;
        _filteredTransactions = _transactions;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.yellow90),
            )
          : SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      'My Wallet',
                      style: AppTextStyles.heading2.copyWith(fontSize: 24),
                    ),
                  ),

                  // Balance Card
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.inputBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.inputBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Current balance',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.txtInactive,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            CurrencyUtils.format(_balance),
                            style: AppTextStyles.heading1.copyWith(
                              fontSize: 36,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: GestureDetector(
                                  onTap: () async {
                                    await Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) =>
                                            const AddFundsScreen(),
                                      ),
                                    );
                                    // Refresh wallet balance after returning from payment
                                    _loadWalletData();
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 12,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.yellow90,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Center(
                                      child: Text(
                                        '+ Add Money',
                                        style: AppTextStyles.body.copyWith(
                                          color: Colors.black,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          const HelpSupportScreen(),
                                    ),
                                  );
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 12,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.bgPri,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: AppColors.inputBorder,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.headset_mic_outlined,
                                        color: Colors.white,
                                        size: 16,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Support',
                                        style: AppTextStyles.body.copyWith(
                                          color: Colors.white,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Manage Payment Methods
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _buildMenuOption(
                      title: 'Manage Payment Methods',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) =>
                                const ManagePaymentMethodsScreen(),
                          ),
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Loyalty & Rewards
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _buildMenuOption(
                      title: 'Loyalty & Rewards',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const LoyaltyRewardsScreen(),
                          ),
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Transaction History Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Transaction History',
                          style: AppTextStyles.body.copyWith(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Row(
                          children: [
                            GestureDetector(
                              onTap: () => _applyFilter(0),
                              child: _buildFilterChip(Icons.list, isSelected: _activeFilter == 0),
                            ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: () => _applyFilter(1),
                              child: _buildFilterChip(Icons.arrow_upward, isSelected: _activeFilter == 1),
                            ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: () => _applyFilter(2),
                              child: _buildFilterChip(Icons.arrow_downward, isSelected: _activeFilter == 2),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Transaction List
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _loadWalletData,
                      color: AppColors.yellow90,
                      child: _filteredTransactions.isEmpty
                          ? ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                const SizedBox(height: 40),
                                Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.receipt_long,
                                        color: AppColors.txtInactive,
                                        size: 48,
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        _activeFilter == 0
                                            ? 'No transactions yet'
                                            : 'No matching transactions',
                                        style: AppTextStyles.body.copyWith(
                                          color: AppColors.txtInactive,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              itemCount: _filteredTransactions.length,
                              itemBuilder: (context, index) {
                                return _buildTransactionItem(_filteredTransactions[index]);
                              },
                            ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  void _applyFilter(int filter) {
    setState(() {
      _activeFilter = filter;
      switch (filter) {
        case 1:
          _filteredTransactions = _transactions.where((t) => t.type == 'debit').toList();
          break;
        case 2:
          _filteredTransactions = _transactions.where((t) => t.type == 'credit').toList();
          break;
        default:
          _filteredTransactions = _transactions;
      }
    });
  }

  Widget _buildMenuOption({
    required String title,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: AppTextStyles.body.copyWith(
                color: Colors.white,
                fontSize: 14,
              ),
            ),
            Icon(Icons.chevron_right, color: AppColors.txtInactive, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(IconData icon, {bool isSelected = false}) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: isSelected
            ? AppColors.yellow90.withOpacity(0.2)
            : AppColors.inputBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isSelected ? AppColors.yellow90 : AppColors.inputBorder,
        ),
      ),
      child: Icon(
        icon,
        color: isSelected ? AppColors.yellow90 : AppColors.txtInactive,
        size: 16,
      ),
    );
  }

  IconData _serviceIcon(String? serviceType) {
    switch (serviceType) {
      case 'ride':
        return Icons.directions_car;
      case 'delivery':
        return Icons.local_shipping;
      case 'airport':
        return Icons.flight;
      case 'topup':
        return Icons.account_balance_wallet;
      case 'payout':
        return Icons.payments;
      case 'refund':
        return Icons.replay;
      default:
        return Icons.receipt_long;
    }
  }

  String _serviceLabel(String? serviceType) {
    switch (serviceType) {
      case 'ride':
        return 'Ride';
      case 'delivery':
        return 'Delivery';
      case 'airport':
        return 'Airport';
      case 'topup':
        return 'Top-up';
      case 'payout':
        return 'Payout';
      case 'refund':
        return 'Refund';
      default:
        return '';
    }
  }

  Widget _buildTransactionItem(WalletTransaction transaction) {
    final isCredit = transaction.type == 'credit';
    final label = _serviceLabel(transaction.serviceType);
    final isPending = transaction.isPending;
    final isFailed = transaction.isFailed;

    // Dim colour for pending/failed
    final iconColor = isFailed
        ? Colors.redAccent
        : isPending
            ? Colors.orange
            : isCredit
                ? AppColors.success
                : AppColors.txtInactive;

    return GestureDetector(
      onTap: () => _showTransactionDetails(transaction),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isFailed
                ? Colors.redAccent.withOpacity(0.4)
                : isPending
                    ? Colors.orange.withOpacity(0.4)
                    : AppColors.inputBorder,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              margin: const EdgeInsets.only(right: 10),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                _serviceIcon(transaction.serviceType),
                color: iconColor,
                size: 18,
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    transaction.description,
                    style: AppTextStyles.body.copyWith(
                      color: isFailed ? Colors.redAccent : Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (isFailed) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: Colors.redAccent.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'Failed',
                            style: AppTextStyles.caption.copyWith(
                              color: Colors.redAccent,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                      ] else if (isPending) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: Colors.orange.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'Pending',
                            style: AppTextStyles.caption.copyWith(
                              color: Colors.orange,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                      ] else if (label.isNotEmpty) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.yellow90.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            label,
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.yellow90,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],
                      Text(
                        _formatDate(transaction.date),
                        style: AppTextStyles.caption.copyWith(
                          color: isFailed
                              ? Colors.redAccent.withOpacity(0.7)
                              : isPending
                                  ? Colors.orange.withOpacity(0.7)
                                  : isCredit
                                      ? AppColors.success
                                      : AppColors.txtInactive,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Text(
              () {
                // Convert transaction amount to the active display currency
                final displayCurrency = _balanceCurrency;
                double displayAmount = transaction.amount;
                if (transaction.currency != displayCurrency) {
                  displayAmount = CurrencyUtils.convert(
                    transaction.amount,
                    transaction.currency,
                    displayCurrency,
                  );
                }
                return '${isCredit ? '+' : ''}${CurrencyUtils.format(displayAmount, currency: displayCurrency)}';
              }(),
              style: AppTextStyles.body.copyWith(
                color: isFailed
                    ? Colors.redAccent
                    : isPending
                        ? Colors.orange
                        : isCredit
                            ? AppColors.success
                            : Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.chevron_right,
              color: AppColors.txtInactive,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }

  void _showTransactionDetails(WalletTransaction transaction) {
    final isCredit = transaction.type == 'credit';

    // Convert amount to display currency
    final displayCurrency = _balanceCurrency;
    double displayAmount = transaction.amount;
    if (transaction.currency != displayCurrency) {
      displayAmount = CurrencyUtils.convert(
        transaction.amount,
        transaction.currency,
        displayCurrency,
      );
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgPri,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppColors.inputBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              Text(
                'Transaction Details',
                style: AppTextStyles.heading3.copyWith(fontSize: 18),
              ),
              const SizedBox(height: 20),

              // Description
              Text(
                transaction.description,
                style: AppTextStyles.body.copyWith(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 16),

              // Detail rows
              _buildDetailRow(
                'Type',
                isCredit ? 'Credit' : 'Debit',
                valueColor: isCredit ? AppColors.success : Colors.redAccent,
              ),
              _buildDetailRow(
                'Status',
                transaction.status == 'success'
                    ? 'Successful'
                    : transaction.status == 'pending'
                        ? 'Pending'
                        : 'Failed',
                valueColor: transaction.status == 'success'
                    ? AppColors.success
                    : transaction.status == 'pending'
                        ? Colors.orange
                        : Colors.redAccent,
              ),
              if (transaction.serviceType != null && transaction.serviceType!.isNotEmpty)
                _buildDetailRow(
                  'Service',
                  _serviceLabel(transaction.serviceType) .isNotEmpty
                      ? _serviceLabel(transaction.serviceType)
                      : transaction.serviceType!,
                ),
              _buildDetailRow(
                'Amount',
                '${isCredit ? '+' : '-'}${CurrencyUtils.format(displayAmount, currency: displayCurrency)}',
                valueColor: isCredit ? AppColors.success : Colors.white,
              ),
              _buildDetailRow(
                'Date',
                _formatFullDate(transaction.date),
              ),
              _buildDetailRow(
                'Reference',
                transaction.reference ?? transaction.id,
              ),
              if (transaction.currency != displayCurrency)
                _buildDetailRow(
                  'Original Currency',
                  '${CurrencyUtils.format(transaction.amount, currency: transaction.currency)} (${transaction.currency})',
                ),

              const SizedBox(height: 20),

              // Close button
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.inputBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.inputBorder),
                  ),
                  child: Center(
                    child: Text(
                      'Close',
                      style: AppTextStyles.body.copyWith(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTextStyles.body.copyWith(
              color: AppColors.txtInactive,
              fontSize: 13,
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: AppTextStyles.body.copyWith(
                color: valueColor ?? Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  String _formatFullDate(DateTime date) {
    final months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year} at ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[date.month - 1]} ${date.day} - ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}
