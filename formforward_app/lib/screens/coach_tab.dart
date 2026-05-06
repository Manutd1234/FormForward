import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/section_header.dart';

class CoachTab extends StatefulWidget {
  const CoachTab({super.key});

  @override
  State<CoachTab> createState() => _CoachTabState();
}

class _CoachTabState extends State<CoachTab> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, String>> _messages = [
    {
      'role': 'assistant',
      'content':
          'Welcome to FormForward! I\'m your AI running coach powered by Gemma 4. '
          'Upload a CSV/GPX file or a running video and I\'ll analyze your form using '
          'wearable metrics and computer vision.\n\n'
          'I can help with:\n'
          '• Interpreting cadence, vertical oscillation, and ground contact trends\n'
          '• Identifying when and why your form broke down\n'
          '• POSE Method cues, drills, and focus areas for your next run\n'
          '• Video-based biomechanical angle assessment (12 metrics)\n\n'
          'What would you like to know?'
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.auto_awesome, size: 14, color: AppTheme.accent),
                    SizedBox(width: 6),
                    Text('Gemma 4', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppTheme.accent)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('AI Running Coach', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.green.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('LOCAL', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppTheme.green, letterSpacing: 1)),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Training Card
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.amber.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.amber.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.model_training, color: AppTheme.amber, size: 20),
                  SizedBox(width: 8),
                  Text('Train Gemma 4 Model', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.amber)),
                ],
              ),
              const SizedBox(height: 6),
              const Text('Upload running data to fine-tune the model for your personal form improvement over time.', style: TextStyle(fontSize: 12, color: AppTheme.muted)),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Selecting data files and starting Gemma 4 fine-tuning...')),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.amber.withValues(alpha: 0.2),
                    foregroundColor: AppTheme.text,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: const Text('Upload Data & Train', style: TextStyle(fontSize: 13)),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 8),

        // Messages
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: _messages.length,
            itemBuilder: (context, i) {
              final msg = _messages[i];
              final isUser = msg['role'] == 'user';
              return Align(
                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                  decoration: BoxDecoration(
                    color: isUser ? AppTheme.accent.withValues(alpha: 0.15) : AppTheme.card,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(14),
                      topRight: const Radius.circular(14),
                      bottomLeft: Radius.circular(isUser ? 14 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 14),
                    ),
                    border: Border.all(color: isUser ? AppTheme.accent.withValues(alpha: 0.2) : AppTheme.line),
                  ),
                  child: Text(
                    msg['content']!,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.5,
                      color: isUser ? AppTheme.text : AppTheme.textSecondary,
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        // Input
        Container(
          padding: const EdgeInsets.fromLTRB(12, 8, 8, 12),
          decoration: const BoxDecoration(
            color: AppTheme.surface,
            border: Border(top: BorderSide(color: AppTheme.line)),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.line),
                    ),
                    child: TextField(
                      controller: _controller,
                      style: const TextStyle(fontSize: 14, color: AppTheme.text),
                      decoration: InputDecoration(
                        hintText: 'Ask about your running form…',
                        hintStyle: TextStyle(color: AppTheme.muted.withValues(alpha: 0.6), fontSize: 14),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onSubmitted: _sendMessage,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _sendMessage(_controller.text),
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppTheme.accent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.send_rounded, color: AppTheme.bg, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _sendMessage(String text) {
    if (text.trim().isEmpty) return;
    setState(() {
      _messages.add({'role': 'user', 'content': text.trim()});
      _controller.clear();
      // Simulated assistant response
      _messages.add({
        'role': 'assistant',
        'content': 'I see your question about "${text.trim()}". '
            'To provide specific coaching, please upload your Garmin CSV/GPX data or a running video. '
            'I\'ll analyze your biomechanics and give you POSE Method drills tailored to your form.\n\n'
            'For now, based on the sample data:\n'
            '• Your cadence drops from 178 to 160 spm in the last 5 minutes — classic fatigue pattern\n'
            '• Ground contact time rises from 248ms to 282ms\n'
            '• Recommended: focus on quick-pull drills and maintain arm drive in the final third.'
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
