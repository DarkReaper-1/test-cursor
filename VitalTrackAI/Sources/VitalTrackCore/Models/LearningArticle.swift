import Foundation

public enum LearningTopic: String, Codable, Sendable, CaseIterable, Identifiable {
    case understandingBP
    case heartBasics
    case medication
    case healthyEating
    case exercise
    case stress
    case sleep
    case faq

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .understandingBP: return "Understanding blood pressure"
        case .heartBasics: return "Heart health basics"
        case .medication: return "Medication education"
        case .healthyEating: return "Healthy eating"
        case .exercise: return "Exercise"
        case .stress: return "Stress management"
        case .sleep: return "Sleep"
        case .faq: return "FAQs"
        }
    }

    public var systemImage: String {
        switch self {
        case .understandingBP: return "heart.text.square"
        case .heartBasics: return "heart.fill"
        case .medication: return "pills.fill"
        case .healthyEating: return "leaf.fill"
        case .exercise: return "figure.walk"
        case .stress: return "brain.head.profile"
        case .sleep: return "moon.zzz.fill"
        case .faq: return "questionmark.circle.fill"
        }
    }
}

public struct LearningArticle: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var topic: LearningTopic
    public var title: String
    public var summary: String
    public var body: String
    public var minutesToRead: Int

    public init(
        id: UUID = UUID(),
        topic: LearningTopic,
        title: String,
        summary: String,
        body: String,
        minutesToRead: Int = 3
    ) {
        self.id = id
        self.topic = topic
        self.title = title
        self.summary = summary
        self.body = body
        self.minutesToRead = minutesToRead
    }
}
