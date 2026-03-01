import 'package:flutter_test/flutter_test.dart';
import 'package:blackliveryrider/main.dart';
import 'package:blackliveryrider/presentation/pages/onboarding_screen.dart';

void main() {
  testWidgets('Onboarding screen smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    expect(find.byType(OnboardingScreen), findsOneWidget);
  });
}