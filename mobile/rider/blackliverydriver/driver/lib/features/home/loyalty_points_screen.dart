import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../auth/data/services/driver_service.dart';

class LoyaltyPointsScreen extends StatefulWidget {
  const LoyaltyPointsScreen({super.key});

  @override
  State<LoyaltyPointsScreen> createState() => _LoyaltyPointsScreenState();
}

class _LoyaltyPointsScreenState extends State<LoyaltyPointsScreen> {
  final DriverService _driverService = DriverService();
  bool _isLoading = true;
  Map<String, dynamic> _data = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      final data = await _driverService.getLoyaltyOverview();
      if (!mounted) return;
      setState(() {
        _data = data;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to load loyalty data')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final account = (_data['account'] as Map<String, dynamic>?) ?? {};
    final rewards = (_data['rewards'] as List<dynamic>?) ?? [];
    final history = (_data['history'] as List<dynamic>?) ?? [];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Loyalty Points'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.cardBackground,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Tier: ${(account['tier'] ?? 'bronze').toString().toUpperCase()}',
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${account['points'] ?? 0} points',
                          style: const TextStyle(
                            color: AppColors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Lifetime points: ${account['lifetimePoints'] ?? 0} • Trips: ${account['lifetimeTrips'] ?? 0}',
                          style: const TextStyle(color: AppColors.grey, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Available Rewards',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...rewards.map((reward) {
                    final r = reward as Map<String, dynamic>;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.cardBackground,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              (r['description'] ?? r['type'] ?? '').toString(),
                              style: const TextStyle(color: AppColors.white, fontSize: 13),
                            ),
                          ),
                          Text(
                            '${r['pointsCost'] ?? 0} pts',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 10),
                  const Text(
                    'Recent Activity',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (history.isEmpty)
                    const Text(
                      'No loyalty activity yet',
                      style: TextStyle(color: AppColors.grey),
                    )
                  else
                    ...history.map((entry) {
                      final e = entry as Map<String, dynamic>;
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          (e['description'] ?? 'Activity').toString(),
                          style: const TextStyle(color: AppColors.white, fontSize: 13),
                        ),
                        trailing: Text(
                          '${e['points'] ?? 0}',
                          style: TextStyle(
                            color: (e['points'] ?? 0) is num && (e['points'] as num) < 0
                                ? Colors.redAccent
                                : Colors.greenAccent,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}
