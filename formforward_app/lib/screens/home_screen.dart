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

  final List<_AppTab> _tabs = const [
    _AppTab(
        'Dashboard', Icons.dashboard_outlined, Icons.dashboard, DashboardTab()),
    _AppTab('Analysis', Icons.analytics_outlined, Icons.analytics, ChartsTab()),
    _AppTab('Improvements', Icons.auto_fix_high_outlined, Icons.auto_fix_high,
        ImprovementsTab()),
    _AppTab('Video', Icons.videocam_outlined, Icons.videocam, VideoTab()),
    _AppTab('Research', Icons.travel_explore_outlined, Icons.travel_explore,
        ResearchTab()),
    _AppTab('History', Icons.history_outlined, Icons.history, HistoryTab()),
    _AppTab('Coach', Icons.psychology_outlined, Icons.psychology, CoachTab()),
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 980;
        return Scaffold(
          body: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFF120F0E), AppTheme.bg],
              ),
            ),
            child: SafeArea(
              child: Column(
                children: [
                  Padding(
                    padding: EdgeInsets.fromLTRB(
                        wide ? 28 : 18, 18, wide ? 28 : 18, 14),
                    child: _buildTopShell(wide),
                  ),
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(
                          wide ? 20 : 10, 0, wide ? 20 : 10, wide ? 20 : 96),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(22),
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            border: Border.all(color: AppTheme.line),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.26),
                                blurRadius: 32,
                                offset: const Offset(0, 16),
                              ),
                            ],
                          ),
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 260),
                            switchInCurve: Curves.easeOutCubic,
                            switchOutCurve: Curves.easeInCubic,
                            child: KeyedSubtree(
                              key: ValueKey(_currentIndex),
                              child: _tabs[_currentIndex].screen,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: wide ? null : _buildBottomDock(),
        );
      },
    );
  }

  Widget _buildTopShell(bool wide) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: const LinearGradient(
                    colors: [AppTheme.peach, AppTheme.accent],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(Icons.directions_run_rounded,
                    color: Colors.black, size: 26),
              ),
              const SizedBox(width: 14),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'LOCAL WEARABLE COACHING',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.accent,
                      letterSpacing: 1.4,
                    ),
                  ),
                  SizedBox(height: 3),
                  Text(
                    'FormForward',
                    style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.text),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (wide)
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: _buildSegmentedTabs(compact: false),
          )
        else
          _buildContextChip(),
      ],
    );
  }

  Widget _buildContextChip() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.line),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.bolt_rounded, color: AppTheme.amber, size: 18),
          SizedBox(width: 8),
          Text('Local AI',
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.text)),
        ],
      ),
    );
  }

  Widget _buildSegmentedTabs({required bool compact}) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.line),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: List.generate(_tabs.length, (index) {
            final tab = _tabs[index];
            final active = index == _currentIndex;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => setState(() => _currentIndex = index),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOutCubic,
                  padding: EdgeInsets.symmetric(
                      horizontal: compact ? 14 : 16, vertical: 11),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: active
                        ? const LinearGradient(
                            colors: [Color(0x3329D3F4), Color(0x22FF9B83)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : null,
                    color: active ? null : Colors.transparent,
                    border: Border.all(
                      color: active
                          ? AppTheme.accent.withValues(alpha: 0.28)
                          : Colors.transparent,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(active ? tab.activeIcon : tab.icon,
                          color: active ? AppTheme.accent : AppTheme.muted,
                          size: 20),
                      if (!compact) ...[
                        const SizedBox(width: 8),
                        Text(
                          tab.label,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: active ? AppTheme.text : AppTheme.muted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }

  Widget _buildBottomDock() {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        child: _buildSegmentedTabs(compact: true),
      ),
    );
  }
}

class _AppTab {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final Widget screen;

  const _AppTab(this.label, this.icon, this.activeIcon, this.screen);
}
