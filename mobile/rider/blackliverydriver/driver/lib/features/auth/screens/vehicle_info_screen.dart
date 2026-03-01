import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/vehicle_icon.dart';
import '../../../core/providers/riverpod_providers.dart';
import '../data/models/vehicle_model.dart';

class VehicleInfoScreen extends ConsumerStatefulWidget {
  const VehicleInfoScreen({super.key});

  @override
  ConsumerState<VehicleInfoScreen> createState() => _VehicleInfoScreenState();
}

class _VehicleInfoScreenState extends ConsumerState<VehicleInfoScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(driverRiverpodProvider).loadVehicles();
    });
  }

  Future<String?> _uploadVehicleImage(XFile image, String uid, String side) async {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final ref = FirebaseStorage.instance.ref('vehicles/$uid/${side}_$timestamp.jpg');
    await ref.putFile(File(image.path));
    return await ref.getDownloadURL();
  }

  void _showAddVehicleDialog() {
    final nameController = TextEditingController();
    final yearController = TextEditingController();
    final plateController = TextEditingController();
    final seatsController = TextEditingController(text: '4');
    String selectedCategory = 'ride'; // Default category
    final formKey = GlobalKey<FormState>();
    XFile? frontImage;
    XFile? backImage;
    bool uploadingImages = false;
    final picker = ImagePicker();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          Future<void> pickImage(String side) async {
            final picked = await picker.pickImage(
              source: ImageSource.gallery,
              maxWidth: 1200,
              imageQuality: 85,
            );
            if (picked != null) {
              setModalState(() {
                if (side == 'front') {
                  frontImage = picked;
                } else {
                  backImage = picked;
                }
              });
            }
          }

          return Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 24,
            right: 24,
            top: 24,
          ),
          decoration: const BoxDecoration(
            color: AppColors.cardBackground,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Center(
                    child: Text(
                      'Add Vehicle',
                      style: TextStyle(
                        color: AppColors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _dialogField(
                    nameController,
                    'Vehicle Name',
                    'e.g. Toyota Camry',
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Vehicle name is required';
                      if (v.trim().length < 3) return 'Name must be at least 3 characters';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  _dialogField(
                    yearController,
                    'Year',
                    'e.g. 2022',
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Year is required';
                      final year = int.tryParse(v.trim());
                      if (year == null) return 'Enter a valid year';
                      final currentYear = DateTime.now().year;
                      if (year < 2000 || year > currentYear + 1) {
                        return 'Year must be between 2000 and ${currentYear + 1}';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  _dialogField(
                    plateController,
                    'Plate Number',
                    'e.g. ABC-1234',
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Plate number is required';
                      if (v.trim().length < 4) return 'Enter a valid plate number';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _dialogField(
                          seatsController,
                          'Seats',
                          '4',
                          keyboardType: TextInputType.number,
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return 'Required';
                            final seats = int.tryParse(v.trim());
                            if (seats == null || seats < 1 || seats > 12) {
                              return '1-12';
                            }
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: AppColors.inputBackground,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: selectedCategory,
                              dropdownColor: AppColors.cardBackground,
                              style: const TextStyle(color: AppColors.white),
                              items: ['ride', 'delivery'].map((String value) {
                                return DropdownMenuItem<String>(
                                  value: value,
                                  child: Text(value.toUpperCase()),
                                );
                              }).toList(),
                              onChanged: (newValue) {
                                setModalState(() {
                                  selectedCategory = newValue!;
                                });
                              },
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  // Vehicle photo pickers
                  Row(
                    children: [
                      Expanded(
                        child: _ImagePickerButton(
                          label: 'Front Photo',
                          image: frontImage,
                          onTap: () => pickImage('front'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _ImagePickerButton(
                          label: 'Back Photo',
                          image: backImage,
                          onTap: () => pickImage('back'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: uploadingImages ? null : () async {
                        if (!formKey.currentState!.validate()) return;
                        if (frontImage == null || backImage == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please select both front and back vehicle photos'),
                              backgroundColor: Colors.orange,
                            ),
                          );
                          return;
                        }
                        setModalState(() => uploadingImages = true);
                        try {
                          final uid = ref.read(authRiverpodProvider).user?.id ?? 'unknown';
                          final frontUrl = await _uploadVehicleImage(frontImage!, uid, 'front');
                          final backUrl = await _uploadVehicleImage(backImage!, uid, 'back');
                          await ref.read(driverRiverpodProvider).addVehicle({
                            'name': nameController.text.trim(),
                            'year': yearController.text.trim(),
                            'plateNumber': plateController.text.trim(),
                            'seats': int.tryParse(seatsController.text) ?? 4,
                            'category': selectedCategory,
                            'images': {
                              'front': frontUrl,
                              'back': backUrl,
                            },
                          });
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Vehicle added successfully'),
                                backgroundColor: Colors.green,
                              ),
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
                          if (ctx.mounted) setModalState(() => uploadingImages = false);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Add Vehicle',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          );
        },
      ),
    );
  }

  Widget _dialogField(
    TextEditingController controller,
    String label,
    String hint, {
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(color: AppColors.white),
      validator: validator ??
          (v) => (v == null || v.trim().isEmpty) ? '$label is required' : null,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.grey[400]),
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey[600]),
        filled: true,
        fillColor: AppColors.inputBackground,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.inputBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(
            color: AppColors.inputFocusBorder,
            width: 1.5,
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Vehicles'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.white,
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddVehicleDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.black),
      ),
      body: Consumer(
        builder: (context, ref, _) {
          final provider = ref.watch(driverRiverpodProvider);
          if (provider.isLoading && provider.vehicles.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          if (provider.vehicles.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  VehicleIcon(
                    type: VehicleType.sedan,
                    size: 80,
                    color: Colors.grey[600] ?? Colors.grey,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No Vehicles Yet',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Add your vehicle to start driving',
                    style: TextStyle(color: Colors.grey[400], fontSize: 14),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _showAddVehicleDialog,
                    icon: const Icon(Icons.add),
                    label: const Text('Add Vehicle'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.loadVehicles(),
            color: AppColors.primary,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: provider.vehicles.length,
              itemBuilder: (context, index) =>
                  _buildVehicleCard(provider.vehicles[index]),
            ),
          );
        },
      ),
    );
  }

  Widget _buildVehicleCard(Vehicle vehicle) {
    final isApproved =
        vehicle.status?.toLowerCase() == 'active' ||
        vehicle.status?.toLowerCase() == 'approved';
    final isPending =
        vehicle.status?.toLowerCase() == 'pending' || vehicle.status == null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.directions_car,
                  color: AppColors.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vehicle.name,
                      style: const TextStyle(
                        color: AppColors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${vehicle.year} • ${vehicle.category.toUpperCase()}',
                      style: TextStyle(color: Colors.grey[400], fontSize: 13),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color:
                      (isApproved
                              ? Colors.green
                              : isPending
                              ? Colors.orange
                              : Colors.red)
                          .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isApproved
                      ? 'Approved'
                      : isPending
                      ? 'Pending'
                      : 'Rejected',
                  style: TextStyle(
                    color: isApproved
                        ? Colors.green
                        : isPending
                        ? Colors.orange
                        : Colors.red,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.inputBackground,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.pin_outlined,
                  color: AppColors.primary,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text(
                  vehicle.plateNumber,
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ImagePickerButton extends StatelessWidget {
  final String label;
  final XFile? image;
  final VoidCallback onTap;

  const _ImagePickerButton({
    required this.label,
    required this.image,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 80,
        decoration: BoxDecoration(
          color: AppColors.inputBackground,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: image != null ? AppColors.primary : AppColors.inputBorder,
          ),
        ),
        child: image != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(11),
                child: Image.file(
                  File(image!.path),
                  fit: BoxFit.cover,
                  width: double.infinity,
                ),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.camera_alt_outlined, color: AppColors.primary, size: 24),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    style: const TextStyle(color: AppColors.primary, fontSize: 12),
                  ),
                ],
              ),
      ),
    );
  }
}
