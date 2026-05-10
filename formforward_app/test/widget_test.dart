import 'package:flutter_test/flutter_test.dart';
import 'package:formforward_app/main.dart';

void main() {
  testWidgets('FormForward app shell renders', (tester) async {
    await tester.pumpWidget(const FormForwardApp());
    await tester.pumpAndSettle();

    expect(find.text('FormForward'), findsOneWidget);
    expect(find.text('LOCAL WEARABLE COACHING'), findsOneWidget);
  });
}
