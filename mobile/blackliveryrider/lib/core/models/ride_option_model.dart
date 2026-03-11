class RideOption {
  final String id;
  final String name;
  final String description;
  final String iconPath;
  final double basePrice;
  final double pricePerKm;
  final int estimatedMinutes;
  final int capacity;
  final double surgeMultiplier;

  RideOption({
    required this.id,
    required this.name,
    required this.description,
    required this.iconPath,
    required this.basePrice,
    required this.pricePerKm,
    required this.estimatedMinutes,
    required this.capacity,
    this.surgeMultiplier = 1.0,
  });

  factory RideOption.fromJson(Map<String, dynamic> json) {
    return RideOption(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      iconPath: json['iconPath'] ?? '',
      basePrice: (json['basePrice'] as num?)?.toDouble() ?? 0.0,
      pricePerKm: (json['pricePerKm'] as num?)?.toDouble() ?? 0.0,
      estimatedMinutes: json['estimatedMinutes'] ?? 0,
      capacity: json['capacity'] ?? 4,
      surgeMultiplier: (json['surgeMultiplier'] as num?)?.toDouble() ?? 1.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'iconPath': iconPath,
      'basePrice': basePrice,
      'pricePerKm': pricePerKm,
      'estimatedMinutes': estimatedMinutes,
      'capacity': capacity,
      'surgeMultiplier': surgeMultiplier,
    };
  }

  bool get hasSurge => surgeMultiplier > 1.0;

  double calculatePrice(double distanceKm) {
    // Note: When basePrice comes from backend estimatedFare, surge is already included.
    // surgeMultiplier is stored for display purposes only.
    return basePrice + (pricePerKm * distanceKm);
  }

  /// Fallback option for ride recovery when original option is unknown.
  factory RideOption.defaultOption() => RideOption(
        id: 'sedan',
        name: 'Sedan',
        description: '',
        iconPath: '',
        basePrice: 0,
        pricePerKm: 0,
        estimatedMinutes: 0,
        capacity: 4,
      );
}
