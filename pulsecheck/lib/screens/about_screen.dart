import 'package:flutter/material.dart';

import '../widgets/disclaimer_dialog.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('About PulseCheck')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('How it works', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text(
            'Covering the rear camera and flash with your fingertip makes the '
            'camera see tiny brightness changes caused by blood flowing '
            'through the fingertip with each heartbeat (photoplethysmography, '
            'or PPG — the same principle used in pulse oximeters). PulseCheck '
            'analyzes those brightness changes on your device to estimate your '
            'heart rate, and, if the signal stays steady long enough, a rough '
            'heart-rate-variability (HRV) number.',
            style: TextStyle(fontSize: 16, height: 1.5),
          ),
          const SizedBox(height: 24),
          Text('What this app is not', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text(
            'It is not a medical device and it cannot measure blood pressure. '
            'No phone camera or fingerprint sensor can measure blood pressure — '
            'that needs an inflatable cuff or a clinically validated sensor. '
            'Do not use PulseCheck to diagnose or manage a health condition.',
            style: TextStyle(fontSize: 16, height: 1.5),
          ),
          const SizedBox(height: 24),
          Text('Your privacy', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text(
            '• No account or sign-in\n'
            '• No ads, no analytics, no trackers\n'
            '• All readings live in a database stored only on this device\n'
            "• Camera frames themselves are processed in memory and never saved or uploaded\n"
            "• Syncing to Apple Health / Health Connect is off by default, an explicit choice in "
            "Settings — even then it only writes to your phone's own on-device Health store, never "
            "to a PulseCheck server (there isn't one)\n"
            '• Reminder notifications are scheduled locally on your phone, not sent from a server\n'
            '• Exporting as CSV or PDF is the only way data leaves the app, and only when you tap Export\n'
            '• Permissions requested: camera, and notifications (only if you enable reminders)',
            style: TextStyle(fontSize: 16, height: 1.6),
          ),
          const SizedBox(height: 24),
          Text('Blood pressure logging', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text(
            'PulseCheck does not estimate blood pressure. Measure it with your own cuff, then '
            'type the systolic/diastolic numbers into the Log Blood Pressure screen so they sit '
            'alongside your camera-based heart rate readings, in the same charts and exports.',
            style: TextStyle(fontSize: 16, height: 1.5),
          ),
          const SizedBox(height: 32),
          OutlinedButton(
            onPressed: () => showDialog(context: context, builder: (_) => const DisclaimerDialog()),
            child: const Text('Read the full disclaimer again'),
          ),
        ],
      ),
    );
  }
}
