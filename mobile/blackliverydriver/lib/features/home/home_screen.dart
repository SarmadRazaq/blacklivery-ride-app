import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_utils.dart';
import '../../core/providers/region_provider.dart';
import '../../core/services/socket_service.dart';
import '../../core/services/connectivity_service.dart';
import '../auth/screens/edit_profile_screen.dart';
import '../auth/screens/vehicle_info_screen.dart';
import '../auth/screens/documents_screen.dart';
import 'incentive_screen.dart';
import 'support_screen.dart';
import 'settings_screen.dart';
import 'rating_screen.dart';
import '../earnings/payout_screen.dart';
import '../onboarding/splash_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String _serviceMode = 'both'; // 'ride', 'delivery', 'both'

  @override
  void initState() {
    super.initState();
    // Load earnings data when screen initializes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(earningsRiverpodProvider).loadEarningsData();
    });
  }

  @override
  Widget build(BuildContext context) {
    // Return only the Home Tab content.
    // DriverMapScreen provides the Scaffold and BottomNavigationBar.
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            StreamBuilder<bool>(
              stream: ConnectivityService().onConnectivityChanged,
              initialData: ConnectivityService().isOnline,
              builder: (context, snapshot) {
                final isOnline = snapshot.data ?? true;
                if (isOnline) return const SizedBox.shrink();
                return Container(
                  width: double.infinity,
                  color: AppColors.error,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: const Text(
                    'No Internet Connection. Showing cached data.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.white, fontSize: 12),
                  ),
                );
              },
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  await ref.read(earningsRiverpodProvider).loadEarningsData();
                },
                color: AppColors.primary,
                child: _buildHomeTab(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeTab() {
    final user = ref.watch(authRiverpodProvider).user;
    final earnings = ref.watch(earningsRiverpodProvider);

    final userName = user != null
        ? '${user.firstName ?? ''} ${user.lastName ?? ''}'.trim()
        : 'Driver';
    final userInitials = userName.isNotEmpty
        ? userName
              .split(' ')
              .map((e) => e.isNotEmpty ? e[0] : '')
              .take(2)
              .join()
              .toUpperCase()
        : 'D';
    final rawStatus = user?.status ?? '';
    final userStatus = _mapStatusLabel(rawStatus);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    userInitials,
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Hello, $userName',
                    style: const TextStyle(
                      color: AppColors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      userStatus,
                      style: const TextStyle(
                        color: Colors.orange,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              IconButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('No new notifications')),
                  );
                },
                icon: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.notifications_outlined,
                    color: AppColors.white,
                    size: 20,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          // Status Card — dynamic based on driver approval status
          _buildStatusCard(rawStatus),
          const SizedBox(height: 32),
          // Stats
          const Text(
            'Quick Stats',
            style: TextStyle(
              color: AppColors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  icon: Icons.attach_money,
                  title: 'Earnings',
                  value: CurrencyUtils.formatExact(earnings.totalEarnings),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.directions_car,
                  title: 'Rides',
                  value: '${earnings.earningsData['ridesCount'] ?? 0}',
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.star,
                  title: 'Rating',
                  value: '${earnings.earningsData['rating'] ?? 0.0}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          // Service Mode Toggle
          const Text(
            'Service Mode',
            style: TextStyle(
              color: AppColors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildModeChip('Rides', 'ride', Icons.directions_car),
              const SizedBox(width: 8),
              _buildModeChip('Delivery', 'delivery', Icons.local_shipping),
              const SizedBox(width: 8),
              _buildModeChip('Both', 'both', Icons.apps),
            ],
          ),
          const SizedBox(height: 24),
          // Quick Actions
          const Text(
            'Quick Actions',
            style: TextStyle(
              color: AppColors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildQuickAction(
                  icon: Icons.emoji_events,
                  label: 'Incentives',
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const IncentiveScreen()),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildQuickAction(
                  icon: Icons.star,
                  label: 'My Rating',
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const RatingScreen()),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          // Driver Status
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              userStatus,
              style: const TextStyle(
                color: Colors.orange,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(height: 32),
          // Profile Options
          _buildProfileOption(
            icon: Icons.person_outline,
            title: 'Edit Profile',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const EditProfileScreen()),
            ),
          ),
          _buildProfileOption(
            icon: Icons.directions_car_outlined,
            title: 'Vehicle Info',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const VehicleInfoScreen()),
            ),
          ),
          _buildProfileOption(
            icon: Icons.description_outlined,
            title: 'Documents',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const DocumentsScreen()),
            ),
          ),
          _buildProfileOption(
            icon: Icons.account_balance_wallet_outlined,
            title: 'Payment Settings',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PayoutScreen()),
              );
            },
          ),
          _buildProfileOption(
            icon: Icons.public_outlined,
            title: 'Region',
            subtitle: ref.watch(regionRiverpodProvider).current.label,
            onTap: () => _showRegionPicker(context, ref),
          ),
          _buildProfileOption(
            icon: Icons.settings_outlined,
            title: 'Settings',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SettingsScreen()),
            ),
          ),
          _buildProfileOption(
            icon: Icons.help_outline,
            title: 'Help & Support',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SupportScreen()),
            ),
          ),
          _buildProfileOption(
            icon: Icons.logout,
            title: 'Logout',
            onTap: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.cardBackground,
                  title: const Text(
                    'Logout',
                    style: TextStyle(color: Colors.white),
                  ),
                  content: const Text(
                    'Are you sure you want to logout?',
                    style: TextStyle(color: Colors.white70),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text(
                        'Logout',
                        style: TextStyle(color: Colors.red),
                      ),
                    ),
                  ],
                ),
              );
              if (confirmed == true && context.mounted) {
                await ref.read(authRiverpodProvider).logout();
                if (context.mounted) {
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const SplashScreen()),
                    (route) => false,
                  );
                }
              }
            },
            isDestructive: true,
          ),
        ],
      ),
    );
  }

  static String _mapStatusLabel(String status) {
    switch (status) {
      case 'approved':
        return 'Active';
      case 'pending_documents':
        return 'Documents Required';
      case 'pending_approval':
        return 'Pending Approval';
      case 'under_review':
        return 'Under Review';
      case 'suspended':
        return 'Suspended';
      case 'deactivated':
        return 'Deactivated';
      default:
        return status.isNotEmpty ? status : 'Pending Approval';
    }
  }

  Widget _buildStatusCard(String status) {
    final isApproved = status == 'approved';
    final isSuspended = status == 'suspended' || status == 'deactivated';

    final IconData icon;
    final String title;
    final String subtitle;
    final List<Color> gradientColors;

    if (isApproved) {
      icon = Icons.check_circle_outline;
      title = 'Account Active';
      subtitle = 'You\'re all set! Go online to start receiving rides.';
      gradientColors = [Colors.green.shade700, Colors.green.shade500];
    } else if (isSuspended) {
      icon = Icons.block;
      title = status == 'deactivated' ? 'Account Deactivated' : 'Account Suspended';
      subtitle = 'Please contact support for more information.';
      gradientColors = [Colors.red.shade800, Colors.red.shade600];
    } else if (status == 'pending_documents') {
      icon = Icons.upload_file;
      title = 'Documents Required';
      subtitle = 'Please upload your documents to continue.';
      gradientColors = [
        AppColors.primary.withValues(alpha: 0.8),
        AppColors.primary.withValues(alpha: 0.6),
      ];
    } else {
      icon = Icons.hourglass_top;
      title = 'Account Under Review';
      subtitle = 'Your account will be active within 24 hours after approval.';
      gradientColors = [
        AppColors.primary.withValues(alpha: 0.8),
        AppColors.primary.withValues(alpha: 0.6),
      ];
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Icon(icon, color: Colors.white, size: 48),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.8),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.primary, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(title, style: TextStyle(color: Colors.grey[400], fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildModeChip(String label, String mode, IconData icon) {
    final isSelected = _serviceMode == mode;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() => _serviceMode = mode);
          SocketService().emitDriverMode(mode);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.2)
                : AppColors.cardBackground,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppColors.primary : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                color: isSelected ? AppColors.primary : AppColors.grey,
                size: 22,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? AppColors.primary : AppColors.grey,
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          color: AppColors.cardBackground,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 24),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.white,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void _showRegionPicker(BuildContext context, WidgetRef ref) {
  final region = ref.read(regionRiverpodProvider);
  showModalBottomSheet(
    context: context,
    backgroundColor: AppColors.cardBackground,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select Region',
              style: TextStyle(
                color: AppColors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'This sets your currency and pricing region',
              style: TextStyle(color: Colors.grey[400], fontSize: 13),
            ),
            const SizedBox(height: 20),
            ...region.allRegions.map((r) {
              final isSelected = r.code == region.code;
              return ListTile(
                onTap: () async {
                  if (isSelected) {
                    Navigator.pop(context);
                    return;
                  }

                  try {
                    final backendRegionCode = RegionProvider.toBackendCode(r.code);
                    await ref.read(authRiverpodProvider).updateProfile(
                      region: backendRegionCode,
                    );
                    await region.setRegion(r.code);
                    if (context.mounted) {
                      Navigator.pop(context);
                    }
                  } catch (e) {
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to update region: $e')),
                    );
                  }
                },
                leading: Icon(
                  Icons.public,
                  color: isSelected ? AppColors.primary : Colors.grey,
                ),
                title: Text(
                  r.label,
                  style: TextStyle(
                    color: isSelected ? AppColors.primary : AppColors.white,
                    fontWeight: isSelected
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                ),
                subtitle: Text(
                  '${r.currency} (${r.symbol})',
                  style: TextStyle(color: Colors.grey[400], fontSize: 12),
                ),
                trailing: isSelected
                    ? const Icon(Icons.check_circle, color: AppColors.primary)
                    : null,
                tileColor: isSelected
                    ? AppColors.primary.withValues(alpha: 0.1)
                    : Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              );
            }),
            const SizedBox(height: 12),
          ],
        ),
      );
    },
  );
}

Widget _buildProfileOption({
  required IconData icon,
  required String title,
  required VoidCallback onTap,
  String? subtitle,
  bool isDestructive = false,
}) {
  return Container(
    margin: const EdgeInsets.only(bottom: 12),
    child: ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.inputBackground,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          icon,
          color: isDestructive ? Colors.red : AppColors.primary,
          size: 20,
        ),
      ),
      title: Text(
        title,
        style: TextStyle(
          color: isDestructive ? Colors.red : AppColors.white,
          fontSize: 16,
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: TextStyle(color: Colors.grey[400], fontSize: 13),
            )
          : null,
      trailing: Icon(Icons.chevron_right, color: Colors.grey[600]),
      tileColor: AppColors.cardBackground,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}
