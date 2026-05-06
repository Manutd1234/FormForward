import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../theme/app_theme.dart';
import '../widgets/section_header.dart';

class VideoTab extends StatefulWidget {
  const VideoTab({super.key});

  @override
  State<VideoTab> createState() => _VideoTabState();
}

class _VideoTabState extends State<VideoTab> {
  String _status = 'No video uploaded';
  bool _hasVideo = false;
  bool _isAnalyzing = false;
  bool _showResults = false;

  // Sample analysis results
  final _grades = {
    'Head': {'value': 95.0, 'grade': 'Good'},
    'Trunk Lean': {'value': 8.2, 'grade': 'Good'},
    'L Knee': {'value': 142.0, 'grade': 'Good'},
    'R Knee': {'value': 148.0, 'grade': 'Needs Improvement'},
    'L Elbow': {'value': 78.0, 'grade': 'Good'},
    'R Elbow': {'value': 82.0, 'grade': 'Good'},
    'L Shank': {'value': 6.5, 'grade': 'Good'},
    'R Shank': {'value': 12.0, 'grade': 'Needs Improvement'},
    'Hip Drop': {'value': 2.8, 'grade': 'Good'},
    'Vert. Osc': {'value': 22.0, 'grade': 'Good'},
    'L Foot': {'value': 8.0, 'grade': 'Good'},
    'R Foot': {'value': 18.0, 'grade': 'Needs Improvement'},
  };

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(title: 'Live tracking & upload', eyebrow: 'COMPUTER VISION'),

        const SizedBox(height: 12),

        // Live Tracking Button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Starting Live Tracking via Camera...')),
              );
            },
            icon: const Icon(Icons.fiber_manual_record, color: Colors.redAccent),
            label: const Text('Start Live Tracking', style: TextStyle(fontSize: 16)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.surface,
              foregroundColor: AppTheme.text,
              side: const BorderSide(color: AppTheme.accent),
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Upload area
        GestureDetector(
          onTap: _pickVideo,
          child: Container(
            height: _hasVideo ? 200 : 140,
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _hasVideo ? AppTheme.accent.withValues(alpha: 0.4) : AppTheme.line,
                width: _hasVideo ? 2 : 1,
              ),
            ),
            child: _hasVideo
                ? Stack(
                    children: [
                      Center(
                        child: Icon(Icons.play_circle_filled, size: 54, color: AppTheme.accent.withValues(alpha: 0.6)),
                      ),
                      Positioned(
                        bottom: 10,
                        left: 14,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppTheme.bg.withValues(alpha: 0.85),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(_status, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
                        ),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.videocam_outlined, size: 40, color: AppTheme.muted.withValues(alpha: 0.6)),
                      const SizedBox(height: 10),
                      const Text('Tap to upload running video', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.muted)),
                      const SizedBox(height: 4),
                      Text('Supports MP4, MOV · Side-view recommended', style: TextStyle(fontSize: 11, color: AppTheme.muted.withValues(alpha: 0.6))),
                    ],
                  ),
          ),
        ),

        if (_hasVideo) ...[
          const SizedBox(height: 12),

          // CV Pipeline status
          _buildPipelineTracker(),

          const SizedBox(height: 12),

          // Analyze button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isAnalyzing ? null : _runAnalysis,
              icon: _isAnalyzing
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.bg))
                  : const Icon(Icons.auto_awesome, size: 18),
              label: Text(_isAnalyzing ? 'Analyzing…' : (_showResults ? 'Re-analyze' : 'Analyze with CV')),
            ),
          ),
        ],

        if (_showResults) ...[
          const SizedBox(height: 18),

          // Biomechanical angle grid
          const SectionHeader(title: 'Biomechanical Angles', eyebrow: '12-POINT ANALYSIS'),
          const SizedBox(height: 8),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.5,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            children: _grades.entries.map((e) => _buildAngleCard(e.key, e.value['value'] as double, e.value['grade'] as String)).toList(),
          ),

          const SizedBox(height: 18),

          // Gait phases
          const SectionHeader(title: 'Gait Cycle Phases', eyebrow: 'STRIDE ANALYSIS'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _buildPhaseTag('20%: left-stance / right-swing'),
              _buildPhaseTag('50%: right-stance / left-swing'),
              _buildPhaseTag('80%: left-stance / right-swing'),
            ],
          ),

          const SizedBox(height: 18),

          // Form score
          const SectionHeader(title: 'Form Assessment', eyebrow: 'SCORING'),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.line),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.amber.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text('67/100', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppTheme.amber)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('3 strengths · 3 areas to improve', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text('Trunk lean and head position are solid. R Shank and R Foot need attention.',
                          style: TextStyle(fontSize: 12, color: AppTheme.muted, height: 1.3)),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 30),
        ],
      ],
    );
  }

  Future<void> _pickVideo() async {
    final picker = ImagePicker();
    final video = await picker.pickVideo(source: ImageSource.gallery);
    if (video != null) {
      setState(() {
        _hasVideo = true;
        _status = video.name;
        _showResults = false;
      });
    }
  }

  Future<void> _runAnalysis() async {
    setState(() => _isAnalyzing = true);
    // Simulate pipeline stages
    await Future.delayed(const Duration(milliseconds: 800));
    setState(() {
      _isAnalyzing = false;
      _showResults = true;
    });
  }

  Widget _buildPipelineTracker() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('CV PIPELINE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppTheme.muted, letterSpacing: 1.2)),
          const SizedBox(height: 8),
          _buildPipelineStage('Pose Detection', 'MediaPipe 33-point', _showResults),
          _buildPipelineStage('Angle Analysis', '12 biomechanical metrics', _showResults),
          _buildPipelineStage('Form Classification', '3-tier grading', _showResults),
          _buildPipelineStage('Gait Analysis', 'Phase + symmetry + degradation', _showResults),
          _buildPipelineStage('VLM Coaching', 'Gemma 4 synthesis', _showResults),
        ],
      ),
    );
  }

  Widget _buildPipelineStage(String title, String subtitle, bool done) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            done ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 16,
            color: done ? AppTheme.green : AppTheme.muted,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                Text(subtitle, style: TextStyle(fontSize: 10, color: AppTheme.muted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAngleCard(String label, double value, String grade) {
    Color borderColor;
    Color bgColor;
    switch (grade) {
      case 'Good':
        borderColor = AppTheme.green.withValues(alpha: 0.5);
        bgColor = AppTheme.green.withValues(alpha: 0.08);
        break;
      case 'Bad':
        borderColor = AppTheme.red.withValues(alpha: 0.5);
        bgColor = AppTheme.red.withValues(alpha: 0.1);
        break;
      default:
        borderColor = AppTheme.amber.withValues(alpha: 0.5);
        bgColor = AppTheme.amber.withValues(alpha: 0.08);
    }

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppTheme.muted)),
          const Spacer(),
          Text(
            value % 1 == 0 ? value.toStringAsFixed(0) : value.toStringAsFixed(1),
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }

  Widget _buildPhaseTag(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.blue.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.blue)),
    );
  }
}
