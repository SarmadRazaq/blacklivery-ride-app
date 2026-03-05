class WalletTransaction {
  final String id;
  final String description;
  final DateTime date;
  final double amount;
  final String type; // 'credit' or 'debit'
  final String currency;
  final String? reference;

  WalletTransaction({
    required this.id,
    required this.description,
    required this.date,
    required this.amount,
    required this.type,
    this.currency = 'USD',
    this.reference,
  });

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
      currency: json['currency'] ?? 'USD',
      reference: json['reference'] ?? json['ref'] ?? json['transactionRef'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'description': description,
      'date': date.toIso8601String(),
      'amount': amount,
      'type': type,
      'currency': currency,
      if (reference != null) 'reference': reference,
    };
  }
}
