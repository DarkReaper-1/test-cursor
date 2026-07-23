/// A blood pressure reading the user typed in after measuring it with an
/// external cuff. PulseCheck never estimates blood pressure itself — no
/// phone camera or fingerprint sensor can do that reliably.
class BloodPressureReading {
  final int? id;
  final DateTime takenAt;
  final int systolic;
  final int diastolic;
  final int? pulse;
  final String? notes;

  const BloodPressureReading({
    this.id,
    required this.takenAt,
    required this.systolic,
    required this.diastolic,
    this.pulse,
    this.notes,
  });

  Map<String, Object?> toMap() => {
        if (id != null) 'id': id,
        'taken_at': takenAt.toIso8601String(),
        'systolic': systolic,
        'diastolic': diastolic,
        'pulse': pulse,
        'notes': notes,
      };

  factory BloodPressureReading.fromMap(Map<String, Object?> map) => BloodPressureReading(
        id: map['id'] as int?,
        takenAt: DateTime.parse(map['taken_at'] as String),
        systolic: map['systolic'] as int,
        diastolic: map['diastolic'] as int,
        pulse: map['pulse'] as int?,
        notes: map['notes'] as String?,
      );

  /// General reference categorization based on published AHA thresholds.
  /// This is informational only — not a diagnosis, and it deliberately
  /// does not use words like "you have hypertension".
  String get referenceCategory {
    if (systolic >= 180 || diastolic >= 120) return 'Crisis range — seek medical care';
    if (systolic >= 140 || diastolic >= 90) return 'Stage 2 range';
    if (systolic >= 130 || diastolic >= 80) return 'Stage 1 range';
    if (systolic >= 120 && diastolic < 80) return 'Elevated range';
    return 'Normal range';
  }
}
