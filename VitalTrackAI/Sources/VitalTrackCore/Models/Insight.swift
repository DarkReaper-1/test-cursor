import Foundation

public enum InsightSeverity: String, Codable, Sendable, CaseIterable {
    case info
    case suggestion
    case attention
}

public struct Insight: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var title: String
    public var body: String
    public var severity: InsightSeverity
    public var createdAt: Date
    public var relatedMetric: String?
    public var includesMedicalDisclaimer: Bool

    public init(
        id: UUID = UUID(),
        title: String,
        body: String,
        severity: InsightSeverity = .info,
        createdAt: Date = .now,
        relatedMetric: String? = nil,
        includesMedicalDisclaimer: Bool = true
    ) {
        self.id = id
        self.title = title
        self.body = body
        self.severity = severity
        self.createdAt = createdAt
        self.relatedMetric = relatedMetric
        self.includesMedicalDisclaimer = includesMedicalDisclaimer
    }
}
