import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import 'providers/earnings_provider.dart';

class TransactionHistoryScreen extends ConsumerStatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  ConsumerState<TransactionHistoryScreen> createState() =>
      _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState
    extends ConsumerState<TransactionHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(earningsRiverpodProvider).loadTransactionHistory();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = ref.watch(earningsRiverpodProvider);
    final transactions = provider.transactionHistory;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: const BackButton(color: Colors.white),
        title: const Text(
          'Transaction History',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: Builder(
        builder: (context) {
          if (provider.isLoading && transactions.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          return RefreshIndicator(
            onRefresh: () => provider.loadTransactionHistory(),
            color: AppColors.primary,
            backgroundColor: AppColors.cardBackground,
            child: transactions.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: const [
                      SizedBox(height: 80),
                      Center(
                        child: Text(
                          'No transactions found',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: transactions.length,
                    itemBuilder: (context, index) {
                      return _buildTransactionItem(
                          transactions[index], provider.currency);
                    },
                  ),
          );
        },
      ),
    );
  }

  Widget _buildTransactionItem(dynamic item, String currency) {
    double amount = 0.0;
    final rawAmount = item['amount'];
    if (rawAmount is num) {
      amount = rawAmount.toDouble();
    } else if (rawAmount is String) {
      amount = double.tryParse(rawAmount) ?? 0.0;
    }

    final type = item['type']?.toString() ?? 'debit';
    final isCredit = type == 'credit';

    dynamic dateRaw = item['createdAt'] ?? item['date'];
    String dateStr = '';
    if (dateRaw != null) {
      dateStr = CurrencyUtils.formatDate(dateRaw);
    }

    final description = item['description']?.toString() ?? '';
    final serviceType = item['serviceType']?.toString() ?? item['category']?.toString() ?? 'other';
    final ref = item['reference']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isCredit
                  ? Colors.green.withValues(alpha: 0.15)
                  : Colors.red.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _serviceIcon(serviceType),
              color: isCredit ? Colors.green : Colors.red,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  description.isNotEmpty
                      ? description
                      : _serviceLabel(serviceType),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: _serviceColor(serviceType)
                            .withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        _serviceLabel(serviceType),
                        style: TextStyle(
                          color: _serviceColor(serviceType),
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      dateStr,
                      style: const TextStyle(color: Colors.grey, fontSize: 11),
                    ),
                  ],
                ),
                if (ref.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Ref: $ref',
                    style: const TextStyle(color: Colors.grey, fontSize: 10),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          Text(
            '${isCredit ? '+' : '-'}${CurrencyUtils.formatExact(amount, currency: currency)}',
            style: TextStyle(
              color: isCredit ? Colors.green : Colors.red,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }

  IconData _serviceIcon(String serviceType) {
    switch (serviceType) {
      case 'ride':
        return Icons.directions_car;
      case 'delivery':
        return Icons.local_shipping;
      case 'airport':
        return Icons.flight;
      case 'topup':
      case 'wallet_topup':
        return Icons.account_balance_wallet;
      case 'payout':
      case 'driver_payout':
        return Icons.payments;
      case 'refund':
        return Icons.replay;
      default:
        return Icons.receipt_long;
    }
  }

  String _serviceLabel(String serviceType) {
    switch (serviceType) {
      case 'ride':
        return 'Ride';
      case 'delivery':
        return 'Delivery';
      case 'airport':
        return 'Airport';
      case 'topup':
      case 'wallet_topup':
        return 'Top-up';
      case 'payout':
      case 'driver_payout':
        return 'Payout';
      case 'refund':
        return 'Refund';
      case 'commission_deduction':
        return 'Commission';
      default:
        return serviceType.replaceAll('_', ' ').toUpperCase();
    }
  }

  Color _serviceColor(String serviceType) {
    switch (serviceType) {
      case 'ride':
        return const Color(0xFFCDFF00);
      case 'delivery':
        return Colors.orange;
      case 'airport':
        return Colors.blue;
      case 'topup':
      case 'wallet_topup':
        return Colors.green;
      case 'payout':
      case 'driver_payout':
        return Colors.purple;
      case 'refund':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }
}
