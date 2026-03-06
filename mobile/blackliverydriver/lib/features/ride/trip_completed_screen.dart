import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import 'data/models/ride_model.dart';
import 'driver_map_screen.dart';

class TripCompletedScreen extends ConsumerStatefulWidget {
  final Ride ride;

  const TripCompletedScreen({super.key, required this.ride});

  @override
  ConsumerState<TripCompletedScreen> createState() => _TripCompletedScreenState();
}

class _TripCompletedScreenState extends ConsumerState<TripCompletedScreen> {
  int _selectedRating = 5;
  bool _isSubmitting = false;
  final TextEditingController _feedbackController = TextEditingController();
  final Set<String> _selectedFeedback = {};

  final List<String> _feedbackOptions = [
    'Behaviour',
    'Policy',
    'Tipped',
    'Friendly Ride',
    'Chat',
    'Smooth Ride',
    'Clean',
  ];

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    try {
      final rideId = widget.ride.id;
      if (rideId.isNotEmpty) {
        final feedbackText = _feedbackController.text.trim();
        final tagsText = _selectedFeedback.join(', ');
        final finalFeedback = [
          feedbackText,
          tagsText,
        ].where((s) => s.isNotEmpty).join(' | ');
        await ref.read(rideRiverpodProvider).rateRider(
          rideId,
          _selectedRating,
          finalFeedback.isNotEmpty ? finalFeedback : null,
        );
      }
    } catch (e) {
      debugPrint('Rating submission failed: $e');
    }
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const DriverMapScreen()),
        (route) => false,
      );
    }
  }

  void _skip() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const DriverMapScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final ride = widget.ride;
    final fare = ride.fare;
    final tips = ride.pricing.tips;
    final total = fare + tips;
    final distance = ride.pricing.distance;

    // Compute trip duration from timestamps
    String durationText = '—';
    if (ride.startedAt != null && ride.completedAt != null) {
      final diff = ride.completedAt!.difference(ride.startedAt!);
      final mins = diff.inMinutes;
      if (mins < 60) {
        durationText = '$mins min';
      } else {
        final h = mins ~/ 60;
        final m = mins % 60;
        durationText = '${h}h ${m}m';
      }
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // ── Header ──────────────────────────────────────────────────
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_outline,
                  size: 48,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Trip Completed!',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Thank you for providing great service',
                style: TextStyle(color: Colors.grey[400], fontSize: 14),
              ),
              const SizedBox(height: 28),

              // ── Ride Details ─────────────────────────────────────────────
              _buildCard(
                title: 'Ride Details',
                child: Column(
                  children: [
                    _buildRow('Ride ID', ride.id.substring(0, 8)),
                    const Divider(color: AppColors.darkGrey, height: 20),
                    // Route
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Column(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            Container(
                              width: 2,
                              height: 28,
                              color: Colors.grey[700],
                            ),
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: Colors.red[400],
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                ride.pickupAddress,
                                style: const TextStyle(
                                  color: AppColors.white,
                                  fontSize: 13,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 18),
                              Text(
                                ride.dropoffAddress,
                                style: TextStyle(
                                  color: Colors.grey[400],
                                  fontSize: 13,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: AppColors.darkGrey, height: 20),
                    _buildRow('Distance', '${distance.toStringAsFixed(1)} km'),
                    const Divider(color: AppColors.darkGrey, height: 20),
                    _buildRow('Duration', durationText),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── Earnings Summary ─────────────────────────────────────────
              _buildCard(
                title: 'Earnings Summary',
                child: Column(
                  children: [
                    _buildRow('Fare Amount', CurrencyUtils.format(fare)),
                    const Divider(color: AppColors.darkGrey, height: 20),
                    _buildRow(
                      'Tips',
                      tips > 0 ? CurrencyUtils.format(tips) : '—',
                    ),
                    const Divider(color: AppColors.darkGrey, height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total Earnings',
                          style: TextStyle(
                            color: AppColors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          CurrencyUtils.format(total),
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: AppColors.darkGrey, height: 20),
                    _buildRow(
                      'Payment Method',
                      ride.payment?.gateway ?? 'Cash',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── Rate Rider ───────────────────────────────────────────────
              _buildCard(
                title: 'Rate this ride',
                child: Column(
                  children: [
                    // Stars
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        return GestureDetector(
                          onTap: () =>
                              setState(() => _selectedRating = index + 1),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            child: Icon(
                              index < _selectedRating
                                  ? Icons.star
                                  : Icons.star_border,
                              color: AppColors.primary,
                              size: 38,
                            ),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 16),
                    // Feedback chips
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      alignment: WrapAlignment.center,
                      children: _feedbackOptions.map((option) {
                        final isSelected = _selectedFeedback.contains(option);
                        return FilterChip(
                          label: Text(
                            option,
                            style: TextStyle(
                              color: isSelected
                                  ? Colors.black
                                  : AppColors.white,
                              fontSize: 12,
                            ),
                          ),
                          selected: isSelected,
                          onSelected: (selected) {
                            setState(() {
                              if (selected) {
                                _selectedFeedback.add(option);
                              } else {
                                _selectedFeedback.remove(option);
                              }
                            });
                          },
                          backgroundColor: AppColors.cardBackground,
                          selectedColor: AppColors.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                            side: BorderSide(
                              color: isSelected
                                  ? AppColors.primary
                                  : Colors.grey[700]!,
                            ),
                          ),
                          showCheckmark: false,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 0,
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    // Feedback text
                    TextField(
                      controller: _feedbackController,
                      maxLines: 2,
                      style: const TextStyle(color: AppColors.white),
                      decoration: InputDecoration(
                        hintText: 'Leave feedback (optional)',
                        hintStyle: TextStyle(color: Colors.grey[500]),
                        filled: true,
                        fillColor: AppColors.background,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey[700]!),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey[700]!),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ── Continue Button ──────────────────────────────────────────
              GestureDetector(
                onTap: _isSubmitting ? null : _submit,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: _isSubmitting ? Colors.grey[700] : AppColors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text(
                            'Continue',
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _isSubmitting ? null : _skip,
                child: Text(
                  'Skip',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCard({required String title, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: Colors.grey[400], fontSize: 14)),
        Text(
          value,
          style: const TextStyle(
            color: AppColors.white,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
