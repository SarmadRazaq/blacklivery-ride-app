import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/providers/region_provider.dart';
import '../../core/data/booking_state.dart';
import '../../core/models/ride_option_model.dart';
import '../widgets/vehicle_icon.dart';
import '../widgets/custom_button.dart';
import 'where_to_screen.dart';

/// Hourly booking screen — lets user select hours (min 2) and vehicle category
/// for a chauffeur-by-the-hour service.
class HourlyBookingScreen extends StatefulWidget {
  const HourlyBookingScreen({super.key});

  @override
  State<HourlyBookingScreen> createState() => _HourlyBookingScreenState();
}

class _HourlyBookingScreenState extends State<HourlyBookingScreen> {
  int _selectedHours = 2;
  int _selectedCategoryIndex = 0;

  // Hourly rates per vehicle category
  static const List<_HourlyCategory> _categories = [
    _HourlyCategory(
      id: 'business_sedan',
      name: 'Business Sedan',
      description: 'Executive sedan with professional driver',
      hourlyRateNGN: 5000,
      hourlyRateUSD: 45,
      capacity: 3,
    ),
    _HourlyCategory(
      id: 'suv',
      name: 'SUV',
      description: 'Spacious SUV for comfort & group travel',
      hourlyRateNGN: 7500,
      hourlyRateUSD: 65,
      capacity: 5,
    ),
    _HourlyCategory(
      id: 'first_class',
      name: 'First Class',
      description: 'Premium luxury vehicle',
      hourlyRateNGN: 12000,
      hourlyRateUSD: 95,
      capacity: 3,
    ),
  ];

  double _estimatedTotal(RegionProvider region) {
    final cat = _categories[_selectedCategoryIndex];
    final rate = region.isChicago ? cat.hourlyRateUSD : cat.hourlyRateNGN;
    return rate * _selectedHours.toDouble();
  }

  @override
  Widget build(BuildContext context) {
    final region = context.watch<RegionProvider>();
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: Colors.white, size: 28),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Book by the Hour', style: AppTextStyles.heading3),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppSpacing.lg),

            // Info banner
            Container(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              decoration: BoxDecoration(
                color: AppColors.yellow90.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
                border: Border.all(
                  color: AppColors.yellow90.withOpacity(0.3),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: AppColors.yellow90, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'A dedicated driver for your schedule. '
                      'Minimum 2 hours. Unlimited stops within the city.',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.yellow90,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.xl),

            // Hour Selector
            Text('Select Duration', style: AppTextStyles.heading3.copyWith(fontSize: 16)),
            const SizedBox(height: AppSpacing.md),

            _buildHourSelector(),

            const SizedBox(height: AppSpacing.xl),

            // Vehicle Category
            Text('Select Vehicle', style: AppTextStyles.heading3.copyWith(fontSize: 16)),
            const SizedBox(height: AppSpacing.md),

            Expanded(
              child: ListView.builder(
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = _selectedCategoryIndex == index;
                  return _buildCategoryCard(cat, isSelected, index, region);
                },
              ),
            ),

            // Price summary and confirm
            Container(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '$_selectedHours hrs × ${_categories[_selectedCategoryIndex].name}',
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.txtSec,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        CurrencyUtils.format(_estimatedTotal(region)),
                        style: AppTextStyles.heading3.copyWith(
                          color: AppColors.yellow90,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  CustomButton.gradient(
                    text: 'Set Pickup Location',
                    onTap: () {
                      final bookingState = Provider.of<BookingState>(
                        context,
                        listen: false,
                      );
                      bookingState.setBookingType('hourly');
                      bookingState.setHoursBooked(_selectedHours);
                      bookingState.selectRideOption(
                        _categories[_selectedCategoryIndex].toRideOption(isChicago: region.isChicago),
                      );
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const WhereToScreen(),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ),
      ),
    );
  }

  Widget _buildHourSelector() {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Row(
        children: [
          // Decrease button
          _buildHourButton(
            icon: Icons.remove,
            onTap: _selectedHours > 2
                ? () => setState(() => _selectedHours--)
                : null,
          ),
          // Hours display
          Expanded(
            child: Center(
              child: Text(
                '$_selectedHours hours',
                style: AppTextStyles.heading3.copyWith(fontSize: 18),
              ),
            ),
          ),
          // Increase button
          _buildHourButton(
            icon: Icons.add,
            onTap: _selectedHours < 12
                ? () => setState(() => _selectedHours++)
                : null,
          ),
        ],
      ),
    );
  }

  Widget _buildHourButton({
    required IconData icon,
    VoidCallback? onTap,
  }) {
    final isDisabled = onTap == null;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: isDisabled
              ? Colors.transparent
              : AppColors.yellow90.withOpacity(0.15),
          borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
        ),
        child: Icon(
          icon,
          color: isDisabled ? AppColors.txtInactive : AppColors.yellow90,
          size: 24,
        ),
      ),
    );
  }

  Widget _buildCategoryCard(
    _HourlyCategory cat,
    bool isSelected,
    int index,
    RegionProvider region,
  ) {
    return GestureDetector(
      onTap: () => setState(() => _selectedCategoryIndex = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: const EdgeInsets.all(AppSpacing.cardPadding),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.yellow90.withOpacity(0.12)
              : AppColors.inputBg,
          borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
          border: Border.all(
            color: isSelected ? AppColors.yellow90 : AppColors.inputBorder,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.yellow90.withOpacity(0.2)
                    : AppColors.bgPri,
                borderRadius: BorderRadius.circular(12),
              ),
              child: VehicleIcon.fromId(
                cat.id,
                color: isSelected ? AppColors.yellow90 : AppColors.txtInactive,
                size: 32,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    cat.name,
                    style: AppTextStyles.bodySmall.copyWith(
                      color: isSelected ? AppColors.yellow90 : Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    cat.description,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${CurrencyUtils.format((region.isChicago ? cat.hourlyRateUSD : cat.hourlyRateNGN).toDouble())}/hr',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: isSelected ? AppColors.yellow90 : Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.person, size: 12, color: AppColors.txtInactive),
                    const SizedBox(width: 2),
                    Text(
                      '${cat.capacity}',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.txtInactive,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HourlyCategory {
  final String id;
  final String name;
  final String description;
  final int hourlyRateNGN;
  final int hourlyRateUSD;
  final int capacity;

  const _HourlyCategory({
    required this.id,
    required this.name,
    required this.description,
    required this.hourlyRateNGN,
    required this.hourlyRateUSD,
    required this.capacity,
  });

  RideOption toRideOption({bool isChicago = false}) {
    return RideOption(
      id: id,
      name: name,
      description: description,
      iconPath: '',
      basePrice: (isChicago ? hourlyRateUSD : hourlyRateNGN).toDouble(),
      pricePerKm: 0,
      estimatedMinutes: 0,
      capacity: capacity,
    );
  }
}
