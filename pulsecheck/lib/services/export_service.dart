import 'dart:io';

import 'package:csv/csv.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

import 'health_repository.dart';

/// Turns your local reading history into a CSV or PDF file you can share
/// or hand to a doctor. Export is the only way data ever leaves the phone
/// in this app, and it only happens when you tap one of these buttons.
class ExportService {
  final HealthRepository _repository;

  ExportService({HealthRepository? repository}) : _repository = repository ?? HealthRepository();

  Future<void> shareCsv() async {
    final hr = await _repository.heartRateReadings();
    final bp = await _repository.bloodPressureReadings();

    final rows = <List<String>>[
      ['type', 'date', 'value_1', 'value_2', 'notes'],
      for (final r in hr) ['heart_rate', r.takenAt.toIso8601String(), '${r.bpm}', r.rmssdMs?.toStringAsFixed(0) ?? '', ''],
      for (final r in bp)
        [
          'blood_pressure',
          r.takenAt.toIso8601String(),
          '${r.systolic}',
          '${r.diastolic}',
          r.notes ?? '',
        ],
    ];

    final csv = const ListToCsvConverter().convert(rows);
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/pulsecheck_export.csv');
    await file.writeAsString(csv);

    await SharePlus.instance.share(
      ShareParams(files: [XFile(file.path)], text: 'PulseCheck data export'),
    );
  }

  Future<void> sharePdfReport() async {
    final hr = await _repository.heartRateReadings();
    final bp = await _repository.bloodPressureReadings();

    final doc = pw.Document();
    doc.addPage(
      pw.MultiPage(
        build: (context) => [
          pw.Header(level: 0, text: 'PulseCheck report'),
          pw.Paragraph(
            text: 'Generated ${DateTime.now().toLocal()}. Not a medical document — '
                'PulseCheck is a wellness app, not a diagnostic tool.',
            style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
          ),
          pw.SizedBox(height: 16),
          pw.Header(level: 1, text: 'Heart rate readings (${hr.length})'),
          pw.Table.fromTextArray(
            headers: ['Date', 'BPM', 'HRV (ms)'],
            data: [
              for (final r in hr)
                [r.takenAt.toLocal().toString(), '${r.bpm}', r.rmssdMs?.toStringAsFixed(0) ?? '—'],
            ],
          ),
          pw.SizedBox(height: 16),
          pw.Header(level: 1, text: 'Blood pressure readings (${bp.length})'),
          pw.Table.fromTextArray(
            headers: ['Date', 'Systolic', 'Diastolic', 'Pulse', 'Reference range'],
            data: [
              for (final r in bp)
                [
                  r.takenAt.toLocal().toString(),
                  '${r.systolic}',
                  '${r.diastolic}',
                  r.pulse?.toString() ?? '—',
                  r.referenceCategory,
                ],
            ],
          ),
        ],
      ),
    );

    final bytes = await doc.save();
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/pulsecheck_report.pdf');
    await file.writeAsBytes(bytes);

    await SharePlus.instance.share(
      ShareParams(files: [XFile(file.path)], text: 'PulseCheck report'),
    );
  }
}
