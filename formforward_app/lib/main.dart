import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const FormForwardApp());
}

class FormForwardApp extends StatelessWidget {
  const FormForwardApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FormForward',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const HomeScreen(),
    );
  }
}
