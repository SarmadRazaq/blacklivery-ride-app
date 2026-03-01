import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../widgets/custom_button.dart';

class PickupTimeSheet extends StatefulWidget {
  const PickupTimeSheet({super.key});

  @override
  State<PickupTimeSheet> createState() => _PickupTimeSheetState();
}

class _PickupTimeSheetState extends State<PickupTimeSheet> {
  DateTime _selectedDate = DateTime.now();
  int _selectedHour = 4;
  int _selectedMinute = 30;
  bool _isPM = true;

  final List<String> _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppColors.bgPri,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.inputBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Title
          Text(
            'Pickup Now',
            style: AppTextStyles.heading3,
          ),
          
          const SizedBox(height: 8),
          
          Text(
            'Set pickup time',
            style: AppTextStyles.body.copyWith(
              color: AppColors.txtInactive,
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Date Selector
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Days of week
              ...List.generate(7, (index) {
                final date = DateTime.now().add(Duration(days: index));
                final isSelected = index == 0;
                
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedDate = date;
                    });
                  },
                  child: Container(
                    width: 36,
                    height: 36,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.inputBg : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: isSelected
                          ? Border.all(color: AppColors.inputBorder)
                          : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _days[date.weekday - 1].substring(0, 1),
                          style: TextStyle(
                            color: isSelected ? Colors.white : AppColors.txtInactive,
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          date.day.toString(),
                          style: TextStyle(
                            color: isSelected ? Colors.white : AppColors.txtInactive,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Time Picker
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Today label
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Text(
                  'Today',
                  style: AppTextStyles.body.copyWith(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ),
              
              const SizedBox(width: 16),
              
              // Hour
              _buildTimeSpinner(
                value: _selectedHour,
                onChanged: (val) => setState(() => _selectedHour = val),
                min: 1,
                max: 12,
              ),
              
              Text(
                ':',
                style: AppTextStyles.heading2.copyWith(
                  color: Colors.white,
                ),
              ),
              
              // Minute
              _buildTimeSpinner(
                value: _selectedMinute,
                onChanged: (val) => setState(() => _selectedMinute = val),
                min: 0,
                max: 59,
                padZero: true,
              ),
              
              const SizedBox(width: 16),
              
              // AM/PM
              Column(
                children: [
                  GestureDetector(
                    onTap: () => setState(() => _isPM = false),
                    child: Text(
                      'AM',
                      style: TextStyle(
                        color: !_isPM ? Colors.white : AppColors.txtInactive,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () => setState(() => _isPM = true),
                    child: Text(
                      'PM',
                      style: TextStyle(
                        color: _isPM ? Colors.white : AppColors.txtInactive,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Info text
          Text(
            'We\'ll notify before your scheduled booking,\nso you have time to safely exit',
            style: AppTextStyles.caption,
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 24),
          
          // Pickup Now button
          GestureDetector(
            onTap: () {
              Navigator.pop(context, {
                'displayText': 'Pickup Now',
                'dateTime': DateTime.now(),
                'isNow': true,
              });
            },
            child: Container(
              width: double.infinity,
              height: 52,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.inputBorder),
              ),
              child: Center(
                child: Text(
                  'Pickup Now',
                  style: AppTextStyles.body.copyWith(color: Colors.white),
                ),
              ),
            ),
          ),
          
          // Schedule Button
          CustomButton.main(
            text: 'Schedule Pickup',
            onTap: () {
              // Build the datetime
              int hour24 = _selectedHour;
              if (_isPM && hour24 != 12) hour24 += 12;
              if (!_isPM && hour24 == 12) hour24 = 0;
              
              final scheduledDateTime = DateTime(
                _selectedDate.year,
                _selectedDate.month,
                _selectedDate.day,
                hour24,
                _selectedMinute,
              );
              
              // Build the display string
              final timeStr = '$_selectedHour:${_selectedMinute.toString().padLeft(2, '0')} ${_isPM ? 'PM' : 'AM'}';
              final isToday = _selectedDate.day == DateTime.now().day && 
                              _selectedDate.month == DateTime.now().month;
              final displayText = isToday 
                  ? 'Today $timeStr' 
                  : '${_days[_selectedDate.weekday - 1]} $timeStr';
              
              Navigator.pop(context, {
                'displayText': displayText,
                'dateTime': scheduledDateTime,
                'isNow': false,
              });
            },
          ),
          
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildTimeSpinner({
    required int value,
    required Function(int) onChanged,
    required int min,
    required int max,
    bool padZero = false,
  }) {
    return SizedBox(
      width: 50,
      height: 80,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          GestureDetector(
            onTap: () {
              if (value < max) onChanged(value + 1);
            },
            child: Icon(
              Icons.keyboard_arrow_up,
              color: AppColors.txtInactive,
              size: 20,
            ),
          ),
          Text(
            padZero ? value.toString().padLeft(2, '0') : value.toString(),
            style: AppTextStyles.heading2.copyWith(
              color: Colors.white,
            ),
          ),
          GestureDetector(
            onTap: () {
              if (value > min) onChanged(value - 1);
            },
            child: Icon(
              Icons.keyboard_arrow_down,
              color: AppColors.txtInactive,
              size: 20,
            ),
          ),
        ],
      ),
    );
  }
}
