import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SectionHeader extends StatelessWidget {
  final String title;
  final String eyebrow;
  final VoidCallback? onAction;
  final String? actionLabel;

  const SectionHeader({
    super.key,
    required this.title,
    required this.eyebrow,
    this.onAction,
    this.actionLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                eyebrow,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.accent,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
        if (onAction != null)
          TextButton(
            onPressed: onAction,
            child: Text(actionLabel ?? 'View all', style: const TextStyle(fontSize: 12, color: AppTheme.accent, fontWeight: FontWeight.w700)),
          ),
      ],
    );
  }
}
