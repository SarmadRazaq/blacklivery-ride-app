class RideOption {
  final String id;
  final String name;
  final String description;
  final String iconPath;
  final double basePrice;
  final double pricePerKm;
  final int estimatedMinutes;
  final int capacity;

  RideOption({
    required this.id,
    required this.name,
    required this.description,
    required this.iconPath,
    required this.basePrice,
    required this.pricePerKm,
    required this.estimatedMinutes,
    required this.capacity,
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
    };
  }

  double calculatePrice(double distanceKm) {
    return basePrice + (pricePerKm * distanceKm);
  }
}
