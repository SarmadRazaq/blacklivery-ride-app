import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/currency_utils.dart';
import 'providers/earnings_provider.dart';

class PayoutHistoryScreen extends ConsumerWidget {
  const PayoutHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = ref.watch(earningsRiverpodProvider);
    final history = provider.payoutHistory;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: const BackButton(color: Colors.white),
        title: const Text(
          'Payout History',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: Builder(
        builder: (context) {
          if (provider.isLoading && history.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          return RefreshIndicator(
            onRefresh: () => provider.loadPayoutHistory(),
            color: AppColors.primary,
            backgroundColor: AppColors.cardBackground,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _buildTotalPayoutsCard(provider),
                const SizedBox(height: 32),
                const Text(
                  'Payout History',
                  style: TextStyle(color: Colors.grey, fontSize: 14),
                ),
                const SizedBox(height: 16),
                if (history.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: Center(
                      child: Text(
                        'No payout history found',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  ),
                ...history.map(
                  (item) => _buildHistoryItem(item, provider.currency),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildTotalPayoutsCard(EarningsProvider provider) {
    double total = 0;
    for (var item in provider.payoutHistory) {
      if (item is Map) {
        final amount = item['amount'];
        if (amount is num) {
          total += amount.toDouble();
        } else if (amount is String) {
          total += double.tryParse(amount) ?? 0.0;
        }
      }
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          const Text(
            'Total Payouts (Loaded)',
            style: TextStyle(color: Colors.grey, fontSize: 14),
          ),
          const SizedBox(height: 8),
          Text(
            CurrencyUtils.formatExact(total, currency: provider.currency),
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryItem(dynamic item, String currency) {
    double amount = 0.0;
    if (item['amount'] is num) {
      amount = (item['amount'] as num).toDouble();
    } else if (item['amount'] is String) {
      amount = double.tryParse(item['amount']) ?? 0.0;
    }

    dynamic dateRaw = item['createdAt'] ?? item['date'];
    String dateStr = '';
    if (dateRaw != null) {
      dateStr = CurrencyUtils.formatDate(dateRaw);
    }

    String status = 'Completed';
    if (item['status'] != null) {
      status = item['status'].toString().capitalize();
    }

    final bankName = item['bankName']?.toString() ?? 'Bank';
    final ref =
        item['referenceId']?.toString() ?? item['reference']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                dateStr,
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
              const SizedBox(height: 4),
              Text(
                CurrencyUtils.formatExact(amount, currency: currency),
                style: const TextStyle(
                  color: AppColors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Bank Transfer • $bankName',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                children: [
                  const Icon(Icons.check, color: AppColors.white, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    status,
                    style: const TextStyle(
                      color: AppColors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Reference ID: #$ref',
                style: const TextStyle(color: Colors.grey, fontSize: 10),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

extension StringExtension on String {
  String capitalize() {
    if (isEmpty) return this;
    return "${this[0].toUpperCase()}${substring(1)}";
  }
}
