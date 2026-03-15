import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/data/booking_state.dart';
import '../../core/models/ride_option_model.dart';
import '../../core/providers/region_provider.dart';
import '../widgets/vehicle_icon.dart';
import '../widgets/custom_button.dart';
import 'where_to_screen.dart';

/// Airport transfer booking screen — fixed-price rides to/from ORD or MDW.
class AirportBookingScreen extends StatefulWidget {
  const AirportBookingScreen({super.key});

  @override
  State<AirportBookingScreen> createState() => _AirportBookingScreenState();
}

class _AirportBookingScreenState extends State<AirportBookingScreen> {
  int _selectedAirportIndex = 0;
  int _selectedCategoryIndex = 0;
  bool _isPickup = true; // true = airport pickup, false = airport dropoff

  static const List<_Airport> _airports = [
    _Airport(
      code: 'ORD',
      name: 'O\'Hare International',
      fullName: 'Chicago O\'Hare International Airport',
      icon: Icons.flight,
    ),
    _Airport(
      code: 'MDW',
      name: 'Midway International',
      fullName: 'Chicago Midway International Airport',
      icon: Icons.flight,
    ),
  ];

  static const List<_AirportCategory> _categories = [
    _AirportCategory(
      id: 'business_sedan',
      name: 'Business Sedan',
      ordRate: 95,
      mdwRate: 85,
      capacity: 3,
    ),
    _AirportCategory(
      id: 'business_suv',
      name: 'Business SUV',
      ordRate: 125,
      mdwRate: 110,
      capacity: 5,
    ),
    _AirportCategory(
      id: 'first_class',
      name: 'First Class',
      ordRate: 150,
      mdwRate: 135,
      capacity: 3,
    ),
  ];

  double get _price {
    final cat = _categories[_selectedCategoryIndex];
    return _selectedAirportIndex == 0 ? cat.ordRate : cat.mdwRate;
  }

  String get _airportCode => _airports[_selectedAirportIndex].code;

  @override
  Widget build(BuildContext context) {
    final region = Provider.of<RegionProvider>(context, listen: false);
    final isChicago = region.apiRegionKey == 'chicago' || region.isChicago;

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: Colors.white, size: 28),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Airport Transfer', style: AppTextStyles.heading3),
        centerTitle: true,
      ),
      body: !isChicago
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.airplanemode_inactive, color: AppColors.txtInactive, size: 64),
                    const SizedBox(height: 16),
                    Text(
                      'Not Available in Your Region',
                      style: AppTextStyles.heading3,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Airport transfers are currently only available in Chicago. '
                      'Switch your region to Chicago in Settings to access this feature.',
                      style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.yellow90,
                        foregroundColor: AppColors.bgPri,
                        minimumSize: const Size(0, 52),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(30),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                      ),
                      child: const Text('Go Back'),
                    ),
                  ],
                ),
              ),
            )
          : Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppSpacing.md),

            // Info banner — 60 min free wait
            Container(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              decoration: BoxDecoration(
                color: AppColors.yellow90.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
                border: Border.all(color: AppColors.yellow90.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.access_time,
                    color: AppColors.yellow90,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Fixed pricing with 60 minutes free waiting time. '
                      'Meet & greet service included.',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.yellow90,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.lg),

            // Direction toggle (To airport / From airport)
            _buildDirectionToggle(),

            const SizedBox(height: AppSpacing.lg),

            // Airport Selector
            Text(
              'Select Airport',
              style: AppTextStyles.heading3.copyWith(fontSize: 16),
            ),
            const SizedBox(height: AppSpacing.sm),

            Row(
              children: List.generate(_airports.length, (index) {
                final airport = _airports[index];
                final isSelected = _selectedAirportIndex == index;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedAirportIndex = index),
                    child: Container(
                      margin: EdgeInsets.only(
                        right: index == 0 ? 8 : 0,
                        left: index == 1 ? 8 : 0,
                      ),
                      padding: const EdgeInsets.all(AppSpacing.cardPadding),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.yellow90.withOpacity(0.12)
                            : AppColors.inputBg,
                        borderRadius: BorderRadius.circular(
                          AppSpacing.cardRadius,
                        ),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.yellow90
                              : AppColors.inputBorder,
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            airport.icon,
                            color: isSelected
                                ? AppColors.yellow90
                                : AppColors.txtInactive,
                            size: 28,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            airport.code,
                            style: AppTextStyles.heading3.copyWith(
                              fontSize: 18,
                              color: isSelected
                                  ? AppColors.yellow90
                                  : Colors.white,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            airport.name,
                            textAlign: TextAlign.center,
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.txtInactive,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),

            const SizedBox(height: AppSpacing.lg),

            // Vehicle Category
            Text(
              'Select Vehicle',
              style: AppTextStyles.heading3.copyWith(fontSize: 16),
            ),
            const SizedBox(height: AppSpacing.sm),

            Expanded(
              child: ListView.builder(
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = _selectedCategoryIndex == index;
                  final price = _selectedAirportIndex == 0
                      ? cat.ordRate
                      : cat.mdwRate;

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
                        borderRadius: BorderRadius.circular(
                          AppSpacing.cardRadius,
                        ),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.yellow90
                              : AppColors.inputBorder,
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.yellow90.withOpacity(0.2)
                                  : AppColors.bgPri,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: VehicleIcon.fromId(
                              cat.id,
                              color: isSelected
                                  ? AppColors.yellow90
                                  : AppColors.txtInactive,
                              size: 30,
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
                                    color: isSelected
                                        ? AppColors.yellow90
                                        : Colors.white,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.person,
                                      size: 12,
                                      color: AppColors.txtInactive,
                                    ),
                                    const SizedBox(width: 2),
                                    Text(
                                      '${cat.capacity} passengers',
                                      style: AppTextStyles.caption.copyWith(
                                        color: AppColors.txtInactive,
                                        fontSize: 11,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Icon(
                                      Icons.access_time,
                                      size: 12,
                                      color: AppColors.txtInactive,
                                    ),
                                    const SizedBox(width: 2),
                                    Text(
                                      '60 min free wait',
                                      style: AppTextStyles.caption.copyWith(
                                        color: AppColors.txtInactive,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Text(
                            CurrencyUtils.format(price, currency: 'USD'),
                            style: AppTextStyles.heading3.copyWith(
                              color: isSelected
                                  ? AppColors.yellow90
                                  : Colors.white,
                              fontSize: 20,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Book button
            Padding(
              padding: const EdgeInsets.only(
                bottom: AppSpacing.screenBottom,
                top: AppSpacing.sm,
              ),
              child: CustomButton.gradient(
                text:
                    'Book ${_airports[_selectedAirportIndex].code} Transfer — ${CurrencyUtils.format(_price, currency: 'USD')}',
                onTap: () {
                  final bookingState = Provider.of<BookingState>(
                    context,
                    listen: false,
                  );
                  bookingState.setBookingType('airport_transfer');
                  bookingState.setAirportCode(_airportCode);
                  bookingState.setAirportDirection(isPickup: _isPickup);
                  bookingState.selectRideOption(
                    _categories[_selectedCategoryIndex].toRideOption(
                      _selectedAirportIndex == 0,
                    ),
                  );
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const WhereToScreen()),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDirectionToggle() {
    return Container(
      height: 50,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Row(
        children: [
          _buildToggleItem(
            label: 'From Airport',
            icon: Icons.flight_land,
            isSelected: _isPickup,
            onTap: () => setState(() => _isPickup = true),
          ),
          _buildToggleItem(
            label: 'To Airport',
            icon: Icons.flight_takeoff,
            isSelected: !_isPickup,
            onTap: () => setState(() => _isPickup = false),
          ),
        ],
      ),
    );
  }

  Widget _buildToggleItem({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? AppColors.bgPri : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: isSelected
                ? Border.all(color: AppColors.inputBorder)
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: isSelected ? Colors.white : Colors.white70,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white70,
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Airport {
  final String code;
  final String name;
  final String fullName;
  final IconData icon;

  const _Airport({
    required this.code,
    required this.name,
    required this.fullName,
    required this.icon,
  });
}

class _AirportCategory {
  final String id;
  final String name;
  final double ordRate;
  final double mdwRate;
  final int capacity;

  const _AirportCategory({
    required this.id,
    required this.name,
    required this.ordRate,
    required this.mdwRate,
    required this.capacity,
  });

  RideOption toRideOption(bool isORD) {
    return RideOption(
      id: id,
      name: name,
      description: 'Airport transfer',
      iconPath: '',
      basePrice: isORD ? ordRate : mdwRate,
      pricePerKm: 0,
      estimatedMinutes: 0,
      capacity: capacity,
    );
  }
}
