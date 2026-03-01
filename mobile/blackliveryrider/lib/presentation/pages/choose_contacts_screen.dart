import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/models/emergency_contact_model.dart';
import '../../core/services/contacts_service.dart';

class ChooseContactsScreen extends StatefulWidget {
  final List<EmergencyContact> selectedContacts;

  const ChooseContactsScreen({
    super.key,
    this.selectedContacts = const [],
  });

  @override
  State<ChooseContactsScreen> createState() => _ChooseContactsScreenState();
}

class _ChooseContactsScreenState extends State<ChooseContactsScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ContactsService _contactsService = ContactsService();
  late List<EmergencyContact> _selectedContacts;
  List<EmergencyContact> _allContacts = [];
  String _searchQuery = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _selectedContacts = List.from(widget.selectedContacts);
    _loadContacts();
  }

  Future<void> _loadContacts() async {
    setState(() => _isLoading = true);
    try {
      final contacts = await _contactsService.getAllContacts();
      setState(() {
        _allContacts = contacts;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<EmergencyContact> get _filteredContacts {
    if (_searchQuery.isEmpty) {
      return _allContacts;
    }
    return _allContacts.where((contact) {
      return contact.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          contact.phone.contains(_searchQuery);
    }).toList();
  }

  bool _isSelected(EmergencyContact contact) {
    return _selectedContacts.any((c) => c.id == contact.id);
  }

  void _toggleContact(EmergencyContact contact) {
    setState(() {
      if (_isSelected(contact)) {
        _selectedContacts.removeWhere((c) => c.id == contact.id);
      } else {
        if (_selectedContacts.length < 5) {
          _selectedContacts.add(contact);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('You can only add up to 5 emergency contacts'),
            ),
          );
        }
      }
    });
  }

  void _saveContacts() {
    Navigator.pop(context, _selectedContacts);
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
          'Choose Contacts',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.yellow90))
          : Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(20),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.inputBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.inputBorder),
              ),
              child: Row(
                children: [
                  const SizedBox(width: 16),
                  Icon(
                    Icons.search,
                    color: AppColors.txtInactive,
                    size: 22,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: AppTextStyles.body.copyWith(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Search name or number',
                        hintStyle: AppTextStyles.body.copyWith(
                          color: AppColors.txtInactive,
                          fontSize: 14,
                        ),
                        border: InputBorder.none,
                        contentPadding:
                            const EdgeInsets.symmetric(vertical: 16),
                      ),
                      onChanged: (value) {
                        setState(() {
                          _searchQuery = value;
                        });
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Contacts list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _filteredContacts.length,
              itemBuilder: (context, index) {
                final contact = _filteredContacts[index];
                return _buildContactItem(contact);
              },
            ),
          ),

          // Add contacts button
          Padding(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _selectedContacts.isNotEmpty ? _saveContacts : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.yellow90,
                  foregroundColor: AppColors.bgPri,
                  disabledBackgroundColor: AppColors.inputBg,
                  disabledForegroundColor: AppColors.txtInactive,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                child: Text(
                  'Add contacts${_selectedContacts.isNotEmpty ? ' (${_selectedContacts.length})' : ''}',
                  style: AppTextStyles.body.copyWith(
                    color: _selectedContacts.isNotEmpty
                        ? AppColors.bgPri
                        : AppColors.txtInactive,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactItem(EmergencyContact contact) {
    final isSelected = _isSelected(contact);

    return GestureDetector(
      onTap: () => _toggleContact(contact),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.yellow90 : AppColors.inputBorder,
          ),
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
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.yellow90 : Colors.transparent,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(
                  color: isSelected ? AppColors.yellow90 : AppColors.txtInactive,
                  width: 2,
                ),
              ),
              child: isSelected
                  ? Icon(
                      Icons.check,
                      color: AppColors.bgPri,
                      size: 16,
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
