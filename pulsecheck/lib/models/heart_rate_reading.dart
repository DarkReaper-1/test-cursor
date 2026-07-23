enum ReadingSource { camera, appleWatch, manual }

class HeartRateReading {
  final int? id;
  final DateTime takenAt;
  final int bpm;
  final double? rmssdMs;
  final ReadingSource source;

  const HeartRateReading({
    this.id,
    required this.takenAt,
    required this.bpm,
    this.rmssdMs,
    this.source = ReadingSource.camera,
  });

  Map<String, Object?> toMap() => {
        if (id != null) 'id': id,
        'taken_at': takenAt.toIso8601String(),
        'bpm': bpm,
        'rmssd_ms': rmssdMs,
        'source': source.name,
      };

  factory HeartRateReading.fromMap(Map<String, Object?> map) => HeartRateReading(
        id: map['id'] as int?,
        takenAt: DateTime.parse(map['taken_at'] as String),
        bpm: map['bpm'] as int,
        rmssdMs: (map['rmssd_ms'] as num?)?.toDouble(),
        source: ReadingSource.values.firstWhere(
          (s) => s.name == map['source'],
          orElse: () => ReadingSource.camera,
        ),
      );
}
