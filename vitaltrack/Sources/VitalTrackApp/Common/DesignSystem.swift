import SwiftUI

/// Deliberately thin: Apple Human Interface Guidelines means leaning on
/// system colors, system fonts, and Dynamic Type rather than a custom
/// design language — the accent color is the only real brand choice.
enum VTColor {
    static let accent = Color(red: 0.05, green: 0.48, blue: 0.42) // calm teal, not alarm red
    static let good = Color.green
    static let caution = Color.orange
    static let danger = Color.red
    static let cardBackground = Color(uiColor: .secondarySystemGroupedBackground)
}

enum VTMetrics {
    static let cardCornerRadius: CGFloat = 16
    static let sectionSpacing: CGFloat = 20
}

struct VTCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            content
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(VTColor.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: VTMetrics.cardCornerRadius, style: .continuous))
    }
}

struct VTPill: View {
    let text: String
    let tone: Tone

    enum Tone { case neutral, good, caution, danger

        var color: Color {
            switch self {
            case .neutral: return .secondary
            case .good: return VTColor.good
            case .caution: return VTColor.caution
            case .danger: return VTColor.danger
            }
        }
    }

    var body: some View {
        Label(text, systemImage: "circle.fill")
            .labelStyle(.titleOnly)
            .font(.footnote.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(tone.color.opacity(0.15))
            .foregroundStyle(tone.color)
            .clipShape(Capsule())
    }
}
