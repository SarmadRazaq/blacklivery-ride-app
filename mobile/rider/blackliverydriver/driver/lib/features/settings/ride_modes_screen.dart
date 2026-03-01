import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/custom_button.dart';
import '../auth/data/services/driver_service.dart';

class RideModesScreen extends StatefulWidget {
  const RideModesScreen({super.key});

  @override
  State<RideModesScreen> createState() => _RideModesScreenState();
}

class _RideModesScreenState extends State<RideModesScreen> {
  String _selectedMode = 'instant'; // 'instant', 'scheduled', 'all'
  bool _isLoading = false;
  final DriverService _driverService = DriverService();

  Future<void> _saveSettings() async {
    setState(() => _isLoading = true);
    try {
      await _driverService.updateProfileField('rideMode', _selectedMode);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Preferences saved successfully')),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to save settings: $e')));
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const CustomAppBar(title: 'Account Setup'),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Incoming Rides Mode',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Select your incoming ride requests method you wish to use. You can change this anytime in settings.',
                style: TextStyle(fontSize: 14, color: Colors.grey[400]),
              ),
              const SizedBox(height: 32),

              _buildModeOption(
                id: 'instant',
                title: 'Instant Request',
                description:
                    'Only accept rider instant ride requests, you can use this anytime in settings.',
              ),
              const SizedBox(height: 16),
              _buildModeOption(
                id: 'scheduled',
                title: 'Scheduled Request',
                description:
                    'Accept scheduled ride requests for up to 7+ days ahead.',
              ),
              const SizedBox(height: 16),
              _buildModeOption(
                id: 'all',
                title: 'All Requests',
                description:
                    'Accept both scheduled and instant incoming ride requests.',
              ),

              const Spacer(),

              CustomButton(
                text: 'Save Settings',
                onPressed: _isLoading ? null : _saveSettings,
                backgroundColor: AppColors.white,
                textColor: Colors.black,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModeOption({
    required String id,
    required String title,
    required String description,
  }) {
    final isSelected = _selectedMode == id;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedMode = id;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.cardBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? Colors.amber : Colors.transparent,
            width: 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: TextStyle(
                      color: Colors.grey[500],
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            if (isSelected)
              const Icon(Icons.check, color: Colors.amber, size: 24)
            else
              Icon(Icons.circle_outlined, color: Colors.grey[600], size: 24),
          ],
        ),
      ),
    );
  }
}
