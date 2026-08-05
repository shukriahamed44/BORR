import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_dev.flutter/flutter_secure_storage'),
      (MethodCall methodCall) async => null,
    );
  });

  testWidgets('Smoke test harness initialization', (WidgetTester tester) async {
    expect(true, isTrue);
  });
}
