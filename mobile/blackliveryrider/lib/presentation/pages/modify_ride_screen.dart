import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/models/location_model.dart';
import '../../core/models/ride_history_model.dart';
import '../../core/services/ride_service.dart';
import '../widgets/vehicle_icon.dart';
import '../widgets/ride_map_view.dart';
import 'map_picker_screen.dart';

class ModifyRideScreen extends StatefulWidget {
  final RideHistoryItem ride;

  const ModifyRideScreen({super.key, required this.ride});

  @override
  State<ModifyRideScreen> createState() => _ModifyRideScreenState();
}

class _ModifyRideScreenState extends State<ModifyRideScreen> {
  late String _pickupTime;
  bool _isForMe = true;
  late String _destination;
  String? _additionalStop;
  late String _pickup;
  bool _isCancelling = false;

  @override
  void initState() {
    super.initState();
    _destination = widget.ride.dropoffAddress;
    _pickup = widget.ride.pickupAddress;
    _pickupTime =
        '${widget.ride.date.month}/${widget.ride.date.day} at ${widget.ride.time}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
        backgroundColor: AppColors.bgPri,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.inputBg,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.inputBorder),
            ),
            child: const Icon(Icons.chevron_left, color: Colors.white),
          ),
        ),
        title: Text(
          'Modify ride',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Map preview
            SizedBox(
              height: 160,
              width: double.infinity,
              child: RideMapView(
                pickup:
                    widget.ride.pickupLat != null &&
                        widget.ride.pickupLng != null
                    ? LatLng(widget.ride.pickupLat!, widget.ride.pickupLng!)
                    : null,
                dropoff:
                    widget.ride.dropoffLat != null &&
                        widget.ride.dropoffLng != null
                    ? LatLng(widget.ride.dropoffLat!, widget.ride.dropoffLng!)
                    : null,
                showRoute: true,
              ),
            ),

            const SizedBox(height: 20),

            // Pickup time and For whom section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: _showTimePickerSheet,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.inputBg,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.inputBorder),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.access_time,
                              color: AppColors.yellow90,
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _pickupTime,
                              style: AppTextStyles.body.copyWith(
                                color: Colors.white,
                                fontSize: 12,
                              ),
                            ),
                            const Spacer(),
                            Icon(
                              Icons.keyboard_arrow_down,
                              color: AppColors.txtInactive,
                              size: 18,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: () {
                      setState(() => _isForMe = !_isForMe);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.inputBg,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.inputBorder),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.person_outline,
                            color: AppColors.yellow90,
                            size: 16,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _isForMe ? 'For Me' : 'For Others',
                            style: AppTextStyles.body.copyWith(
                              color: Colors.white,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.keyboard_arrow_down,
                            color: AppColors.txtInactive,
                            size: 18,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Route section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Column(
                  children: [
                    // Destination
                    Row(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.red, width: 2),
                          ),
                          child: const Icon(
                            Icons.location_on,
                            color: Colors.red,
                            size: 14,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _destination,
                                style: AppTextStyles.body.copyWith(
                                  color: Colors.white,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: () async {
                            final result = await Navigator.push<Location>(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const MapPickerScreen(
                                  title: 'Edit Destination',
                                ),
                              ),
                            );
                            if (result != null && mounted) {
                              setState(() => _destination = result.address);
                            }
                          },
                          child: Icon(
                            Icons.edit,
                            color: AppColors.txtInactive,
                            size: 18,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Add stop
                    GestureDetector(
                      onTap: _showAddStopSheet,
                      child: Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: AppColors.yellow90.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.add,
                              color: AppColors.yellow90,
                              size: 16,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            _additionalStop ?? 'Add stop',
                            style: AppTextStyles.body.copyWith(
                              color: _additionalStop != null
                                  ? Colors.white
                                  : AppColors.yellow90,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Pickup
                    Row(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.yellow90,
                              width: 2,
                            ),
                          ),
                          child: const Icon(
                            Icons.radio_button_checked,
                            color: AppColors.yellow90,
                            size: 14,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _pickup,
                            style: AppTextStyles.body.copyWith(
                              color: Colors.white,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () async {
                            final result = await Navigator.push<Location>(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const MapPickerScreen(
                                  title: 'Edit Pickup',
                                ),
                              ),
                            );
                            if (result != null && mounted) {
                              setState(() => _pickup = result.address);
                            }
                          },
                          child: Icon(
                            Icons.edit,
                            color: AppColors.txtInactive,
                            size: 18,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Driver info card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Row(
                  children: [
                    // Driver photo
                    Container(
                      width: 45,
                      height: 45,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.yellow90, width: 2),
                        color: AppColors.bgPri,
                      ),
                      child: const Icon(
                        Icons.person,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                widget.ride.driver?.name ??
                                    'Assigning Driver...',
                                style: AppTextStyles.body.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(width: 8),
                              if (widget.ride.driver != null)
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.star,
                                      color: AppColors.yellow90,
                                      size: 12,
                                    ),
                                    Text(
                                      ' ${widget.ride.driver!.rating}',
                                      style: AppTextStyles.caption.copyWith(
                                        color: Colors.white,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              _buildDriverInfoChip(widget.ride.rideType),
                              const SizedBox(width: 8),
                              Text(
                                widget.ride.driver?.name ?? 'Unknown',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.txtInactive,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              Text(
                                'Plate number: ',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.txtInactive,
                                  fontSize: 10,
                                ),
                              ),
                              Text(
                                widget.ride.driver?.plateNumber ?? 'N/A',
                                style: AppTextStyles.caption.copyWith(
                                  color: Colors.white,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              Text(
                                'Color: ',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.txtInactive,
                                  fontSize: 10,
                                ),
                              ),
                              Text(
                                widget.ride.driver?.vehicleColor ?? 'N/A',
                                style: AppTextStyles.caption.copyWith(
                                  color: Colors.white,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    // Car image and schedule
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Container(
                          width: 70,
                          height: 45,
                          decoration: BoxDecoration(
                            color: AppColors.bgPri,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: VehicleIcon.fromId(
                            widget.ride.rideType,
                            color: AppColors.yellow90,
                            size: 36,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          DateFormat('MMM d').format(widget.ride.date),
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 10,
                          ),
                        ),
                        Text(
                          widget.ride.time,
                          style: AppTextStyles.body.copyWith(
                            color: Colors.white,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Price and Payment info
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.attach_money,
                          color: AppColors.yellow90,
                          size: 18,
                        ),
                        Text(
                          CurrencyUtils.format(widget.ride.price),
                          style: AppTextStyles.body.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          widget.ride.paymentMethod ?? 'Card',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Container(
                          width: 20,
                          height: 14,
                          decoration: BoxDecoration(
                            color: Colors.blue,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Share ride info button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: GestureDetector(
                onTap: () {
                  Share.share(
                    'Track my BlackLivery ride!\n'
                    'From: $_pickup\n'
                    'To: $_destination\n'
                    'Time: $_pickupTime',
                  );
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: AppColors.yellow90,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      'Share ride info',
                      style: AppTextStyles.body.copyWith(
                        color: Colors.black,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Cancel ride button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: GestureDetector(
                onTap: _isCancelling ? null : _showCancelConfirmation,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.withOpacity(0.5)),
                  ),
                  child: Center(
                    child: _isCancelling
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.red,
                              strokeWidth: 2,
                            ),
                          )
                        : Text(
                            'Cancel ride',
                            style: AppTextStyles.body.copyWith(
                              color: Colors.red,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildDriverInfoChip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.bgPri,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: AppTextStyles.caption.copyWith(
          color: AppColors.txtInactive,
          fontSize: 9,
        ),
      ),
    );
  }

  void _showTimePickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSec,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.inputBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text('Select pickup time', style: AppTextStyles.heading3),
            const SizedBox(height: 20),
            _buildTimeOption('Today at 4:00pm'),
            _buildTimeOption('Today at 5:00pm'),
            _buildTimeOption('Tomorrow at 9:00am'),
            _buildTimeOption('Tomorrow at 2:00pm'),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeOption(String time) {
    return GestureDetector(
      onTap: () {
        setState(() => _pickupTime = time);
        Navigator.pop(context);
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: const BoxDecoration(
          border: Border(
            bottom: BorderSide(color: AppColors.inputBorder, width: 0.5),
          ),
        ),
        child: Text(
          time,
          style: AppTextStyles.body.copyWith(
            color: _pickupTime == time ? AppColors.yellow90 : Colors.white,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  void _showAddStopSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSec,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.inputBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text('Add a stop', style: AppTextStyles.heading3),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: TextField(
                  style: AppTextStyles.body.copyWith(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Enter stop address',
                    hintStyle: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive,
                    ),
                    border: InputBorder.none,
                    prefixIcon: const Icon(
                      Icons.search,
                      color: AppColors.txtInactive,
                    ),
                  ),
                  onSubmitted: (value) {
                    if (value.isNotEmpty) {
                      setState(() => _additionalStop = value);
                      Navigator.pop(context);
                    }
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  void _showCancelConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.bgSec,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Cancel Ride?', style: AppTextStyles.heading3),
        content: Text(
          'Are you sure you want to cancel this scheduled ride? Cancellation fees may apply.',
          style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('No', style: AppTextStyles.body),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _cancelRide();
            },
            child: Text(
              'Yes, Cancel',
              style: AppTextStyles.body.copyWith(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _cancelRide() async {
    setState(() => _isCancelling = true);
    try {
      await RideService().cancelRide(widget.ride.id, reason: 'Cancelled by rider');
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ride cancelled successfully')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isCancelling = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to cancel: ${e.toString().replaceAll('Exception: ', '')}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
