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
      // Persist to Firestore
      SavedPlace? persisted;
      if (_homePlace != null && _homePlace!.id.isNotEmpty && _homePlace!.id != 'home') {
        // Update existing
        final updated = SavedPlace(
          id: _homePlace!.id,
          name: result.name,
          address: result.address,
          type: result.type,
          latitude: result.latitude,
          longitude: result.longitude,
        );
        persisted = await _placesService.updateSavedPlace(updated);
      } else {
        persisted = await _placesService.addSavedPlace(result);
      }
      setState(() {
        _homePlace = persisted ?? result;
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
      // Persist to Firestore
      SavedPlace? persisted;
      if (_workPlace != null && _workPlace!.id.isNotEmpty && _workPlace!.id != 'work') {
        // Update existing
        final updated = SavedPlace(
          id: _workPlace!.id,
          name: result.name,
          address: result.address,
          type: result.type,
          latitude: result.latitude,
          longitude: result.longitude,
        );
        persisted = await _placesService.updateSavedPlace(updated);
      } else {
        persisted = await _placesService.addSavedPlace(result);
      }
      setState(() {
        _workPlace = persisted ?? result;
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
      // Persist to Firestore
      final persisted = await _placesService.addSavedPlace(result);
      setState(() {
        _otherPlaces.add(persisted ?? result);
      });
    }
  }

  Future<void> _confirmDelete(String title, Future<void> Function() onDelete) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.bgSec,
        title: Text(
          'Delete $title?',
          style: AppTextStyles.heading3.copyWith(fontSize: 16),
        ),
        content: Text(
          'This saved place will be permanently removed.',
          style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel',
                style: AppTextStyles.body.copyWith(color: AppColors.txtInactive)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Delete',
                style: AppTextStyles.body.copyWith(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await onDelete();
    }
  }

  Future<void> _deleteHome() async {
    if (_homePlace == null) return;
    await _confirmDelete('Home', () async {
      final success = await _placesService.deleteSavedPlace(_homePlace!.id);
      if (success) {
        setState(() => _homePlace = null);
      }
    });
  }

  Future<void> _deleteWork() async {
    if (_workPlace == null) return;
    await _confirmDelete('Work', () async {
      final success = await _placesService.deleteSavedPlace(_workPlace!.id);
      if (success) {
        setState(() => _workPlace = null);
      }
    });
  }

  Future<void> _deleteOtherPlace(SavedPlace place) async {
    await _confirmDelete(place.name, () async {
      final success = await _placesService.deleteSavedPlace(place.id);
      if (success) {
        setState(() => _otherPlaces.remove(place));
      }
    });
  }

  void _editOtherPlace(SavedPlace place) async {
    final result = await Navigator.push<SavedPlace>(
      context,
      MaterialPageRoute(
        builder: (context) => AddPlaceScreen(existingPlace: place),
      ),
    );

    if (result != null) {
      // Keep the original id so the backend can update
      final updated = SavedPlace(
        id: place.id,
        name: result.name,
        address: result.address,
        type: 'other',
        latitude: result.latitude,
        longitude: result.longitude,
      );
      final persisted = await _placesService.updateSavedPlace(updated);
      setState(() {
        final idx = _otherPlaces.indexWhere((p) => p.id == place.id);
        if (idx >= 0) {
          _otherPlaces[idx] = persisted ?? updated;
        }
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
              onLongPress: _homePlace != null ? _deleteHome : null,
            ),

            const SizedBox(height: 12),

            // Add Work
            _buildFavouriteItem(
              icon: Icons.work_outline,
              title: _workPlace?.name ?? 'Add Work',
              subtitle: _workPlace?.address,
              isSet: _workPlace != null,
              onTap: _addWork,
              onLongPress: _workPlace != null ? _deleteWork : null,
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
    VoidCallback? onLongPress,
  }) {
    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
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
            if (isSet) ...[
              GestureDetector(
                onTap: () {
                  if (title.toLowerCase().contains('home')) {
                    _deleteHome();
                  } else if (title.toLowerCase().contains('work')) {
                    _deleteWork();
                  }
                },
                child: Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Icon(
                    Icons.delete_outline,
                    color: AppColors.txtInactive,
                    size: 20,
                  ),
                ),
              ),
            ],
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
    final child = GestureDetector(
      onTap: () {
        if (widget.onPlaceSelected != null) {
          widget.onPlaceSelected!(place);
          Navigator.pop(context);
        } else {
          _editOtherPlace(place);
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
            GestureDetector(
              onTap: () => _editOtherPlace(place),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(
                  Icons.edit_outlined,
                  color: AppColors.txtInactive,
                  size: 18,
                ),
              ),
            ),
            const SizedBox(width: 4),
            GestureDetector(
              onTap: () => _deleteOtherPlace(place),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(
                  Icons.delete_outline,
                  color: AppColors.txtInactive,
                  size: 20,
                ),
              ),
            ),
          ],
        ),
      ),
    );

    return Dismissible(
      key: ValueKey(place.id),
      direction: DismissDirection.endToStart,
      background: Container(
        margin: const EdgeInsets.only(bottom: 12),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: Colors.red.withOpacity(0.2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.delete, color: Colors.red),
      ),
      confirmDismiss: (_) async {
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: AppColors.bgSec,
            title: Text(
              'Delete ${place.name}?',
              style: AppTextStyles.heading3.copyWith(fontSize: 16),
            ),
            content: Text(
              'This saved place will be permanently removed.',
              style: AppTextStyles.body.copyWith(color: AppColors.txtInactive),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('Cancel',
                    style: AppTextStyles.body.copyWith(color: AppColors.txtInactive)),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text('Delete',
                    style: AppTextStyles.body.copyWith(color: Colors.red)),
              ),
            ],
          ),
        );
        return confirmed == true;
      },
      onDismissed: (_) async {
        final success = await _placesService.deleteSavedPlace(place.id);
        if (success) {
          setState(() => _otherPlaces.remove(place));
        }
      },
      child: child,
    );
  }
}
