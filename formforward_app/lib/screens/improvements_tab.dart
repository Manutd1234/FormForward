import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/section_header.dart';

class ImprovementsTab extends StatelessWidget {
  const ImprovementsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(title: 'Form Improvements', eyebrow: 'ACTIONABLE ADJUSTMENTS'),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Based on your analysis, focus on the following biomechanical adjustments to optimize your POSE method form:',
                style: TextStyle(color: AppTheme.muted, fontSize: 14, height: 1.5),
              ),
              const SizedBox(height: 16),
              _buildAdjustmentItem(
                'Increase Cadence',
                'Aim for 175-180 spm to reduce ground contact time and vertical oscillation.',
                Icons.speed,
              ),
              _buildAdjustmentItem(
                'Pull, Don\'t Push',
                'Focus on pulling your foot up under your hips using your hamstrings instead of pushing off the ground.',
                Icons.arrow_upward,
              ),
              _buildAdjustmentItem(
                'Lean Forward',
                'Lean from the ankles (not the waist) to harness gravity.',
                Icons.trending_flat,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAdjustmentItem(String title, String description, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.accent.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: AppTheme.accent, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.text)),
                const SizedBox(height: 4),
                Text(description, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
