import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import 'package:provider/provider.dart';
import '../../core/providers/auth_provider.dart';

class PersonalInfoScreen extends StatefulWidget {
  const PersonalInfoScreen({super.key});

  @override
  State<PersonalInfoScreen> createState() => _PersonalInfoScreenState();
}

class _PersonalInfoScreenState extends State<PersonalInfoScreen> {
  late String _email;
  late String _phoneNumber;

  bool _isEditingEmail = false;
  bool _isEditingPhone = false;

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final FocusNode _emailFocus = FocusNode();
  final FocusNode _phoneFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    _email = user?.email ?? '';
    _phoneNumber = user?.phone ?? ''; // Fixed: user?.phone

    _emailController.text = _email;
    _phoneController.text = _phoneNumber;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    _emailFocus.dispose();
    _phoneFocus.dispose();
    super.dispose();
  }

  void _startEditingEmail() {
    setState(() {
      _isEditingEmail = true;
      _isEditingPhone = false;
    });
    Future.delayed(const Duration(milliseconds: 100), () {
      _emailFocus.requestFocus();
    });
  }

  void _startEditingPhone() {
    setState(() {
      _isEditingPhone = true;
      _isEditingEmail = false;
    });
    Future.delayed(const Duration(milliseconds: 100), () {
      _phoneFocus.requestFocus();
    });
  }

  static final RegExp _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
  );

  static final RegExp _phoneRegex = RegExp(
    r'^\+?[1-9]\d{6,14}$',
  );

  Future<void> _saveEmail() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || email == _email) {
      setState(() {
        _isEditingEmail = false;
        _emailController.text = _email;
      });
      return;
    }

    if (!_emailRegex.hasMatch(email)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid email address')),
      );
      return;
    }

    try {
      await Provider.of<AuthProvider>(
        context,
        listen: false,
      ).updateProfile(email: email);

        setState(() {
          _email = email;
          _isEditingEmail = false;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Email updated. Please verify your new email address to continue using the app.'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 4),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Failed to update email: $e')));
        }
      }
    }

  Future<void> _savePhone() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty || phone == _phoneNumber) {
      setState(() {
        _isEditingPhone = false;
        _phoneController.text = _phoneNumber;
      });
      return;
    }

    if (!_phoneRegex.hasMatch(phone.replaceAll(RegExp(r'[\s\-()]'), ''))) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid phone number')),
      );
      return;
    }

    try {
      await Provider.of<AuthProvider>(
        context,
        listen: false,
      ).updateProfile(phoneNumber: phone);

      setState(() {
        _phoneNumber = phone;
        _isEditingPhone = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Phone updated. Please verify your new phone number to continue using the app.'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update phone: $e')));
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
            // Email field
            _buildInfoField(
              icon: Icons.email_outlined,
              label: 'Email',
              value: _email,
              isEditing: _isEditingEmail,
              controller: _emailController,
              focusNode: _emailFocus,
              onEdit: _startEditingEmail,
              onSave: _saveEmail,
              keyboardType: TextInputType.emailAddress,
            ),

            const SizedBox(height: 16),

            // Phone field
            _buildInfoField(
              icon: Icons.phone_outlined,
              label: 'Phone',
              value: _phoneNumber,
              isEditing: _isEditingPhone,
              controller: _phoneController,
              focusNode: _phoneFocus,
              onEdit: _startEditingPhone,
              onSave: _savePhone,
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
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
