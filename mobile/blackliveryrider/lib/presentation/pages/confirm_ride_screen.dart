import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import 'package:provider/provider.dart';
import '../../core/providers/region_provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/services/promotion_service.dart';
import '../widgets/vehicle_icon.dart';
import '../../core/services/payment_service.dart';
import '../widgets/custom_button.dart';
import '../widgets/ride_map_view.dart';
import 'searching_driver_screen.dart';

class ConfirmRideScreen extends StatefulWidget {
  const ConfirmRideScreen({super.key});

  @override
  State<ConfirmRideScreen> createState() => _ConfirmRideScreenState();
}

class _ConfirmRideScreenState extends State<ConfirmRideScreen> {
  bool _isLoading = false;
  bool _showPromoInput = false;
  final TextEditingController _promoController = TextEditingController();
  String? _promoDiscount;
  double _discountAmount = 0;
  String? _defaultPaymentLabel;

  @override
  void initState() {
    super.initState();
    _loadDefaultPaymentMethod();
  }

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  Future<void> _loadDefaultPaymentMethod() async {
    try {
      final methods = await PaymentService().getPaymentMethods();
      if (methods.isNotEmpty && mounted) {
        final m = methods.first;
        final brand = m['brand'] ?? m['type'] ?? 'Card';
        final last4 = m['last4'] ?? '';
        setState(() {
          _defaultPaymentLabel = last4.isNotEmpty ? '$brand •••• $last4' : brand;
        });
      }
    } catch (e) {
      // Ignore — fallback to 'Default Method'
    }
  }

  Future<void> _applyPromoCode() async {
    final code = _promoController.text.trim();
    if (code.isEmpty) return;

    final result = await PromotionService().applyPromoCode(code: code);
    if (result != null && mounted) {
      setState(() {
        _promoDiscount = result['description'] ?? 'Discount applied';
        _discountAmount = (result['discount'] as num?)?.toDouble() ?? 0;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_promoDiscount!)),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid promo code')),
      );
    }
  }

  Future<void> _confirmRide() async {
    setState(() => _isLoading = true);

    try {
      await Provider.of<BookingState>(context, listen: false).createBooking();

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const SearchingDriverScreen(),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingState = Provider.of<BookingState>(context);
    final rideOption = bookingState.selectedRideOption;
    final distance = bookingState.estimatedDistance;
    final price = rideOption?.calculatePrice(distance) ?? 0;
    final finalPrice = price - _discountAmount;

    final pickupLatLng = bookingState.pickupLocation != null
        ? LatLng(bookingState.pickupLocation!.latitude, bookingState.pickupLocation!.longitude)
        : null;
    final dropoffLatLng = bookingState.dropoffLocation != null
        ? LatLng(bookingState.dropoffLocation!.latitude, bookingState.dropoffLocation!.longitude)
        : null;

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Icon(
                      Icons.chevron_left,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  const Spacer(),
                  Text('Confirm Ride', style: AppTextStyles.heading3),
                  const Spacer(),
                  const SizedBox(width: 28),
                ],
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    // Route map
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: SizedBox(
                        height: 200,
                        child: RideMapView(
                          pickup: pickupLatLng,
                          dropoff: dropoffLatLng,
                          showRoute: true,
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Route details
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.inputBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.inputBorder),
                      ),
                      child: Column(
                        children: [
                          _buildRouteRow(
                            icon: Icons.circle,
                            iconColor: AppColors.yellow90,
                            iconSize: 12,
                            title: 'Pickup',
                            subtitle: bookingState.pickupLocation?.name ?? '',
                            time: bookingState.formattedScheduledTime,
                          ),
                          const Padding(
                            padding: EdgeInsets.only(left: 5),
                            child: SizedBox(
                              height: 30,
                              child: VerticalDivider(
                                color: AppColors.inputBorder,
                                thickness: 2,
                              ),
                            ),
                          ),
                          _buildRouteRow(
                            icon: Icons.circle,
                            iconColor: Colors.red,
                            iconSize: 12,
                            title: 'Dropoff',
                            subtitle: bookingState.dropoffLocation?.name ?? '',
                            time: '',
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Ride details
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
                            children: [
                              Container(
                                width: 50,
                                height: 35,
                                decoration: BoxDecoration(
                                  color: AppColors.bgPri,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: VehicleIcon.fromId(
                                  rideOption?.id ?? 'sedan',
                                  color: AppColors.yellow90,
                                  size: 32,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      rideOption?.name ?? 'Ride',
                                      style: AppTextStyles.body.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    Text(
                                      '${rideOption?.estimatedMinutes ?? 0} min • ${distance.toStringAsFixed(1)} ${Provider.of<RegionProvider>(context, listen: false).isNigeria ? 'km' : 'mi'}',
                                      style: AppTextStyles.caption.copyWith(
                                        color: AppColors.txtInactive,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                CurrencyUtils.formatExact(finalPrice > 0 ? finalPrice : price),
                                style: AppTextStyles.heading3.copyWith(
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          const Divider(color: AppColors.inputBorder),
                          const SizedBox(height: 16),

                          // Fare breakdown
                          if (rideOption != null) ...[
                            _buildFareRow('Base fare', CurrencyUtils.formatExact(rideOption.basePrice)),
                            const SizedBox(height: 8),
                            _buildFareRow(
                              'Distance (${distance.toStringAsFixed(1)} ${Provider.of<RegionProvider>(context, listen: false).isNigeria ? 'km' : 'mi'})',
                              CurrencyUtils.formatExact(rideOption.pricePerKm * distance),
                            ),
                            if (_discountAmount > 0) ...[
                              const SizedBox(height: 8),
                              _buildFareRow('Promo discount', '- ${CurrencyUtils.formatExact(_discountAmount)}', valueColor: Colors.green),
                            ],
                            const SizedBox(height: 8),
                            const Divider(color: AppColors.inputBorder),
                            const SizedBox(height: 8),
                            _buildFareRow(
                              'Total',
                              CurrencyUtils.formatExact(finalPrice > 0 ? finalPrice : price),
                              isBold: true,
                            ),
                            const SizedBox(height: 16),
                            const Divider(color: AppColors.inputBorder),
                            const SizedBox(height: 16),
                          ],

                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Payment',
                                style: AppTextStyles.body.copyWith(
                                  color: AppColors.txtInactive,
                                ),
                              ),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.credit_card,
                                    color: AppColors.yellow90,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    _defaultPaymentLabel ?? 'Default Method',
                                    style: AppTextStyles.body.copyWith(
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          // Promo code section
                          const SizedBox(height: 16),
                          const Divider(color: AppColors.inputBorder),
                          const SizedBox(height: 12),
                          GestureDetector(
                            onTap: () => setState(() => _showPromoInput = !_showPromoInput),
                            child: Row(
                              children: [
                                const Icon(Icons.local_offer, color: AppColors.yellow90, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  _promoDiscount ?? 'Have a promo code?',
                                  style: AppTextStyles.body.copyWith(
                                    color: _promoDiscount != null ? Colors.green : AppColors.yellow90,
                                    fontSize: 14,
                                  ),
                                ),
                                const Spacer(),
                                Icon(
                                  _showPromoInput ? Icons.expand_less : Icons.expand_more,
                                  color: AppColors.txtInactive,
                                  size: 20,
                                ),
                              ],
                            ),
                          ),
                          if (_showPromoInput && _promoDiscount == null) ...[
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _promoController,
                                    style: AppTextStyles.body.copyWith(color: Colors.white, fontSize: 14),
                                    decoration: InputDecoration(
                                      hintText: 'Enter promo code',
                                      hintStyle: AppTextStyles.body.copyWith(color: AppColors.txtInactive, fontSize: 14),
                                      filled: true,
                                      fillColor: AppColors.bgPri,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(10),
                                        borderSide: BorderSide(color: AppColors.inputBorder),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(10),
                                        borderSide: BorderSide(color: AppColors.inputBorder),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                GestureDetector(
                                  onTap: _applyPromoCode,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: AppColors.yellow90,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text('Apply', style: AppTextStyles.body.copyWith(color: AppColors.bgPri, fontWeight: FontWeight.w600, fontSize: 14)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                          if (_discountAmount > 0) ...[
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Discount', style: AppTextStyles.body.copyWith(color: Colors.green, fontSize: 14)),
                                Text('- ${CurrencyUtils.formatExact(_discountAmount)}', style: AppTextStyles.body.copyWith(color: Colors.green, fontSize: 14)),
                              ],
                            ),
                          ],
                          if (bookingState.isForSomeoneElse) ...[
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Booking For',
                                  style: AppTextStyles.body.copyWith(
                                    color: AppColors.txtInactive,
                                  ),
                                ),
                                Text(
                                  bookingState.recipientName ?? 'Someone Else',
                                  style: AppTextStyles.body.copyWith(
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Confirm Button
            Padding(
              padding: const EdgeInsets.all(20),
              child: CustomButton.main(
                text: _isLoading ? 'Processing...' : 'Confirm & Book',
                onTap: _isLoading ? null : _confirmRide,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRouteRow({
    required IconData icon,
    required Color iconColor,
    required double iconSize,
    required String title,
    required String subtitle,
    required String time,
  }) {
    return Row(
      children: [
        Icon(icon, color: iconColor, size: iconSize),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.txtInactive,
                ),
              ),
              Text(
                subtitle,
                style: AppTextStyles.body.copyWith(
                  color: Colors.white,
                  fontSize: 14,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        if (time.isNotEmpty)
          Text(
            time,
            style: AppTextStyles.caption.copyWith(color: AppColors.yellow90),
          ),
      ],
    );
  }

  Widget _buildFareRow(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTextStyles.body.copyWith(
            color: isBold ? Colors.white : AppColors.txtInactive,
            fontSize: 13,
            fontWeight: isBold ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
        Text(
          value,
          style: AppTextStyles.body.copyWith(
            color: valueColor ?? (isBold ? AppColors.yellow90 : Colors.white),
            fontSize: 13,
            fontWeight: isBold ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      ],
    );
  }
}
