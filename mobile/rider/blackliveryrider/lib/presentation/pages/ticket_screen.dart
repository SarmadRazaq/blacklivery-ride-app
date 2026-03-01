import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/services/support_service.dart';

class TicketScreen extends StatefulWidget {
  const TicketScreen({super.key});

  @override
  State<TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends State<TicketScreen> {
  final SupportService _supportService = SupportService();
  List<dynamic> _tickets = [];
  bool _isLoading = true;
  bool _showNewTicket = false;
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  String _selectedCategory = 'general';
  bool _isSubmitting = false;

  static const List<String> _categories = [
    'general',
    'payment',
    'ride_issue',
    'account',
    'safety',
  ];

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _loadTickets() async {
    setState(() => _isLoading = true);
    try {
      final tickets = await _supportService.getMyTickets();
      if (mounted) {
        setState(() {
          _tickets = tickets;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _submitTicket() async {
    if (_subjectController.text.trim().isEmpty ||
        _messageController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all fields')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final result = await _supportService.createTicket(
        subject: _subjectController.text.trim(),
        message: _messageController.text.trim(),
        category: _selectedCategory,
      );

      if (mounted) {
        setState(() => _isSubmitting = false);
        if (result != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Ticket submitted successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          _subjectController.clear();
          _messageController.clear();
          _selectedCategory = 'general';
          setState(() => _showNewTicket = false);
          _loadTickets();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to submit ticket. Please try again.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
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
            child: const Icon(Icons.chevron_left, color: Colors.white),
          ),
        ),
        title: Text(
          'Support Tickets',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
        actions: [
          if (!_showNewTicket)
            IconButton(
              onPressed: () => setState(() => _showNewTicket = true),
              icon: const Icon(Icons.add, color: AppColors.yellow90),
            ),
        ],
      ),
      body: _showNewTicket ? _buildNewTicketForm() : _buildTicketList(),
    );
  }

  Widget _buildTicketList() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.yellow90),
      );
    }

    if (_tickets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.support_agent, size: 64, color: AppColors.txtInactive),
            const SizedBox(height: 16),
            Text(
              'No Support Tickets',
              style: AppTextStyles.heading3.copyWith(color: AppColors.txtInactive),
            ),
            const SizedBox(height: 8),
            Text(
              'Tap + to create a new ticket',
              style: AppTextStyles.body.copyWith(color: AppColors.txtInactive, fontSize: 14),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => setState(() => _showNewTicket = true),
              icon: const Icon(Icons.add),
              label: const Text('New Ticket'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.yellow90,
                foregroundColor: AppColors.bgPri,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTickets,
      color: AppColors.yellow90,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _tickets.length,
        itemBuilder: (context, index) {
          final ticket = _tickets[index] as Map<String, dynamic>;
          return _buildTicketCard(ticket);
        },
      ),
    );
  }

  Widget _buildTicketCard(Map<String, dynamic> ticket) {
    final status = ticket['status'] ?? 'open';
    final statusColor = switch (status) {
      'open' => Colors.orange,
      'in_progress' => Colors.blue,
      'resolved' || 'closed' => Colors.green,
      _ => AppColors.txtInactive,
    };
    final statusLabel = switch (status) {
      'open' => 'Open',
      'in_progress' => 'In Progress',
      'resolved' => 'Resolved',
      'closed' => 'Closed',
      _ => status.toString().toUpperCase(),
    };

    return GestureDetector(
      onTap: () => _showTicketDetail(ticket),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    ticket['subject'] ?? 'No Subject',
                    style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor.withOpacity(0.4)),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              ticket['message'] ?? '',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.body.copyWith(color: AppColors.txtInactive, fontSize: 13),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                if (ticket['category'] != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.yellow90.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      (ticket['category'] as String).replaceAll('_', ' ').toUpperCase(),
                      style: TextStyle(color: AppColors.yellow90, fontSize: 10, fontWeight: FontWeight.w600),
                    ),
                  ),
                const Spacer(),
                Text(
                  _formatDate(ticket['createdAt']),
                  style: TextStyle(color: AppColors.txtInactive, fontSize: 11),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showTicketDetail(Map<String, dynamic> ticket) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSec,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40, height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.inputBorder,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    ticket['subject'] ?? 'No Subject',
                    style: AppTextStyles.heading3.copyWith(fontSize: 18),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    ticket['message'] ?? '',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.txtInactive, fontSize: 14, height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (ticket['replies'] != null &&
                      (ticket['replies'] as List).isNotEmpty) ...[
                    Text(
                      'Replies',
                      style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                    const SizedBox(height: 12),
                    ...(ticket['replies'] as List).map((reply) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.inputBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  reply['from'] ?? 'Support',
                                  style: TextStyle(
                                    color: AppColors.yellow90,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12,
                                  ),
                                ),
                                const Spacer(),
                                Text(
                                  _formatDate(reply['createdAt']),
                                  style: TextStyle(color: AppColors.txtInactive, fontSize: 10),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              reply['message'] ?? '',
                              style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.4),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildNewTicketForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('New Support Ticket', style: AppTextStyles.heading3.copyWith(fontSize: 20)),
          const SizedBox(height: 20),

          Text('Category', style: AppTextStyles.caption.copyWith(color: AppColors.txtInactive, fontSize: 13)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: AppColors.inputBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.inputBorder),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedCategory,
                isExpanded: true,
                dropdownColor: AppColors.bgSec,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                onChanged: (v) => setState(() => _selectedCategory = v!),
                items: _categories.map((c) {
                  return DropdownMenuItem(
                    value: c,
                    child: Text(c.replaceAll('_', ' ').toUpperCase(), style: const TextStyle(color: Colors.white)),
                  );
                }).toList(),
              ),
            ),
          ),

          const SizedBox(height: 18),
          Text('Subject', style: AppTextStyles.caption.copyWith(color: AppColors.txtInactive, fontSize: 13)),
          const SizedBox(height: 8),
          TextField(
            controller: _subjectController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.inputBg,
              hintText: 'Brief description of your issue...',
              hintStyle: TextStyle(color: AppColors.txtInactive, fontSize: 14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.inputBorder)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.inputBorder)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.yellow90)),
            ),
          ),

          const SizedBox(height: 18),
          Text('Message', style: AppTextStyles.caption.copyWith(color: AppColors.txtInactive, fontSize: 13)),
          const SizedBox(height: 8),
          TextField(
            controller: _messageController,
            style: const TextStyle(color: Colors.white),
            maxLines: 5,
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.inputBg,
              hintText: 'Describe your issue in detail...',
              hintStyle: TextStyle(color: AppColors.txtInactive, fontSize: 14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.inputBorder)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.inputBorder)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.yellow90)),
            ),
          ),

          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _submitTicket,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.yellow90,
                foregroundColor: AppColors.bgPri,
                disabledBackgroundColor: AppColors.yellow90.withOpacity(0.4),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              child: _isSubmitting
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.bgPri))
                  : Text('Submit Ticket', style: AppTextStyles.body.copyWith(color: AppColors.bgPri, fontWeight: FontWeight.w600, fontSize: 16)),
            ),
          ),

          const SizedBox(height: 12),
          Center(
            child: TextButton(
              onPressed: () => setState(() => _showNewTicket = false),
              child: Text('Cancel', style: TextStyle(color: AppColors.txtInactive)),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(dynamic dateVal) {
    if (dateVal == null) return '';
    try {
      DateTime dt;
      if (dateVal is String) {
        dt = DateTime.parse(dateVal);
      } else if (dateVal is Map && dateVal['_seconds'] != null) {
        dt = DateTime.fromMillisecondsSinceEpoch((dateVal['_seconds'] as int) * 1000);
      } else {
        return '';
      }
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inHours < 1) return '${diff.inMinutes}m ago';
      if (diff.inDays < 1) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return '';
    }
  }
}
