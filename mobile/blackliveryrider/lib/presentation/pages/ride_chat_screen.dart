import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/chat_service.dart';
import '../../core/services/socket_service.dart';

class RideChatScreen extends StatefulWidget {
  final String rideId;
  final String driverName;

  const RideChatScreen({
    super.key,
    required this.rideId,
    required this.driverName,
  });

  @override
  State<RideChatScreen> createState() => _RideChatScreenState();
}

class _RideChatScreenState extends State<RideChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ChatService _chatService = ChatService();
  final SocketService _socketService = SocketService();
  final ScrollController _scrollController = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _listenForNewMessages();
  }

  Future<void> _loadMessages() async {
    setState(() => _loading = true);
    try {
      final messages = await _chatService.getMessages(widget.rideId);
      setState(() {
        _messages = messages.cast<Map<String, dynamic>>();
      });
      _scrollToBottom();
    } catch (e) {
      debugPrint('Failed to load chat messages: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _listenForNewMessages() {
    _socketService.listenToChatMessages((data) {
      if (data['rideId'] == widget.rideId) {
        setState(() {
          _messages.add(data);
        });
        _scrollToBottom();
      }
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;
    final text = _messageController.text.trim();
    _messageController.clear();

    // Optimistically add
    setState(() {
      _messages.add({
        'message': text,
        'senderRole': 'rider',
        'createdAt': DateTime.now().toIso8601String(),
      });
    });
    _scrollToBottom();

    try {
      await _chatService.sendMessage(rideId: widget.rideId, message: text);
    } catch (e) {
      debugPrint('Failed to send message: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send message')),
        );
      }
    }
  }

  @override
  void dispose() {
    _socketService.stopListeningToChat();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
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
            child: const Icon(Icons.chevron_left, color: Colors.white),
          ),
        ),
        title: Text(
          'Chat with ${widget.driverName}',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Text(
                          'No messages yet. Say hello!',
                          style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg['senderRole'] != 'driver';
                          return _buildMessageBubble(
                            msg['message'] ?? msg['text'] ?? '',
                            isMe,
                          );
                        },
                      ),
          ),
          // Input
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.bgPri,
              border: Border(top: BorderSide(color: AppColors.inputBorder)),
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    child: Row(
                      children: [
                        for (final msg in const [
                          "I'm here",
                          "On my way",
                          "5 minutes away",
                          "Please wait",
                          "Thank you",
                        ])
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ActionChip(
                              label: Text(msg, style: AppTextStyles.caption.copyWith(color: Colors.white, fontSize: 12)),
                              backgroundColor: AppColors.inputBg,
                              side: BorderSide(color: AppColors.inputBorder),
                              onPressed: () {
                                _messageController.text = msg;
                                _sendMessage();
                              },
                            ),
                          ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(color: AppColors.inputBorder),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _messageController,
                            style: AppTextStyles.body.copyWith(color: Colors.white, fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Type a message...',
                              hintStyle: AppTextStyles.body.copyWith(
                                color: AppColors.txtInactive,
                                fontSize: 14,
                              ),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onSubmitted: (_) => _sendMessage(),
                          ),
                        ),
                        GestureDetector(
                          onTap: _sendMessage,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            child: const Icon(Icons.send, color: Colors.white, size: 20),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(String text, bool isMe) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isMe ? AppColors.yellow90.withOpacity(0.9) : AppColors.inputBg,
          borderRadius: BorderRadius.circular(16),
          border: isMe ? null : Border.all(color: AppColors.inputBorder),
        ),
        child: Text(
          text,
          style: AppTextStyles.body.copyWith(
            color: isMe ? AppColors.bgPri : Colors.white,
            fontSize: 13,
            height: 1.4,
          ),
        ),
      ),
    );
  }
}
