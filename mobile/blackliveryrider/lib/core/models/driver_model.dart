class Driver {
  final String id;
  final String name;
  final String photoUrl;
  final double rating;
  final int totalRides;
  final String carModel;
  final String carColor;
  final String licensePlate;
  final String phone;
  final double latitude;
  final double longitude;

  Driver({
    required this.id,
    required this.name,
    required this.photoUrl,
    required this.rating,
    required this.totalRides,
    required this.carModel,
    required this.carColor,
    required this.licensePlate,
    this.phone = '',
    required this.latitude,
    required this.longitude,
  });

  factory Driver.fromJson(Map<String, dynamic> json) {
    return Driver(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Unknown Driver',
      photoUrl: json['photoUrl'] ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      totalRides: json['totalRides'] ?? 0,
      carModel: json['carModel'] ?? '',
      carColor: json['carColor'] ?? '',
      licensePlate: json['licensePlate'] ?? '',
      phone: json['phone'] ?? json['phoneNumber'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
