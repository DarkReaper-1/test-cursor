import Foundation
import VitalTrackCore

#if canImport(UIKit)
import UIKit
#endif

public struct PDFReportBuilder: PDFReportBuilding {
    public init() {}

    public func buildReportPDF(title: String, body: String) async throws -> Data {
#if canImport(UIKit)
        let pageRect = CGRect(x: 0, y: 0, width: 612, height: 792) // US Letter
        let renderer = UIGraphicsPDFRenderer(bounds: pageRect)
        let data = renderer.pdfData { context in
            context.beginPage()
            let titleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 18)
            ]
            let bodyAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11)
            ]
            let inset: CGFloat = 48
            let titleRect = CGRect(x: inset, y: inset, width: pageRect.width - inset * 2, height: 28)
            (title as NSString).draw(in: titleRect, withAttributes: titleAttrs)
            let bodyRect = CGRect(
                x: inset,
                y: inset + 36,
                width: pageRect.width - inset * 2,
                height: pageRect.height - inset * 2 - 36
            )
            (body as NSString).draw(in: bodyRect, withAttributes: bodyAttrs)
        }
        return data
#else
        // Fallback: UTF-8 "PDF-like" text package for non-UIKit hosts / tests.
        let text = "%PDF-TEXT\n\(title)\n\n\(body)\n"
        guard let data = text.data(using: .utf8) else {
            throw VitalTrackError.exportFailed("Could not build report.")
        }
        return data
#endif
    }

    public func buildHTMLExport(title: String, body: String) -> String {
        let escapedTitle = title
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
        let escapedBody = body
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\n", with: "<br/>")
        return """
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"/><title>\(escapedTitle)</title></head>
        <body>
        <h1>\(escapedTitle)</h1>
        <p><em>\(TrustPolicy.medicalDisclaimer)</em></p>
        <p>\(escapedBody)</p>
        </body></html>
        """
    }
}
