import 'package:flutter_test/flutter_test.dart';
import 'package:blackliveryrider/core/providers/auth_provider.dart';

void main() {
  test('AuthProvider should initialize without requiring Firebase app setup', () {
    expect(() => AuthProvider(), returnsNormally);
  });
}
