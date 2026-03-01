import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/currency_utils.dart';
import '../data/models/delivery_model.dart';

/// Bottom sheet shown when a delivery request arrives via socket.
/// Similar to RideRequestSheet but with package details and recipient info.
class DeliveryRequestSheet extends StatefulWidget {
  final Map<String, dynamic> deliveryData;
  final VoidCallback? onAccept;
  final VoidCallback? onDecline;

  const DeliveryRequestSheet({
    super.key,
    required this.deliveryData,
    this.onAccept,
    this.onDecline,
  });

  @override
  State<DeliveryRequestSheet> createState() => _DeliveryRequestSheetState();
}

class _DeliveryRequestSheetState extends State<DeliveryRequestSheet>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _progressAnimation;
  late DeliveryRequest _delivery;

  @override
  void initState() {
    super.initState();

    _delivery = DeliveryRequest.fromJson(widget.deliveryData);

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20), // 20s for deliveries (more info to read)
    );
    _progressAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.linear),
    );
    _animationController.forward();
    _animationController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _declineDelivery();
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _acceptDelivery() {
    _animationController.stop();
    if (widget.onAccept != null) {
      widget.onAccept!();
    }
  }

  void _declineDelivery() {
    _animationController.stop();
    widget.onDecline?.call();
  }

  @override
  Widget build(BuildContext context) {
    final currency = _delivery.currency;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Timer progress bar
            AnimatedBuilder(
              animation: _progressAnimation,
              builder: (context, _) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: LinearProgressIndicator(
                  value: _progressAnimation.value,
                  backgroundColor: AppColors.inputBackground,
                  valueColor: const AlwaysStoppedAnimation<Color>(Colors.orange),
                  minHeight: 4,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.local_shipping, color: Colors.orange, size: 24),
                const SizedBox(width: 8),
                const Text(
                  'New Delivery Request',
                  style: TextStyle(
                    color: AppColors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Service type badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _delivery.deliveryDetails.serviceType.label,
                style: const TextStyle(
                  color: Colors.orange,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Package info card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.inputBackground,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    // Package type row
                    Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.orange.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.inventory_2,
                            color: Colors.orange,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _delivery.deliveryDetails.packageType.label,
                                style: const TextStyle(
                                  color: AppColors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (_delivery.deliveryDetails.weightKg != null)
                                Text(
                                  '${_delivery.deliveryDetails.weightKg!.toStringAsFixed(1)} kg',
                                  style: TextStyle(
                                    color: Colors.grey[400],
                                    fontSize: 13,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        // Fare
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              CurrencyUtils.format(_delivery.estimatedFare, currency: currency),
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '${_delivery.distanceKm.toStringAsFixed(1)} km',
                              style: TextStyle(
                                color: Colors.grey[400],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),

                    if (_delivery.deliveryDetails.description != null) ...[
                      const SizedBox(height: 8),
                      const Divider(color: AppColors.darkGrey),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.notes, color: Colors.grey[500], size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _delivery.deliveryDetails.description!,
                              style: TextStyle(color: Colors.grey[400], fontSize: 13),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],

                    // Return trip indicator
                    if (_delivery.deliveryDetails.requiresReturn) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.replay, color: Colors.orange, size: 16),
                          const SizedBox(width: 6),
                          Text(
                            'Return trip included',
                            style: TextStyle(color: Colors.orange[300], fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Route info
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.inputBackground,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    // Pickup
                    Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: const BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'PICKUP',
                                style: TextStyle(
                                  color: Colors.grey[500],
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 1,
                                ),
                              ),
                              Text(
                                _delivery.pickupLocation.address,
                                style: const TextStyle(
                                  color: AppColors.white,
                                  fontSize: 14,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(left: 4),
                      child: Container(width: 2, height: 20, color: AppColors.grey),
                    ),
                    // Dropoff
                    Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: Colors.red[400],
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'DROPOFF',
                                style: TextStyle(
                                  color: Colors.grey[500],
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 1,
                                ),
                              ),
                              Text(
                                _delivery.dropoffLocation.address,
                                style: const TextStyle(
                                  color: AppColors.white,
                                  fontSize: 14,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Recipient info
            if (_delivery.deliveryDetails.dropoffContact != null) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.person_outline, color: AppColors.grey, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Recipient: ${_delivery.deliveryDetails.dropoffContact!.name}',
                              style: const TextStyle(color: AppColors.white, fontSize: 13),
                            ),
                            Text(
                              _delivery.deliveryDetails.dropoffContact!.phone,
                              style: TextStyle(color: Colors.grey[400], fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Action buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  // Decline
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _declineDelivery,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.grey,
                        side: const BorderSide(color: AppColors.darkGrey),
                        minimumSize: const Size(0, 52),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Decline', style: TextStyle(fontSize: 16)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Accept
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: _acceptDelivery,
                      icon: const Icon(Icons.local_shipping, size: 20),
                      label: const Text('Accept Delivery', style: TextStyle(fontSize: 16)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(0, 52),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
