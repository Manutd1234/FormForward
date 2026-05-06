import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme/app_theme.dart';
import '../widgets/section_header.dart';

class ChartsTab extends StatefulWidget {
  const ChartsTab({super.key});

  @override
  State<ChartsTab> createState() => _ChartsTabState();
}

class _ChartsTabState extends State<ChartsTab> {
  int _selectedMetric = 0;

  static const _metrics = [
    {'label': 'Cadence', 'unit': 'spm', 'color': Color(0xFFff9b83), 'icon': Icons.directions_run},
    {'label': 'Heart rate', 'unit': 'bpm', 'color': Color(0xFFf36b6d), 'icon': Icons.favorite},
    {'label': 'Vertical osc.', 'unit': 'cm', 'color': Color(0xFF8f96ff), 'icon': Icons.height},
    {'label': 'Ground contact', 'unit': 'ms', 'color': Color(0xFFf3c85d), 'icon': Icons.speed},
    {'label': 'Stride length', 'unit': 'm', 'color': Color(0xFF7ed6af), 'icon': Icons.straighten},
    {'label': 'Pace', 'unit': '/km', 'color': Color(0xFFcc7b6d), 'icon': Icons.timer},
  ];

  static const List<List<double>> _sampleData = [
    [178.0, 179.0, 177.0, 177.0, 176.0, 175.0, 170.0, 167.0, 163.0, 162.0, 160.0],
    [138.0, 142.0, 148.0, 155.0, 160.0, 162.0, 166.0, 170.0, 172.0, 175.0, 178.0],
    [8.2, 8.0, 8.1, 8.3, 8.5, 8.8, 9.1, 9.3, 9.5, 9.7, 10.0],
    [248.0, 250.0, 252.0, 255.0, 258.0, 260.0, 264.0, 268.0, 272.0, 278.0, 282.0],
    [1.15, 1.16, 1.14, 1.12, 1.10, 1.08, 1.05, 1.02, 1.0, 0.98, 0.96],
    [5.2, 5.25, 5.3, 5.35, 5.4, 5.45, 5.5, 5.6, 5.7, 5.8, 5.95],
  ];

  @override
  Widget build(BuildContext context) {
    final metric = _metrics[_selectedMetric];
    final data = _sampleData[_selectedMetric];
    final color = metric['color'] as Color;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(title: 'Metric Timeline', eyebrow: 'METRIC TIMELINE'),
        const SizedBox(height: 10),

        // Metric selector chips
        SizedBox(
          height: 42,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _metrics.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final isActive = i == _selectedMetric;
              final m = _metrics[i];
              return GestureDetector(
                onTap: () => setState(() => _selectedMetric = i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: isActive ? (m['color'] as Color).withOpacity(0.15) : AppTheme.card,
                    borderRadius: BorderRadius.circular(21),
                    border: Border.all(
                      color: isActive ? (m['color'] as Color) : AppTheme.line,
                      width: isActive ? 1.5 : 1,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Row(
                    children: [
                      Icon(
                        m['icon'] as IconData,
                        size: 20,
                        color: isActive ? (m['color'] as Color) : AppTheme.textSecondary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        m['label'] as String,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: isActive ? AppTheme.text : AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 6),
        Text(
          '${metric['label']} (${metric['unit']})',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 14),

        // Chart
        Container(
          height: 280,
          padding: const EdgeInsets.fromLTRB(8, 20, 16, 12),
          decoration: BoxDecoration(
            color: const Color(0xFF211d1c),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.line),
          ),
          child: LineChart(
            LineChartData(
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                horizontalInterval: _getInterval(data),
                getDrawingHorizontalLine: (_) => FlLine(color: AppTheme.line.withValues(alpha: 0.5), strokeWidth: 1),
              ),
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 44,
                    getTitlesWidget: (v, _) => Text(
                      _selectedMetric == 4 ? v.toStringAsFixed(2) : v.toStringAsFixed(0),
                      style: const TextStyle(fontSize: 10, color: AppTheme.muted, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    interval: 2,
                    getTitlesWidget: (v, _) => Text(
                      '${v.toInt()}:00',
                      style: const TextStyle(fontSize: 10, color: AppTheme.muted, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [
                LineChartBarData(
                  spots: List.generate(data.length, (i) => FlSpot(i.toDouble(), data[i])),
                  isCurved: true,
                  color: color,
                  barWidth: 3,
                  dotData: FlDotData(
                    show: true,
                    getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(radius: 4, color: color, strokeWidth: 0),
                  ),
                  belowBarData: BarAreaData(
                    show: true,
                    color: color.withValues(alpha: 0.1),
                  ),
                ),
              ],
              minX: 0,
              maxX: (data.length - 1).toDouble(),
            ),
          ),
        ),

        const SizedBox(height: 14),

        // Legend
        Row(
          children: [
            _legendDot(color, metric['label'] as String),
            const SizedBox(width: 14),
            _legendDot(AppTheme.amber, 'Medium'),
            const SizedBox(width: 14),
            _legendDot(AppTheme.red, 'High'),
          ],
        ),
      ],
    );
  }

  double _getInterval(List<double> data) {
    final range = data.reduce((a, b) => a > b ? a : b) - data.reduce((a, b) => a < b ? a : b);
    return (range / 4).ceilToDouble().clamp(1, 100);
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
      ],
    );
  }
}
