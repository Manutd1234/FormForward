import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/metric_card.dart';
import '../widgets/section_header.dart';

class DashboardTab extends StatelessWidget {
  const DashboardTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Upload Card
        Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.accent.withOpacity(0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.accent.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.upload_file, color: AppTheme.accent, size: 20),
                  SizedBox(width: 8),
                  Text('Upload Activity Data', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.accent)),
                ],
              ),
              const SizedBox(height: 6),
              const Text('Load your GPS/CSV run data to begin FormForward analysis.', style: TextStyle(fontSize: 12, color: AppTheme.muted)),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Opening file picker...')),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accent.withOpacity(0.2),
                    foregroundColor: AppTheme.text,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: const Text('Select CSV / GPX File', style: TextStyle(fontSize: 13)),
                ),
              ),
            ],
          ),
        ),

        // Hero card
        Container(
          height: 180,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: const LinearGradient(
              colors: [Color(0xFF3a2520), Color(0xFF1a1614)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            border: Border.all(color: AppTheme.line),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text(
                'GEMMA 4 FORM LAB',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.accent.withValues(alpha: 0.8),
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Your Form,\nYour Forward.',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  height: 1.1,
                  color: AppTheme.text,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.accent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'AI-POWERED',
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppTheme.accent),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text('Predict & Perform', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Summary KPI grid
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.3,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          children: const [
            MetricCard(label: 'DURATION', value: '13:00'),
            MetricCard(label: 'DISTANCE', value: '2.38 km'),
            MetricCard(label: 'AVG PACE', value: '5:27 /km'),
            MetricCard(label: 'AVG CADENCE', value: '172 spm'),
            MetricCard(label: 'FORM SCORE', value: '45/100', isHighlighted: true),
            MetricCard(label: 'BREAKDOWNS', value: '29'),
          ],
        ),

        const SizedBox(height: 14),

        // Status strip
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.line),
          ),
          child: const Row(
            children: [
              _StatusItem(label: 'SOURCE', value: 'Sample CSV run'),
              _StatusItem(label: 'PRIVACY', value: 'Local by default'),
              _StatusItem(label: 'PIPELINE', value: 'Import → Detect → Coach'),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Form Breakdowns preview
        const SectionHeader(title: 'Form Breakdowns', eyebrow: 'DETECTED MOMENTS'),
        const SizedBox(height: 8),
        _buildBreakdownItem('Fatigue form risk', 'S2', '7:00'),
        _buildBreakdownItem('Ground contact drift', 'S3', '8:00'),
        _buildBreakdownItem('Stride overextension', 'S3', '8:00'),

        const SizedBox(height: 20),

        // Coaching preview
        const SectionHeader(title: 'Coaching Insights', eyebrow: 'POSE METHOD'),
        const SizedBox(height: 8),
        _buildCoachCard('Cadence drop detected', 'Increase turnover to 175+ spm during the last third of your run.', 'S2'),
        _buildCoachCard('Ground contact rising', 'Focus on quick pull drills — foot should leave ground within 240ms.', 'S3'),
      ],
    );
  }

  Widget _buildBreakdownItem(String label, String severity, String time) {
    final isHigh = severity == 'S3';
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.line),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: (isHigh ? AppTheme.red : AppTheme.amber).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(severity, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: isHigh ? AppTheme.red : AppTheme.amber)),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700))),
          Text(time, style: const TextStyle(fontSize: 13, color: AppTheme.muted, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _buildCoachCard(String title, String cue, String severity) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800))),
              Text(severity, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppTheme.amber)),
            ],
          ),
          const SizedBox(height: 6),
          Text(cue, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4)),
        ],
      ),
    );
  }
}

class _StatusItem extends StatelessWidget {
  final String label;
  final String value;
  const _StatusItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppTheme.muted, letterSpacing: 1)),
          const SizedBox(height: 3),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }
}
