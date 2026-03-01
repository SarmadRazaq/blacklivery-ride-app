import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:firebase_storage/firebase_storage.dart';

class FirebaseStorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final firebase_auth.FirebaseAuth _auth = firebase_auth.FirebaseAuth.instance;

  Future<Map<String, String>> uploadDriverDocument({
    required String docType,
    required File file,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('You must be signed in to upload documents.');
    }

    final extension = _fileExtension(file.path);
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final storagePath =
        'drivers/${user.uid}/documents/${docType}_$timestamp.$extension';

    final ref = _storage.ref().child(storagePath);
    await ref.putFile(
      file,
      SettableMetadata(
        contentType: _mimeTypeFromExtension(extension),
        customMetadata: {
          'uid': user.uid,
          'documentType': docType,
          'uploadedAt': DateTime.now().toUtc().toIso8601String(),
        },
      ),
    );

    final downloadUrl = await ref.getDownloadURL();
    return {'url': downloadUrl, 'storagePath': storagePath};
  }

  Future<String> uploadDriverProfileImage(File file) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('You must be signed in to upload profile image.');
    }

    final extension = _fileExtension(file.path);
    final storagePath =
        'profiles/${user.uid}/driver_avatar_${DateTime.now().millisecondsSinceEpoch}.$extension';

    final ref = _storage.ref().child(storagePath);
    await ref.putFile(
      file,
      SettableMetadata(
        contentType: _mimeTypeFromExtension(extension),
        customMetadata: {
          'uid': user.uid,
          'uploadedAt': DateTime.now().toUtc().toIso8601String(),
          'type': 'profile_image',
        },
      ),
    );

    final downloadUrl = await ref.getDownloadURL();
    await user.updatePhotoURL(downloadUrl);
    return downloadUrl;
  }

  String _fileExtension(String path) {
    final normalized = path.toLowerCase();
    final dot = normalized.lastIndexOf('.');
    if (dot == -1 || dot == normalized.length - 1) return 'jpg';
    return normalized.substring(dot + 1);
  }

  String _mimeTypeFromExtension(String ext) {
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'heic':
        return 'image/heic';
      case 'heif':
        return 'image/heif';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'image/jpeg';
    }
  }
}
