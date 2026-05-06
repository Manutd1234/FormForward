import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'dashboard_tab.dart';
import 'charts_tab.dart';
import 'improvements_tab.dart';
import 'video_tab.dart';
import 'research_tab.dart';
import 'history_tab.dart';
import 'coach_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _tabs = const [
    DashboardTab(),
    ChartsTab(), // This is the analysis tab visually, but class is ChartsTab
    ImprovementsTab(),
    VideoTab(),
    ResearchTab(),
    HistoryTab(),
    CoachTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.accent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.directions_run, color: AppTheme.bg, size: 22),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'LOCAL WEARABLE COACHING',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.accent,
                    letterSpacing: 1.2,
                  ),
                ),
                const Text('FormForward'),
              ],
            ),
          ],
        ),

      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        child: _tabs[_currentIndex],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: Container(
        margin: const EdgeInsets.symmetric(horizontal: 24),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: AppTheme.surface.withOpacity(0.9),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: AppTheme.line),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 20,
              offset: const Offset(0, 10),
            )
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: List.generate(_tabs.length, (i) {
            final isActive = i == _currentIndex;
            final icons = [
              Icons.dashboard_outlined,
              Icons.analytics_outlined, // Analysis
              Icons.auto_fix_high_outlined, // Improvements
              Icons.videocam_outlined,
              Icons.travel_explore_outlined, // Research
              Icons.history_outlined, // History
              Icons.psychology_outlined, // AI Coach
            ];
            final activeIcons = [
              Icons.dashboard,
              Icons.analytics,
              Icons.auto_fix_high,
              Icons.videocam,
              Icons.travel_explore,
              Icons.history,
              Icons.psychology,
            ];
            
            return GestureDetector(
              onTap: () => setState(() => _currentIndex = i),
              behavior: HitTestBehavior.opaque,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: isActive ? AppTheme.accent.withOpacity(0.15) : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isActive ? AppTheme.accent.withOpacity(0.3) : Colors.transparent,
                  ),
                ),
                child: Icon(
                  isActive ? activeIcons[i] : icons[i],
                  color: isActive ? AppTheme.accent : AppTheme.muted,
                  size: 28, // Bigger icons as requested
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
