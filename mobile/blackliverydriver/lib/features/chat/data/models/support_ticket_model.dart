class SupportTicketMessage {
  final String senderId;
  final String role; // 'user' | 'admin'
  final String content;
  final DateTime createdAt;

  SupportTicketMessage({
    required this.senderId,
    required this.role,
    required this.content,
    required this.createdAt,
  });

  factory SupportTicketMessage.fromJson(Map<String, dynamic> json) {
    return SupportTicketMessage(
      senderId: json['senderId'] ?? '',
      role: json['role'] ?? 'user',
      content: json['content'] ?? '',
      createdAt: _parseDate(json['createdAt']),
    );
  }

  static DateTime _parseDate(dynamic date) {
    if (date is String) {
      return DateTime.parse(date);
    } else if (date is Map) {
      // Handle Firestore Timestamp {_seconds, _nanoseconds}
      final int seconds = date['_seconds'] ?? 0;
      final int nanoseconds = date['_nanoseconds'] ?? 0;
      return DateTime.fromMillisecondsSinceEpoch(
        seconds * 1000 + (nanoseconds / 1000000).round(),
      );
    }
    return DateTime.now();
  }

  bool get isFromAdmin => role == 'admin';
}

class SupportTicket {
  final String id;
  final String subject;
  final String description;
  final String status; // 'open', 'in_progress', 'resolved', 'closed'
  final String priority;
  final DateTime createdAt;
  final List<SupportTicketMessage> messages;

  SupportTicket({
    required this.id,
    required this.subject,
    required this.description,
    required this.status,
    required this.priority,
    required this.createdAt,
    required this.messages,
  });

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    var rawMessages = json['messages'] as List? ?? [];
    List<SupportTicketMessage> parsedMessages = rawMessages
        .map((m) => SupportTicketMessage.fromJson(m))
        .toList();

    // Sort messages by date
    parsedMessages.sort((a, b) => a.createdAt.compareTo(b.createdAt));

    return SupportTicket(
      id: json['id'] ?? '',
      subject: json['subject'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'open',
      priority: json['priority'] ?? 'normal',
      createdAt: SupportTicketMessage._parseDate(json['createdAt']),
      messages: parsedMessages,
    );
  }
}
