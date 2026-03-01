import 'location_model.dart';
import 'ride_option_model.dart';
import 'driver_model.dart';

class Booking {
  final String id;
  final Location pickup;
  final Location dropoff;
  final RideOption rideOption;
  final Driver? driver;
  final DateTime scheduledTime;
  final double estimatedPrice;
  final double distanceKm;
  final String status; // 'pending', 'confirmed', 'arriving', 'in_progress', 'completed', 'cancelled'
  final bool isForSomeoneElse;
  final String? recipientName;
  final String? recipientPhone;

  Booking({
    required this.id,
    required this.pickup,
    required this.dropoff,
    required this.rideOption,
    this.driver,
    required this.scheduledTime,
    required this.estimatedPrice,
    required this.distanceKm,
    required this.status,
    this.isForSomeoneElse = false,
    this.recipientName,
    this.recipientPhone,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] ?? '',
      pickup: Location.fromJson(json['pickup'] ?? {}),
      dropoff: Location.fromJson(json['dropoff'] ?? {}),
      rideOption: RideOption.fromJson(json['rideOption'] ?? {}),
      driver: json['driver'] != null ? Driver.fromJson(json['driver']) : null,
      scheduledTime: json['scheduledTime'] != null 
          ? DateTime.parse(json['scheduledTime']) 
          : DateTime.now(),
      estimatedPrice: (json['estimatedPrice'] as num?)?.toDouble() ?? 0.0,
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'pending',
      isForSomeoneElse: json['isForSomeoneElse'] ?? false,
      recipientName: json['recipientName'],
      recipientPhone: json['recipientPhone'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'pickup': pickup.toJson(),
      'dropoff': dropoff.toJson(),
      'rideOption': rideOption.toJson(),
      'driver': driver != null ? {
        'id': driver!.id,
        'name': driver!.name,
      } : null,
      'scheduledTime': scheduledTime.toIso8601String(),
      'estimatedPrice': estimatedPrice,
      'distanceKm': distanceKm,
      'status': status,
      'isForSomeoneElse': isForSomeoneElse,
      'recipientName': recipientName,
      'recipientPhone': recipientPhone,
    };
  }

  Booking copyWith({
    String? id,
    Location? pickup,
    Location? dropoff,
    RideOption? rideOption,
    Driver? driver,
    DateTime? scheduledTime,
    double? estimatedPrice,
    double? distanceKm,
    String? status,
    bool? isForSomeoneElse,
    String? recipientName,
    String? recipientPhone,
  }) {
    return Booking(
      id: id ?? this.id,
      pickup: pickup ?? this.pickup,
      dropoff: dropoff ?? this.dropoff,
      rideOption: rideOption ?? this.rideOption,
      driver: driver ?? this.driver,
      scheduledTime: scheduledTime ?? this.scheduledTime,
      estimatedPrice: estimatedPrice ?? this.estimatedPrice,
      distanceKm: distanceKm ?? this.distanceKm,
      status: status ?? this.status,
      isForSomeoneElse: isForSomeoneElse ?? this.isForSomeoneElse,
      recipientName: recipientName ?? this.recipientName,
      recipientPhone: recipientPhone ?? this.recipientPhone,
    );
  }
}
