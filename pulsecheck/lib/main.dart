import 'package:flutter/material.dart';

import 'screens/root_nav.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const PulseCheckApp());
}

class PulseCheckApp extends StatelessWidget {
  const PulseCheckApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PulseCheck',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      // Respect the user's system font-size setting instead of overriding
      // it — important for older users and anyone using accessibility text
      // scaling.
      builder: (context, child) {
        final mediaQuery = MediaQuery.of(context);
        final clampedScale = mediaQuery.textScaler.clamp(minScaleFactor: 1.0, maxScaleFactor: 1.6);
        return MediaQuery(
          data: mediaQuery.copyWith(textScaler: clampedScale),
          child: child!,
        );
      },
      home: const RootNav(),
    );
  }
}
