class SavedPlace {
  final String id;
  final String name;
  final String address;
  final String type; // 'home', 'work', 'other'
  final double latitude;
  final double longitude;

  SavedPlace({
    required this.id,
    required this.name,
    required this.address,
    required this.type,
    this.latitude = 0.0,
    this.longitude = 0.0,
  });

  factory SavedPlace.fromJson(Map<String, dynamic> json) {
    return SavedPlace(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      type: json['type'] ?? json['label'] ?? 'other',
      latitude: (json['latitude'] as num?)?.toDouble() ??
          (json['lat'] as num?)?.toDouble() ??
          0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ??
          (json['lng'] as num?)?.toDouble() ??
          0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'label': type,
      'lat': latitude,
      'lng': longitude,
    };
  }
}
