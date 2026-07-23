import 'package:flutter/material.dart';

import '../models/blood_pressure_reading.dart';
import '../services/health_repository.dart';
import '../services/healthkit_service.dart';
import '../services/settings_store.dart';

/// Manual blood pressure entry. PulseCheck never estimates blood pressure
/// from the camera or a fingerprint sensor — you take the reading with a
/// real cuff, and log the numbers here so they live alongside your camera
/// heart-rate readings.
class BloodPressureLogScreen extends StatefulWidget {
  const BloodPressureLogScreen({super.key});

  @override
  State<BloodPressureLogScreen> createState() => _BloodPressureLogScreenState();
}

class _BloodPressureLogScreenState extends State<BloodPressureLogScreen> {
  final _formKey = GlobalKey<FormState>();
  final _systolicController = TextEditingController();
  final _diastolicController = TextEditingController();
  final _pulseController = TextEditingController();
  final _notesController = TextEditingController();

  final _repository = HealthRepository();
  final _settings = SettingsStore();
  final _healthKit = HealthKitService();

  bool _saving = false;

  @override
  void dispose() {
    _systolicController.dispose();
    _diastolicController.dispose();
    _pulseController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final reading = BloodPressureReading(
      takenAt: DateTime.now(),
      systolic: int.parse(_systolicController.text),
      diastolic: int.parse(_diastolicController.text),
      pulse: _pulseController.text.isEmpty ? null : int.parse(_pulseController.text),
      notes: _notesController.text.isEmpty ? null : _notesController.text,
    );

    await _repository.addBloodPressure(reading);
    if (await _settings.healthSyncEnabled()) {
      await _healthKit.writeBloodPressure(
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        takenAt: reading.takenAt,
      );
    }

    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Log blood pressure')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Enter the reading from your blood pressure cuff.',
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                ),
                const SizedBox(height: 24),
                _NumberField(
                  controller: _systolicController,
                  label: 'Systolic (top number)',
                  min: 50,
                  max: 260,
                ),
                const SizedBox(height: 16),
                _NumberField(
                  controller: _diastolicController,
                  label: 'Diastolic (bottom number)',
                  min: 30,
                  max: 180,
                ),
                const SizedBox(height: 16),
                _NumberField(
                  controller: _pulseController,
                  label: 'Pulse from cuff (optional)',
                  min: 30,
                  max: 240,
                  required: false,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _notesController,
                  decoration: const InputDecoration(
                    labelText: 'Notes (optional)',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Save reading'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NumberField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final int min;
  final int max;
  final bool required;

  const _NumberField({
    required this.controller,
    required this.label,
    required this.min,
    required this.max,
    this.required = true,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.number,
      style: const TextStyle(fontSize: 22),
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return required ? 'Required' : null;
        }
        final n = int.tryParse(value);
        if (n == null) return 'Enter a number';
        if (n < min || n > max) return 'Enter a value between $min and $max';
        return null;
      },
    );
  }
}
