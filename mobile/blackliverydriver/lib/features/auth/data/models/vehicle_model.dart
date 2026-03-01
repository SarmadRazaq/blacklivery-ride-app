class Vehicle {
  final String id;
  final String name; // Combined make + model from backend
  final String year;
  final String plateNumber;
  final String? status; // Derived from isApproved or status field
  final int seats;
  final String category;

  Vehicle({
    required this.id,
    required this.name,
    required this.year,
    required this.plateNumber,
    this.status,
    this.seats = 4,
    this.category = 'ride',
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      year: json['year']?.toString() ?? '',
      plateNumber: json['plateNumber'] ?? '',
      status:
          json['status'] ?? (json['isApproved'] == true ? 'Active' : 'Pending'),
      seats: json['seats'] ?? 4,
      category: json['category'] ?? 'ride',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'year': year,
      'plateNumber': plateNumber,
      'seats': seats,
      'category': category,
    };
  }
}
