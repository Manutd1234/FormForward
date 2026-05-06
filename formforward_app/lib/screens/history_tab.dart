import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/section_header.dart';

class HistoryTab extends StatelessWidget {
  const HistoryTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(title: 'Activity & Research History', eyebrow: 'DATA VAULT'),
        const SizedBox(height: 16),
        const Text(
          'Review your previously clocked runs, uploaded videos, and scraped research sources.',
          style: TextStyle(color: AppTheme.muted, fontSize: 14),
        ),
        const SizedBox(height: 20),

        _buildHistoryItem(
          icon: Icons.bar_chart,
          title: 'Morning 5k Tempo',
          subtitle: 'CSV Upload • 2026-05-01',
          actionText: 'Load',
          iconColor: Colors.white,
          borderColor: AppTheme.line,
          bgColor: Colors.white.withOpacity(0.03),
        ),
        _buildHistoryItem(
          icon: Icons.videocam,
          title: 'Track Sprint Form',
          subtitle: 'MP4 Video • 2026-04-28',
          actionText: 'Load',
          iconColor: Colors.white,
          borderColor: AppTheme.line,
          bgColor: Colors.white.withOpacity(0.03),
        ),
        _buildHistoryItem(
          icon: Icons.picture_as_pdf,
          title: 'Biomechanics of Elite Sprinters',
          subtitle: 'PDF Scraped (PaddleOCR) • 2026-04-25',
          actionText: 'View Data',
          iconColor: AppTheme.amber,
          borderColor: AppTheme.amber.withOpacity(0.3),
          bgColor: AppTheme.amber.withOpacity(0.05),
        ),
        _buildHistoryItem(
          icon: Icons.public,
          title: 'Optimal Cadence Study',
          subtitle: 'Web Scraped (Scrapy) • 2026-04-20',
          actionText: 'View Data',
          iconColor: AppTheme.accent,
          borderColor: AppTheme.accent.withOpacity(0.3),
          bgColor: AppTheme.accent.withOpacity(0.05),
        ),
      ],
    );
  }

  Widget _buildHistoryItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required String actionText,
    required Color iconColor,
    required Color borderColor,
    required Color bgColor,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 28),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(color: iconColor == Colors.white ? AppTheme.text : iconColor, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 4),
                Text(subtitle, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
              ],
            ),
          ),
          OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(
              foregroundColor: iconColor == Colors.white ? AppTheme.text : iconColor,
              side: BorderSide(color: iconColor == Colors.white ? AppTheme.line : iconColor),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
              minimumSize: const Size(64, 32),
            ),
            child: Text(actionText, style: const TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
