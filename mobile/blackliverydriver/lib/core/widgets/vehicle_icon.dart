import 'package:flutter/material.dart';

/// Vehicle type enum matching backend VehicleCategory
enum VehicleType { sedan, suv, xl, premium, motorbike, cargoVan }

/// Maps a vehicle ID string or display name to a [VehicleType].
///
/// Accepts backend IDs ('sedan', 'suv', 'xl', 'first_class', 'motorbike',
/// 'cargo_van') and display names ('Standard', 'SUV', 'XL', 'Premium',
/// 'Moto', 'Economy', 'Cargo Van').
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
    case 'cargo_van':
    case 'cargo':
    case 'van':
      return VehicleType.cargoVan;
    default:
      return VehicleType.sedan;
  }
}

/// Vehicle icon using built-in Flutter Material Icons.
///
/// Each [VehicleType] maps to a distinctive Material icon:
///   - **sedan** — compact car
///   - **suv** — filled car
///   - **xl** — shuttle / minibus
///   - **premium** — star + car
///   - **motorbike** — two-wheeler
///   - **cargoVan** — local shipping truck
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

  IconData get _iconData {
    switch (type) {
      case VehicleType.sedan:
        return Icons.local_taxi_rounded;
      case VehicleType.suv:
        return Icons.directions_car_filled_rounded;
      case VehicleType.xl:
        return Icons.airport_shuttle_rounded;
      case VehicleType.premium:
        return Icons.star_rounded;
      case VehicleType.motorbike:
        return Icons.two_wheeler_rounded;
      case VehicleType.cargoVan:
        return Icons.local_shipping_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Icon(_iconData, size: size, color: color);
  }
}
