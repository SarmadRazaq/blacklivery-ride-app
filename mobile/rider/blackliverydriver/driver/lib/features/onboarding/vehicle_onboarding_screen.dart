import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/custom_text_field.dart';
import 'emergency_contacts_screen.dart';

class VehicleOnboardingScreen extends ConsumerStatefulWidget {
  const VehicleOnboardingScreen({super.key});

  @override
  ConsumerState<VehicleOnboardingScreen> createState() =>
      _VehicleOnboardingScreenState();
}

class _VehicleOnboardingScreenState extends ConsumerState<VehicleOnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _makeController = TextEditingController();
  final TextEditingController _plateController = TextEditingController();
  final TextEditingController _colorController = TextEditingController();
  final TextEditingController _yearController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _makeController.dispose();
    _plateController.dispose();
    _colorController.dispose();
    _yearController.dispose();
    super.dispose();
  }

  Future<void> _submitVehicle() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // Assuming 'addVehicle' exists in DriverProvider
      await ref.read(driverRiverpodProvider).addVehicle({
        'name': _makeController.text.trim(), // Backend expects 'name'
        'plateNumber': _plateController.text.trim(),
        'color': _colorController.text.trim(),
        'year': _yearController.text.trim(),
        // Defaults
        'seats': 4,
        'category': 'ride',
      });

      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const EmergencyContactsScreen(),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to add vehicle: $e')));
      }
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
      appBar: const CustomAppBar(title: 'Vehicle Info'),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Vehicle Details',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Enter your vehicle information.',
                    style: TextStyle(fontSize: 14, color: Colors.grey[400]),
                  ),
                  const SizedBox(height: 32),

                  CustomTextField(
                    hintText: 'Vehicle Make',
                    prefixIcon: Icons.directions_car_outlined,
                    controller: _makeController,
                    validator: (v) => v?.isNotEmpty == true ? null : 'Required',
                  ),
                  const SizedBox(height: 16),

                  CustomTextField(
                    hintText: 'Vehicle Plate Number',
                    prefixIcon: Icons.pin_outlined,
                    controller: _plateController,
                    validator: (v) => v?.isNotEmpty == true ? null : 'Required',
                  ),
                  const SizedBox(height: 16),

                  CustomTextField(
                    hintText: 'Vehicle Color',
                    prefixIcon: Icons.color_lens_outlined,
                    controller: _colorController,
                    validator: (v) => v?.isNotEmpty == true ? null : 'Required',
                  ),
                  const SizedBox(height: 16),

                  CustomTextField(
                    hintText: 'Vehicle Year',
                    prefixIcon: Icons.calendar_today_outlined,
                    controller: _yearController,
                    keyboardType: TextInputType.number,
                    validator: (v) => v?.isNotEmpty == true ? null : 'Required',
                  ),

                  const SizedBox(height: 32),

                  CustomButton(
                    text: 'Save & Continue',
                    onPressed: _submitVehicle,
                    isLoading: _isLoading,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
