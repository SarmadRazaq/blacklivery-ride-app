import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/riverpod_providers.dart';

class PreferencesScreen extends ConsumerWidget {
  const PreferencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefs = ref.watch(driverPreferencesRiverpodProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back, color: AppColors.white),
        ),
        title: const Text(
          'Preferences',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ride Types
            _buildSectionTitle('Ride Types'),
            const SizedBox(height: 12),
            _buildToggleItem(
              icon: Icons.directions_car_rounded,
              title: 'Accept Rides',
              subtitle: 'Receive passenger ride requests',
              value: prefs.acceptRides,
              onChanged: (v) => prefs.setAcceptRides(v),
            ),
            _buildToggleItem(
              icon: Icons.delivery_dining_rounded,
              title: 'Accept Deliveries',
              subtitle: 'Receive package delivery requests',
              value: prefs.acceptDeliveries,
              onChanged: (v) => prefs.setAcceptDeliveries(v),
            ),
            _buildToggleItem(
              icon: Icons.schedule_rounded,
              title: 'Accept Scheduled Rides',
              subtitle: 'Receive advance booking requests',
              value: prefs.acceptScheduled,
              onChanged: (v) => prefs.setAcceptScheduled(v),
            ),

            const SizedBox(height: 28),
            // Trip Preferences
            _buildSectionTitle('Trip Preferences'),
            const SizedBox(height: 12),
            _buildToggleItem(
              icon: Icons.straighten_rounded,
              title: 'Long Trips',
              subtitle: 'Trips longer than 30 minutes',
              value: prefs.longTrips,
              onChanged: (v) => prefs.setLongTrips(v),
            ),
            _buildToggleItem(
              icon: Icons.short_text_rounded,
              title: 'Short Trips',
              subtitle: 'Trips under 15 minutes',
              value: prefs.shortTrips,
              onChanged: (v) => prefs.setShortTrips(v),
            ),
            _buildToggleItem(
              icon: Icons.flight_rounded,
              title: 'Airport Rides',
              subtitle: 'Trips to/from airports',
              value: prefs.airportRides,
              onChanged: (v) => prefs.setAirportRides(v),
            ),

            const SizedBox(height: 28),
            // Communication
            _buildSectionTitle('Communication'),
            const SizedBox(height: 12),
            _buildToggleItem(
              icon: Icons.waving_hand_rounded,
              title: 'Auto Greeting',
              subtitle: 'Send automatic greeting to riders',
              value: prefs.autoGreeting,
              onChanged: (v) => prefs.setAutoGreeting(v),
            ),
            _buildToggleItem(
              icon: Icons.volume_off_rounded,
              title: 'Quiet Mode',
              subtitle: 'Let riders know you prefer minimal chat',
              value: prefs.quietMode,
              onChanged: (v) => prefs.setQuietMode(v),
            ),

            const SizedBox(height: 28),
            // Accessibility
            _buildSectionTitle('Accessibility'),
            const SizedBox(height: 12),
            _buildToggleItem(
              icon: Icons.accessible_rounded,
              title: 'Wheelchair Accessible',
              subtitle: 'Your vehicle supports wheelchair access',
              value: prefs.wheelchairAccessible,
              onChanged: (v) => prefs.setWheelchairAccessible(v),
            ),
            _buildToggleItem(
              icon: Icons.pets_rounded,
              title: 'Pet Friendly',
              subtitle: 'You allow pets in your vehicle',
              value: prefs.petFriendly,
              onChanged: (v) => prefs.setPetFriendly(v),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        color: AppColors.white,
        fontSize: 16,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildToggleItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              color: value
                  ? AppColors.primary.withValues(alpha: 0.15)
                  : Colors.grey.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              color: value ? AppColors.primary : AppColors.grey,
              size: 20,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.primary,
            activeTrackColor: AppColors.primary.withValues(alpha: 0.3),
            inactiveThumbColor: Colors.grey,
            inactiveTrackColor: Colors.grey.withValues(alpha: 0.2),
          ),
        ],
      ),
    );
  }
}
