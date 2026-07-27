import Foundation
import PDFKit
import UIKit

public enum ExportFormat: String, CaseIterable, Identifiable, Sendable {
    case csv
    case pdfSummary
    case pdfDoctorReport

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .csv: return "CSV"
        case .pdfSummary: return "PDF summary"
        case .pdfDoctorReport: return "Doctor report (PDF)"
        }
    }
}

/// Builds a shareable file from your local reading history. Export is the
/// only way data leaves the app, and only when you explicitly choose a
/// format and tap Share — there is no automatic upload anywhere.
public struct ExportManager {
    private let repository: HealthRepository

    public init(repository: HealthRepository) {
        self.repository = repository
    }

    public func export(_ format: ExportFormat) async throws -> URL {
        switch format {
        case .csv: return try await exportCsv()
        case .pdfSummary: return try await exportPdf(doctorStyle: false)
        case .pdfDoctorReport: return try await exportPdf(doctorStyle: true)
        }
    }

    private func exportCsv() async throws -> URL {
        let heartRate = try await repository.heartRateReadings(since: nil)
        let bloodPressure = try await repository.bloodPressureReadings(since: nil)

        var rows = ["type,date,value_1,value_2,source,notes"]
        let formatter = ISO8601DateFormatter()
        for r in heartRate {
            rows.append("heart_rate,\(formatter.string(from: r.takenAt)),\(r.bpm),\(r.hrvRMSSDMs.map { String(format: "%.0f", $0) } ?? ""),\(r.source.rawValue),")
        }
        for r in bloodPressure {
            let notes = (r.notes ?? "").replacingOccurrences(of: ",", with: ";")
            rows.append("blood_pressure,\(formatter.string(from: r.takenAt)),\(r.systolic),\(r.diastolic),\(r.source.rawValue),\(notes)")
        }

        let url = FileManager.default.temporaryDirectory.appendingPathComponent("vitaltrack_export.csv")
        try rows.joined(separator: "\n").write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private func exportPdf(doctorStyle: Bool) async throws -> URL {
        let heartRate = try await repository.heartRateReadings(since: nil)
        let bloodPressure = try await repository.bloodPressureReadings(since: nil)

        let pageBounds = CGRect(x: 0, y: 0, width: 612, height: 792) // US Letter, 72dpi
        let renderer = UIGraphicsPDFRenderer(bounds: pageBounds)

        let url = FileManager.default.temporaryDirectory.appendingPathComponent(
            doctorStyle ? "vitaltrack_doctor_report.pdf" : "vitaltrack_summary.pdf"
        )

        let data = renderer.pdfData { context in
            context.beginPage()
            var y: CGFloat = 40
            let margin: CGFloat = 40

            func draw(_ text: String, font: UIFont, color: UIColor = .black, gap: CGFloat = 6) {
                let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color]
                let attributed = NSAttributedString(string: text, attributes: attributes)
                let size = attributed.boundingRect(
                    with: CGSize(width: pageBounds.width - margin * 2, height: .greatestFiniteMagnitude),
                    options: .usesLineFragmentOrigin
                ).size
                attributed.draw(in: CGRect(x: margin, y: y, width: pageBounds.width - margin * 2, height: size.height))
                y += size.height + gap
            }

            draw(doctorStyle ? "VitalTrack — Doctor Report" : "VitalTrack — Summary Report",
                 font: .boldSystemFont(ofSize: 20))
            draw("Generated \(DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .short))",
                 font: .systemFont(ofSize: 10), color: .darkGray)
            draw("VitalTrack is a wellness app, not a diagnostic tool. Blood pressure readings were "
                + "entered manually or imported from a Bluetooth monitor / Apple Health — never estimated "
                + "by this app.", font: .systemFont(ofSize: 10), color: .darkGray, gap: 16)

            draw("Heart rate readings (\(heartRate.count))", font: .boldSystemFont(ofSize: 14))
            for r in heartRate.prefix(60) {
                let hrv = r.hrvRMSSDMs.map { ", HRV \(Int($0)) ms" } ?? ""
                draw("\(DateFormatter.localizedString(from: r.takenAt, dateStyle: .short, timeStyle: .short))  —  \(r.bpm) bpm\(hrv)",
                     font: .systemFont(ofSize: 10), gap: 3)
                if y > pageBounds.height - 60 { context.beginPage(); y = 40 }
            }

            y += 12
            draw("Blood pressure readings (\(bloodPressure.count))", font: .boldSystemFont(ofSize: 14))
            for r in bloodPressure.prefix(60) {
                draw("\(DateFormatter.localizedString(from: r.takenAt, dateStyle: .short, timeStyle: .short))  —  "
                    + "\(r.systolic)/\(r.diastolic) mmHg  ·  \(r.referenceRange.rawValue)",
                     font: .systemFont(ofSize: 10), gap: 3)
                if y > pageBounds.height - 60 { context.beginPage(); y = 40 }
            }
        }

        try data.write(to: url)
        return url
    }
}
