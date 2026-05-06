import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final bool isHighlighted;

  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isHighlighted ? AppTheme.accent.withValues(alpha: 0.12) : AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isHighlighted ? AppTheme.accent.withValues(alpha: 0.4) : AppTheme.line,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              color: isHighlighted ? AppTheme.accent : AppTheme.muted,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: isHighlighted ? AppTheme.accent : AppTheme.text,
            ),
          ),
        ],
      ),
    );
  }
}
