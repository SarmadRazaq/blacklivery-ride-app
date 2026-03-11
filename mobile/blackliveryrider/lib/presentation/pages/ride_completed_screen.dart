import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import 'package:provider/provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/providers/region_provider.dart';
import '../../core/services/ride_service.dart';
import '../widgets/custom_button.dart';
import '../../core/utils/currency_utils.dart';
import 'home_screen.dart';

class RideCompletedScreen extends StatefulWidget {
  /// Optional [rideId] injected from a deep link (e.g. blacklivery://receipt/abc123).
  final String? rideId;

  const RideCompletedScreen({super.key, this.rideId});

  @override
  State<RideCompletedScreen> createState() => _RideCompletedScreenState();
}

class _RideCompletedScreenState extends State<RideCompletedScreen> {
  int _rating = 5;
  double? _actualFare;
  bool _loadingFare = false;
  Map<String, dynamic>? _fareBreakdown;
  final TextEditingController _tipController = TextEditingController();
  final TextEditingController _feedbackController = TextEditingController();

  /// Saved rideId so it survives even if bookingState clears.
  String? _savedRideId;
  /// Driver info fetched from API (fallback when bookingState.assignedDriver is null).
  String? _apiDriverName;
  String? _apiDriverPhoto;

  @override
  void initState() {
    super.initState();
    // Snapshot the rideId immediately before any state clearing can happen.
    final bookingState = Provider.of<BookingState>(context, listen: false);
    _savedRideId = widget.rideId ?? bookingState.currentBooking?.id ?? bookingState.rideId;
    _fetchActualFare();
  }

  /// Fetch completed ride details from backend to get the final fare and driver info.
  void _fetchActualFare() async {
    final rideId = _savedRideId;
    if (rideId == null || rideId.isEmpty) return;

    setState(() => _loadingFare = true);
    try {
      final details = await RideService().getRideDetails(rideId);
      if (details != null && mounted) {
        final pricing = details['pricing'] as Map<String, dynamic>?;
        final breakdown = pricing?['breakdown'] as Map<String, dynamic>?;
        final finalFare = (pricing?['finalFare'] as num?)?.toDouble()
            ?? (details['finalFare'] as num?)?.toDouble();

        // Extract driver info from API response as fallback
        final driverData = details['driver'] as Map<String, dynamic>?;
        final driverName = driverData?['name'] as String?;
        final driverPhoto = (driverData?['photoUrl'] ?? driverData?['photoURL']) as String?;

        if (mounted) {
          setState(() {
            if (finalFare != null && finalFare > 0) _actualFare = finalFare;
            _fareBreakdown = breakdown ?? pricing;
            if (driverName != null && driverName.isNotEmpty) {
              _apiDriverName = driverName;
            }
            if (driverPhoto != null && driverPhoto.isNotEmpty) {
              _apiDriverPhoto = driverPhoto;
            }
          });
        }
      }
    } catch (e) {
      debugPrint('Failed to fetch actual fare: $e');
    } finally {
      if (mounted) setState(() => _loadingFare = false);
    }
  }

  @override
  void dispose() {
    _tipController.dispose();
    _feedbackController.dispose();
    super.dispose();
  }

  void _submitRating() async {
    // Submit rating to backend
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final rideId = _savedRideId ?? bookingState.currentBooking?.id;

    if (rideId != null && rideId.isNotEmpty) {
      try {
        final rideService = RideService();
        await rideService.rateDriver(
          rideId: rideId,
          rating: _rating,
          comment: _feedbackController.text.trim().isNotEmpty
              ? _feedbackController.text.trim()
              : null,
        );

        // Submit tip if entered
        final tipText = _tipController.text.replaceAll(RegExp(r'[^0-9.]'), '');
        final tipAmount = double.tryParse(tipText) ?? 0;
        if (tipAmount > 0) {
          try {
            await rideService.addTip(rideId: rideId, amount: tipAmount);
          } catch (e) {
            debugPrint('Failed to submit tip: $e');
          }
        }
      } catch (e) {
        debugPrint('Failed to submit rating: $e');
      }
    }

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Thank you for your feedback!')),
    );

    // Reset booking state
    bookingState.resetBookingFlow();

    // Navigate to home
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const HomeScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingState = Provider.of<BookingState>(context);
    final booking = bookingState.currentBooking;
    final driver = bookingState.assignedDriver;

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(height: 20),

              // Success icon
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle,
                  color: Colors.green,
                  size: 50,
                ),
              ),

              const SizedBox(height: 24),

              Text('Ride Completed!', style: AppTextStyles.heading2),

              const SizedBox(height: 8),

              Text(
                'Thank you for riding with us',
                style: AppTextStyles.body.copyWith(
                  color: AppColors.txtInactive,
                ),
              ),

              const SizedBox(height: 32),

              // Trip summary
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Trip Total',
                          style: AppTextStyles.body.copyWith(
                            color: AppColors.txtInactive,
                          ),
                        ),
                        _loadingFare
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.yellow90,
                                ),
                              )
                            : Text(
                                CurrencyUtils.formatExact(
                                  _actualFare ?? booking?.estimatedPrice ?? 0,
                                ),
                                style: AppTextStyles.heading2.copyWith(
                                  color: Colors.white,
                                ),
                              ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Divider(color: AppColors.inputBorder),
                    const SizedBox(height: 16),
                    if (_fareBreakdown != null) ...[
                      if ((_fareBreakdown!['baseFare'] as num?) != null)
                        _buildSummaryRow('Base fare', CurrencyUtils.formatExact((_fareBreakdown!['baseFare'] as num).toDouble())),
                      if ((_fareBreakdown!['baseFare'] as num?) != null)
                        const SizedBox(height: 8),
                      if ((_fareBreakdown!['distanceFare'] as num?) != null)
                        _buildSummaryRow('Distance fare', CurrencyUtils.formatExact((_fareBreakdown!['distanceFare'] as num).toDouble())),
                      if ((_fareBreakdown!['distanceFare'] as num?) != null)
                        const SizedBox(height: 8),
                      if ((_fareBreakdown!['timeFare'] as num?) != null)
                        _buildSummaryRow('Time fare', CurrencyUtils.formatExact((_fareBreakdown!['timeFare'] as num).toDouble())),
                      if ((_fareBreakdown!['timeFare'] as num?) != null)
                        const SizedBox(height: 8),
                      if ((_fareBreakdown!['surgeFare'] as num?) != null && (_fareBreakdown!['surgeFare'] as num) > 0)
                        _buildSummaryRow(
                          'Surge (${((_fareBreakdown!['surgeMultiplier'] as num?) ?? 1.0).toStringAsFixed(1)}x)',
                          CurrencyUtils.formatExact((_fareBreakdown!['surgeFare'] as num).toDouble()),
                        ),
                      if ((_fareBreakdown!['surgeFare'] as num?) != null && (_fareBreakdown!['surgeFare'] as num) > 0)
                        const SizedBox(height: 8),
                      const Divider(color: AppColors.inputBorder),
                      const SizedBox(height: 8),
                    ],
                    _buildSummaryRow(
                      'Distance',
                      '${((booking?.distanceKm ?? 0) > 0 ? booking!.distanceKm : bookingState.estimatedDistance).toStringAsFixed(1)} ${Provider.of<RegionProvider>(context, listen: false).isNigeria ? 'km' : 'mi'}',
                    ),
                    const SizedBox(height: 8),
                    _buildSummaryRow('Duration', '${booking?.rideOption.estimatedMinutes ?? 0} min'),
                    const SizedBox(height: 8),
                    _buildSummaryRow('Payment', bookingState.paymentMethod == 'cash' ? 'Cash' : bookingState.paymentMethod == 'wallet' ? 'Wallet' : 'Card'),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Rate driver
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Column(
                  children: [
                    // Driver info
                    Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.yellow90,
                              width: 2,
                            ),
                          ),
                          child: ClipOval(
                            child: (driver?.photoUrl != null && driver!.photoUrl.isNotEmpty) || (_apiDriverPhoto != null)
                                ? Image.network(
                                    driver?.photoUrl.isNotEmpty == true ? driver!.photoUrl : _apiDriverPhoto!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.person,
                                      color: Colors.white,
                                      size: 28,
                                    ),
                                  )
                                : const Icon(
                                    Icons.person,
                                    color: Colors.white,
                                    size: 28,
                                  ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Rate your driver',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.txtInactive,
                                ),
                              ),
                              Text(
                                driver?.name ?? _apiDriverName ?? 'Driver',
                                style: AppTextStyles.body.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Stars
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        return GestureDetector(
                          onTap: () => setState(() => _rating = index + 1),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Icon(
                              index < _rating ? Icons.star : Icons.star_border,
                              color: AppColors.yellow90,
                              size: 36,
                            ),
                          ),
                        );
                      }),
                    ),

                    const SizedBox(height: 20),

                    // Feedback
                    TextField(
                      controller: _feedbackController,
                      maxLines: 3,
                      style: AppTextStyles.body.copyWith(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Add a comment (optional)',
                        hintStyle: AppTextStyles.body.copyWith(
                          color: AppColors.txtInactive,
                        ),
                        filled: true,
                        fillColor: AppColors.bgPri,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: AppColors.yellow90),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Tip section
              Container(
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
                      'Add a tip',
                      style: AppTextStyles.body.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        _buildTipOption('${CurrencyUtils.symbol()}2'),
                        const SizedBox(width: 12),
                        _buildTipOption('${CurrencyUtils.symbol()}5'),
                        const SizedBox(width: 12),
                        _buildTipOption('${CurrencyUtils.symbol()}10'),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            height: 44,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: AppColors.bgPri,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.inputBorder),
                            ),
                            child: TextField(
                              controller: _tipController,
                              keyboardType: TextInputType.number,
                              style: AppTextStyles.body.copyWith(
                                color: Colors.white,
                                fontSize: 14,
                              ),
                              decoration: InputDecoration(
                                border: InputBorder.none,
                                hintText: 'Other',
                                hintStyle: AppTextStyles.body.copyWith(
                                  color: AppColors.txtInactive,
                                  fontSize: 14,
                                ),
                                prefixText: '${CurrencyUtils.symbol()} ',
                                prefixStyle: AppTextStyles.body.copyWith(
                                  color: Colors.white,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              CustomButton.main(text: 'Submit & Done', onTap: _submitRating),

              const SizedBox(height: 16),

              GestureDetector(
                onTap: () {
                  Provider.of<BookingState>(
                    context,
                    listen: false,
                  ).resetBookingFlow();
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (context) => const HomeScreen()),
                    (route) => false,
                  );
                },
                child: Text(
                  'Skip',
                  style: AppTextStyles.body.copyWith(
                    color: AppColors.txtInactive,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTextStyles.body.copyWith(
            color: AppColors.txtInactive,
            fontSize: 14,
          ),
        ),
        Text(
          value,
          style: AppTextStyles.body.copyWith(color: Colors.white, fontSize: 14),
        ),
      ],
    );
  }

  Widget _buildTipOption(String amount) {
    return GestureDetector(
      onTap: () {
        _tipController.text = amount.replaceAll(RegExp(r'[^0-9.]'), '');
      },
      child: Container(
        width: 50,
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.bgPri,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Center(
          child: Text(
            amount,
            style: AppTextStyles.body.copyWith(
              color: Colors.white,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }
}
