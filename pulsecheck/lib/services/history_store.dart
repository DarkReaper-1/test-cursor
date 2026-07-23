import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class ReadingRecord {
  final DateTime takenAt;
  final int bpm;
  final double? rmssdMs;

  const ReadingRecord({required this.takenAt, required this.bpm, this.rmssdMs});

  Map<String, dynamic> toJson() => {
        'takenAt': takenAt.toIso8601String(),
        'bpm': bpm,
        'rmssdMs': rmssdMs,
      };

  factory ReadingRecord.fromJson(Map<String, dynamic> json) => ReadingRecord(
        takenAt: DateTime.parse(json['takenAt'] as String),
        bpm: json['bpm'] as int,
        rmssdMs: (json['rmssdMs'] as num?)?.toDouble(),
      );
}

/// Everything this app stores lives only on-device in SharedPreferences.
/// There is no account, no server, and no analytics SDK — the history you
/// see is the only copy that exists.
class HistoryStore {
  static const _key = 'pulsecheck_history_v1';
  static const _disclaimerKey = 'pulsecheck_disclaimer_ack_v1';
  static const _maxEntries = 200;

  Future<List<ReadingRecord>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_key) ?? const [];
    return raw
        .map((s) => ReadingRecord.fromJson(jsonDecode(s) as Map<String, dynamic>))
        .toList()
        .reversed
        .toList();
  }

  Future<void> add(ReadingRecord record) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_key) ?? <String>[];
    raw.add(jsonEncode(record.toJson()));
    final trimmed = raw.length > _maxEntries ? raw.sublist(raw.length - _maxEntries) : raw;
    await prefs.setStringList(_key, trimmed);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }

  Future<bool> hasAcknowledgedDisclaimer() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_disclaimerKey) ?? false;
  }

  Future<void> setAcknowledgedDisclaimer() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_disclaimerKey, true);
  }
}
