import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/widgets/slide_to_action.dart';

enum RequestType { instant, scheduled }

class RideRequestOverlay extends StatefulWidget {
  final RequestType requestType;
  final Map<String, dynamic> rideData;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  const RideRequestOverlay({
    super.key,
    required this.requestType,
    required this.rideData,
    required this.onAccept,
    required this.onDecline,
  });

  @override
  State<RideRequestOverlay> createState() => _RideRequestOverlayState();
}

class _RideRequestOverlayState extends State<RideRequestOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  String _readableSchedule() {
    final date = (widget.rideData['scheduledDate'] ?? '').toString().trim();
    final time =
        (widget.rideData['scheduledTime'] ?? widget.rideData['scheduledAt'] ?? '')
            .toString()
            .trim();

    if (date.isEmpty && time.isEmpty) return 'Now';
    if (date.isEmpty) return time;
    if (time.isEmpty) return date;
    return '$date • $time';
  }

  @override
  void initState() {
    super.initState();
    _controller =
        AnimationController(vsync: this, duration: const Duration(seconds: 15))
          ..forward().whenComplete(() {
            if (mounted) {
              widget.onDecline();
            }
          });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 12, 12),
            child: Row(
              children: [
                RepaintBoundary(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 40,
                        height: 40,
                        child: AnimatedBuilder(
                          animation: _controller,
                          builder: (context, child) {
                            return CircularProgressIndicator(
                              value: 1.0 - _controller.value,
                              color: AppColors.primary,
                              backgroundColor: Colors.white.withValues(alpha: 0.15),
                              strokeWidth: 3,
                            );
                          },
                        ),
                      ),
                      const Icon(
                        Icons.notifications_active,
                        color: AppColors.primary,
                        size: 18,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.requestType == RequestType.instant
                            ? 'Instant Request'
                            : 'Scheduled Request',
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        widget.requestType == RequestType.instant
                            ? '${widget.rideData['distance'] ?? ''} away'
                            : _readableSchedule(),
                        style: TextStyle(
                          color: Colors.grey[400],
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: widget.onDecline,
                  icon: Icon(Icons.close, color: Colors.grey[400]),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                  ),
                  child: Column(
                    children: [
                      _buildLocationRow(
                        widget.rideData['pickup_address'] ??
                            widget.rideData['pickup'] ??
                            'Pickup location',
                        isPickup: true,
                      ),
                      Padding(
                        padding: const EdgeInsets.only(left: 6, top: 6, bottom: 6),
                        child: Container(
                          width: 1.5,
                          height: 14,
                          color: Colors.white.withValues(alpha: 0.2),
                        ),
                      ),
                      _buildLocationRow(
                        widget.rideData['dropoff_address'] ??
                            widget.rideData['dropoff'] ??
                            'Dropoff location',
                        isPickup: false,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                // Rider info row
                if ((widget.rideData['riderName'] ?? widget.rideData['name']) != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: Colors.white.withValues(alpha: 0.12),
                          backgroundImage: widget.rideData['riderAvatar'] != null
                              ? NetworkImage(widget.rideData['riderAvatar'])
                              : null,
                          child: widget.rideData['riderAvatar'] == null
                              ? const Icon(Icons.person, color: Colors.grey, size: 18)
                              : null,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          widget.rideData['riderName'] ?? widget.rideData['name'] ?? '',
                          style: const TextStyle(
                            color: AppColors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        widget.rideData['paymentMethod'] ?? 'Cash',
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if ((widget.rideData['duration'] ?? '').toString().isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.timer_outlined, color: AppColors.white, size: 13),
                            const SizedBox(width: 4),
                            Text(
                              widget.rideData['duration'].toString(),
                              style: const TextStyle(
                                color: AppColors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const Spacer(),
                    Text(
                      CurrencyUtils.format(
                        (widget.rideData['price'] as num?)?.toDouble() ?? 0,
                      ),
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Row(
              children: [
                GestureDetector(
                  onTap: widget.onDecline,
                  child: Container(
                    width: 46,
                    height: 46,
                    decoration: const BoxDecoration(
                      color: AppColors.error,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close, color: AppColors.white, size: 20),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SlideToAction(
                    text: 'Slide to Accept',
                    onSlide: () async => widget.onAccept(),
                    outerColor: AppColors.white,
                    innerColor: Colors.black,
                    textColor: Colors.black,
                    sliderButtonIcon: Icons.chevron_right,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationRow(String text, {required bool isPickup}) {
    return Row(
      children: [
        Icon(Icons.circle, size: 10, color: isPickup ? AppColors.primary : Colors.red),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
