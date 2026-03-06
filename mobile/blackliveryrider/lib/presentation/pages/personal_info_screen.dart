import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import 'package:provider/provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/region_provider.dart';

class PersonalInfoScreen extends StatefulWidget {
  const PersonalInfoScreen({super.key});

  @override
  State<PersonalInfoScreen> createState() => _PersonalInfoScreenState();
}

class _PersonalInfoScreenState extends State<PersonalInfoScreen> {
  late String _fullName;
  late String _email;
  late String _phoneNumber;

  bool _isEditingName = false;

  final TextEditingController _nameController = TextEditingController();
  final FocusNode _nameFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    _fullName = user?.fullName ?? '';
    _email = user?.email ?? '';
    _phoneNumber = user?.phone ?? ''; // Fixed: user?.phone

    _nameController.text = _fullName;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  void _startEditingName() {
    setState(() {
      _isEditingName = true;
    });
    Future.delayed(const Duration(milliseconds: 100), () {
      _nameFocus.requestFocus();
    });
  }

  Future<void> _saveName() async {
    final name = _nameController.text.trim();
    if (name.isEmpty || name == _fullName) {
      setState(() {
        _isEditingName = false;
        _nameController.text = _fullName;
      });
      return;
    }

    if (name.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Name must be at least 2 characters')),
      );
      return;
    }

    try {
      await Provider.of<AuthProvider>(
        context,
        listen: false,
      ).updateProfile(fullName: name);

      // Re-read all fields from provider in case merge filled in missing data
      final updatedUser = Provider.of<AuthProvider>(context, listen: false).user;
      setState(() {
        _fullName = name;
        _email = updatedUser?.email ?? _email;
        _phoneNumber = updatedUser?.phone ?? _phoneNumber;
        _isEditingName = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Name updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update name: $e')));
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
          'Personal Info',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Name field
            _buildInfoField(
              icon: Icons.person_outlined,
              label: 'Full Name',
              value: _fullName.isEmpty ? 'Not set' : _fullName,
              isEditing: _isEditingName,
              controller: _nameController,
              focusNode: _nameFocus,
              onEdit: _startEditingName,
              onSave: _saveName,
              keyboardType: TextInputType.name,
            ),

            const SizedBox(height: 16),

            // Email field (read-only — changing auth credentials requires re-verification)
            _buildReadOnlyField(
              icon: Icons.email_outlined,
              value: _email.isEmpty ? 'Not set' : _email,
            ),

            const SizedBox(height: 16),

            // Phone field (read-only — changing auth credentials requires re-verification)
            Builder(
              builder: (context) {
                final phoneCodePrefix = context.watch<RegionProvider>().phoneCode;
                final phoneDisplay = _phoneNumber.isEmpty
                    ? 'Not set'
                    : '$phoneCodePrefix $_phoneNumber';
                return _buildReadOnlyField(
                  icon: Icons.phone_outlined,
                  value: phoneDisplay,
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReadOnlyField({
    required IconData icon,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.txtInactive, size: 22),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              style: AppTextStyles.body.copyWith(
                color: AppColors.txtInactive,
                fontSize: 14,
              ),
            ),
          ),
          Icon(Icons.lock_outline, color: AppColors.txtInactive.withOpacity(0.4), size: 16),
        ],
      ),
    );
  }

  Widget _buildInfoField({
    required IconData icon,
    required String label,
    required String value,
    required bool isEditing,
    required TextEditingController controller,
    required FocusNode focusNode,
    required VoidCallback onEdit,
    required VoidCallback onSave,
    required TextInputType keyboardType,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.inputBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isEditing ? AppColors.yellow90 : AppColors.inputBorder,
        ),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.txtInactive, size: 22),
          const SizedBox(width: 16),
          Expanded(
            child: isEditing
                ? TextField(
                    controller: controller,
                    focusNode: focusNode,
                    keyboardType: keyboardType,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                    decoration: InputDecoration(
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                      border: InputBorder.none,
                      hintText: 'Enter $label',
                      hintStyle: AppTextStyles.body.copyWith(
                        color: AppColors.txtInactive,
                        fontSize: 14,
                      ),
                    ),
                    onSubmitted: (_) => onSave(),
                  )
                : Text(
                    value,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: isEditing ? onSave : onEdit,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isEditing
                    ? AppColors.yellow90.withOpacity(0.2)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                isEditing ? Icons.check : Icons.edit_outlined,
                color: isEditing ? AppColors.yellow90 : AppColors.txtInactive,
                size: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
