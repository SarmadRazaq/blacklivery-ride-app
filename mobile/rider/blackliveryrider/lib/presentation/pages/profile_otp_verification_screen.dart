import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class ProfileOtpVerificationScreen extends StatefulWidget {
  final String verificationType; // 'email' or 'phone'
  final String value;
  final VoidCallback onVerified;

  const ProfileOtpVerificationScreen({
    super.key,
    required this.verificationType,
    required this.value,
    required this.onVerified,
  });

  @override
  State<ProfileOtpVerificationScreen> createState() =>
      _ProfileOtpVerificationScreenState();
}

class _ProfileOtpVerificationScreenState
    extends State<ProfileOtpVerificationScreen> {
  String _otpCode = '';
  int _remainingSeconds = 59;
  Timer? _timer;
  bool _isVerified = false;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        setState(() {
          _remainingSeconds--;
        });
      } else {
        timer.cancel();
      }
    });
  }

  void _onKeyPressed(String key) {
    if (_isVerified) return;

    if (key == 'backspace') {
      if (_otpCode.isNotEmpty) {
        setState(() {
          _otpCode = _otpCode.substring(0, _otpCode.length - 1);
        });
      }
    } else if (key == 'check') {
      if (_otpCode.length == 6) {
        _verifyOtp();
      }
    } else if (_otpCode.length < 6) {
      setState(() {
        _otpCode += key;
      });

      // Auto verify when 6 digits entered
      if (_otpCode.length == 6) {
        _verifyOtp();
      }
    }
  }

  void _verifyOtp() {
    // Simulate verification
    setState(() {
      _isVerified = true;
    });

    // Call callback and pop after delay
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        widget.onVerified();
        Navigator.pop(context);
      }
    });
  }

  String get _formattedTime {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  String get _maskedValue {
    if (widget.verificationType == 'email') {
      final parts = widget.value.split('@');
      if (parts.length == 2) {
        final name = parts[0];
        final domain = parts[1];
        if (name.length > 2) {
          return '${name.substring(0, 2)}***@$domain';
        }
      }
      return widget.value;
    } else {
      // Phone - show last 4 digits
      if (widget.value.length > 4) {
        return '***${widget.value.substring(widget.value.length - 4)}';
      }
      return widget.value;
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
          'OTP Verification',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const SizedBox(height: 20),

                  // Success state or OTP input
                  if (_isVerified) ...[
                    _buildSuccessState(),
                  ] else ...[
                    // Instructions
                    Text(
                      'Enter the OTP sent to $_maskedValue',
                      style: AppTextStyles.body.copyWith(
                        color: AppColors.txtInactive,
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 40),

                    // OTP boxes
                    _buildOtpBoxes(),

                    const SizedBox(height: 24),

                    // Timer
                    Text(
                      _formattedTime,
                      style: AppTextStyles.body.copyWith(
                        color: AppColors.txtInactive,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Numpad
          if (!_isVerified) _buildNumpad(),
        ],
      ),
    );
  }

  Widget _buildSuccessState() {
    return Column(
      children: [
        const SizedBox(height: 60),
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: AppColors.success.withOpacity(0.15),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.check,
            color: AppColors.success,
            size: 50,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Changes Saved!',
          style: AppTextStyles.heading2.copyWith(
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Your ${widget.verificationType} has been updated successfully.',
          style: AppTextStyles.body.copyWith(
            color: AppColors.txtInactive,
            fontSize: 14,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildOtpBoxes() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(6, (index) {
        final hasValue = index < _otpCode.length;
        final isActive = index == _otpCode.length;

        return Container(
          width: 45,
          height: 50,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: AppColors.inputBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isActive
                  ? AppColors.yellow90
                  : hasValue
                      ? AppColors.yellow90.withOpacity(0.5)
                      : AppColors.inputBorder,
              width: isActive ? 2 : 1,
            ),
          ),
          child: Center(
            child: hasValue
                ? Text(
                    _otpCode[index],
                    style: AppTextStyles.heading2.copyWith(
                      color: Colors.white,
                      fontSize: 20,
                    ),
                  )
                : null,
          ),
        );
      }),
    );
  }

  Widget _buildNumpad() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
      color: AppColors.bgSec,
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildNumKey('1'),
              _buildNumKey('2'),
              _buildNumKey('3'),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildNumKey('4'),
              _buildNumKey('5'),
              _buildNumKey('6'),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildNumKey('7'),
              _buildNumKey('8'),
              _buildNumKey('9'),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildActionKey(Icons.chevron_left, 'backspace'),
              _buildNumKey('0'),
              _buildActionKey(Icons.check, 'check'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNumKey(String value) {
    return GestureDetector(
      onTap: () => _onKeyPressed(value),
      child: Container(
        width: 70,
        height: 70,
        decoration: BoxDecoration(
          color: AppColors.inputBg,
          borderRadius: BorderRadius.circular(35),
        ),
        child: Center(
          child: Text(
            value,
            style: AppTextStyles.heading2.copyWith(
              color: Colors.white,
              fontSize: 24,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionKey(IconData icon, String action) {
    final isCheck = action == 'check';
    final isEnabled = isCheck ? _otpCode.length == 6 : _otpCode.isNotEmpty;

    return GestureDetector(
      onTap: isEnabled ? () => _onKeyPressed(action) : null,
      child: Container(
        width: 70,
        height: 70,
        decoration: BoxDecoration(
          color: isCheck && isEnabled
              ? AppColors.yellow90
              : AppColors.inputBg,
          borderRadius: BorderRadius.circular(35),
        ),
        child: Center(
          child: Icon(
            icon,
            color: isCheck && isEnabled
                ? AppColors.bgPri
                : isEnabled
                    ? Colors.white
                    : AppColors.txtInactive,
            size: 28,
          ),
        ),
      ),
    );
  }
}
