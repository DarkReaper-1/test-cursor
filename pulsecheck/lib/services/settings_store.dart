import 'package:shared_preferences/shared_preferences.dart';

/// Small on-device flags/preferences (not health data, so a lightweight
/// key-value store is enough — no need for the SQL database here).
class SettingsStore {
  static const _disclaimerKey = 'pulsecheck_disclaimer_ack_v1';
  static const _remindersEnabledKey = 'pulsecheck_reminders_enabled_v1';
  static const _bpReminderHourKey = 'pulsecheck_bp_reminder_hour_v1';
  static const _bpReminderMinuteKey = 'pulsecheck_bp_reminder_minute_v1';
  static const _hrReminderHourKey = 'pulsecheck_hr_reminder_hour_v1';
  static const _hrReminderMinuteKey = 'pulsecheck_hr_reminder_minute_v1';
  static const _healthSyncEnabledKey = 'pulsecheck_health_sync_enabled_v1';

  Future<bool> hasAcknowledgedDisclaimer() async =>
      (await SharedPreferences.getInstance()).getBool(_disclaimerKey) ?? false;

  Future<void> setAcknowledgedDisclaimer() async =>
      (await SharedPreferences.getInstance()).setBool(_disclaimerKey, true);

  Future<bool> remindersEnabled() async =>
      (await SharedPreferences.getInstance()).getBool(_remindersEnabledKey) ?? false;

  Future<void> setRemindersEnabled(bool value) async =>
      (await SharedPreferences.getInstance()).setBool(_remindersEnabledKey, value);

  Future<(int hour, int minute)> bpReminderTime() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getInt(_bpReminderHourKey) ?? 9, prefs.getInt(_bpReminderMinuteKey) ?? 0);
  }

  Future<void> setBpReminderTime(int hour, int minute) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_bpReminderHourKey, hour);
    await prefs.setInt(_bpReminderMinuteKey, minute);
  }

  Future<(int hour, int minute)> hrReminderTime() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getInt(_hrReminderHourKey) ?? 20, prefs.getInt(_hrReminderMinuteKey) ?? 0);
  }

  Future<void> setHrReminderTime(int hour, int minute) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_hrReminderHourKey, hour);
    await prefs.setInt(_hrReminderMinuteKey, minute);
  }

  /// Off by default — syncing to Apple Health / Health Connect is an
  /// explicit opt-in, not a default behavior.
  Future<bool> healthSyncEnabled() async =>
      (await SharedPreferences.getInstance()).getBool(_healthSyncEnabledKey) ?? false;

  Future<void> setHealthSyncEnabled(bool value) async =>
      (await SharedPreferences.getInstance()).setBool(_healthSyncEnabledKey, value);
}
