import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/providers/riverpod_providers.dart';
import '../ride/data/models/ride_model.dart';

class RideHistoryScreen extends ConsumerStatefulWidget {
  const RideHistoryScreen({super.key});

  @override
  ConsumerState<RideHistoryScreen> createState() => _RideHistoryScreenState();
}

class _RideHistoryScreenState extends ConsumerState<RideHistoryScreen> {
  final ScrollController _scrollController = ScrollController();
  String _selectedFilter = 'all';

  static const Map<String, String> _filterLabels = {
    'all': 'All',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'in_progress': 'In Progress',
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(rideHistoryRiverpodProvider).loadRideHistory(refresh: true);
    });
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      final provider = ref.read(rideHistoryRiverpodProvider);
      if (!provider.isLoading && provider.hasMore) {
        provider.loadRideHistory();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = ref.watch(rideHistoryRiverpodProvider);

    return Scaffold(
      backgroundColor: Colors.black, // Dark background
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF1E1E1E),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.arrow_back_ios_new,
              size: 16,
              color: Colors.white,
            ),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Ride History',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Header Image
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 16.0,
              vertical: 8.0,
            ),
            child: Image.asset(
              'assets/images/ride-history.png',
              fit: BoxFit.contain,
              width: double.infinity,
              errorBuilder: (context, error, stackTrace) => const Icon(
                Icons.directions_car,
                size: 64,
                color: Colors.white24,
              ),
            ),
          ),

          // Filter chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _filterLabels.entries.map((entry) {
                  final isSelected = _selectedFilter == entry.key;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(entry.value),
                      selected: isSelected,
                      onSelected: (_) => setState(() => _selectedFilter = entry.key),
                      selectedColor: const Color(0xFFC7A062),
                      backgroundColor: const Color(0xFF1E1E1E),
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.black : Colors.white,
                        fontSize: 12,
                      ),
                      side: BorderSide(
                        color: isSelected ? const Color(0xFFC7A062) : Colors.white24,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          Expanded(
            child: Builder(
              builder: (context) {
                if (provider.isLoading && provider.rides.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (provider.error != null && provider.rides.isEmpty) {
                  return Center(
                    child: Text(
                      provider.error!,
                      style: const TextStyle(color: Colors.white),
                    ),
                  );
                }

                return ListView.separated(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _filteredRides(provider.rides).length + (provider.hasMore ? 1 : 0),
                  separatorBuilder: (context, index) =>
                      const Divider(color: Colors.white10),
                  itemBuilder: (context, index) {
                    final filtered = _filteredRides(provider.rides);
                    if (index == filtered.length) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    return _buildHistoryItem(filtered[index]);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  List<Ride> _filteredRides(List<Ride> rides) {
    if (_selectedFilter == 'all') return rides;
    return rides.where((r) => r.status == _selectedFilter).toList();
  }

  Widget _buildHistoryItem(Ride ride) {
    return GestureDetector(
      onTap: () => _showRideEarningsBreakdown(ride),
      child: Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Status + Check
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                ride.status == 'completed'
                    ? 'Ride Completed'
                    : ride.status == 'cancelled'
                        ? 'Ride Cancelled'
                        : 'Ride ${ride.status[0].toUpperCase()}${ride.status.substring(1)}',
                style: TextStyle(
                  color: ride.status == 'cancelled' ? Colors.red[300] : Colors.white,
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              ),
              Icon(
                ride.status == 'completed'
                    ? Icons.check
                    : ride.status == 'cancelled'
                        ? Icons.close
                        : Icons.hourglass_empty,
                color: ride.status == 'completed'
                    ? const Color(0xFFC7A062)
                    : ride.status == 'cancelled'
                        ? Colors.red[300]
                        : Colors.grey[400],
                size: 18,
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Address(es)
          // Mockup shows multiple lines of address. We show pickup and dropoff.
          Text(
            "${ride.pickupAddress}\n${ride.dropoffAddress}",
            style: TextStyle(
              color: Colors.grey[400],
              fontSize: 13,
              height: 1.4,
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 12),

          // Row 3: Date, Price
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                DateFormat(
                  'MMMM d, HH:mm',
                ).format(ride.createdAt), // e.g. November at 15:20
                style: TextStyle(color: Colors.grey[500], fontSize: 12),
              ),
              Text(
                CurrencyUtils.format(ride.fare), // $500
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    ),
    );
  }

  void _showRideEarningsBreakdown(Ride ride) {
    final currency = ride.pricing.currency;
    final driverEarnings = ride.payment?.driverAmount;

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E1E1E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[600],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Earnings Breakdown',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            _earningsRow('Ride Fare', CurrencyUtils.format(ride.pricing.estimatedFare, currency: currency)),
            if (ride.pricing.finalFare != null && ride.pricing.finalFare != ride.pricing.estimatedFare)
              _earningsRow('Final Fare', CurrencyUtils.format(ride.pricing.finalFare!, currency: currency)),
            _earningsRow('Distance', '${ride.pricing.distance.toStringAsFixed(1)} km'),
            if (ride.pricing.tips > 0)
              _earningsRow('Tips', CurrencyUtils.format(ride.pricing.tips, currency: currency), color: Colors.green[300]),
            if (driverEarnings != null)
              _earningsRow('Your Earnings', CurrencyUtils.format(driverEarnings, currency: currency), bold: true, color: const Color(0xFFC7A062)),
            if (ride.payment?.status != null)
              _earningsRow('Payment Status', ride.payment!.status!.toUpperCase()),
            if (ride.payment?.gateway != null)
              _earningsRow('Payment Gateway', ride.payment!.gateway!),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _earningsRow(String label, String value, {bool bold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[400], fontSize: 14)),
          Text(
            value,
            style: TextStyle(
              color: color ?? Colors.white,
              fontSize: 14,
              fontWeight: bold ? FontWeight.bold : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
