import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
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

class _VehicleOnboardingScreenState
    extends ConsumerState<VehicleOnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _makeController = TextEditingController();
  final _plateController = TextEditingController();
  final _colorController = TextEditingController();
  final _yearController = TextEditingController();
  final _seatsController = TextEditingController(text: '4');

  String _selectedCategory = 'sedan';
  XFile? _frontImage;
  XFile? _backImage;
  bool _isLoading = false;
  final _picker = ImagePicker();

  static const _categoryLabels = <String, String>{
    'motorbike': 'Motorbike',
    'sedan': 'Sedan',
    'suv': 'SUV',
    'xl': 'XL',
    'first_class': 'First Class',
    'business_sedan': 'Business Sedan',
    'business_suv': 'Business SUV',
    'cargo_van': 'Cargo Van',
  };

  @override
  void dispose() {
    _makeController.dispose();
    _plateController.dispose();
    _colorController.dispose();
    _yearController.dispose();
    _seatsController.dispose();
    super.dispose();
  }

  // ── Image handling ──────────────────────────────────────────────

  Future<void> _pickImage(String side) async {
    // Show bottom-sheet so the user can choose camera or gallery
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: AppColors.cardBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: AppColors.primary),
              title: const Text('Camera',
                  style: TextStyle(color: AppColors.white)),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading:
                  const Icon(Icons.photo_library, color: AppColors.primary),
              title: const Text('Gallery',
                  style: TextStyle(color: AppColors.white)),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;

    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 1200,
        imageQuality: 85,
      );
      if (picked != null && mounted) {
        setState(() {
          if (side == 'front') {
            _frontImage = picked;
          } else {
            _backImage = picked;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not pick image: $e')),
        );
      }
    }
  }

  Future<String?> _uploadImage(XFile image, String uid, String side) async {
    final ts = DateTime.now().millisecondsSinceEpoch;
    final storageRef =
        FirebaseStorage.instance.ref('vehicles/$uid/${side}_$ts.jpg');
    await storageRef.putFile(File(image.path));
    return storageRef.getDownloadURL();
  }

  // ── Submit ──────────────────────────────────────────────────────

  Future<void> _submitVehicle() async {
    if (!_formKey.currentState!.validate()) return;

    if (_frontImage == null || _backImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please add both front and back vehicle photos'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final uid = ref.read(authRiverpodProvider).user?.id ?? 'unknown';
      final frontUrl = await _uploadImage(_frontImage!, uid, 'front');
      final backUrl = await _uploadImage(_backImage!, uid, 'back');

      await ref.read(driverRiverpodProvider).addVehicle({
        'name': _makeController.text.trim(),
        'plateNumber': _plateController.text.trim(),
        'color': _colorController.text.trim(),
        'year': int.parse(_yearController.text.trim()),
        'seats': int.tryParse(_seatsController.text.trim()) ?? 4,
        'category': _selectedCategory,
        'images': {'front': frontUrl, 'back': backUrl},
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Vehicle added successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).push(
          MaterialPageRoute(
              builder: (_) => const EmergencyContactsScreen()),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to add vehicle: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Image picker tile ──────────────────────────────────────────

  Widget _buildImagePicker(String label, XFile? image, String side) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => _pickImage(side),
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          color: AppColors.inputBackground,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: image != null ? AppColors.primary : AppColors.inputBorder,
            width: image != null ? 1.5 : 1,
          ),
        ),
        child: image != null
            ? Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(11),
                    child: Image.file(File(image.path), fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: CircleAvatar(
                      radius: 14,
                      backgroundColor: Colors.black54,
                      child: Icon(Icons.edit,
                          size: 14, color: AppColors.primary),
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_a_photo_outlined,
                      color: Colors.grey[500], size: 32),
                  const SizedBox(height: 8),
                  Text(label,
                      style:
                          TextStyle(color: Colors.grey[500], fontSize: 13)),
                  const SizedBox(height: 2),
                  Text('Tap to select',
                      style:
                          TextStyle(color: Colors.grey[700], fontSize: 11)),
                ],
              ),
      ),
    );
  }

  // ── Build ───────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: const CustomAppBar(title: 'Vehicle Info'),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              physics: const AlwaysScrollableScrollPhysics(),
              child: ConstrainedBox(
                constraints:
                    BoxConstraints(minHeight: constraints.maxHeight - 48),
                child: Form(
                  key: _formKey,
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
                      Text('Enter your vehicle information.',
                          style: TextStyle(
                              fontSize: 14, color: Colors.grey[400])),
                      const SizedBox(height: 28),

                      // ── Make & Model ──
                      CustomTextField(
                        hintText: 'Vehicle Make & Model',
                        prefixIcon: Icons.directions_car_outlined,
                        controller: _makeController,
                        validator: (v) => (v != null && v.trim().length >= 3)
                            ? null
                            : 'Min 3 characters',
                      ),
                      const SizedBox(height: 14),

                      // ── Plate Number ──
                      CustomTextField(
                        hintText: 'Plate Number',
                        prefixIcon: Icons.pin_outlined,
                        controller: _plateController,
                        validator: (v) => (v != null && v.trim().length >= 2)
                            ? null
                            : 'Please enter plate number',
                      ),
                      const SizedBox(height: 14),

                      // ── Color ──
                      CustomTextField(
                        hintText: 'Color',
                        prefixIcon: Icons.color_lens_outlined,
                        controller: _colorController,
                        validator: (v) =>
                            v?.isNotEmpty == true ? null : 'Required',
                      ),
                      const SizedBox(height: 14),

                      // ── Year + Seats side by side ──
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 3,
                            child: CustomTextField(
                              hintText: 'Year (e.g. 2024)',
                              prefixIcon: Icons.calendar_today_outlined,
                              controller: _yearController,
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(4),
                              ],
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) {
                                  return 'Required';
                                }
                                final y = int.tryParse(v.trim());
                                if (y == null ||
                                    y < 2000 ||
                                    y > DateTime.now().year + 1) {
                                  return '2000–${DateTime.now().year + 1}';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: CustomTextField(
                              hintText: 'Seats',
                              prefixIcon: Icons.event_seat_outlined,
                              controller: _seatsController,
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(2),
                              ],
                              validator: (v) {
                                final s = int.tryParse(v?.trim() ?? '');
                                if (s == null || s < 1 || s > 8) {
                                  return 'Seats must be 1–8';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // ── Vehicle Type dropdown (no wrapping Container) ──
                      DropdownButtonFormField<String>(
                        initialValue: _selectedCategory,
                        dropdownColor: AppColors.cardBackground,
                        style: const TextStyle(
                            color: AppColors.white, fontSize: 14),
                        icon: const Icon(Icons.keyboard_arrow_down,
                            color: AppColors.primary),
                        decoration: InputDecoration(
                          labelText: 'Vehicle Type',
                          labelStyle: TextStyle(color: Colors.grey[400]),
                          prefixIcon: const Icon(Icons.local_taxi_outlined,
                              color: AppColors.primary, size: 20),
                        ),
                        items: _categoryLabels.entries.map((e) {
                          return DropdownMenuItem(
                            value: e.key,
                            child: Text(e.value),
                          );
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setState(() => _selectedCategory = v);
                          }
                        },
                      ),
                      const SizedBox(height: 24),

                      // ── Vehicle Photos ──
                      Text('Vehicle Photos',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey[300],
                          )),
                      const SizedBox(height: 4),
                      Text(
                          'Upload clear photos of the front and back of your vehicle.',
                          style: TextStyle(
                              fontSize: 12, color: Colors.grey[500])),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                              child: _buildImagePicker(
                                  'Front Photo', _frontImage, 'front')),
                          const SizedBox(width: 12),
                          Expanded(
                              child: _buildImagePicker(
                                  'Back Photo', _backImage, 'back')),
                        ],
                      ),

                      const SizedBox(height: 32),

                      CustomButton(
                        text: 'Save & Continue',
                        onPressed: _submitVehicle,
                        isLoading: _isLoading,
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
