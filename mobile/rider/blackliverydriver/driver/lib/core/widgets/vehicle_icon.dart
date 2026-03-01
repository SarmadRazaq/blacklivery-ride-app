import 'package:flutter/material.dart';

/// Vehicle type enum matching backend VehicleCategory
enum VehicleType { sedan, suv, xl, premium, motorbike }

/// Maps a vehicle ID string or display name to a [VehicleType].
///
/// Accepts backend IDs ('sedan', 'suv', 'xl', 'first_class', 'motorbike')
/// and display names ('Standard', 'SUV', 'XL', 'Premium', 'Moto', 'Economy').
VehicleType vehicleTypeFromId(String id) {
  switch (id.toLowerCase()) {
    case 'sedan':
    case 'standard':
    case 'economy':
    case 'business_sedan':
      return VehicleType.sedan;
    case 'suv':
    case 'business_suv':
      return VehicleType.suv;
    case 'xl':
    case 'minivan':
      return VehicleType.xl;
    case 'first_class':
    case 'premium':
    case 'luxury':
      return VehicleType.premium;
    case 'motorbike':
    case 'moto':
    case 'motorcycle':
      return VehicleType.motorbike;
    default:
      return VehicleType.sedan;
  }
}

/// Uber-style flat vehicle silhouette icon.
///
/// Renders a side-profile vehicle silhouette using [CustomPainter].
/// Each [VehicleType] has a distinct shape:
///   - **sedan** — low compact sedan profile
///   - **suv** — taller, boxier SUV profile
///   - **xl** — stretched minivan/van profile
///   - **premium** — sleek luxury sedan with longer hood
///   - **motorbike** — motorcycle silhouette
class VehicleIcon extends StatelessWidget {
  final VehicleType type;
  final double size;
  final Color color;

  const VehicleIcon({
    super.key,
    required this.type,
    this.size = 48,
    this.color = Colors.white,
  });

  /// Convenience factory from a vehicle ID string (e.g. 'sedan', 'suv').
  factory VehicleIcon.fromId(
    String id, {
    Key? key,
    double size = 48,
    Color color = Colors.white,
  }) {
    return VehicleIcon(
      key: key,
      type: vehicleTypeFromId(id),
      size: size,
      color: color,
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size * 0.55,
      child: CustomPaint(
        painter: VehiclePainter(type: type, color: color),
      ),
    );
  }
}

class VehiclePainter extends CustomPainter {
  final VehicleType type;
  final Color color;

  VehiclePainter({required this.type, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    switch (type) {
      case VehicleType.sedan:
        _paintSedan(canvas, size);
        break;
      case VehicleType.suv:
        _paintSUV(canvas, size);
        break;
      case VehicleType.xl:
        _paintXL(canvas, size);
        break;
      case VehicleType.premium:
        _paintPremium(canvas, size);
        break;
      case VehicleType.motorbike:
        _paintMotorbike(canvas, size);
        break;
    }
  }

  void _paintSedan(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final body = Path()
      ..moveTo(w * 0.05, h * 0.70)
      ..lineTo(w * 0.10, h * 0.70)
      ..lineTo(w * 0.12, h * 0.55)
      ..lineTo(w * 0.30, h * 0.50)
      ..lineTo(w * 0.38, h * 0.20)
      ..lineTo(w * 0.62, h * 0.18)
      ..lineTo(w * 0.75, h * 0.45)
      ..lineTo(w * 0.90, h * 0.50)
      ..lineTo(w * 0.95, h * 0.55)
      ..lineTo(w * 0.95, h * 0.70)
      ..close();
    canvas.drawPath(body, paint);

    final windowPaint = Paint()
      ..color = color.withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;
    final window = Path()
      ..moveTo(w * 0.34, h * 0.48)
      ..lineTo(w * 0.39, h * 0.24)
      ..lineTo(w * 0.61, h * 0.22)
      ..lineTo(w * 0.72, h * 0.47)
      ..close();
    canvas.drawPath(window, windowPaint);

    final pillarPaint = Paint()
      ..color = color
      ..strokeWidth = w * 0.015
      ..style = PaintingStyle.stroke;
    canvas.drawLine(
      Offset(w * 0.50, h * 0.21),
      Offset(w * 0.50, h * 0.48),
      pillarPaint,
    );

    _drawWheel(canvas, Offset(w * 0.24, h * 0.73), w * 0.075, color);
    _drawWheel(canvas, Offset(w * 0.78, h * 0.73), w * 0.075, color);

    final lightPaint = Paint()
      ..color = color.withValues(alpha: 0.6)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.06, h * 0.56, w * 0.05, h * 0.08),
        Radius.circular(w * 0.01),
      ),
      lightPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.91, h * 0.52, w * 0.03, h * 0.10),
        Radius.circular(w * 0.01),
      ),
      lightPaint,
    );
  }

  void _paintSUV(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final body = Path()
      ..moveTo(w * 0.05, h * 0.72)
      ..lineTo(w * 0.10, h * 0.72)
      ..lineTo(w * 0.12, h * 0.50)
      ..lineTo(w * 0.28, h * 0.45)
      ..lineTo(w * 0.34, h * 0.12)
      ..lineTo(w * 0.70, h * 0.10)
      ..lineTo(w * 0.76, h * 0.38)
      ..lineTo(w * 0.92, h * 0.40)
      ..lineTo(w * 0.95, h * 0.50)
      ..lineTo(w * 0.95, h * 0.72)
      ..close();
    canvas.drawPath(body, paint);

    final windowPaint = Paint()
      ..color = color.withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;
    final fw = Path()
      ..moveTo(w * 0.30, h * 0.44)
      ..lineTo(w * 0.35, h * 0.16)
      ..lineTo(w * 0.48, h * 0.14)
      ..lineTo(w * 0.48, h * 0.44)
      ..close();
    canvas.drawPath(fw, windowPaint);
    final rw = Path()
      ..moveTo(w * 0.51, h * 0.14)
      ..lineTo(w * 0.68, h * 0.14)
      ..lineTo(w * 0.74, h * 0.40)
      ..lineTo(w * 0.51, h * 0.44)
      ..close();
    canvas.drawPath(rw, windowPaint);

    final rackPaint = Paint()
      ..color = color.withValues(alpha: 0.5)
      ..strokeWidth = h * 0.025
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(w * 0.40, h * 0.09),
      Offset(w * 0.63, h * 0.09),
      rackPaint,
    );

    _drawWheel(canvas, Offset(w * 0.24, h * 0.76), w * 0.090, color);
    _drawWheel(canvas, Offset(w * 0.78, h * 0.76), w * 0.090, color);

    final lightPaint = Paint()
      ..color = color.withValues(alpha: 0.6)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.06, h * 0.52, w * 0.05, h * 0.10),
        Radius.circular(w * 0.01),
      ),
      lightPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.91, h * 0.42, w * 0.03, h * 0.12),
        Radius.circular(w * 0.01),
      ),
      lightPaint,
    );
  }

  void _paintXL(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final body = Path()
      ..moveTo(w * 0.03, h * 0.72)
      ..lineTo(w * 0.08, h * 0.72)
      ..lineTo(w * 0.10, h * 0.48)
      ..lineTo(w * 0.18, h * 0.42)
      ..lineTo(w * 0.24, h * 0.12)
      ..lineTo(w * 0.80, h * 0.10)
      ..lineTo(w * 0.82, h * 0.12)
      ..lineTo(w * 0.84, h * 0.40)
      ..lineTo(w * 0.95, h * 0.42)
      ..lineTo(w * 0.97, h * 0.50)
      ..lineTo(w * 0.97, h * 0.72)
      ..close();
    canvas.drawPath(body, paint);

    final windowPaint = Paint()
      ..color = color.withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;
    final fw = Path()
      ..moveTo(w * 0.20, h * 0.42)
      ..lineTo(w * 0.25, h * 0.16)
      ..lineTo(w * 0.40, h * 0.14)
      ..lineTo(w * 0.40, h * 0.42)
      ..close();
    canvas.drawPath(fw, windowPaint);
    final mw = Path()
      ..moveTo(w * 0.43, h * 0.14)
      ..lineTo(w * 0.60, h * 0.13)
      ..lineTo(w * 0.60, h * 0.42)
      ..lineTo(w * 0.43, h * 0.42)
      ..close();
    canvas.drawPath(mw, windowPaint);
    final rw = Path()
      ..moveTo(w * 0.63, h * 0.13)
      ..lineTo(w * 0.78, h * 0.13)
      ..lineTo(w * 0.82, h * 0.40)
      ..lineTo(w * 0.63, h * 0.42)
      ..close();
    canvas.drawPath(rw, windowPaint);

    final doorPaint = Paint()
      ..color = color.withValues(alpha: 0.4)
      ..strokeWidth = w * 0.008
      ..style = PaintingStyle.stroke;
    canvas.drawLine(
      Offset(w * 0.55, h * 0.42),
      Offset(w * 0.55, h * 0.70),
      doorPaint,
    );

    _drawWheel(canvas, Offset(w * 0.20, h * 0.76), w * 0.085, color);
    _drawWheel(canvas, Offset(w * 0.82, h * 0.76), w * 0.085, color);

    final lightPaint = Paint()
      ..color = color.withValues(alpha: 0.6)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.04, h * 0.50, w * 0.05, h * 0.10),
        Radius.circular(w * 0.01),
      ),
      lightPaint,
    );
  }

  void _paintPremium(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final body = Path()
      ..moveTo(w * 0.02, h * 0.68)
      ..lineTo(w * 0.08, h * 0.68)
      ..lineTo(w * 0.10, h * 0.52)
      ..lineTo(w * 0.35, h * 0.48)
      ..lineTo(w * 0.44, h * 0.18)
      ..lineTo(w * 0.60, h * 0.16)
      ..lineTo(w * 0.78, h * 0.40)
      ..lineTo(w * 0.92, h * 0.45)
      ..lineTo(w * 0.96, h * 0.52)
      ..lineTo(w * 0.98, h * 0.68)
      ..close();
    canvas.drawPath(body, paint);

    final windowPaint = Paint()
      ..color = color.withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;
    final window = Path()
      ..moveTo(w * 0.37, h * 0.47)
      ..lineTo(w * 0.45, h * 0.22)
      ..lineTo(w * 0.59, h * 0.20)
      ..lineTo(w * 0.74, h * 0.42)
      ..close();
    canvas.drawPath(window, windowPaint);

    final pillarPaint = Paint()
      ..color = color
      ..strokeWidth = w * 0.012
      ..style = PaintingStyle.stroke;
    canvas.drawLine(
      Offset(w * 0.53, h * 0.19),
      Offset(w * 0.53, h * 0.45),
      pillarPaint,
    );

    final trimPaint = Paint()
      ..color = color.withValues(alpha: 0.4)
      ..strokeWidth = h * 0.02
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(w * 0.12, h * 0.55),
      Offset(w * 0.90, h * 0.50),
      trimPaint,
    );

    _drawWheel(canvas, Offset(w * 0.22, h * 0.72), w * 0.075, color);
    _drawWheel(canvas, Offset(w * 0.82, h * 0.72), w * 0.075, color);

    final lightPaint = Paint()
      ..color = color.withValues(alpha: 0.6)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.04, h * 0.52, w * 0.06, h * 0.07),
        Radius.circular(w * 0.015),
      ),
      lightPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.92, h * 0.46, w * 0.04, h * 0.10),
        Radius.circular(w * 0.01),
      ),
      lightPaint,
    );
  }

  void _paintMotorbike(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final rearFender = Path()
      ..moveTo(w * 0.70, h * 0.50)
      ..quadraticBezierTo(w * 0.82, h * 0.35, w * 0.85, h * 0.50)
      ..lineTo(w * 0.70, h * 0.50)
      ..close();
    canvas.drawPath(rearFender, paint);

    final frame = Path()
      ..moveTo(w * 0.30, h * 0.55)
      ..lineTo(w * 0.35, h * 0.28)
      ..lineTo(w * 0.50, h * 0.22)
      ..lineTo(w * 0.58, h * 0.25)
      ..lineTo(w * 0.68, h * 0.32)
      ..lineTo(w * 0.78, h * 0.38)
      ..lineTo(w * 0.75, h * 0.55)
      ..lineTo(w * 0.50, h * 0.60)
      ..close();
    canvas.drawPath(frame, paint);

    final forkPaint = Paint()
      ..color = color
      ..strokeWidth = w * 0.025
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(w * 0.35, h * 0.30),
      Offset(w * 0.22, h * 0.62),
      forkPaint,
    );
    canvas.drawLine(
      Offset(w * 0.30, h * 0.20),
      Offset(w * 0.40, h * 0.22),
      forkPaint..strokeWidth = w * 0.02,
    );

    final lightPaint = Paint()
      ..color = color.withValues(alpha: 0.6)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(w * 0.30, h * 0.28), w * 0.030, lightPaint);

    final exhaustPaint = Paint()
      ..color = color.withValues(alpha: 0.5)
      ..strokeWidth = h * 0.04
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(w * 0.60, h * 0.58),
      Offset(w * 0.80, h * 0.52),
      exhaustPaint,
    );

    _drawWheel(canvas, Offset(w * 0.22, h * 0.72), w * 0.095, color);
    _drawWheel(canvas, Offset(w * 0.78, h * 0.72), w * 0.090, color);
  }

  void _drawWheel(Canvas canvas, Offset center, double radius, Color color) {
    final tirePaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, radius, tirePaint);
    final rimPaint = Paint()
      ..color = color.withValues(alpha: 0.15)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, radius * 0.60, rimPaint);
    final hubPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, radius * 0.20, hubPaint);
  }

  @override
  bool shouldRepaint(covariant VehiclePainter oldDelegate) {
    return oldDelegate.type != type || oldDelegate.color != color;
  }
}
