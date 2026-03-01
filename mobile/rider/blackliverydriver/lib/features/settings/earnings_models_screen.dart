import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import '../../features/auth/data/services/driver_service.dart';
import '../../core/providers/riverpod_providers.dart';

enum PayoutOption { scheduled, manual }

class EarningsModelsScreen extends ConsumerStatefulWidget {
  const EarningsModelsScreen({super.key});

  @override
  ConsumerState<EarningsModelsScreen> createState() => _EarningsModelsScreenState();
}

class _EarningsModelsScreenState extends ConsumerState<EarningsModelsScreen> {
  PayoutOption _selectedPayout = PayoutOption.scheduled;
  final DriverService _driverService = DriverService();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(authRiverpodProvider).user;
      if (user?.driverProfile != null) {
        setState(() {
          _selectedPayout = (user!.driverProfile!.autoPayoutEnabled)
              ? PayoutOption.scheduled
              : PayoutOption.manual;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Earnings Models',
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Driver Earnings Model',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Choose the model that works best for you!',
              style: TextStyle(fontSize: 14, color: Colors.grey[400]),
            ),
            const SizedBox(height: 32),
            _buildOption(
              title: 'Scheduled Payout',
              description:
                  'Schedule your payout to automatically cash-out weekly or monthly.',
              option: PayoutOption.scheduled,
            ),
            const SizedBox(height: 16),
            _buildOption(
              title: 'Manual Payout',
              description:
                  'Manually Cash-out your earning whenever you please (${CurrencyUtils.format(1000)} minimum).',
              option: PayoutOption.manual,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOption({
    required String title,
    required String description,
    required PayoutOption option,
  }) {
    final isSelected = _selectedPayout == option;
    return GestureDetector(
      onTap: () async {
        setState(() => _selectedPayout = option);
        try {
          await _driverService.updateProfileField(
            'autoPayoutEnabled',
            option == PayoutOption.scheduled,
          );
          if (mounted) {
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(const SnackBar(content: Text('Preference updated')));
            // Refresh profile to keep local state in sync
            ref.read(authRiverpodProvider).getProfile();
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Failed to update preference: $e')),
            );
          }
        }
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E1E),
          borderRadius: BorderRadius.circular(16),
          border: isSelected ? Border.all(color: Colors.white, width: 1) : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: TextStyle(
                      color: Colors.grey[400],
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Icon(
              isSelected ? Icons.check : Icons.circle_outlined,
              color: isSelected
                  ? const Color(0xFFD4AF37)
                  : Colors.grey, // Goldish check
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}
