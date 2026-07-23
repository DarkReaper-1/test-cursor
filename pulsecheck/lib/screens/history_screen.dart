import 'package:flutter/material.dart';

import '../models/blood_pressure_reading.dart';
import '../models/heart_rate_reading.dart';
import '../services/health_repository.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> with SingleTickerProviderStateMixin {
  final _repository = HealthRepository();
  late final TabController _tabController;

  List<HeartRateReading> _hrReadings = [];
  List<BloodPressureReading> _bpReadings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final hr = await _repository.heartRateReadings();
    final bp = await _repository.bloodPressureReadings();
    if (!mounted) return;
    setState(() {
      _hrReadings = hr;
      _bpReadings = bp;
      _loading = false;
    });
  }

  Future<void> _clearAll() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Clear all history?'),
        content: const Text('This deletes every saved heart rate and blood pressure reading on this device. It cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Clear')),
        ],
      ),
    );
    if (confirmed == true) {
      await _repository.clearAll();
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('History'),
        bottom: TabBar(controller: _tabController, tabs: const [
          Tab(text: 'Heart rate'),
          Tab(text: 'Blood pressure'),
        ]),
        actions: [
          if (_hrReadings.isNotEmpty || _bpReadings.isNotEmpty)
            IconButton(icon: const Icon(Icons.delete_outline), tooltip: 'Clear history', onPressed: _clearAll),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [_buildHrList(), _buildBpList()],
            ),
    );
  }

  Widget _buildHrList() {
    if (_hrReadings.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'No heart rate readings yet. Your history stays on this device only.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 18, color: Colors.grey),
          ),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _hrReadings.length,
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (context, index) {
        final r = _hrReadings[index];
        return ListTile(
          leading: const Icon(Icons.favorite, color: Colors.redAccent),
          title: Text('${r.bpm} bpm', style: const TextStyle(fontSize: 20)),
          subtitle: Text(_formatDate(r.takenAt)),
          trailing: r.rmssdMs != null ? Text('HRV ${r.rmssdMs!.toStringAsFixed(0)} ms') : null,
        );
      },
    );
  }

  Widget _buildBpList() {
    if (_bpReadings.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'No blood pressure readings yet. Log a reading from your cuff on the dashboard.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 18, color: Colors.grey),
          ),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _bpReadings.length,
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (context, index) {
        final r = _bpReadings[index];
        return ListTile(
          leading: const Icon(Icons.monitor_heart_outlined, color: Colors.indigo),
          title: Text('${r.systolic}/${r.diastolic} mmHg', style: const TextStyle(fontSize: 20)),
          subtitle: Text('${_formatDate(r.takenAt)} · ${r.referenceCategory}'),
          trailing: r.pulse != null ? Text('${r.pulse} bpm') : null,
        );
      },
    );
  }

  String _formatDate(DateTime dt) {
    final local = dt.toLocal();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${local.year}-${two(local.month)}-${two(local.day)}  ${two(local.hour)}:${two(local.minute)}';
  }
}
