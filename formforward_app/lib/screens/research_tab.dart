import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/section_header.dart';

class ResearchTab extends StatefulWidget {
  const ResearchTab({super.key});

  @override
  State<ResearchTab> createState() => _ResearchTabState();
}

class _ResearchTabState extends State<ResearchTab> {
  final List<Map<String, String>> _collatedSources = [];
  bool _isTraining = false;
  String _trainingStatus = 'Idle';

  void _scrapeUrls() {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Scraping URLs...')));
    Future.delayed(const Duration(seconds: 1), () {
      setState(() {
        _collatedSources.add({
          'title': 'Optimal Cadence Study',
          'type': 'Web Scraped (Scrapy)',
          'date': DateTime.now().toString().split(' ')[0],
          'summary': 'Extracted running form data from web source.'
        });
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added web source to collated data.')));
    });
  }

  void _analyzePdf() {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Analyzing PDF using PaddleOCR...')));
    Future.delayed(const Duration(seconds: 1), () {
      setState(() {
        _collatedSources.add({
          'title': 'Biomechanics of Elite Sprinters.pdf',
          'type': 'PDF Scraped (PaddleOCR)',
          'date': DateTime.now().toString().split(' ')[0],
          'summary': 'Extracted biomechanical form data. Text is ready for ML ingestion.'
        });
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added PDF source to collated data.')));
    });
  }

  void _startTraining() {
    if (_collatedSources.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please collate some sources first.')));
      return;
    }
    
    setState(() {
      _isTraining = true;
      _trainingStatus = 'Synthesizing data with Gemma 4...';
    });
    
    Future.delayed(const Duration(seconds: 2), () {
      setState(() {
        _isTraining = false;
        _trainingStatus = 'Context injected with Garmin CSV and ${_collatedSources.length} research sources.';
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pipeline Complete!')));
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(title: 'Biomechanical Scraper', eyebrow: 'DATA INGESTION'),
        const SizedBox(height: 16),
        
        // URL Scraper
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Website Scraper', style: TextStyle(color: AppTheme.accent, fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              const Text('Enter URLs (comma-separated) to scrape articles on optimal running form.', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
              const SizedBox(height: 12),
              TextField(
                decoration: InputDecoration(
                  hintText: 'https://example.com/running-form',
                  hintStyle: TextStyle(color: AppTheme.muted.withOpacity(0.5)),
                  filled: true,
                  fillColor: Colors.black26,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppTheme.line)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppTheme.line)),
                  contentPadding: const EdgeInsets.all(12),
                ),
                maxLines: 2,
                style: const TextStyle(color: AppTheme.text, fontSize: 14),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _scrapeUrls,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accent.withOpacity(0.15),
                    foregroundColor: AppTheme.accent,
                    side: const BorderSide(color: AppTheme.accent),
                  ),
                  child: const Text('Scrape URLs'),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // PDF Analyzer
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('PDF Analyzer', style: TextStyle(color: AppTheme.amber, fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              const Text('Upload research papers (PDF) to train the machine learning model.', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
              const SizedBox(height: 12),
              InkWell(
                onTap: _analyzePdf,
                child: Container(
                  height: 60,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppTheme.amber.withOpacity(0.05),
                    border: Border.all(color: AppTheme.amber.withOpacity(0.3), style: BorderStyle.solid), // Flutter doesn't natively support dashed easily without custom paint, solid is fine
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Text('+ Select PDF Document', style: TextStyle(color: AppTheme.amber, fontWeight: FontWeight.w600)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _analyzePdf,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.amber.withOpacity(0.15),
                    foregroundColor: AppTheme.amber,
                    side: const BorderSide(color: AppTheme.amber),
                  ),
                  child: const Text('Analyze PDF'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Collated Sources & Training
        const SectionHeader(title: 'Model Training', eyebrow: 'FINE-TUNING'),
        const SizedBox(height: 16),
        
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Collated Sources', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  Text('${_collatedSources.length} items', style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 12),
              
              if (_collatedSources.isEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(8)),
                  child: const Center(child: Text('Waiting for sources... Use the scrapers above.', style: TextStyle(color: AppTheme.muted, fontSize: 12))),
                )
              else
                ..._collatedSources.map((source) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: Text(source['title']!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14))),
                          Text(source['date']!, style: const TextStyle(color: AppTheme.muted, fontSize: 10)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(source['type']!, style: TextStyle(color: source['type']!.contains('PDF') ? AppTheme.amber : AppTheme.accent, fontSize: 11)),
                      const SizedBox(height: 4),
                      Text(source['summary']!, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                    ],
                  ),
                )).toList(),
              
              const SizedBox(height: 24),
              const Divider(color: AppTheme.line),
              const SizedBox(height: 16),
              
              const Text('Garmin CSV Integration', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              const Text('Upload Garmin CSV data and synthesize your collated research with the Gemma 4 coach (RAG pipeline).', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
              const SizedBox(height: 16),
              
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isTraining ? null : _startTraining,
                  icon: _isTraining ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.analytics_outlined),
                  label: Text(_isTraining ? 'Synthesizing...' : 'Upload CSV & Synthesize with Gemma'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
              
              if (_trainingStatus != 'Idle')
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Center(
                    child: Text(_trainingStatus, style: TextStyle(color: _isTraining ? AppTheme.amber : AppTheme.accent, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
