import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/support_service.dart';

class ChatMessage {
  final String text;
  final bool isFromSupport;
  final DateTime timestamp;

  ChatMessage({
    required this.text,
    required this.isFromSupport,
    required this.timestamp,
  });
}

class SupportChatScreen extends StatefulWidget {
  final String? ticketId;
  const SupportChatScreen({super.key, this.ticketId});

  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final SupportService _supportService = SupportService();
  final List<ChatMessage> _messages = [];
  String? _activeTicketId;
  bool _loading = true;

  static const Map<String, String> _categoryLabels = {
    'ride_issue': 'Ride Issue',
    'payment': 'Payment',
    'account': 'Account',
    'safety': 'Safety',
    'general': 'General',
  };
  String _selectedCategory = 'general';

  @override
  void initState() {
    super.initState();
    _activeTicketId = widget.ticketId;
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    setState(() => _loading = true);
    try {
      if (_activeTicketId != null) {
        final ticket = await _supportService.getTicketDetails(_activeTicketId!);
        if (ticket != null) {
          final messages = ticket['messages'] as List<dynamic>? ?? [];
          setState(() {
            _messages.clear();
            // Add the initial ticket description
            _messages.add(ChatMessage(
              text: ticket['description'] ?? ticket['subject'] ?? 'Support request',
              isFromSupport: false,
              timestamp: _parseDate(ticket['createdAt']),
            ));
            // Add conversation messages
            for (final msg in messages) {
              _messages.add(ChatMessage(
                text: msg['message'] ?? msg['text'] ?? '',
                isFromSupport: msg['senderRole'] == 'admin' || msg['sender'] == 'support',
                timestamp: _parseDate(msg['createdAt'] ?? msg['timestamp']),
              ));
            }
          });
        }
      } else {
        // No ticket yet — show welcome message
        setState(() {
          _messages.add(ChatMessage(
            text: 'Welcome to support. Please describe your issue and we\'ll get back to you shortly.',
            isFromSupport: true,
            timestamp: DateTime.now(),
          ));
        });
      }
    } catch (e) {
      debugPrint('Failed to load support messages: $e');
      setState(() {
        _messages.add(ChatMessage(
          text: 'Welcome to support. Please describe your issue below.',
          isFromSupport: true,
          timestamp: DateTime.now(),
        ));
      });
    } finally {
      setState(() => _loading = false);
    }
  }

  DateTime _parseDate(dynamic date) {
    if (date == null) return DateTime.now();
    if (date is Map && date.containsKey('_seconds')) {
      return DateTime.fromMillisecondsSinceEpoch((date['_seconds'] as int) * 1000);
    }
    if (date is String) {
      return DateTime.tryParse(date) ?? DateTime.now();
    }
    return DateTime.now();
  }

  String _formatTime(DateTime time) {
    final hour = time.hour;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$displayHour:$minute$period';
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${days[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}, ${_formatTime(date)}';
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;
    final text = _messageController.text.trim();
    _messageController.clear();

    setState(() {
      _messages.add(ChatMessage(
        text: text,
        isFromSupport: false,
        timestamp: DateTime.now(),
      ));
    });

    try {
      if (_activeTicketId == null) {
        // Create a new support ticket with the first message
        final categoryLabel = _categoryLabels[_selectedCategory] ?? 'General';
        final result = await _supportService.createTicket(
          subject: '$categoryLabel Support Request',
          message: text,
          category: _selectedCategory,
        );
        if (result != null) {
          _activeTicketId = result['id'] ?? result['ticketId'];
          debugPrint('Support ticket created: $_activeTicketId');
        }
      } else {
        // Reply to existing ticket
        await _supportService.replyToTicket(
          ticketId: _activeTicketId!,
          message: text,
        );
      }
    } catch (e) {
      debugPrint('Failed to send support message: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send message. Please try again.')),
        );
      }
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _pickAndSendAttachment() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (pickedFile == null) return;

    setState(() {
      _messages.add(ChatMessage(
        text: '📎 Sending attachment...',
        isFromSupport: false,
        timestamp: DateTime.now(),
      ));
    });

    try {
      final file = File(pickedFile.path);
      final fileName = 'support_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final ref = FirebaseStorage.instance.ref().child('support_attachments').child(fileName);
      await ref.putFile(file);
      final downloadUrl = await ref.getDownloadURL();

      // Update the placeholder message with the image URL
      setState(() {
        _messages.removeLast();
        _messages.add(ChatMessage(
          text: '📎 Image attached: $downloadUrl',
          isFromSupport: false,
          timestamp: DateTime.now(),
        ));
      });

      // If ticket exists, send as reply with attachment
      if (_activeTicketId != null) {
        await _supportService.replyToTicket(
          ticketId: _activeTicketId!,
          message: 'Image attachment: $downloadUrl',
        );
      } else {
        // Create ticket with attachment
        final categoryLabel = _categoryLabels[_selectedCategory] ?? 'General';
        final result = await _supportService.createTicket(
          subject: '$categoryLabel Support Request',
          message: 'Image attachment: $downloadUrl',
          category: _selectedCategory,
        );
        if (result != null) {
          _activeTicketId = result['id'] ?? result['ticketId'];
        }
      }
    } catch (e) {
      debugPrint('Failed to upload attachment: $e');
      setState(() {
        _messages.removeLast();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send attachment. Please try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPri,
      appBar: AppBar(
        backgroundColor: AppColors.bgPri,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.inputBg,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.inputBorder),
            ),
            child: const Icon(
              Icons.chevron_left,
              color: Colors.white,
            ),
          ),
        ),
        title: Text(
          'Help & Support',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
        children: [
          // Category selector (only shown before a ticket is created)
          if (_activeTicketId == null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.bgSec,
                border: Border(
                  bottom: BorderSide(color: AppColors.inputBorder),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Category',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _categoryLabels.entries.map((entry) {
                      final isSelected = _selectedCategory == entry.key;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedCategory = entry.key),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.yellow90 : AppColors.inputBg,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected ? AppColors.yellow90 : AppColors.inputBorder,
                            ),
                          ),
                          child: Text(
                            entry.value,
                            style: AppTextStyles.caption.copyWith(
                              color: isSelected ? AppColors.bgPri : Colors.white,
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),

          // Messages List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                final showTimestamp = index == 0 ||
                    _messages[index - 1].timestamp.day != message.timestamp.day;

                return Column(
                  children: [
                    if (showTimestamp) ...[
                      const SizedBox(height: 8),
                      Text(
                        _formatDate(message.timestamp),
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.txtInactive,
                          fontSize: 11,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    _buildMessageBubble(message),
                    const SizedBox(height: 12),
                  ],
                );
              },
            ),
          ),

          // Message Input
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.bgPri,
              border: Border(
                top: BorderSide(color: AppColors.inputBorder),
              ),
            ),
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: _pickAndSendAttachment,
                      child: Icon(
                        Icons.attach_file,
                        color: AppColors.txtInactive,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        style: AppTextStyles.body.copyWith(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Write a message',
                          hintStyle: AppTextStyles.body.copyWith(
                            color: AppColors.txtInactive,
                            fontSize: 14,
                          ),
                          border: InputBorder.none,
                          contentPadding:
                              const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _sendMessage,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        child: Icon(
                          Icons.send,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    return Align(
      alignment:
          message.isFromSupport ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: message.isFromSupport
              ? AppColors.inputBg
              : AppColors.yellow90.withOpacity(0.9),
          borderRadius: BorderRadius.circular(16),
          border: message.isFromSupport
              ? Border.all(color: AppColors.inputBorder)
              : null,
        ),
        child: Text(
          message.text,
          style: AppTextStyles.body.copyWith(
            color: message.isFromSupport ? Colors.white : AppColors.bgPri,
            fontSize: 13,
            height: 1.4,
          ),
        ),
      ),
    );
  }
}
