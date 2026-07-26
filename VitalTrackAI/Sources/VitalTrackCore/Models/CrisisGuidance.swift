import Foundation

/// Calm, non-alarmist guidance when a logged reading is in a concerning range.
/// Never diagnoses. Never replaces emergency services or clinical advice.
public struct CrisisGuidance: Codable, Sendable, Equatable {
    public var title: String
    public var calmSummary: String
    public var whatThisMayMean: String
    public var urgentSymptoms: [String]
    public var whenToCallEmergency: String
    public var whenToContactDoctor: String
    public var whatToDoNow: [String]
    public var disclaimer: String

    public init(
        title: String,
        calmSummary: String,
        whatThisMayMean: String,
        urgentSymptoms: [String],
        whenToCallEmergency: String,
        whenToContactDoctor: String,
        whatToDoNow: [String],
        disclaimer: String
    ) {
        self.title = title
        self.calmSummary = calmSummary
        self.whatThisMayMean = whatThisMayMean
        self.urgentSymptoms = urgentSymptoms
        self.whenToCallEmergency = whenToCallEmergency
        self.whenToContactDoctor = whenToContactDoctor
        self.whatToDoNow = whatToDoNow
        self.disclaimer = disclaimer
    }
}

public enum CrisisSeverity: String, Codable, Sendable {
    case none
    case elevatedAttention
    case crisisRange
}
