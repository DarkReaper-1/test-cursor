import 'package:flutter/material.dart';

import '../services/insights_service.dart';

class InsightsScreen extends StatefulWidget {
  const InsightsScreen({super.key});

  @override
  State<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends State<InsightsScreen> {
  final _service = InsightsService();
  List<Insight> _insights = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final insights = await _service.buildInsights();
    if (!mounted) return;
    setState(() {
      _insights = insights;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Insights')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    const Card(
                      color: Color(0xFFF1F1EC),
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text(
                          'These are lifestyle observations generated on your device from '
                          'your own logged readings — not medical advice or a diagnosis.',
                          style: TextStyle(fontSize: 14, color: Colors.black87),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ..._insights.map((insight) => _InsightCard(insight: insight)),
                  ],
                ),
              ),
      ),
    );
  }
}

class _InsightCard extends StatelessWidget {
  final Insight insight;
  const _InsightCard({required this.insight});

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (insight.tone) {
      InsightTone.positive => (Icons.check_circle_outline, Colors.green.shade700),
      InsightTone.caution => (Icons.info_outline, Colors.orange.shade800),
      InsightTone.neutral => (Icons.insights, Colors.blueGrey),
    };
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(width: 12),
            Expanded(child: Text(insight.text, style: const TextStyle(fontSize: 16, height: 1.4))),
          ],
        ),
      ),
    );
  }
}
