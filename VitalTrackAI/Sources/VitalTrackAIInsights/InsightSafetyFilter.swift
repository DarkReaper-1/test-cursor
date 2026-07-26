import Foundation
import VitalTrackCore

public struct InsightSafetyFilter: Sendable {
    public init() {}

    /// Words/phrases that imply diagnosis or treatment — stripped or rewritten.
    private let bannedPatterns: [(NSRegularExpression, String)] = {
        let pairs: [(String, String)] = [
            (#"(?i)\bdiagnos(e|is|ed|ing)\b"#, "observe"),
            (#"(?i)\byou have\b"#, "your readings suggest a pattern of"),
            (#"(?i)\bhypertension\b"#, "higher blood pressure range"),
            (#"(?i)\bhypotension\b"#, "lower blood pressure range"),
            (#"(?i)\barrhythmia\b"#, "irregular pulse pattern"),
            (#"(?i)\bprescribe\b"#, "discuss with a clinician about"),
            (#"(?i)\btreat(ment|ing)?\b"#, "care plan"),
            (#"(?i)\bcure\b"#, "improve"),
            (#"(?i)\bdisease\b"#, "condition"),
            (#"(?i)\bmedical advice\b"#, "general information")
        ]
        return pairs.compactMap { pattern, replacement in
            guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
            return (regex, replacement)
        }
    }()

    public func sanitize(_ insight: Insight) -> Insight {
        var title = rewrite(insight.title)
        var body = rewrite(insight.body)
        if !body.contains("informational") && !body.contains("not medical advice") {
            body += "\n\n" + TrustPolicy.medicalDisclaimer
        }
        var result = insight
        result.title = title
        result.body = body
        result.includesMedicalDisclaimer = true
        return result
    }

    public func sanitize(all insights: [Insight]) -> [Insight] {
        insights.map(sanitize)
    }

    /// Sanitize free-form coach / summary text and append medical disclaimer once.
    public func sanitizeText(_ text: String) -> String {
        var body = rewrite(text)
        if !body.lowercased().contains("not medical advice") && !body.lowercased().contains("informational only") {
            body += "\n\n" + TrustPolicy.medicalDisclaimer
        }
        return body
    }

    private func rewrite(_ text: String) -> String {
        var output = text
        for (regex, replacement) in bannedPatterns {
            let range = NSRange(output.startIndex..., in: output)
            output = regex.stringByReplacingMatches(
                in: output,
                options: [],
                range: range,
                withTemplate: replacement
            )
        }
        return output
    }
}
