import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

/// Local-only reminders — "log your blood pressure" / "measure your heart
/// rate" — scheduled entirely on-device via the OS notification system.
/// There is no push server; nothing about a reminder ever leaves the phone.
class NotificationService {
  static const _bpNotificationId = 1001;
  static const _hrNotificationId = 1002;

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> _ensureInitialized() async {
    if (_initialized) return;
    tz_data.initializeTimeZones();

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    await _plugin.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
    );
    _initialized = true;
  }

  Future<bool> requestPermission() async {
    await _ensureInitialized();
    final iosGranted = await _plugin
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: true);
    final androidGranted = await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    return (iosGranted ?? true) && (androidGranted ?? true);
  }

  Future<void> scheduleDailyReminders({
    required int bpHour,
    required int bpMinute,
    required int hrHour,
    required int hrMinute,
  }) async {
    await _ensureInitialized();
    await _scheduleDaily(
      id: _bpNotificationId,
      hour: bpHour,
      minute: bpMinute,
      title: 'Blood pressure check',
      body: "It's time to log today's blood pressure reading.",
    );
    await _scheduleDaily(
      id: _hrNotificationId,
      hour: hrHour,
      minute: hrMinute,
      title: 'Heart rate check',
      body: 'Take a moment to measure your pulse.',
    );
  }

  Future<void> cancelAll() async {
    await _ensureInitialized();
    await _plugin.cancel(_bpNotificationId);
    await _plugin.cancel(_hrNotificationId);
  }

  Future<void> _scheduleDaily({
    required int id,
    required int hour,
    required int minute,
    required String title,
    required String body,
  }) async {
    final now = tz.TZDateTime.now(tz.local);
    var scheduled = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (scheduled.isBefore(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }

    await _plugin.zonedSchedule(
      id,
      title,
      body,
      scheduled,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'pulsecheck_reminders',
          'Reminders',
          channelDescription: 'Daily heart rate and blood pressure reminders',
          importance: Importance.defaultImportance,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }
}
