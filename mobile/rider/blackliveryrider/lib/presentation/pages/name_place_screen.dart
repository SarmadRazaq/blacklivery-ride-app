import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/models/saved_place_model.dart';

class NamePlaceScreen extends StatefulWidget {
  final String address;
  final String suggestedName;

  const NamePlaceScreen({
    super.key,
    required this.address,
    this.suggestedName = '',
  });

  @override
  State<NamePlaceScreen> createState() => _NamePlaceScreenState();
}

class _NamePlaceScreenState extends State<NamePlaceScreen> {
  final TextEditingController _nameController = TextEditingController();
  int _selectedIconIndex = 0;

  final List<IconData> _iconOptions = [
    Icons.location_on_outlined,
    Icons.restaurant_outlined,
    Icons.sports_bar_outlined,
    Icons.shopping_bag_outlined,
    Icons.fitness_center_outlined,
    Icons.local_hospital_outlined,
    Icons.school_outlined,
    Icons.church_outlined,
  ];

  @override
  void initState() {
    super.initState();
    _nameController.text = widget.suggestedName;
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _savePlace() {
    if (_nameController.text.isNotEmpty) {
      final savedPlace = SavedPlace(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        name: _nameController.text,
        address: widget.address,
        type: 'other',
      );
      Navigator.pop(context, savedPlace);
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
          'Name this place',
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Icon selector with name input
                  Row(
                    children: [
                      // Icon dropdown button
                      GestureDetector(
                        onTap: _showIconSelector,
                        child: Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            color: AppColors.yellow90.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            _iconOptions[_selectedIconIndex],
                            color: AppColors.yellow90,
                            size: 24,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Name input
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: AppColors.inputBg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.inputBorder),
                          ),
                          child: TextField(
                            controller: _nameController,
                            style: AppTextStyles.body.copyWith(
                              color: Colors.white,
                              fontSize: 14,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Enter name',
                              hintStyle: AppTextStyles.body.copyWith(
                                color: AppColors.txtInactive,
                                fontSize: 14,
                              ),
                              border: InputBorder.none,
                              contentPadding:
                                  const EdgeInsets.symmetric(vertical: 16),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Check icon
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          color: AppColors.success.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Icons.check,
                          color: AppColors.success,
                          size: 24,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Selected location card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.inputBorder),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.bgPri,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Icons.location_on_outlined,
                            color: AppColors.yellow90,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.suggestedName.isNotEmpty
                                    ? widget.suggestedName
                                    : 'Selected Location',
                                style: AppTextStyles.body.copyWith(
                                  color: Colors.white,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                widget.address,
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.txtInactive,
                                  fontSize: 12,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Save button
          Padding(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _nameController.text.isNotEmpty ? _savePlace : null,
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
                  'Save',
                  style: AppTextStyles.body.copyWith(
                    color: _nameController.text.isNotEmpty
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

  void _showIconSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSec,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.inputBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Choose Icon',
              style: AppTextStyles.heading3,
            ),
            const SizedBox(height: 24),
            GridView.builder(
              shrinkWrap: true,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
              ),
              itemCount: _iconOptions.length,
              itemBuilder: (context, index) {
                final isSelected = index == _selectedIconIndex;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedIconIndex = index;
                    });
                    Navigator.pop(context);
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.yellow90.withOpacity(0.2)
                          : AppColors.inputBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.yellow90
                            : AppColors.inputBorder,
                      ),
                    ),
                    child: Icon(
                      _iconOptions[index],
                      color: isSelected ? AppColors.yellow90 : Colors.white,
                      size: 28,
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
