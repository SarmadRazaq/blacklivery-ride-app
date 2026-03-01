import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class MapPreview extends StatelessWidget {
  const MapPreview({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 180,
      decoration: BoxDecoration(
        color: AppColors.bgSec,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.inputBorder,
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            // Map Background - dark map style
            CustomPaint(
              size: const Size(double.infinity, 180),
              painter: _MapPainter(),
            ),
            // Live Badge
            Positioned(
              top: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.red,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Live',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            // Car Icons on Map
            const Positioned(
              top: 60,
              left: 80,
              child: _CarIcon(),
            ),
            const Positioned(
              top: 40,
              right: 100,
              child: _CarIcon(),
            ),
            const Positioned(
              bottom: 50,
              left: 120,
              child: _CarIcon(),
            ),
            const Positioned(
              top: 80,
              right: 60,
              child: _CarIcon(),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.bgSec
      ..style = PaintingStyle.fill;
    
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), paint);
    
    // Draw grid lines to simulate map roads
    final linePaint = Paint()
      ..color = AppColors.inputBorder.withOpacity(0.3)
      ..strokeWidth = 1;
    
    // Horizontal lines
    for (int i = 0; i < 6; i++) {
      final y = (size.height / 6) * i + 20;
      canvas.drawLine(
        Offset(0, y),
        Offset(size.width, y + 10),
        linePaint,
      );
    }
    
    // Vertical lines
    for (int i = 0; i < 8; i++) {
      final x = (size.width / 8) * i + 10;
      canvas.drawLine(
        Offset(x, 0),
        Offset(x + 20, size.height),
        linePaint,
      );
    }
    
    // Draw some curved roads
    final roadPaint = Paint()
      ..color = AppColors.inputBorder.withOpacity(0.5)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    
    final path = Path();
    path.moveTo(0, size.height * 0.3);
    path.quadraticBezierTo(
      size.width * 0.5, size.height * 0.5,
      size.width, size.height * 0.4,
    );
    canvas.drawPath(path, roadPaint);
    
    final path2 = Path();
    path2.moveTo(size.width * 0.2, 0);
    path2.quadraticBezierTo(
      size.width * 0.4, size.height * 0.6,
      size.width * 0.3, size.height,
    );
    canvas.drawPath(path2, roadPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _CarIcon extends StatelessWidget {
  const _CarIcon();

  @override
  Widget build(BuildContext context) {
    return Transform.rotate(
      angle: -0.5,
      child: Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(4),
        ),
        child: const Icon(
          Icons.directions_car,
          color: AppColors.bgPri,
          size: 16,
        ),
      ),
    );
  }
}
