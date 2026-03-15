import '../../../ride/data/models/ride_model.dart';

/// Package type categories for deliveries.
enum PackageType {
  documents,
  parcel,
  bulk,
  food,
  medical;

  String get label {
    switch (this) {
      case PackageType.documents:
        return 'Documents';
      case PackageType.parcel:
        return 'Parcel';
      case PackageType.bulk:
        return 'Bulk';
      case PackageType.food:
        return 'Food';
      case PackageType.medical:
        return 'Medical';
    }
  }

  IconLabel get iconLabel {
    switch (this) {
      case PackageType.documents:
        return const IconLabel(icon: 0xe24d, label: 'Documents'); // description
      case PackageType.parcel:
        return const IconLabel(icon: 0xf0475, label: 'Parcel'); // inventory_2
      case PackageType.bulk:
        return const IconLabel(icon: 0xe072, label: 'Bulk'); // all_inbox
      case PackageType.food:
        return const IconLabel(icon: 0xf0559, label: 'Food'); // restaurant
      case PackageType.medical:
        return const IconLabel(icon: 0xe3f1, label: 'Medical'); // medical_services
    }
  }

  static PackageType fromString(String value) {
    return PackageType.values.firstWhere(
      (e) => e.name == value,
      orElse: () => PackageType.parcel,
    );
  }
}

class IconLabel {
  final int icon;
  final String label;
  const IconLabel({required this.icon, required this.label});
}

/// Proof of delivery requirement.
enum ProofRequirement {
  photo,
  signature,
  both,
  none;

  static ProofRequirement fromString(String? value) {
    if (value == null) return ProofRequirement.none;
    return ProofRequirement.values.firstWhere(
      (e) => e.name == value,
      orElse: () => ProofRequirement.none,
    );
  }
}

/// Delivery service type (instant, same_day, scheduled).
enum DeliveryServiceType {
  instant,
  sameDay,
  scheduled;

  String get apiValue {
    switch (this) {
      case DeliveryServiceType.instant:
        return 'instant';
      case DeliveryServiceType.sameDay:
        return 'same_day';
      case DeliveryServiceType.scheduled:
        return 'scheduled';
    }
  }

  String get label {
    switch (this) {
      case DeliveryServiceType.instant:
        return 'Instant';
      case DeliveryServiceType.sameDay:
        return 'Same Day';
      case DeliveryServiceType.scheduled:
        return 'Scheduled';
    }
  }

  static DeliveryServiceType fromString(String? value) {
    switch (value) {
      case 'same_day':
        return DeliveryServiceType.sameDay;
      case 'scheduled':
        return DeliveryServiceType.scheduled;
      default:
        return DeliveryServiceType.instant;
    }
  }
}

/// Contact information for pickup or dropoff.
class DeliveryContact {
  final String name;
  final String phone;
  final String? instructions;

  DeliveryContact({
    required this.name,
    required this.phone,
    this.instructions,
  });

  factory DeliveryContact.fromJson(Map<String, dynamic> json) {
    return DeliveryContact(
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      instructions: json['instructions'],
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'phone': phone,
    if (instructions != null) 'instructions': instructions,
  };
}

/// Delivery details nested inside a ride/delivery document.
class DeliveryDetails {
  final PackageType packageType;
  final double? packageValue;
  final double? weightKg;
  final DeliveryServiceType serviceType;
  final bool requiresReturn;
  final int extraStops;
  final DeliveryContact? dropoffContact;
  final DeliveryContact? pickupContact;
  final ProofRequirement proofRequired;
  final String? description;

  DeliveryDetails({
    required this.packageType,
    this.packageValue,
    this.weightKg,
    required this.serviceType,
    this.requiresReturn = false,
    this.extraStops = 0,
    this.dropoffContact,
    this.pickupContact,
    this.proofRequired = ProofRequirement.none,
    this.description,
  });

  factory DeliveryDetails.fromJson(Map<String, dynamic> json) {
    return DeliveryDetails(
      packageType: PackageType.fromString(json['packageType'] ?? 'parcel'),
      packageValue: (json['packageValue'] as num?)?.toDouble(),
      weightKg: (json['weightKg'] as num?)?.toDouble()
          ?? (json['packageDetails'] is Map ? (json['packageDetails']['weight'] as num?)?.toDouble() : null),
      serviceType: DeliveryServiceType.fromString(json['serviceType']),
      requiresReturn: json['requiresReturn'] ?? false,
      extraStops: json['extraStops'] ?? 0,
      dropoffContact: json['dropoffContact'] != null
          ? DeliveryContact.fromJson(json['dropoffContact'])
          : (json['recipientName'] != null || json['recipientPhone'] != null)
              ? DeliveryContact(
                  name: json['recipientName'] ?? '',
                  phone: json['recipientPhone'] ?? '',
                  instructions: json['notes'],
                )
              : null,
      pickupContact: json['pickupContact'] != null
          ? DeliveryContact.fromJson(json['pickupContact'])
          : null,
      proofRequired: ProofRequirement.fromString(json['proofRequired']),
      description: json['description']
          ?? json['packageDescription']
          ?? (json['packageDetails'] is Map ? json['packageDetails']['description'] : null),
    );
  }

  Map<String, dynamic> toJson() => {
    'packageType': packageType.name,
    if (packageValue != null) 'packageValue': packageValue,
    if (weightKg != null) 'weightKg': weightKg,
    'serviceType': serviceType.apiValue,
    'requiresReturn': requiresReturn,
    'extraStops': extraStops,
    if (dropoffContact != null) 'dropoffContact': dropoffContact!.toJson(),
    if (pickupContact != null) 'pickupContact': pickupContact!.toJson(),
    'proofRequired': proofRequired.name,
    if (description != null) 'description': description,
  };
}

/// A delivery request received via socket — extends ride data with delivery fields.
class DeliveryRequest {
  final String id;
  final String riderId;
  final String senderName;
  final String senderPhone;
  final RideLocation pickupLocation;
  final RideLocation dropoffLocation;
  final double estimatedFare;
  final String currency;
  final double distanceKm;
  final int estimatedDurationMin;
  final DeliveryDetails deliveryDetails;
  final String vehicleCategory;
  final DateTime createdAt;

  DeliveryRequest({
    required this.id,
    required this.riderId,
    required this.senderName,
    required this.senderPhone,
    required this.pickupLocation,
    required this.dropoffLocation,
    required this.estimatedFare,
    required this.currency,
    required this.distanceKm,
    required this.estimatedDurationMin,
    required this.deliveryDetails,
    required this.vehicleCategory,
    required this.createdAt,
  });

  factory DeliveryRequest.fromJson(Map<String, dynamic> json) {
    final pickup = json['pickupLocation'] as Map<String, dynamic>?;
    final dropoff = json['dropoffLocation'] as Map<String, dynamic>?;
    final pricing = json['pricing'] as Map<String, dynamic>?;
    final delivery = json['deliveryDetails'] as Map<String, dynamic>?;

    return DeliveryRequest(
      id: json['id'] ?? json['rideId'] ?? json['_id'] ?? '',
      riderId: json['riderId'] ?? '',
      senderName: json['riderName'] ?? json['senderName'] ?? 'Sender',
      senderPhone: json['riderPhone'] ?? json['senderPhone'] ?? '',
      pickupLocation: RideLocation.fromJson(pickup ?? {}),
      dropoffLocation: RideLocation.fromJson(dropoff ?? {}),
      estimatedFare:
          (json['estimatedFare'] ?? pricing?['estimatedFare'] as num?)
              ?.toDouble() ?? 0.0,
      currency: json['currency'] ?? pricing?['currency'] ?? 'NGN',
      distanceKm:
          (json['distance'] ?? json['distanceKm'] as num?)?.toDouble() ?? 0.0,
      estimatedDurationMin:
          (json['duration'] ?? json['etaSeconds'] as num?)?.toInt() ?? 0,
      deliveryDetails: delivery != null
          ? DeliveryDetails.fromJson(delivery)
          : DeliveryDetails(
              packageType: PackageType.parcel,
              serviceType: DeliveryServiceType.instant,
            ),
      vehicleCategory: json['vehicleCategory'] ?? 'motorbike',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

/// Full delivery entity from the backend (extends Ride with delivery fields).
class Delivery {
  final Ride ride;
  final DeliveryDetails deliveryDetails;

  Delivery({required this.ride, required this.deliveryDetails});

  factory Delivery.fromJson(Map<String, dynamic> json) {
    return Delivery(
      ride: Ride.fromJson(json),
      deliveryDetails: DeliveryDetails.fromJson(
        json['deliveryDetails'] ?? {},
      ),
    );
  }

  // Convenience getters
  String get id => ride.id;
  String get status => ride.status;
  RideLocation get pickupLocation => ride.pickupLocation;
  RideLocation get dropoffLocation => ride.dropoffLocation;
  double get fare => ride.fare;
  String get currency => ride.pricing.currency;
  String get vehicleCategory => ride.vehicleCategory;
  Rider? get rider => ride.rider;
}
