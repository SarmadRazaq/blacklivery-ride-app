import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/custom_text_field.dart';
import '../../core/providers/riverpod_providers.dart';
import '../../features/auth/data/models/user_model.dart'; // For EmergencyContact

class ChooseContactsScreen extends ConsumerStatefulWidget {
  const ChooseContactsScreen({super.key});

  @override
  ConsumerState<ChooseContactsScreen> createState() => _ChooseContactsScreenState();
}

class _ChooseContactsScreenState extends ConsumerState<ChooseContactsScreen>
    with WidgetsBindingObserver {
  List<Contact> _contacts = [];
  List<Contact> _filteredContacts = [];
  final Set<String> _selectedContactIds = {}; // Store selected contact IDs
  bool _isLoading = true;
  bool _permissionDenied = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  final List<EmergencyContact> _manualContacts = []; // Manually entered contacts

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _fetchContacts();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _searchController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Re-check permission when user returns from Settings
    if (state == AppLifecycleState.resumed && _permissionDenied) {
      _fetchContacts();
    }
  }

  void _onSearchChanged() {
    setState(() {
      _searchQuery = _searchController.text.toLowerCase();
      _filterContacts();
    });
  }

  Future<void> _fetchContacts() async {
    try {
      // Check permission status first using permission_handler (works after
      // returning from Settings). FlutterContacts.requestPermission() may not
      // re-prompt after a previous denial on Android.
      var status = await Permission.contacts.status;
      if (!status.isGranted) {
        // Only request via system dialog if not permanently denied
        if (status.isDenied) {
          status = await Permission.contacts.request();
        }
      }

      final hasPermission = status.isGranted;
      debugPrint('Contacts permission granted: $hasPermission');

      if (hasPermission) {
        final contacts = await FlutterContacts.getContacts(
          withProperties: true,
          withPhoto: false,
        );

        debugPrint('Fetched ${contacts.length} contacts');
        // Log contacts with/without phones for debugging
        final withPhones = contacts.where((c) => c.phones.isNotEmpty).length;
        debugPrint('Contacts with phone numbers: $withPhones');

        if (mounted) {
          setState(() {
            _contacts = contacts;
            _filterContacts();
            _isLoading = false;
            _permissionDenied = false;
          });
        }
      } else {
        debugPrint('Contacts permission denied');
        if (mounted) {
          setState(() {
            _isLoading = false;
            _permissionDenied = true;
          });
        }
      }
    } on MissingPluginException catch (e) {
      debugPrint('MissingPluginException for flutter_contacts: $e');
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Contacts plugin not available. Please restart the app.',
            ),
          ),
        );
      }
    } catch (e, stack) {
      debugPrint('Error fetching contacts: $e');
      debugPrint('Stack trace: $stack');
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Could not load contacts: $e')));
      }
    }
  }

  void _filterContacts() {
    if (_searchQuery.isEmpty) {
      _filteredContacts = List.from(_contacts);
    } else {
      _filteredContacts = _contacts.where((contact) {
        final name = contact.displayName.toLowerCase();
        final phone = contact.phones.isNotEmpty
            ? contact.phones.first.number
            : '';
        return name.contains(_searchQuery) || phone.contains(_searchQuery);
      }).toList();
    }
  }

  void _toggleSelection(Contact contact) {
    setState(() {
      if (_selectedContactIds.contains(contact.id)) {
        _selectedContactIds.remove(contact.id);
      } else {
        // Limit to 3 (but check how many already exist in provider?)
        // For now, let's just limit locally selected + existing?
        // Actually, this screen might be "select NEW contacts".
        // Let's just allow selection and handle limit on "Add".
        _selectedContactIds.add(contact.id);
      }
    });
  }

  Future<void> _addSelectedContacts() async {
    if (_selectedContactIds.isEmpty && _manualContacts.isEmpty) return;

    final selectedContacts = _contacts
        .where((c) => _selectedContactIds.contains(c.id))
        .map(
          (c) => EmergencyContact(
            name: c.displayName,
            phoneNumber: c.phones.isNotEmpty ? c.phones.first.number : '',
          ),
        )
        .toList();

    final authProvider = ref.read(authRiverpodProvider);
    final currentContacts = authProvider.user?.emergencyContacts ?? [];

    final updatedList = [...currentContacts, ...selectedContacts, ..._manualContacts];

    if (updatedList.length > 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You can only have up to 3 emergency contacts.'),
        ),
      );
      return;
    }

    try {
      await authProvider.updateProfile(emergencyContacts: updatedList);
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to add contacts: $e')));
      }
    }
  }

  void _showManualEntryDialog() {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardBackground,
        title: const Text(
          'Add Contact Manually',
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Full name',
                hintStyle: TextStyle(color: Colors.grey[500]),
                enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: Colors.grey[700]!),
                ),
                focusedBorder: const UnderlineInputBorder(
                  borderSide: BorderSide(color: AppColors.primary),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Phone number',
                hintStyle: TextStyle(color: Colors.grey[500]),
                enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: Colors.grey[700]!),
                ),
                focusedBorder: const UnderlineInputBorder(
                  borderSide: BorderSide(color: AppColors.primary),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: Colors.grey[400])),
          ),
          TextButton(
            onPressed: () {
              final name = nameController.text.trim();
              final phone = phoneController.text.trim();
              if (name.isEmpty || phone.isEmpty) return;
              setState(() {
                _manualContacts.add(
                  EmergencyContact(name: name, phoneNumber: phone),
                );
              });
              Navigator.pop(ctx);
            },
            child: const Text(
              'Add',
              style: TextStyle(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Choose Contacts',
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_alt_1, color: Colors.white),
            tooltip: 'Enter manually',
            onPressed: _showManualEntryDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _fetchContacts,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: CustomTextField(
              hintText: 'Search name or number',
              prefixIcon: Icons.search,
              controller: _searchController,
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _permissionDenied
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Access to contacts is required',
                          style: TextStyle(color: Colors.white),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => openAppSettings(),
                          child: const Text('Open Settings'),
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: _fetchContacts,
                          child: const Text("I've enabled access"),
                        ),
                        const SizedBox(height: 16),
                        const Divider(color: Colors.grey, indent: 48, endIndent: 48),
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: _showManualEntryDialog,
                          icon: const Icon(Icons.person_add_alt_1, color: AppColors.primary),
                          label: const Text(
                            'Or enter contact manually',
                            style: TextStyle(color: AppColors.primary),
                          ),
                        ),
                      ],
                    ),
                  )
                : _filteredContacts.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'No contacts found',
                          style: TextStyle(color: Colors.grey),
                        ),
                        const SizedBox(height: 16),
                        TextButton.icon(
                          onPressed: _showManualEntryDialog,
                          icon: const Icon(Icons.person_add_alt_1, color: AppColors.primary),
                          label: const Text(
                            'Enter contact manually',
                            style: TextStyle(color: AppColors.primary),
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: _filteredContacts.length,
                    itemBuilder: (context, index) {
                      final contact = _filteredContacts[index];
                      final isSelected = _selectedContactIds.contains(
                        contact.id,
                      );
                      final hasPhone = contact.phones.isNotEmpty;

                      if (!hasPhone) {
                        return const SizedBox.shrink(); // Skip contacts without phone
                      }

                      return ListTile(
                        onTap: () => _toggleSelection(contact),
                        title: Text(
                          contact.displayName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        subtitle: Text(
                          contact.phones.first.number,
                          style: TextStyle(color: Colors.grey[400]),
                        ),
                        trailing: Checkbox(
                          value: isSelected,
                          onChanged: (v) => _toggleSelection(contact),
                          activeColor: Colors.white,
                          checkColor: Colors.black,
                          side: const BorderSide(color: Colors.grey),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          // Show manually added contacts
          if (_manualContacts.isNotEmpty) ...[
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Manually added',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
            ..._manualContacts.asMap().entries.map((entry) {
              final idx = entry.key;
              final c = entry.value;
              return ListTile(
                leading: const CircleAvatar(
                  backgroundColor: AppColors.primary,
                  child: Icon(Icons.person, color: Colors.black, size: 20),
                ),
                title: Text(
                  c.name,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
                ),
                subtitle: Text(
                  c.phoneNumber,
                  style: TextStyle(color: Colors.grey[400]),
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey, size: 20),
                  onPressed: () => setState(() => _manualContacts.removeAt(idx)),
                ),
              );
            }),
            const Divider(color: Colors.grey, height: 1, indent: 16, endIndent: 16),
          ],
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: CustomButton(
              text: 'Add contacts',
              onPressed: (_selectedContactIds.isNotEmpty || _manualContacts.isNotEmpty)
                  ? _addSelectedContacts
                  : null,
              backgroundColor: (_selectedContactIds.isNotEmpty || _manualContacts.isNotEmpty)
                  ? AppColors.white
                  : Colors.grey[800],
              textColor: (_selectedContactIds.isNotEmpty || _manualContacts.isNotEmpty)
                  ? Colors.black
                  : Colors.grey,
            ),
          ),
        ],
      ),
    );
  }
}
