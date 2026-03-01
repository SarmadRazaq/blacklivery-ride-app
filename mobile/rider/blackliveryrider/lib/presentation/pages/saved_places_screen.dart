import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/models/saved_place_model.dart';
import '../../core/services/places_service.dart';
import 'add_place_screen.dart';
import 'add_home_screen.dart';
import 'add_work_screen.dart';

class SavedPlacesScreen extends StatefulWidget {
  final Function(SavedPlace)? onPlaceSelected;

  const SavedPlacesScreen({
    super.key,
    this.onPlaceSelected,
  });

  @override
  State<SavedPlacesScreen> createState() => _SavedPlacesScreenState();
}

class _SavedPlacesScreenState extends State<SavedPlacesScreen> {
  final PlacesService _placesService = PlacesService();
  SavedPlace? _homePlace;
  SavedPlace? _workPlace;
  List<SavedPlace> _otherPlaces = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSavedPlaces();
  }

  Future<void> _loadSavedPlaces() async {
    setState(() => _isLoading = true);
    try {
      final places = await _placesService.getSavedPlaces();
      setState(() {
        _homePlace = places.where((p) => p.type == 'home').firstOrNull;
        _workPlace = places.where((p) => p.type == 'work').firstOrNull;
        _otherPlaces = places.where((p) => p.type == 'other').toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _addHome() async {
    final result = await Navigator.push<SavedPlace>(
      context,
      MaterialPageRoute(
        builder: (context) => const AddHomeScreen(),
      ),
    );

    if (result != null) {
      setState(() {
        _homePlace = result;
      });
    }
  }

  void _addWork() async {
    final result = await Navigator.push<SavedPlace>(
      context,
      MaterialPageRoute(
        builder: (context) => const AddWorkScreen(),
      ),
    );

    if (result != null) {
      setState(() {
        _workPlace = result;
      });
    }
  }

  void _addPlace() async {
    final result = await Navigator.push<SavedPlace>(
      context,
      MaterialPageRoute(
        builder: (context) => const AddPlaceScreen(),
      ),
    );

    if (result != null) {
      setState(() {
        _otherPlaces.add(result);
      });
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
          'Saved Places',
          style: AppTextStyles.heading3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.yellow90))
          : SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Favourites section
            Text(
              'Favourites',
              style: AppTextStyles.body.copyWith(
                color: AppColors.txtInactive,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 12),

            // Add Home
            _buildFavouriteItem(
              icon: Icons.home_outlined,
              title: _homePlace?.name ?? 'Add Home',
              subtitle: _homePlace?.address,
              isSet: _homePlace != null,
              onTap: _addHome,
            ),

            const SizedBox(height: 12),

            // Add Work
            _buildFavouriteItem(
              icon: Icons.work_outline,
              title: _workPlace?.name ?? 'Add Work',
              subtitle: _workPlace?.address,
              isSet: _workPlace != null,
              onTap: _addWork,
            ),

            const SizedBox(height: 24),

            // Other Places section
            Row(
              children: [
                Text(
                  'Other Places',
                  style: AppTextStyles.body.copyWith(
                    color: AppColors.txtInactive,
                    fontSize: 12,
                  ),
                ),
                const Spacer(),
                Text(
                  'Edit to set your favorite restaurant or bar',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.txtInactive,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Other places list
            ..._otherPlaces.map((place) => _buildOtherPlaceItem(place)),

            const SizedBox(height: 16),

            // Add a place button
            GestureDetector(
              onTap: _addPlace,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.inputBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.inputBorder),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.add,
                      color: AppColors.yellow90,
                      size: 22,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Add a place',
                      style: AppTextStyles.body.copyWith(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFavouriteItem({
    required IconData icon,
    required String title,
    String? subtitle,
    required bool isSet,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSet ? AppColors.yellow90.withOpacity(0.1) : AppColors.inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSet ? AppColors.yellow90.withOpacity(0.3) : AppColors.inputBorder,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSet ? AppColors.yellow90 : AppColors.txtInactive,
              size: 22,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.txtInactive,
                        fontSize: 12,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: AppColors.txtInactive,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOtherPlaceItem(SavedPlace place) {
    return GestureDetector(
      onTap: () {
        if (widget.onPlaceSelected != null) {
          widget.onPlaceSelected!(place);
          Navigator.pop(context);
        }
      },
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
                    place.name,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    place.address,
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
            Icon(
              Icons.chevron_right,
              color: AppColors.txtInactive,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
