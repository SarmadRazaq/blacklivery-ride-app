import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/rider_notification_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final RiderNotificationService _service = RiderNotificationService();
  List<RiderNotification> _notifications = [];
  bool _isLoading = true;

  static const _typeIcons = <String, IconData>{
    'ride': Icons.directions_car,
    'payment': Icons.payment,
    'promotion': Icons.local_offer,
    'support': Icons.headset_mic,
    'system': Icons.notifications,
    'general': Icons.notifications_outlined,
  };

  static const _typeLabels = <String, String>{
    'ride': 'Ride Updates',
    'payment': 'Payments',
    'promotion': 'Promotions',
    'support': 'Support',
    'system': 'System',
    'general': 'General',
  };

  // Defines display order for grouped sections
  static const _typeOrder = ['ride', 'payment', 'promotion', 'support', 'system', 'general'];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    final items = await _service.getNotifications();
    if (mounted) {
      setState(() {
        _notifications = items;
        _isLoading = false;
      });
    }
  }

  Future<void> _markAllRead() async {
    await _service.markAllRead();
    if (mounted) {
      setState(() {
        _notifications = _notifications
            .map((n) => RiderNotification(
                  id: n.id,
                  title: n.title,
                  body: n.body,
                  type: n.type,
                  read: true,
                  createdAt: n.createdAt,
                  data: n.data,
                ))
            .toList();
      });
    }
  }

  Future<void> _markRead(RiderNotification notification) async {
    if (notification.read) return;
    await _service.markRead(notification.id);
    if (mounted) {
      setState(() {
        final index = _notifications.indexWhere((n) => n.id == notification.id);
        if (index != -1) {
          _notifications[index] = RiderNotification(
            id: notification.id,
            title: notification.title,
            body: notification.body,
            type: notification.type,
            read: true,
            createdAt: notification.createdAt,
            data: notification.data,
          );
        }
      });
    }
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('MMM d').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => !n.read).length;

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
          'Notifications',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: _markAllRead,
              child: Text(
                'Mark all read',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.yellow90,
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.yellow90),
            )
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.notifications_none,
                        color: AppColors.txtInactive,
                        size: 64,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No notifications yet',
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.txtInactive,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  color: AppColors.yellow90,
                  child: _buildGroupedList(),
                ),
    );
  }

  /// Build a list grouped by notification type with section headers.
  Widget _buildGroupedList() {
    // Group notifications by type
    final grouped = <String, List<RiderNotification>>{};
    for (final n in _notifications) {
      grouped.putIfAbsent(n.type, () => []).add(n);
    }

    // Sort each group by createdAt descending (newest first)
    for (final list in grouped.values) {
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    }

    // Build ordered sections based on _typeOrder
    final orderedTypes = _typeOrder.where((t) => grouped.containsKey(t)).toList();
    // Add any types not in _typeOrder at the end
    for (final t in grouped.keys) {
      if (!orderedTypes.contains(t)) orderedTypes.add(t);
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: orderedTypes.fold<int>(
        0,
        (sum, type) => sum + 1 + (grouped[type]?.length ?? 0), // 1 for header
      ),
      itemBuilder: (context, index) {
        // Determine which section and item index this maps to
        int cursor = 0;
        for (final type in orderedTypes) {
          final items = grouped[type]!;
          if (index == cursor) {
            // Section header
            return _buildSectionHeader(type);
          }
          cursor++; // past the header
          final itemIndex = index - cursor;
          if (itemIndex < items.length) {
            return _buildNotificationItem(items[itemIndex]);
          }
          cursor += items.length;
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildSectionHeader(String type) {
    final icon = _typeIcons[type] ?? Icons.notifications;
    final label = _typeLabels[type] ?? type;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
      child: Row(
        children: [
          Icon(icon, color: AppColors.yellow90, size: 18),
          const SizedBox(width: 8),
          Text(
            label,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.yellow90,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationItem(RiderNotification n) {
    return GestureDetector(
      onTap: () => _markRead(n),
      child: Container(
        color: n.read
            ? Colors.transparent
            : AppColors.yellow90.withOpacity(0.05),
        padding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 14,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: n.read
                    ? AppColors.inputBg
                    : AppColors.yellow90.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _typeIcons[n.type] ?? Icons.notifications,
                color: n.read
                    ? AppColors.txtInactive
                    : AppColors.yellow90,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          n.title,
                          style: AppTextStyles.body.copyWith(
                            color: Colors.white,
                            fontWeight: n.read
                                ? FontWeight.w400
                                : FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      if (!n.read)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.yellow90,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    n.body,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 12,
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatTime(n.createdAt),
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
