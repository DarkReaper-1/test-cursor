import 'package:flutter/material.dart';

/// Shown once on first launch, and always reachable from the About screen.
/// Written in plain language on purpose — this is read by people of every
/// age and health-literacy level, not just developers.
class DisclaimerDialog extends StatelessWidget {
  const DisclaimerDialog({super.key});

  static Future<void> showIfNeeded(BuildContext context, {required VoidCallback onAcknowledged}) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const DisclaimerDialog(),
    ).then((_) => onAcknowledged());
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Before you start'),
      content: const SingleChildScrollView(
        child: Text(
          'PulseCheck is a wellness tool, not a medical device.\n\n'
          '• It estimates heart rate (and, with a steady reading, a rough '
          'heart-rate-variability number) using your phone camera and flash.\n\n'
          '• It does NOT measure blood pressure. No fingerprint- or '
          'camera-based consumer app can — that requires a cuff or a '
          'clinically validated sensor.\n\n'
          '• Do not use this app to diagnose, monitor, or make decisions '
          'about any medical condition. If you feel unwell, contact a '
          'doctor or emergency services.\n\n'
          '• Everything you measure stays on this device. No account, '
          'no ads, no data leaves your phone.',
          style: TextStyle(fontSize: 16, height: 1.4),
        ),
      ),
      actions: [
        FilledButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('I understand'),
        ),
      ],
    );
  }
}
