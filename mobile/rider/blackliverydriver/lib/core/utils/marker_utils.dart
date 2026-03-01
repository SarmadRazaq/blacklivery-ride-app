import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../widgets/vehicle_icon.dart';

class MarkerUtils {
  /// Builds a compact Google Maps marker from Flutter's built-in car icon.
  static Future<BitmapDescriptor> getVehicleMarker(
    VehicleType type, {
    Color color = Colors.white,
    double size = 64,
  }) async {
    try {
      final markerSize = size.clamp(40, 96).toDouble();
      final iconSize = markerSize * 0.58;

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final circleRadius = markerSize / 2;
      final center = Offset(circleRadius, circleRadius);

      final bgPaint = Paint()..color = Colors.black.withValues(alpha: 0.78);
      final borderPaint = Paint()
        ..color = Colors.white.withValues(alpha: 0.9)
        ..style = PaintingStyle.stroke
        ..strokeWidth = markerSize * 0.05;

      canvas.drawCircle(center, circleRadius, bgPaint);
      canvas.drawCircle(center, circleRadius - (borderPaint.strokeWidth / 2), borderPaint);

      final textSpan = TextSpan(
        text: String.fromCharCode(Icons.directions_car_filled_rounded.codePoint),
        style: TextStyle(
          fontSize: iconSize,
          fontFamily: Icons.directions_car_filled_rounded.fontFamily,
          package: Icons.directions_car_filled_rounded.fontPackage,
          color: color,
        ),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      )..layout();

      textPainter.paint(
        canvas,
        Offset(
          center.dx - (textPainter.width / 2),
          center.dy - (textPainter.height / 2),
        ),
      );

      final picture = recorder.endRecording();
      final image = await picture.toImage(markerSize.toInt(), markerSize.toInt());
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      if (bytes == null) return BitmapDescriptor.defaultMarker;
      return BitmapDescriptor.bytes(bytes.buffer.asUint8List());
    } catch (_) {
      return BitmapDescriptor.defaultMarker;
    }
  }
}
