import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'data/models/support_ticket_model.dart';
import 'data/services/support_service.dart';

class SupportChatScreen extends StatefulWidget {
  final String? ticketId;
  const SupportChatScreen({super.key, this.ticketId});

  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final SupportService _supportService = SupportService();
  final ScrollController _scrollController = ScrollController();

  SupportTicket? _activeTicket;
  bool _isLoading = true;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _fetchTicket();
    // Poll every 10 seconds for new messages
    _pollingTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (_activeTicket != null) {
        _refreshTicket();
      }
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchTicket() async {
    setState(() => _isLoading = true);
    try {
      final tickets = await _supportService.getTickets();
      if (tickets.isNotEmpty) {
        if (widget.ticketId != null) {
          // Open a specific ticket by ID
          _activeTicket = tickets.firstWhere(
            (t) => t.id == widget.ticketId,
            orElse: () => tickets.first,
          );
        } else {
          // Fall back to most recent ticket
          tickets.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          _activeTicket = tickets.first;
        }
      }
    } catch (e) {
      debugPrint('Error fetching tickets: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
      _scrollToBottom();
    }
  }

  Future<void> _refreshTicket() async {
    if (_activeTicket == null) return;
    try {
      final tickets = await _supportService.getTickets();
      if (tickets.isNotEmpty) {
        // Find our active ticket
        final updatedTicket = tickets.firstWhere(
          (t) => t.id == _activeTicket!.id,
          orElse: () => tickets.first,
        );
        if (mounted) {
          setState(() {
            _activeTicket = updatedTicket;
          });
        }
      }
    } catch (e) {
      debugPrint('Error refreshing ticket: $e');
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();

    // Optimistically add message?
    // For now, simple loading state or just wait.
    setState(
      () {},
    ); // Trigger rebuild to maybe show sending state if we tracked it

    try {
      if (_activeTicket == null) {
        // Create new ticket
        final newTicket = await _supportService.createTicket(
          'Support Request', // Default subject
          text,
        );
        setState(() {
          _activeTicket = newTicket;
        });
      } else {
        // Reply to existing
        await _supportService.replyToTicket(_activeTicket!.id, text);
        await _refreshTicket();
      }
      _scrollToBottom();
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to send message: $e')));
    }
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Help & Support',
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _activeTicket == null
                ? _buildEmptyState()
                : _buildChatList(),
          ),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.support_agent, size: 64, color: Colors.grey[700]),
            const SizedBox(height: 16),
            const Text(
              'How can we help?',
              style: TextStyle(color: Colors.white, fontSize: 18),
            ),
            const SizedBox(height: 8),
            const Text(
              'Send a message to start a conversation with our support team.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        border: Border(top: BorderSide(color: Colors.grey[900]!, width: 1)),
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: TextField(
                  controller: _messageController,
                  style: const TextStyle(color: Colors.white),
                  cursorColor: AppColors.primary,
                  decoration: InputDecoration(
                    hintText: 'Type a message...',
                    hintStyle: TextStyle(color: Colors.grey[600]),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 10,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                  ),
                  minLines: 1,
                  maxLines: 4,
                  textCapitalization: TextCapitalization.sentences,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Container(
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.transparent,
              ),
              child: IconButton(
                onPressed: _sendMessage,
                icon: const Icon(Icons.send_rounded),
                color: AppColors.primary,
                splashRadius: 24,
                tooltip: 'Send',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatList() {
    final messages = _activeTicket!.messages;
    if (messages.isEmpty) return const SizedBox.shrink();

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[index];
        final isMe = !message.isFromAdmin;

        bool showTime = false;
        if (index == 0) {
          showTime = true;
        } else {
          final prevTime = messages[index - 1].createdAt;
          final currTime = message.createdAt;
          if (currTime.difference(prevTime).inMinutes > 30) {
            showTime = true;
          }
        }

        return Column(
          children: [
            if (showTime)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  "${message.createdAt.day}/${message.createdAt.month} ${message.createdAt.hour}:${message.createdAt.minute.toString().padLeft(2, '0')}",
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            Align(
              alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.75,
                ),
                decoration: BoxDecoration(
                  color: isMe
                      ? AppColors.primary.withValues(alpha: 0.15)
                      : const Color(0xFF2C2C2C),
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(20),
                    topRight: const Radius.circular(20),
                    bottomLeft: isMe
                        ? const Radius.circular(20)
                        : const Radius.circular(4),
                    bottomRight: isMe
                        ? const Radius.circular(4)
                        : const Radius.circular(20),
                  ),
                  border: isMe
                      ? Border.all(
                          color: AppColors.primary.withValues(alpha: 0.3),
                          width: 1,
                        )
                      : null,
                ),
                child: Text(
                  message.content,
                  style: TextStyle(
                    color: isMe ? AppColors.white : Colors.white,
                    fontSize: 15,
                    height: 1.4,
                  ),
                ),
              ),
            ),
            if (index == messages.length - 1 && isMe)
              Align(
                alignment: Alignment.centerRight,
                child: Padding(
                  padding: const EdgeInsets.only(right: 4, bottom: 8),
                  child: Text(
                    'Sent',
                    style: TextStyle(
                      color: AppColors.primary.withValues(alpha: 0.6),
                      fontSize: 10,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
