import 'package:flutter/material.dart';

import '../services/export_service.dart';
import '../services/health_repository.dart';
import '../services/healthkit_service.dart';
import '../services/notification_service.dart';
import '../services/settings_store.dart';
import 'about_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _settings = SettingsStore();
  final _notifications = NotificationService();
  final _healthKit = HealthKitService();
  final _repository = HealthRepository();
  final _export = ExportService();

  bool _remindersEnabled = false;
  bool _healthSyncEnabled = false;
  TimeOfDay _bpTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _hrTime = const TimeOfDay(hour: 20, minute: 0);
  bool _loading = true;
  bool _exporting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final reminders = await _settings.remindersEnabled();
    final healthSync = await _settings.healthSyncEnabled();
    final bp = await _settings.bpReminderTime();
    final hr = await _settings.hrReminderTime();
    if (!mounted) return;
    setState(() {
      _remindersEnabled = reminders;
      _healthSyncEnabled = healthSync;
      _bpTime = TimeOfDay(hour: bp.$1, minute: bp.$2);
      _hrTime = TimeOfDay(hour: hr.$1, minute: hr.$2);
      _loading = false;
    });
  }

  Future<void> _toggleReminders(bool value) async {
    if (value) {
      final granted = await _notifications.requestPermission();
      if (!granted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Notification permission was denied.')),
          );
        }
        return;
      }
      await _notifications.scheduleDailyReminders(
        bpHour: _bpTime.hour,
        bpMinute: _bpTime.minute,
        hrHour: _hrTime.hour,
        hrMinute: _hrTime.minute,
      );
    } else {
      await _notifications.cancelAll();
    }
    await _settings.setRemindersEnabled(value);
    setState(() => _remindersEnabled = value);
  }

  Future<void> _toggleHealthSync(bool value) async {
    if (value) {
      final granted = await _healthKit.requestAuthorization();
      if (!granted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Apple Health / Health Connect permission was denied.')),
          );
        }
        return;
      }
    }
    await _settings.setHealthSyncEnabled(value);
    setState(() => _healthSyncEnabled = value);
  }

  Future<void> _pickTime(bool isBp) async {
    final initial = isBp ? _bpTime : _hrTime;
    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked == null) return;
    setState(() => isBp ? _bpTime = picked : _hrTime = picked);
    if (isBp) {
      await _settings.setBpReminderTime(picked.hour, picked.minute);
    } else {
      await _settings.setHrReminderTime(picked.hour, picked.minute);
    }
    if (_remindersEnabled) {
      await _notifications.scheduleDailyReminders(
        bpHour: _bpTime.hour,
        bpMinute: _bpTime.minute,
        hrHour: _hrTime.hour,
        hrMinute: _hrTime.minute,
      );
    }
  }

  Future<void> _exportCsv() async {
    setState(() => _exporting = true);
    await _export.shareCsv();
    if (mounted) setState(() => _exporting = false);
  }

  Future<void> _exportPdf() async {
    setState(() => _exporting = true);
    await _export.sharePdfReport();
    if (mounted) setState(() => _exporting = false);
  }

  Future<void> _clearData() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete all data?'),
        content: const Text('This permanently deletes every reading stored on this device.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed == true) {
      await _repository.clearAll();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('All data deleted.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                const _SectionHeader('Reminders'),
                SwitchListTile(
                  title: const Text('Daily reminders'),
                  subtitle: const Text('Local notifications only — no server involved'),
                  value: _remindersEnabled,
                  onChanged: _toggleReminders,
                ),
                ListTile(
                  enabled: _remindersEnabled,
                  title: const Text('Blood pressure reminder'),
                  trailing: Text(_bpTime.format(context)),
                  onTap: _remindersEnabled ? () => _pickTime(true) : null,
                ),
                ListTile(
                  enabled: _remindersEnabled,
                  title: const Text('Heart rate reminder'),
                  trailing: Text(_hrTime.format(context)),
                  onTap: _remindersEnabled ? () => _pickTime(false) : null,
                ),
                const Divider(),
                const _SectionHeader('Apple Health / Health Connect'),
                SwitchListTile(
                  title: const Text('Sync readings'),
                  subtitle: const Text(
                    "Off by default. When on, PulseCheck writes readings you take here into "
                    "your phone's own Health app — it never reads your existing Health history, "
                    "and nothing is sent to a PulseCheck server.",
                  ),
                  value: _healthSyncEnabled,
                  onChanged: _toggleHealthSync,
                ),
                const Divider(),
                const _SectionHeader('Export'),
                ListTile(
                  leading: const Icon(Icons.table_chart_outlined),
                  title: const Text('Export as CSV'),
                  enabled: !_exporting,
                  onTap: _exportCsv,
                ),
                ListTile(
                  leading: const Icon(Icons.picture_as_pdf_outlined),
                  title: const Text('Export as PDF report'),
                  enabled: !_exporting,
                  onTap: _exportPdf,
                ),
                const Divider(),
                const _SectionHeader('Data & privacy'),
                ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: const Text('About & disclaimer'),
                  onTap: () => Navigator.of(context)
                      .push(MaterialPageRoute(builder: (_) => const AboutScreen())),
                ),
                ListTile(
                  leading: const Icon(Icons.delete_forever_outlined, color: Colors.red),
                  title: const Text('Delete all data', style: TextStyle(color: Colors.red)),
                  onTap: _clearData,
                ),
                const SizedBox(height: 24),
              ],
            ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      child: Text(
        title,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey),
      ),
    );
  }
}
