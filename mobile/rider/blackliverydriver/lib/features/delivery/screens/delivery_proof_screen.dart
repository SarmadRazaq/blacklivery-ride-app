import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/theme/app_theme.dart';
import '../../ride/data/models/ride_model.dart';
import '../data/models/delivery_model.dart';
import '../data/services/delivery_service.dart';

/// Proof of delivery screen — captures photo and/or signature before completing.
class DeliveryProofScreen extends StatefulWidget {
  final Ride ride;
  final ProofRequirement proofRequired;

  const DeliveryProofScreen({
    super.key,
    required this.ride,
    required this.proofRequired,
  });

  @override
  State<DeliveryProofScreen> createState() => _DeliveryProofScreenState();
}

class _DeliveryProofScreenState extends State<DeliveryProofScreen> {
  final DeliveryService _deliveryService = DeliveryService();
  final ImagePicker _picker = ImagePicker();
  final TextEditingController _notesController = TextEditingController();

  File? _photo;
  bool _signatureCollected = false;
  Uint8List? _signatureBytes; // Store actual signature image data
  bool _isSubmitting = false;
  String? _error;

  bool get _needsPhoto =>
      widget.proofRequired == ProofRequirement.photo ||
      widget.proofRequired == ProofRequirement.both;

  bool get _needsSignature =>
      widget.proofRequired == ProofRequirement.signature ||
      widget.proofRequired == ProofRequirement.both;

  bool get _canSubmit {
    if (_needsPhoto && _photo == null) return false;
    if (_needsSignature && !_signatureCollected) return false;
    return true;
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1280,
        maxHeight: 1280,
        imageQuality: 80,
      );
      if (image != null && mounted) {
        setState(() {
          _photo = File(image.path);
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Failed to capture photo');
      }
    }
  }

  Future<void> _collectSignature() async {
    final padKey = GlobalKey<_SignaturePadState>();
    Uint8List? capturedBytes;

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cardBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Recipient Signature',
              style: TextStyle(
                color: AppColors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Ask the recipient to sign below',
              style: TextStyle(color: Colors.grey[400], fontSize: 13),
            ),
            const SizedBox(height: 12),
            Container(
              height: 200,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.inputBorder),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: _SignaturePad(key: padKey),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => padKey.currentState?.clear(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.grey,
                      side: const BorderSide(color: AppColors.darkGrey),
                      minimumSize: const Size(0, 48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text('Clear'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      capturedBytes = await padKey.currentState?.toBytes();
                      Navigator.of(ctx).pop(true);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.black,
                      minimumSize: const Size(0, 48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text('Confirm'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (confirmed == true && mounted) {
      setState(() {
        _signatureCollected = true;
        _signatureBytes = capturedBytes;
        _error = null;
      });
    }
  }

  Future<void> _submitProof() async {
    if (!_canSubmit || _isSubmitting) return;

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      String? signatureBase64;

      // Read photo bytes and encode as base64 (backend expects photoBase64, not a URL)
      String? photoBase64;
      if (_photo != null) {
        try {
          final bytes = await _photo!.readAsBytes();
          photoBase64 = base64Encode(bytes);
        } catch (e) {
          debugPrint('Photo read failed: $e');
        }
      }

      // Encode signature as base64 if captured
      if (_signatureCollected && _signatureBytes != null) {
        signatureBase64 = base64Encode(_signatureBytes!);
      }

      final success = await _deliveryService.uploadProof(
        deliveryId: widget.ride.id,
        photoBase64: photoBase64,
        signatureBase64: signatureBase64,
        notes: _notesController.text.isNotEmpty ? _notesController.text : null,
      );

      if (mounted) {
        if (success) {
          Navigator.of(context).pop(true);
        } else {
          setState(() {
            _error = 'Failed to upload proof. Try again.';
            _isSubmitting = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error: $e';
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text('Proof of Delivery'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Explanation
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.orange, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _proofDescription,
                      style: const TextStyle(color: AppColors.white, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Photo section
            if (_needsPhoto) ...[
              const Text(
                'Delivery Photo',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Take a photo of the package at the delivery location',
                style: TextStyle(color: Colors.grey[400], fontSize: 13),
              ),
              const SizedBox(height: 12),

              if (_photo != null)
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(
                        _photo!,
                        width: double.infinity,
                        height: 200,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: GestureDetector(
                        onTap: _takePhoto,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: AppColors.cardBackground,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.refresh, color: AppColors.white, size: 20),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.success,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.check, color: Colors.white, size: 14),
                            SizedBox(width: 4),
                            Text('Photo captured', style: TextStyle(color: Colors.white, fontSize: 12)),
                          ],
                        ),
                      ),
                    ),
                  ],
                )
              else
                GestureDetector(
                  onTap: _takePhoto,
                  child: Container(
                    width: double.infinity,
                    height: 160,
                    decoration: BoxDecoration(
                      color: AppColors.inputBackground,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.inputBorder,
                        style: BorderStyle.solid,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: Colors.orange.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt, color: Colors.orange, size: 28),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Tap to take photo',
                          style: TextStyle(color: AppColors.white, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),

              const SizedBox(height: 24),
            ],

            // Signature section
            if (_needsSignature) ...[
              const Text(
                'Recipient Signature',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Collect the recipient\'s signature to confirm delivery',
                style: TextStyle(color: Colors.grey[400], fontSize: 13),
              ),
              const SizedBox(height: 12),

              GestureDetector(
                onTap: _signatureCollected ? null : _collectSignature,
                child: Container(
                  width: double.infinity,
                  height: 80,
                  decoration: BoxDecoration(
                    color: _signatureCollected
                        ? AppColors.success.withValues(alpha: 0.1)
                        : AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _signatureCollected
                          ? AppColors.success
                          : AppColors.inputBorder,
                    ),
                  ),
                  child: Center(
                    child: _signatureCollected
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.check_circle, color: AppColors.success, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Signature collected',
                                style: TextStyle(color: AppColors.success, fontSize: 14),
                              ),
                            ],
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.draw, color: Colors.grey[400], size: 20),
                              const SizedBox(width: 8),
                              Text(
                                'Tap to collect signature',
                                style: TextStyle(color: Colors.grey[400], fontSize: 14),
                              ),
                            ],
                          ),
                  ),
                ),
              ),

              const SizedBox(height: 24),
            ],

            // Notes field
            const Text(
              'Delivery Notes (optional)',
              style: TextStyle(
                color: AppColors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              maxLines: 3,
              style: const TextStyle(color: AppColors.white),
              decoration: InputDecoration(
                hintText: 'e.g. Left at front door, handed to security...',
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
                  borderSide: const BorderSide(color: AppColors.primary),
                ),
              ),
            ),

            // Error display
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(color: AppColors.error, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Submit button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _canSubmit && !_isSubmitting ? _submitProof : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _canSubmit ? AppColors.success : AppColors.darkGrey,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  disabledBackgroundColor: AppColors.darkGrey,
                  disabledForegroundColor: AppColors.grey,
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Submit Proof & Complete',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
              ),
            ),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  String get _proofDescription {
    switch (widget.proofRequired) {
      case ProofRequirement.photo:
        return 'Please take a photo of the delivered package as proof of delivery.';
      case ProofRequirement.signature:
        return 'Please collect the recipient\'s signature as proof of delivery.';
      case ProofRequirement.both:
        return 'Please take a photo and collect the recipient\'s signature as proof.';
      case ProofRequirement.none:
        return '';
    }
  }
}

/// Drawable signature pad using CustomPainter — no external packages required.
class _SignaturePad extends StatefulWidget {
  const _SignaturePad({super.key});

  @override
  _SignaturePadState createState() => _SignaturePadState();
}

class _SignaturePadState extends State<_SignaturePad> {
  final List<List<Offset>> _strokes = [];
  List<Offset> _currentStroke = [];
  final _repaintKey = GlobalKey();

  void clear() {
    setState(() {
      _strokes.clear();
      _currentStroke.clear();
    });
  }

  Future<Uint8List?> toBytes() async {
    try {
      final boundary = _repaintKey.currentContext?.findRenderObject()
          as RenderRepaintBoundary?;
      if (boundary == null) return null;
      final image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      return byteData?.buffer.asUint8List();
    } catch (e) {
      debugPrint('Signature capture error: $e');
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      key: _repaintKey,
      child: GestureDetector(
        onPanStart: (details) {
          setState(() {
            _currentStroke = [details.localPosition];
          });
        },
        onPanUpdate: (details) {
          setState(() {
            _currentStroke.add(details.localPosition);
          });
        },
        onPanEnd: (_) {
          setState(() {
            if (_currentStroke.isNotEmpty) {
              _strokes.add(List.from(_currentStroke));
            }
            _currentStroke = [];
          });
        },
        child: CustomPaint(
          painter: _SignaturePainter(
            strokes: _strokes,
            currentStroke: _currentStroke,
          ),
          child: Container(
            color: Colors.transparent,
            width: double.infinity,
            height: double.infinity,
          ),
        ),
      ),
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<List<Offset>> strokes;
  final List<Offset> currentStroke;

  _SignaturePainter({required this.strokes, required this.currentStroke});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black87
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    for (final stroke in [...strokes, currentStroke]) {
      if (stroke.length < 2) continue;
      final path = Path()..moveTo(stroke[0].dx, stroke[0].dy);
      for (var i = 1; i < stroke.length; i++) {
        path.lineTo(stroke[i].dx, stroke[i].dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter old) => true;
}
