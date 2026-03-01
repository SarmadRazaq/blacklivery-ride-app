import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/region_provider.dart';
import '../../core/data/booking_state.dart';

import '../../core/theme/app_color_theme.dart';
import 'personal_info_screen.dart';
import 'login_security_screen.dart';
import 'settings_screen.dart';
import 'saved_places_screen.dart';
import 'refer_earn_screen.dart';
import 'help_support_screen.dart';
import 'legal_screen.dart';
import 'login_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _isUploadingAvatar = false;

  String _getInitials(String? fullName) {
    if (fullName == null || fullName.isEmpty) return 'U';
    final parts = fullName.split(' ');
    final first = parts.isNotEmpty ? parts.first[0].toUpperCase() : '';
    final last = parts.length > 1 ? parts.last[0].toUpperCase() : '';
    return '$first$last'.isEmpty ? 'U' : '$first$last';
  }

  Future<void> _uploadAvatar() async {
    if (_isUploadingAvatar) return;

    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (picked == null) return;

    setState(() {
      _isUploadingAvatar = true;
    });

    try {
      await context.read<AuthProvider>().uploadProfileImage(File(picked.path));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile image updated successfully')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
    } finally {
      if (mounted) {
        setState(() {
          _isUploadingAvatar = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        final user = authProvider.user;
        final fullName = user?.fullName ?? 'User';
        final initials = _getInitials(user?.fullName);

        final ct = AppColorTheme.of(context);
        return Scaffold(
          backgroundColor: ct.bgPri,
          body: SafeArea(
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Text(
                        'Account',
                        style: AppTextStyles.heading1Of(context).copyWith(fontSize: 28),
                      ),
                    ],
                  ),
                ),

                // Profile section
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      // Avatar
                      Stack(
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: ct.inputBg,
                              shape: BoxShape.circle,
                              border: Border.all(color: ct.inputBorder),
                            ),
                            child: ClipOval(
                              child: user?.profileImage != null
                                  ? Image.network(
                                      user!.profileImage!,
                                      fit: BoxFit.cover,
                                      errorBuilder:
                                          (context, error, stackTrace) {
                                            return Center(
                                              child: Text(
                                                initials,
                                                style: AppTextStyles.heading3
                                                    .copyWith(
                                                      color: AppColors.yellow90,
                                                    ),
                                              ),
                                            );
                                          },
                                    )
                                  : Center(
                                      child: Text(
                                        initials,
                                        style: AppTextStyles.heading3.copyWith(
                                          color: AppColors.yellow90,
                                        ),
                                      ),
                                    ),
                            ),
                          ),
                          Positioned(
                            right: -4,
                            bottom: -4,
                            child: GestureDetector(
                              onTap: _uploadAvatar,
                              child: Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: AppColors.yellow90,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: AppColors.bgPri,
                                    width: 2,
                                  ),
                                ),
                                child: _isUploadingAvatar
                                    ? const Padding(
                                        padding: EdgeInsets.all(4),
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.black,
                                        ),
                                      )
                                    : const Icon(
                                        Icons.camera_alt,
                                        size: 12,
                                        color: Colors.black,
                                      ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              fullName,
                              style: AppTextStyles.heading3.copyWith(
                                fontSize: 18,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(
                                  Icons.star,
                                  color: AppColors.yellow90,
                                  size: 14,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  user?.role == 'driver'
                                      ? (user?.rating?.toStringAsFixed(1) ??
                                            '5.0')
                                      : '5.0',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.txtInactive,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Icon(
                                  Icons.circle,
                                  color: AppColors.txtInactive,
                                  size: 4,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  user?.role == 'driver'
                                      ? '${user?.totalTrips ?? 0} rides'
                                      : '${user?.totalTrips ?? 0} rides',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.txtInactive,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Menu items
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        _buildMenuItem(
                          context,
                          icon: Icons.person_outline,
                          title: 'Personal Info',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    const PersonalInfoScreen(),
                              ),
                            );
                          },
                        ),
                        _buildMenuItem(
                          context,
                          icon: Icons.lock_outline,
                          title: 'Login & security',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    const LoginSecurityScreen(),
                              ),
                            );
                          },
                        ),

                        const SizedBox(height: 16),
                        const Divider(color: AppColors.inputBorder, height: 1),
                        const SizedBox(height: 16),

                        _buildMenuItem(
                          context,
                          icon: Icons.public_outlined,
                          title: 'Region — ${context.watch<RegionProvider>().current.label}',
                          onTap: () => _showRegionPicker(context),
                        ),
                        _buildMenuItem(
                          context,
                          icon: Icons.settings_outlined,
                          title: 'Settings',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const SettingsScreen(),
                              ),
                            );
                          },
                        ),
                        _buildMenuItem(
                          context,
                          icon: Icons.bookmark_border,
                          title: 'Saved Places',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => SavedPlacesScreen(
                                  onPlaceSelected: (place) {
                                    Navigator.pop(context);
                                  },
                                ),
                              ),
                            );
                          },
                        ),
                        _buildMenuItem(
                          context,
                          icon: Icons.card_giftcard,
                          title: 'Refer & Earn',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const ReferEarnScreen(),
                              ),
                            );
                          },
                        ),

                        const SizedBox(height: 16),
                        const Divider(color: AppColors.inputBorder, height: 1),
                        const SizedBox(height: 16),

                        _buildMenuItem(
                          context,
                          icon: Icons.help_outline,
                          title: 'Help & Support',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const HelpSupportScreen(),
                              ),
                            );
                          },
                        ),
                        _buildMenuItem(
                          context,
                          icon: Icons.description_outlined,
                          title: 'Legal',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const LegalScreen(),
                              ),
                            );
                          },
                        ),

                        const SizedBox(height: 24),

                        // Log out button
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: GestureDetector(
                            onTap: () => _showLogoutDialog(context),
                            child: Row(
                              children: [
                                Icon(Icons.logout, color: Colors.red, size: 22),
                                const SizedBox(width: 16),
                                Text(
                                  'Log Out',
                                  style: AppTextStyles.body.copyWith(
                                    color: Colors.red,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: 32),

                        // Version info
                        Text(
                          'Version 1.0.0',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 12,
                          ),
                        ),

                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),

                // Bottom navigation removed
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: AppTextStyles.body.copyWith(
                  color: Colors.white,
                  fontSize: 15,
                ),
              ),
            ),
            Icon(Icons.chevron_right, color: AppColors.txtInactive, size: 22),
          ],
        ),
      ),
    );
  }

  void _showRegionPicker(BuildContext context) {
    final region = context.read<RegionProvider>();
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSec,
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
              Text('Select Region', style: AppTextStyles.heading3),
              const SizedBox(height: 4),
              Text(
                'Sets your currency and pricing region',
                style: AppTextStyles.caption.copyWith(color: AppColors.txtInactive),
              ),
              const SizedBox(height: 20),
              ...region.allRegions.map((r) {
                final isSelected = r.code == region.code;
                return ListTile(
                  onTap: () {
                    region.setRegion(r.code);
                    // Sync region into RideService
                    BookingState().rideService.setRegion(r.apiRegionKey);
                    Navigator.pop(context);
                  },
                  leading: Icon(
                    Icons.public,
                    color: isSelected ? AppColors.yellow90 : AppColors.txtInactive,
                  ),
                  title: Text(
                    r.label,
                    style: AppTextStyles.body.copyWith(
                      color: isSelected ? AppColors.yellow90 : Colors.white,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  subtitle: Text(
                    '${r.currency} (${r.symbol})',
                    style: AppTextStyles.caption.copyWith(color: AppColors.txtInactive),
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle, color: AppColors.yellow90)
                      : null,
                  tileColor: isSelected
                      ? AppColors.yellow90.withOpacity(0.08)
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

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.bgSec,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Log Out', style: AppTextStyles.heading3),
        content: Text(
          'Are you sure you want to log out?',
          style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: AppTextStyles.body),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              // Call auth provider logout
              await Provider.of<AuthProvider>(context, listen: false).logout();
              if (context.mounted) {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            child: Text(
              'Log Out',
              style: AppTextStyles.body.copyWith(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }
}
