import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:firebase_storage/firebase_storage.dart';

class FirebaseStorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final firebase_auth.FirebaseAuth _auth = firebase_auth.FirebaseAuth.instance;

  Future<String> uploadRiderProfileImage(File file) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('You must be signed in to upload profile image.');
    }

    // Force token refresh to ensure auth is current for storage rules
    try {
      await user.getIdToken(true);
    } catch (_) {
      // Ignore refresh errors — proceed with existing token
    }

    final extension = _fileExtension(file.path);
    final path = 'profiles/${user.uid}/avatar_${DateTime.now().millisecondsSinceEpoch}.$extension';
    final ref = _storage.ref().child(path);

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

    return ref.getDownloadURL();
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
      default:
        return 'image/jpeg';
    }
  }
}
