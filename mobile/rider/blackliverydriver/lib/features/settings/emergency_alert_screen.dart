import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_button.dart';

class EmergencyAlertScreen extends StatefulWidget {
  const EmergencyAlertScreen({super.key});

  @override
  State<EmergencyAlertScreen> createState() => _EmergencyAlertScreenState();
}

class _EmergencyAlertScreenState extends State<EmergencyAlertScreen> {
  final List<Map<String, String>> _contacts = [
    {'name': 'John Doe', 'phone': '+23412345678'},
    {'name': 'John Doe', 'phone': '+23412345678'},
    {'name': 'John Doe', 'phone': '+23412345678'},
  ];
  final Set<String> _selectedContacts = {};

  void _toggleContact(String name) {
    setState(() {
      if (_selectedContacts.contains(name)) {
        _selectedContacts.remove(name);
      } else {
        _selectedContacts.add(name);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Emergency Contacts',
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const Text(
              'Select who to contact',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E1E1E),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: _contacts.map((contact) {
                  final isSelected = _selectedContacts.contains(
                    contact['name'],
                  ); // Simple check by name
                  return GestureDetector(
                    onTap: () => _toggleContact(contact['name']!),
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  contact['name']!,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  contact['phone']!,
                                  style: const TextStyle(
                                    color: Colors.grey,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primary
                                    : Colors.grey,
                                width: 2,
                              ),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: isSelected
                                ? const Icon(
                                    Icons.check,
                                    size: 16,
                                    color: AppColors.primary,
                                  )
                                : null,
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF1E1E1E),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'What happens next:',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildBulletPoint(
                    'We will contact these people on your behalf and also share your live location with them alongside details of this ride including the drivers details.',
                  ),
                  const SizedBox(height: 16),
                  _buildBulletPoint(
                    'We will also contact the police station closest to where you are currently.',
                  ),
                ],
              ),
            ),
            const Spacer(),
            CustomButton(
              text: 'Send Alert',
              onPressed: () {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(const SnackBar(content: Text('Alert Sent!')));
                Navigator.pop(context);
              },
              backgroundColor: AppColors.white,
              textColor: Colors.black,
            ),
            const SizedBox(height: 16),
            Center(
              child: TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text(
                  'Cancel',
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildBulletPoint(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('• ', style: TextStyle(color: Colors.white, fontSize: 14)),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              color: Colors.grey[400],
              fontSize: 13,
              height: 1.5,
            ),
          ),
        ),
      ],
    );
  }
}
