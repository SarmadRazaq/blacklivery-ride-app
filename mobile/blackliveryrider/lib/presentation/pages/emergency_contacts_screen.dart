import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/models/emergency_contact_model.dart';
import '../../core/services/contacts_service.dart';
import 'choose_contacts_screen.dart';

class EmergencyContactsScreen extends StatefulWidget {
  const EmergencyContactsScreen({super.key});

  @override
  State<EmergencyContactsScreen> createState() =>
      _EmergencyContactsScreenState();
}

class _EmergencyContactsScreenState extends State<EmergencyContactsScreen> {
  final ContactsService _contactsService = ContactsService();
  List<EmergencyContact> _selectedContacts = [];
  bool _nearestPoliceStation = true;
  bool _shareTripStatus = true;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadContacts();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _nearestPoliceStation = prefs.getBool('emergency_police') ?? true;
        _shareTripStatus = prefs.getBool('emergency_share_trip') ?? true;
      });
    }
  }

  Future<void> _saveToggle(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
  }

  Future<void> _loadContacts() async {
    setState(() => _isLoading = true);
    try {
      final contacts = await _contactsService.getEmergencyContacts();
      setState(() {
        _selectedContacts = contacts;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _addContacts() async {
    final result = await Navigator.push<List<EmergencyContact>>(
      context,
      MaterialPageRoute(
        builder: (context) => ChooseContactsScreen(
          selectedContacts: _selectedContacts,
        ),
      ),
    );

    if (result != null) {
      // Determine which contacts are new (not in current list)
      final currentIds = _selectedContacts.map((c) => c.id).toSet();
      final newContacts = result.where((c) => !currentIds.contains(c.id)).toList();

      // Save new contacts to backend
      for (final contact in newContacts) {
        final saved = await _contactsService.addEmergencyContact(contact);
        if (saved == null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to save ${contact.name}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }

      // Reload from backend to get authoritative list
      await _loadContacts();
    }
  }

  Future<void> _removeContact(EmergencyContact contact) async {
    final success = await _contactsService.removeEmergencyContact(contact.id);
    if (success && mounted) {
      setState(() {
        _selectedContacts.removeWhere((c) => c.id == contact.id);
      });
    } else if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to remove contact. Please try again.'),
          backgroundColor: Colors.red,
        ),
      );
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
          'Emergency Contacts',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.yellow90))
          : Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Selected contacts section
                  if (_selectedContacts.isNotEmpty) ...[
                    ..._selectedContacts
                        .map((contact) => _buildSelectedContact(contact)),
                    const SizedBox(height: 24),
                  ],

                  // Set your emergency contacts info
                  _buildInfoSection(
                    icon: Icons.people_outline,
                    title: 'Set your emergency contacts',
                    description:
                        'Choose up to 5 trusted contacts to be notified in case of an emergency during your ride.',
                  ),

                  const SizedBox(height: 16),

                  // Nearest police station toggle
                  _buildToggleSection(
                    icon: Icons.local_police_outlined,
                    title: 'Nearest police station',
                    description:
                        'We\'ll automatically detect the nearest police station to alert if an emergency is triggered.',
                    value: _nearestPoliceStation,
                    onChanged: (value) {
                      setState(() => _nearestPoliceStation = value);
                      _saveToggle('emergency_police', value);
                    },
                  ),

                  const SizedBox(height: 16),

                  // Share your trip status toggle
                  _buildToggleSection(
                    icon: Icons.share_location_outlined,
                    title: 'Share your trip status',
                    description:
                        'Your live location and trip details will be shared with your emergency contacts when you start a ride.',
                    value: _shareTripStatus,
                    onChanged: (value) {
                      setState(() => _shareTripStatus = value);
                      _saveToggle('emergency_share_trip', value);
                    },
                  ),
                ],
              ),
            ),
          ),

          // Bottom button
          Padding(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _addContacts,
                icon: const Icon(Icons.add),
                label: Text(
                  _selectedContacts.isEmpty
                      ? 'Add trusted contact'
                      : 'Add ${_selectedContacts.length < 5 ? "more" : ""} contact',
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.yellow90,
                  foregroundColor: AppColors.bgPri,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedContact(EmergencyContact contact) {
    return Dismissible(
      key: Key('emergency_contact_${contact.id}'),
      direction: DismissDirection.endToStart,
      confirmDismiss: (direction) async {
        return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: AppColors.bgSec,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            title: Text('Remove Contact', style: AppTextStyles.heading3),
            content: Text(
              'Remove ${contact.name} from your emergency contacts?',
              style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('Cancel', style: AppTextStyles.body),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(
                  'Remove',
                  style: AppTextStyles.body.copyWith(color: Colors.red),
                ),
              ),
            ],
          ),
        ) ?? false;
      },
      onDismissed: (_) => _removeContact(contact),
      background: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.red,
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.inputBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.bgPri,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  contact.name.isNotEmpty ? contact.name[0].toUpperCase() : 'J',
                  style: AppTextStyles.heading3.copyWith(
                    color: AppColors.yellow90,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contact.name,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    contact.phone,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.txtInactive,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            GestureDetector(
              onTap: () => _removeContact(contact),
              child: Container(
                padding: const EdgeInsets.all(8),
                child: Icon(
                  Icons.close,
                  color: Colors.red,
                  size: 20,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoSection({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            color: AppColors.yellow90,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.body.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.txtInactive,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToggleSection({
    required IconData icon,
    required String title,
    required String description,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            color: AppColors.yellow90,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: AppTextStyles.body.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Switch(
                      value: value,
                      onChanged: onChanged,
                      activeThumbColor: AppColors.yellow90,
                      activeTrackColor: AppColors.yellow90.withOpacity(0.3),
                      inactiveThumbColor: AppColors.txtInactive,
                      inactiveTrackColor: AppColors.inputBorder,
                    ),
                  ],
                ),
                Text(
                  description,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.txtInactive,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
