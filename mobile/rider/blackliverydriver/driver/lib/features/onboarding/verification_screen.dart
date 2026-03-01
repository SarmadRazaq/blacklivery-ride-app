import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/riverpod_providers.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';
import '../../core/theme/app_theme.dart';
import 'account_setup_screen.dart';

class VerificationScreen extends ConsumerStatefulWidget {
  const VerificationScreen({super.key});

  @override
  ConsumerState<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends ConsumerState<VerificationScreen> {
  bool _isSubmitting = false;
  String _selectedCar = '';
  final _plateController = TextEditingController();

  final Map<String, String?> _uploadedDocuments = {
    'chauffeur_license': null,
    'vehicle_insurance': null,
    'vehicle_inspection': null,
    'vehicle_photo_front': null,
    'vehicle_photo_back': null,
  };

  final List<String> _carOptions = [
    'Lincoln Town Car',
    'Cadillac XTS',
    'Mercedes S-Class',
    'BMW 7 Series',
    'Chevrolet Suburban',
    'Chrysler 300',
    'Other',
  ];

  @override
  void dispose() {
    _plateController.dispose();
    super.dispose();
  }

  Future<void> _pickDocument(String documentType) async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      );

      if (result != null && result.files.single.path != null) {
        final file = File(result.files.single.path!);

        if (!mounted) return;
        await ref.read(driverRiverpodProvider).uploadDocument(documentType, file);

        if (mounted) {
          setState(
            () => _uploadedDocuments[documentType] = result.files.single.name,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: ${e.toString()}')),
        );
      }
    }
  }

  void _showCarPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E1E1E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Select Your Car',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Divider(height: 1, color: Color(0xFF2A2A2A)),
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: _carOptions
                      .map(
                        (car) => ListTile(
                          title: Text(
                            car,
                            style: const TextStyle(color: AppColors.white),
                          ),
                          trailing: _selectedCar == car
                              ? const Icon(
                                  Icons.check,
                                  color: AppColors.primary,
                                  size: 20,
                                )
                              : null,
                          onTap: () {
                            setState(() => _selectedCar = car);
                            Navigator.pop(ctx);
                          },
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _handleContinue() async {
    if (_uploadedDocuments.values.any((doc) => doc == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload all required documents')),
      );
      return;
    }
    if (_selectedCar.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select your car')));
      return;
    }
    if (_plateController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your plate number')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      if (mounted) {
        Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => const AccountSetupScreen()));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios,
            color: AppColors.white,
            size: 20,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        centerTitle: true,
        title: const Text(
          'Verification',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ──
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Account documentation',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.white,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Upload original copies of the following documents, we will verify and authenticate and contact you for actual vehicle design analysis.',
                      style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // ── Document Upload Tiles ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    _buildDocUploadTile(
                      title: 'Chauffeur License',
                      key: 'chauffeur_license',
                      icon: Icons.badge_outlined,
                    ),
                    const SizedBox(height: 12),
                    _buildDocUploadTile(
                      title: 'Vehicle Insurance',
                      key: 'vehicle_insurance',
                      icon: Icons.security_outlined,
                    ),
                    const SizedBox(height: 12),
                    _buildDocUploadTile(
                      title: 'Vehicle Inspection',
                      key: 'vehicle_inspection',
                      icon: Icons.fact_check_outlined,
                    ),
                    const SizedBox(height: 12),
                    _buildDocUploadTile(
                      title: 'Vehicle Photo (Front)',
                      key: 'vehicle_photo_front',
                      icon: Icons.directions_car_outlined,
                    ),
                    const SizedBox(height: 12),
                    _buildDocUploadTile(
                      title: 'Vehicle Photo (Back)',
                      key: 'vehicle_photo_back',
                      icon: Icons.directions_car,
                    ),
                    const SizedBox(height: 20),

                    // ── Car Selector ──
                    GestureDetector(
                      onTap: _showCarPicker,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A1A1A),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.grey[800]!),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.directions_car_outlined,
                              color: Colors.grey[500],
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _selectedCar.isEmpty
                                    ? 'Select Your Car'
                                    : _selectedCar,
                                style: TextStyle(
                                  color: _selectedCar.isEmpty
                                      ? Colors.grey[600]
                                      : AppColors.white,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            Icon(
                              Icons.keyboard_arrow_down,
                              color: Colors.grey[500],
                              size: 22,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // ── Plate Number ──
                    TextFormField(
                      controller: _plateController,
                      style: const TextStyle(
                        color: AppColors.white,
                        fontSize: 15,
                      ),
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Enter your Livery Plate Number',
                        hintStyle: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 14,
                        ),
                        prefixIcon: Icon(
                          Icons.confirmation_number_outlined,
                          color: Colors.grey[500],
                          size: 20,
                        ),
                        filled: true,
                        fillColor: const Color(0xFF1A1A1A),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: Colors.grey[800]!),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: Colors.grey[800]!),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(
                            color: AppColors.primary,
                            width: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),
              _buildStepDots(2),
              const SizedBox(height: 20),

              // ── Continue Button ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleContinue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.white,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.black,
                            ),
                          )
                        : const Text(
                            'Continue',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDocUploadTile({
    required String title,
    required String key,
    required IconData icon,
  }) {
    final isUploaded = _uploadedDocuments[key] != null;

    return GestureDetector(
      onTap: () => _pickDocument(key),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF1A1A1A),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isUploaded
                ? AppColors.primary.withValues(alpha: 0.4)
                : Colors.grey[800]!,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isUploaded ? AppColors.primary : Colors.grey[500],
              size: 22,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (isUploaded)
                    Text(
                      _uploadedDocuments[key]!,
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: isUploaded
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : const Color(0xFF252525),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                isUploaded ? Icons.check : Icons.file_upload_outlined,
                color: isUploaded ? AppColors.primary : Colors.grey[500],
                size: 18,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildStepDots(int activeIndex) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(4, (i) {
        final isActive = i == activeIndex;
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: isActive ? 24 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: isActive ? AppColors.white : Colors.grey[700],
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}
