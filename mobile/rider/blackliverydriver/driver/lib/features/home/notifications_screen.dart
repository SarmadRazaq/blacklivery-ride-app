import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/notification_service.dart';
import '../auth/data/services/driver_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final DriverService _driverService = DriverService();
  bool _isLoading = true;
  bool _markingAll = false;
  List<dynamic> _notifications = [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    // Clear badge count when user opens notifications
    NotificationService().clearBadge();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      final data = await _driverService.getNotifications();
      if (!mounted) return;
      setState(() {
        _notifications = data;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to load notifications')),
      );
    }
  }

  Future<void> _markOneRead(String id, int index) async {
    final item = _notifications[index] as Map<String, dynamic>;
    if (item['read'] == true) return; // already read

    // Optimistic update
    setState(() {
      _notifications[index] = {...item, 'read': true};
    });

    try {
      await _driverService.markNotificationRead(id);
    } catch (_) {
      // Revert on failure
      if (mounted) {
        setState(() {
          _notifications[index] = item;
        });
      }
    }
  }

  Future<void> _markAllRead() async {
    setState(() => _markingAll = true);
    try {
      await _driverService.markAllNotificationsRead();
      await _loadNotifications();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All notifications marked as read')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to mark notifications as read')),
      );
    } finally {
      if (mounted) setState(() => _markingAll = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Notifications',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          TextButton(
            onPressed: _markingAll ? null : _markAllRead,
            child: Text(
              _markingAll ? '...' : 'Mark all',
              style: const TextStyle(color: AppColors.primary),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.notifications_none_rounded,
                        size: 64,
                        color: AppColors.grey.withValues(alpha: 0.5),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No notifications yet',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'You\'ll see ride requests, updates\nand promotions here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: AppColors.grey,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  color: AppColors.primary,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    itemCount: _notifications.length,
                    separatorBuilder: (_, index) => Divider(
                      color: Colors.white.withValues(alpha: 0.08),
                      height: 1,
                    ),
                    itemBuilder: (context, index) {
                      final item = _notifications[index] as Map<String, dynamic>;
                      final isRead = item['read'] == true;
                      final title = (item['title'] ?? 'Notification').toString();
                      final body = (item['body'] ?? '').toString();

                      final id = (item['id'] ?? item['_id'] ?? '').toString();
                      return ListTile(
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
                        onTap: id.isNotEmpty
                            ? () => _markOneRead(id, index)
                            : null,
                        leading: Icon(
                          isRead
                              ? Icons.notifications_none_rounded
                              : Icons.notifications_active_outlined,
                          color: isRead ? AppColors.white : AppColors.primary,
                          size: 18,
                        ),
                        title: Text(
                          title,
                          style: TextStyle(
                            color: AppColors.white,
                            fontSize: 13,
                            fontWeight: isRead ? FontWeight.w500 : FontWeight.w700,
                          ),
                        ),
                        subtitle: Text(
                          body,
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 11,
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
