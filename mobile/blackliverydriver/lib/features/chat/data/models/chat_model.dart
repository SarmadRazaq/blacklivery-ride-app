class ChatMessage {
  final String id;
  final String senderId;
  final String text;
  final DateTime timestamp;
  final bool isRead;
  final bool isFromDriver; // Helper to distinguish sender

  ChatMessage({
    required this.id,
    required this.senderId,
    required this.text,
    required this.timestamp,
    required this.isRead,
    required this.isFromDriver,
  });

  factory ChatMessage.fromJson(
    Map<String, dynamic> json,
    String currentDriverId,
  ) {
    final senderId = json['senderId'] ?? '';
    return ChatMessage(
      id: json['id'] ?? '',
      senderId: senderId,
      text: json['message'] ?? json['text'] ?? '',
      timestamp: DateTime.parse(
        json['createdAt']?.toString() ?? json['timestamp']?.toString() ?? DateTime.now().toIso8601String(),
      ),
      isRead: json['isRead'] ?? false,
      isFromDriver: senderId == currentDriverId,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'senderId': senderId,
      'message': text,
      'createdAt': timestamp.toIso8601String(),
      'isRead': isRead,
    };
  }
}
