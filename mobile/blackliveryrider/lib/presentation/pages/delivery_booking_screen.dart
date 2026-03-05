import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/data/booking_state.dart';
import '../../core/services/delivery_service.dart';
import '../widgets/custom_button.dart';

/// Delivery booking screen — package type, pickup/dropoff, recipient details,
/// real-time tracking of delivery.
class DeliveryBookingScreen extends StatefulWidget {
  const DeliveryBookingScreen({super.key});

  @override
  State<DeliveryBookingScreen> createState() => _DeliveryBookingScreenState();
}

class _DeliveryBookingScreenState extends State<DeliveryBookingScreen> {
  final DeliveryService _deliveryService = DeliveryService();

  int _currentStep = 0; // 0 = package, 1 = recipient, 2 = confirm
  int _selectedPackageIndex = 0;
  bool _isLoading = false;
  Map<String, dynamic>? _quote;

  final _recipientNameController = TextEditingController();
  final _recipientPhoneController = TextEditingController();
  final _packageDescController = TextEditingController();

  static const List<_PackageType> _packageTypes = [
    _PackageType(
      id: 'document',
      name: 'Document',
      description: 'Envelopes, letters, small documents',
      icon: Icons.description,
      maxWeight: 1,
    ),
    _PackageType(
      id: 'small',
      name: 'Small Package',
      description: 'Up to 5kg — electronics, clothing, etc.',
      icon: Icons.inventory_2,
      maxWeight: 5,
    ),
    _PackageType(
      id: 'medium',
      name: 'Medium Package',
      description: 'Up to 15kg — multiple items, equipment',
      icon: Icons.all_inbox,
      maxWeight: 15,
    ),
    _PackageType(
      id: 'large',
      name: 'Large Package',
      description: 'Up to 30kg — furniture parts, bulk items',
      icon: Icons.local_shipping,
      maxWeight: 30,
    ),
  ];

  @override
  void dispose() {
    _recipientNameController.dispose();
    _recipientPhoneController.dispose();
    _packageDescController.dispose();
    super.dispose();
  }

  /// Map package type to the appropriate vehicle category for pricing.
  String _vehicleCategoryForPackage(String packageId) {
    switch (packageId) {
      case 'document':
      case 'small':
        return 'motorbike';
      case 'medium':
        return 'sedan';
      case 'large':
        return 'suv';
      default:
        return 'motorbike';
    }
  }

  Future<void> _getQuote() async {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final pickup = bookingState.pickupLocation;
    final dropoff = bookingState.dropoffLocation;
    if (pickup == null || dropoff == null) return;

    setState(() => _isLoading = true);

    final pkg = _packageTypes[_selectedPackageIndex];
    final quote = await _deliveryService.getDeliveryQuote(
      pickupLat: pickup.latitude,
      pickupLng: pickup.longitude,
      dropoffLat: dropoff.latitude,
      dropoffLng: dropoff.longitude,
      pickupAddress: pickup.address,
      dropoffAddress: dropoff.address,
      vehicleCategory: _vehicleCategoryForPackage(pkg.id),
    );

    setState(() {
      _quote = quote;
      _isLoading = false;
    });
  }

  Future<void> _createDelivery() async {
    final bookingState = Provider.of<BookingState>(context, listen: false);
    final pickup = bookingState.pickupLocation;
    final dropoff = bookingState.dropoffLocation;
    if (pickup == null || dropoff == null) return;

    setState(() => _isLoading = true);

    try {
      final pkg = _packageTypes[_selectedPackageIndex];
      final result = await _deliveryService.createDelivery(
        pickupLat: pickup.latitude,
        pickupLng: pickup.longitude,
        dropoffLat: dropoff.latitude,
        dropoffLng: dropoff.longitude,
        recipientName: _recipientNameController.text.trim(),
        recipientPhone: _recipientPhoneController.text.trim(),
        pickupAddress: pickup.address,
        dropoffAddress: dropoff.address,
        packageDescription: _packageDescController.text.trim(),
        weight: pkg.maxWeight.toDouble(),
        vehicleCategory: _vehicleCategoryForPackage(pkg.id),
      );

      if (result != null && mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => DeliveryTrackingScreen(
              deliveryId: result['id'] ?? '',
              deliveryData: result,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: Colors.white, size: 28),
          onPressed: () {
            if (_currentStep > 0) {
              setState(() => _currentStep--);
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: Text(
          _currentStep == 0
              ? 'Package Type'
              : _currentStep == 1
                  ? 'Recipient Details'
                  : 'Confirm Delivery',
          style: AppTextStyles.heading3,
        ),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
        ),
        child: Column(
          children: [
            // Progress indicator
            _buildProgressBar(),
            const SizedBox(height: AppSpacing.lg),

            Expanded(
              child: _currentStep == 0
                  ? _buildPackageStep()
                  : _currentStep == 1
                      ? _buildRecipientStep()
                      : _buildConfirmStep(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressBar() {
    return Row(
      children: List.generate(3, (i) {
        final isActive = i <= _currentStep;
        return Expanded(
          child: Container(
            height: 3,
            margin: EdgeInsets.only(right: i < 2 ? 4 : 0),
            decoration: BoxDecoration(
              color: isActive ? AppColors.yellow90 : AppColors.inputBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildPackageStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'What are you sending?',
          style: AppTextStyles.heading3.copyWith(fontSize: 16),
        ),
        const SizedBox(height: AppSpacing.md),
        Expanded(
          child: ListView.builder(
            itemCount: _packageTypes.length,
            itemBuilder: (context, index) {
              final pkg = _packageTypes[index];
              final isSelected = _selectedPackageIndex == index;
              return GestureDetector(
                onTap: () => setState(() => _selectedPackageIndex = index),
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
                      color: isSelected
                          ? AppColors.yellow90
                          : AppColors.inputBorder,
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
                        child: Icon(
                          pkg.icon,
                          color: isSelected
                              ? AppColors.yellow90
                              : AppColors.txtInactive,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              pkg.name,
                              style: AppTextStyles.bodySmall.copyWith(
                                color: isSelected
                                    ? AppColors.yellow90
                                    : Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              pkg.description,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.txtInactive,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '≤${pkg.maxWeight}kg',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.txtInactive,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Package description
        TextField(
          controller: _packageDescController,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            filled: true,
            fillColor: AppColors.inputBg,
            hintText: 'Package description (optional)',
            hintStyle: AppTextStyles.caption.copyWith(
              color: AppColors.txtInactive,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
              borderSide: BorderSide.none,
            ),
          ),
        ),

        const SizedBox(height: AppSpacing.md),

        CustomButton.gradient(
          text: 'Continue',
          onTap: () => setState(() => _currentStep = 1),
        ),
        const SizedBox(height: AppSpacing.screenBottom),
      ],
    );
  }

  Widget _buildRecipientStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Who is receiving this?',
          style: AppTextStyles.heading3.copyWith(fontSize: 16),
        ),
        const SizedBox(height: AppSpacing.lg),

        _buildInputField(
          controller: _recipientNameController,
          label: 'Recipient Name',
          icon: Icons.person_outline,
        ),
        const SizedBox(height: AppSpacing.md),

        _buildInputField(
          controller: _recipientPhoneController,
          label: 'Recipient Phone',
          icon: Icons.phone_outlined,
          keyboardType: TextInputType.phone,
        ),

        const Spacer(),

        CustomButton.gradient(
          text: 'Review Delivery',
          isDisabled: _recipientNameController.text.trim().isEmpty ||
              _recipientPhoneController.text.trim().isEmpty,
          onTap: () async {
            if (_recipientNameController.text.trim().isEmpty ||
                _recipientPhoneController.text.trim().isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Please fill in recipient details')),
              );
              return;
            }
            // Validate phone format: at least 10 digits, optional leading +
            final phone = _recipientPhoneController.text.trim();
            final phoneRegex = RegExp(r'^\+?\d{10,15}$');
            if (!phoneRegex.hasMatch(phone.replaceAll(RegExp(r'[\s\-()]'), ''))) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Please enter a valid phone number (10-15 digits)')),
              );
              return;
            }
            await _getQuote();
            if (mounted) setState(() => _currentStep = 2);
          },
        ),
        const SizedBox(height: AppSpacing.screenBottom),
      ],
    );
  }

  Widget _buildConfirmStep() {
    final bookingState = Provider.of<BookingState>(context);
    final pickup = bookingState.pickupLocation;
    final dropoff = bookingState.dropoffLocation;
    final pkg = _packageTypes[_selectedPackageIndex];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Delivery Summary',
          style: AppTextStyles.heading3.copyWith(fontSize: 16),
        ),
        const SizedBox(height: AppSpacing.md),

        // Summary card
        Container(
          padding: const EdgeInsets.all(AppSpacing.cardPadding),
          decoration: BoxDecoration(
            color: AppColors.inputBg,
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
            border: Border.all(color: AppColors.inputBorder),
          ),
          child: Column(
            children: [
              _buildSummaryRow(Icons.inventory_2, 'Package', pkg.name),
              _buildDivider(),
              _buildSummaryRow(
                Icons.location_on,
                'Pickup',
                pickup?.address ?? 'Not set',
              ),
              _buildDivider(),
              _buildSummaryRow(
                Icons.flag,
                'Dropoff',
                dropoff?.address ?? 'Not set',
              ),
              _buildDivider(),
              _buildSummaryRow(
                Icons.person,
                'Recipient',
                _recipientNameController.text,
              ),
              _buildDivider(),
              _buildSummaryRow(
                Icons.phone,
                'Phone',
                _recipientPhoneController.text,
              ),
              if (_packageDescController.text.isNotEmpty) ...[
                _buildDivider(),
                _buildSummaryRow(
                  Icons.note,
                  'Description',
                  _packageDescController.text,
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.md),

        // Price
        if (_isLoading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation(AppColors.yellow90),
              ),
            ),
          )
        else if (_quote != null)
          Container(
            padding: const EdgeInsets.all(AppSpacing.cardPadding),
            decoration: BoxDecoration(
              color: AppColors.yellow90.withOpacity(0.1),
              borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
              border: Border.all(
                color: AppColors.yellow90.withOpacity(0.3),
              ),
            ),
            child: Column(
              children: [
                // Distance and duration row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildQuoteDetail(
                      Icons.straighten,
                      '${(_quote!['distanceKm'] as num?)?.toStringAsFixed(1) ?? '—'} km',
                    ),
                    _buildQuoteDetail(
                      Icons.schedule,
                      '${(_quote!['durationMinutes'] as num?)?.round() ?? '—'} min',
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(color: AppColors.divider, height: 1),
                const SizedBox(height: 12),
                // Price row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Estimated Price',
                      style: AppTextStyles.body.copyWith(
                        color: AppColors.yellow90,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      CurrencyUtils.format(
                        (_quote!['estimatedFare'] as num?)?.toDouble() ?? 0.0,
                      ),
                      style: AppTextStyles.heading3.copyWith(
                        color: AppColors.yellow90,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

        const Spacer(),

        CustomButton.gradient(
          text: _isLoading ? 'Loading...' : 'Confirm & Send',
          isDisabled: _isLoading,
          onTap: _isLoading ? null : _createDelivery,
        ),
        const SizedBox(height: AppSpacing.screenBottom),
      ],
    );
  }

  Widget _buildQuoteDetail(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: AppColors.yellow90, size: 16),
        const SizedBox(width: 6),
        Text(
          text,
          style: AppTextStyles.bodySmall.copyWith(
            color: AppColors.yellow90,
            fontSize: 13,
          ),
        ),
      ],
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white),
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(
        filled: true,
        fillColor: AppColors.inputBg,
        hintText: label,
        hintStyle: AppTextStyles.caption.copyWith(
          color: AppColors.txtInactive,
        ),
        prefixIcon: Icon(icon, color: AppColors.txtInactive, size: 20),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
          borderSide: const BorderSide(color: AppColors.inputFocusBorder),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: AppColors.txtInactive, size: 18),
          const SizedBox(width: 12),
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.txtInactive,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTextStyles.bodySmall.copyWith(
                color: Colors.white,
                fontSize: 13,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return const Divider(color: AppColors.divider, height: 1);
  }
}

class _PackageType {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final int maxWeight;

  const _PackageType({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.maxWeight,
  });
}

/// Delivery tracking screen — shows live status after delivery is created.
class DeliveryTrackingScreen extends StatefulWidget {
  final String deliveryId;
  final Map<String, dynamic> deliveryData;

  const DeliveryTrackingScreen({
    super.key,
    required this.deliveryId,
    required this.deliveryData,
  });

  @override
  State<DeliveryTrackingScreen> createState() => _DeliveryTrackingScreenState();
}

class _DeliveryTrackingScreenState extends State<DeliveryTrackingScreen> {
  final DeliveryService _deliveryService = DeliveryService();
  Map<String, dynamic>? _delivery;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _delivery = widget.deliveryData;
    _isLoading = false;
    _pollStatus();
  }

  void _pollStatus() {
    Future.delayed(const Duration(seconds: 10), () async {
      if (!mounted) return;
      final details = await _deliveryService.getDeliveryDetails(
        widget.deliveryId,
      );
      if (details != null && mounted) {
        setState(() => _delivery = details);
        // Stop polling once delivery reaches a terminal state
        final status = details['status'] ?? details['deliveryStatus'];
        if (status == 'delivered' || status == 'cancelled' || status == 'failed') {
          return; // Don't continue polling
        }
      }
      if (mounted) _pollStatus(); // Continue polling only for active states
    });
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'pending':
        return 'Finding a driver...';
      case 'accepted':
        return 'Driver assigned';
      case 'picked_up':
        return 'Package picked up';
      case 'in_transit':
        return 'In transit';
      case 'delivered':
        return 'Delivered!';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Processing...';
    }
  }

  IconData _statusIcon(String? status) {
    switch (status) {
      case 'pending':
        return Icons.hourglass_top;
      case 'accepted':
        return Icons.person_pin;
      case 'picked_up':
        return Icons.inventory;
      case 'in_transit':
        return Icons.local_shipping;
      case 'delivered':
        return Icons.check_circle;
      case 'cancelled':
        return Icons.cancel;
      default:
        return Icons.pending;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _delivery?['status'] as String?;

    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: Colors.white, size: 28),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Delivery Status', style: AppTextStyles.heading3),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation(AppColors.yellow90),
              ),
            )
          : Padding(
              padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
              child: Column(
                children: [
                  const SizedBox(height: AppSpacing.xl),

                  // Status icon
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: AppColors.yellow90.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _statusIcon(status),
                      color: AppColors.yellow90,
                      size: 40,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  Text(
                    _statusLabel(status),
                    style: AppTextStyles.heading3,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Delivery ID: ${widget.deliveryId.substring(0, 8).toUpperCase()}',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                    ),
                  ),

                  const SizedBox(height: AppSpacing.xl),

                  // Timeline
                  _buildTimeline(status),

                  const Spacer(),

                  if (status == 'delivered')
                    CustomButton.gradient(
                      text: 'Done',
                      onTap: () {
                        Navigator.popUntil(context, (route) => route.isFirst);
                      },
                    ),

                  const SizedBox(height: AppSpacing.screenBottom),
                ],
              ),
            ),
    );
  }

  Widget _buildTimeline(String? currentStatus) {
    final steps = ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered'];
    final labels = ['Placed', 'Driver Assigned', 'Picked Up', 'In Transit', 'Delivered'];
    final activeIndex = steps.indexOf(currentStatus ?? 'pending');

    return Column(
      children: List.generate(steps.length, (i) {
        final isCompleted = i <= activeIndex;
        final isCurrent = i == activeIndex;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? AppColors.yellow90
                        : AppColors.inputBg,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isCompleted
                          ? AppColors.yellow90
                          : AppColors.inputBorder,
                      width: 2,
                    ),
                  ),
                  child: isCompleted
                      ? const Icon(Icons.check, size: 14, color: Colors.black)
                      : null,
                ),
                if (i < steps.length - 1)
                  Container(
                    width: 2,
                    height: 30,
                    color: isCompleted
                        ? AppColors.yellow90
                        : AppColors.inputBorder,
                  ),
              ],
            ),
            const SizedBox(width: 14),
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                labels[i],
                style: AppTextStyles.bodySmall.copyWith(
                  color: isCurrent
                      ? AppColors.yellow90
                      : isCompleted
                          ? Colors.white
                          : AppColors.txtInactive,
                  fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
                  fontSize: 14,
                ),
              ),
            ),
          ],
        );
      }),
    );
  }
}
