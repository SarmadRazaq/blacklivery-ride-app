import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/riverpod_providers.dart';
import '../data/services/driver_service.dart';

class DocumentsScreen extends ConsumerStatefulWidget {
  const DocumentsScreen({super.key});

  @override
  ConsumerState<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends ConsumerState<DocumentsScreen> {
  final DriverService _driverService = DriverService();
  final TextEditingController _plateController = TextEditingController();

  List<dynamic> _documents = [];
  bool _isLoading = true;
  bool _isSavingDetails = false;
  String? _activeUploadDocType;
  double _uploadProgress = 0.0;
  String _selectedCar = '';
  String? _error;

  final List<Map<String, dynamic>> _documentTypes = [
    {
      'type': 'chauffeur_license',
      'backendType': 'driver_license',
      'label': 'Chauffeur license',
      'icon': Icons.badge_outlined,
    },
    {
      'type': 'vehicle_insurance',
      'backendType': 'vehicle_insurance',
      'label': 'Vehicle insurance',
      'icon': Icons.shield_outlined,
    },
    {
      'type': 'vehicle_inspection',
      'backendType': 'vehicle_registration',
      'label': 'Vehicle inspection',
      'icon': Icons.fact_check_outlined,
    },
    {
      'type': 'vehicle_photo_front',
      'backendType': 'vehicle_photo_front',
      'label': 'Vehicle photo (front)',
      'icon': Icons.directions_car_outlined,
    },
    {
      'type': 'vehicle_photo_back',
      'backendType': 'vehicle_photo_back',
      'label': 'Vehicle photo (back)',
      'icon': Icons.directions_car,
    },
  ];

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
  void initState() {
    super.initState();
    _loadDocuments();
  }

  @override
  void dispose() {
    _plateController.dispose();
    super.dispose();
  }

  Future<void> _loadDocuments() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _driverService.getDocumentVerificationState();
      setState(() {
        _documents = (response['documents'] as List<dynamic>?) ?? [];
        _selectedCar = (response['vehicleType'] ?? '').toString();
        _plateController.text = (response['liveryPlateNumber'] ?? '').toString();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  String _getDocumentStatus(String backendDocType) {
    final doc = _documents.firstWhere(
      (d) => d['type'] == backendDocType,
      orElse: () => null,
    );
    if (doc == null) return 'not_uploaded';
    return doc['status'] ?? 'pending';
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'approved':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      case 'pending':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Under Review';
      default:
        return 'Not Uploaded';
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'approved':
        return Icons.check_circle;
      case 'rejected':
        return Icons.cancel;
      case 'pending':
        return Icons.hourglass_empty;
      default:
        return Icons.upload_file;
    }
  }

  Future<void> _saveVerificationDetails() async {
    if (_selectedCar.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select your car')),
      );
      return;
    }
    if (_plateController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your livery plate number')),
      );
      return;
    }

    setState(() {
      _isSavingDetails = true;
    });

    try {
      await _driverService.saveVerificationDetails(
        vehicleType: _selectedCar,
        liveryPlateNumber: _plateController.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Verification details saved'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save details: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSavingDetails = false;
        });
      }
    }
  }

  void _showCarPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardBackground,
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

  Future<void> _uploadDocument(String docType) async {
    if (_activeUploadDocType != null) return;

    setState(() {
      _activeUploadDocType = docType;
    });

    final picker = ImagePicker();
    XFile? pickedFile;
    try {
      pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    } on PlatformException catch (e) {
      if (mounted) {
        final isAlreadyActive = e.code == 'already_active';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isAlreadyActive
                  ? 'Image picker is already open. Please wait.'
                  : 'Could not open gallery. Please try again.',
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
      setState(() {
        _activeUploadDocType = null;
      });
      return;
    }

    if (pickedFile == null) {
      setState(() {
        _activeUploadDocType = null;
      });
      return;
    }

    try {
      final file = File(pickedFile.path);
      setState(() => _uploadProgress = 0.0);
      await ref.read(driverRiverpodProvider).uploadDocument(
        docType,
        file,
        vehicleType: _selectedCar,
        liveryPlateNumber: _plateController.text,
        onSendProgress: (sent, total) {
          if (mounted && total > 0) {
            setState(() => _uploadProgress = sent / total);
          }
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Document uploaded successfully'),
            backgroundColor: Colors.green,
          ),
        );
        _loadDocuments(); // Refresh list
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _activeUploadDocType = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Documents'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.white,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 48, color: Colors.grey[600]),
                      const SizedBox(height: 16),
                      Text(
                        'Could not load documents',
                        style: TextStyle(color: Colors.grey[400], fontSize: 16),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadDocuments,
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                        child: const Text('Retry', style: TextStyle(color: Colors.black)),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadDocuments,
                  color: AppColors.primary,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _documentTypes.length,
                    itemBuilder: (context, index) {
                      final docType = _documentTypes[index];
                      final status = _getDocumentStatus(
                        docType['backendType'] as String,
                      );
                      final uploadType = docType['type'] as String;
                      final isUploading = _activeUploadDocType == uploadType;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.cardBackground,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                docType['icon'] as IconData,
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
                                    docType['label'] as String,
                                    style: const TextStyle(
                                      color: AppColors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Icon(
                                        _statusIcon(status),
                                        size: 14,
                                        color: _statusColor(status),
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        _statusLabel(status),
                                        style: TextStyle(
                                          color: _statusColor(status),
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (isUploading) ...[
                                    const SizedBox(height: 8),
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(4),
                                      child: LinearProgressIndicator(
                                        value: _uploadProgress > 0 ? _uploadProgress : null,
                                        backgroundColor: Colors.white.withValues(alpha: 0.1),
                                        color: AppColors.primary,
                                        minHeight: 4,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _uploadProgress > 0
                                          ? '${(_uploadProgress * 100).toInt()}%'
                                          : 'Preparing...',
                                      style: TextStyle(
                                        color: Colors.grey[500],
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            GestureDetector(
                              onTap: isUploading || _activeUploadDocType != null
                                  ? null
                                  : () => _uploadDocument(uploadType),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isUploading
                                      ? AppColors.primary.withValues(alpha: 0.6)
                                      : AppColors.primary,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  isUploading
                                      ? 'Please wait...'
                                      : (status == 'not_uploaded' ? 'Upload' : 'Replace'),
                                  style: const TextStyle(
                                    color: Colors.black,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
      bottomNavigationBar: _isLoading || _error != null
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GestureDetector(
                    onTap: _showCarPicker,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.cardBackground,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.directions_car_outlined, color: Colors.grey[400], size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _selectedCar.isEmpty ? 'Select Your Car' : _selectedCar,
                              style: TextStyle(
                                color: _selectedCar.isEmpty ? Colors.grey[500] : AppColors.white,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          Icon(Icons.keyboard_arrow_down, color: Colors.grey[400], size: 20),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _plateController,
                    style: const TextStyle(color: AppColors.white, fontSize: 14),
                    textCapitalization: TextCapitalization.characters,
                    decoration: InputDecoration(
                      hintText: 'Enter your Livery Plate Number',
                      hintStyle: TextStyle(color: Colors.grey[500], fontSize: 14),
                      prefixIcon: Icon(Icons.confirmation_number_outlined, color: Colors.grey[400], size: 20),
                      filled: true,
                      fillColor: AppColors.cardBackground,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.primary, width: 1.4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSavingDetails ? null : _saveVerificationDetails,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: _isSavingDetails
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                            )
                          : const Text(
                              'Save Verification Details',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                            ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
