import 'package:flutter/material.dart';

import '../../core/constants/assets.dart';

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

/// Uber-style isometric vehicle icon.
///
/// Displays the corresponding 3D isometric PNG icon for each vehicle type.
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

  String get _assetPath {
    switch (type) {
      case VehicleType.sedan:
        return AppAssets.sedanIcon;
      case VehicleType.suv:
        return AppAssets.suvIcon;
      case VehicleType.xl:
        return AppAssets.xlIcon;
      case VehicleType.premium:
        return AppAssets.premiumIcon;
      case VehicleType.motorbike:
        return AppAssets.motorbikeIcon;
    }
  }

  @override
  Widget build(BuildContext context) {
    // The color parameter is ignored for the new 3D icons as they come
    // pre-rendered in black/dark-grey realistic styling.
    return SizedBox(
      width: size * 1.5,
      height: size,
      child: Center(child: Image.asset(_assetPath, fit: BoxFit.contain)),
    );
  }
}
