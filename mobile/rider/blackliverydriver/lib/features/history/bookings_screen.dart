import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import '../ride/data/models/ride_model.dart';
import 'ride_history_screen.dart'; // Import the new screen

class BookingsScreen extends ConsumerStatefulWidget {
  const BookingsScreen({super.key});

  @override
  ConsumerState<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends ConsumerState<BookingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(rideHistoryRiverpodProvider).loadUpcomingRides();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // Dark background
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Rides',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 24,
          ),
        ),
        centerTitle:
            false, // Left aligned title as per mockup (implied by "Rides" at top left)
        automaticallyImplyLeading: false,
      ),
      body: Column(
        children: [
          // Header Image (Upcoming Rides + Line)
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 16.0,
              vertical: 8.0,
            ),
            child: Image.asset(
              'assets/images/upcoming-riders.png', // Using the found asset
              fit: BoxFit.contain,
              width: double.infinity,
            ),
          ),

          // List of Upcoming Rides
          Expanded(
            child: Consumer(
              builder: (context, ref, child) {
                final provider = ref.watch(rideHistoryRiverpodProvider);
                if (provider.isUpcomingLoading &&
                    provider.upcomingRides.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (provider.upcomingError != null) {
                  return Center(
                    child: Text(
                      provider.upcomingError!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  );
                }

                if (provider.upcomingRides.isEmpty) {
                  return const Center(
                    child: Text(
                      'No upcoming rides',
                      style: TextStyle(color: Colors.grey),
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => provider.loadUpcomingRides(),
                  color: AppColors.primary,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: provider.upcomingRides.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 16),
                    itemBuilder: (context, index) {
                      final ride = provider.upcomingRides[index];
                      return _buildUpcomingCard(ride);
                    },
                  ),
                );
              },
            ),
          ),

          // Bottom Link to History
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const RideHistoryScreen(),
                  ),
                );
              },
              child: const Text(
                'View Ride History',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingCard(Ride ride) {
    // Parse scheduled time
    final dateStr = ride.startedAt ?? ride.acceptedAt ?? ride.createdAt;
    // Assuming ride.scheduledTime exists on the model or we parse it from somewhere.
    // Since Ride model doesn't have it explicitly, we might rely on createdAt or formatted string.
    // For the mockup: "Nov 25, 2024 | 10:30 AM"

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Rider Info
          Row(
            children: [
              Text(
                ride.rider?.name ?? 'Unknown Rider',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.star, color: Color(0xFFC7A062), size: 16),
              const SizedBox(width: 4),
              Text(
                ride.rider?.rating.toString() ?? '5.0',
                style: const TextStyle(
                  color: Color(0xFFC7A062), // Goldish color
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text(
                DateFormat('MMM d, yyyy | h:mm a').format(dateStr),
                style: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Colors.white10),
          const SizedBox(height: 16),

          // Row 2: Locations with Graphic
          Row(
            crossAxisAlignment: CrossAxisAlignment.start, // Align to top
            children: [
              // Visual Asset
              Image.asset(
                'assets/images/car-move.png',
                height: 80, // Adjust height to match text
                fit: BoxFit.contain,
              ),
              const SizedBox(width: 12),
              // Addresses
              Expanded(
                child: SizedBox(
                  height: 80, // Match image height to distribute text
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ride.pickupAddress,
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 13,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        ride.dropoffAddress,
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 13,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Row 3: Fare & Distance
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Fare Amount',
                style: TextStyle(color: Colors.grey[400], fontSize: 12),
              ),
              const SizedBox(width: 4),
              const Text('•', style: TextStyle(color: Colors.grey)),
              const SizedBox(width: 4),
              Text(
                CurrencyUtils.format(ride.fare),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(width: 4),
              const Text('-', style: TextStyle(color: Colors.grey)),
              const SizedBox(width: 4),
              Text(
                ride.payment?.gateway?.toUpperCase() ?? 'CASH',
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Pickup distance',
                style: TextStyle(color: Colors.grey[400], fontSize: 12),
              ),
              const SizedBox(width: 4),
              const Text('•', style: TextStyle(color: Colors.grey)),
              const SizedBox(width: 4),
              const Text(
                '--', // Duration not provided by Ride model currently
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 4),
              const Text('•', style: TextStyle(color: Colors.grey)),
              const SizedBox(width: 4),
              Text(
                '${ride.pricing.distance.toStringAsFixed(1)} km',
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Row 4: Buttons
          Row(
            children: [
              // Call Rider Button
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    // Call logic
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text(
                    'Call Rider',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Decline Schedule Button
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    // Decline logic
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD32F2F), // Red
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text(
                    'Decline Schedule',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
