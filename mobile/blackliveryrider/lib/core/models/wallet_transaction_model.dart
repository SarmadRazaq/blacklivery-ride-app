class WalletTransaction {
  final String id;
  final String description;
  final DateTime date;
  final double amount;
  final String type; // 'credit' or 'debit'
  final String status; // 'pending' | 'success' | 'failed'
  final String currency;
  final String? reference;
  final String? serviceType; // 'ride' | 'delivery' | 'airport' | 'topup' | 'payout' | 'refund' | 'other'

  WalletTransaction({
    required this.id,
    required this.description,
    required this.date,
    required this.amount,
    required this.type,
    this.status = 'success',
    this.currency = 'NGN',
    this.reference,
    this.serviceType,
  });

  bool get isPending => status == 'pending';
  bool get isFailed => status == 'failed';

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    // Backend sends 'createdAt' (Firestore timestamp or ISO string), fallback to 'date'
    DateTime parsedDate = DateTime.now();
    final rawDate = json['createdAt'] ?? json['date'];
    if (rawDate != null) {
      if (rawDate is String) {
        parsedDate = DateTime.tryParse(rawDate) ?? DateTime.now();
      } else if (rawDate is Map && rawDate['_seconds'] != null) {
        // Firestore Timestamp serialized as {_seconds, _nanoseconds}
        parsedDate = DateTime.fromMillisecondsSinceEpoch(
          (rawDate['_seconds'] as int) * 1000,
        );
      }
    }

    return WalletTransaction(
      id: json['id'] ?? '',
      description: json['description'] ?? json['narration'] ?? '',
      date: parsedDate,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      type: json['type'] ?? 'debit',
      status: json['status'] ?? 'success',
      currency: json['currency'] ?? 'NGN',
      reference: json['reference'] ?? json['ref'] ?? json['transactionRef'],
      serviceType: json['serviceType'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'description': description,
      'date': date.toIso8601String(),
      'amount': amount,
      'type': type,
      'status': status,
      'currency': currency,
      if (reference != null) 'reference': reference,
      if (serviceType != null) 'serviceType': serviceType,
    };
  }
}
