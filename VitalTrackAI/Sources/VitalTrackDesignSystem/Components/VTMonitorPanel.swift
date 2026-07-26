import SwiftUI

/// Dark monitor-style BP readout for comfort-first logging.
public struct VTMonitorPanel: View {
    private let systolic: Int
    private let diastolic: Int
    private let pulse: Int?
    private let categoryLabel: String

    public init(systolic: Int, diastolic: Int, pulse: Int?, categoryLabel: String) {
        self.systolic = systolic
        self.diastolic = diastolic
        self.pulse = pulse
        self.categoryLabel = categoryLabel
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("SYSTOLIC / DIASTOLIC")
                        .font(VTTypography.caption().weight(.bold))
                        .foregroundStyle(Color.white.opacity(0.85))
                    Text("\(systolic)/\(diastolic)")
                        .font(VTTypography.metric(48))
                        .foregroundStyle(.white)
                        .contentTransition(.numericText())
                        .minimumScaleFactor(0.7)
                        .lineLimit(1)
                }
                Spacer(minLength: 12)
                VStack(alignment: .trailing, spacing: 8) {
                    Text("PULSE")
                        .font(VTTypography.caption().weight(.bold))
                        .foregroundStyle(Color.white.opacity(0.85))
                    Text(pulse.map(String.init) ?? "--")
                        .font(VTTypography.metric(28))
                        .foregroundStyle(.white)
                    Text(categoryLabel)
                        .font(VTTypography.caption().weight(.bold))
                        .foregroundStyle(VTColors.brandDeep)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.92))
                        .clipShape(Capsule())
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.04, green: 0.21, blue: 0.20),
                    Color(red: 0.06, green: 0.33, blue: 0.30),
                    Color(red: 0.09, green: 0.25, blue: 0.34)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: Color.black.opacity(0.18), radius: 16, y: 8)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Blood pressure \(systolic) over \(diastolic), pulse \(pulse.map(String.init) ?? "unknown"), \(categoryLabel)")
    }
}

public struct VTSourceChip: View {
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(VTTypography.caption().weight(.bold))
            .foregroundStyle(VTColors.brandSecondary)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(VTColors.subtle)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

public struct VTScreenHeader: View {
    private let eyebrow: String
    private let title: String
    private let subtitle: String?

    public init(eyebrow: String, title: String, subtitle: String? = nil) {
        self.eyebrow = eyebrow
        self.title = title
        self.subtitle = subtitle
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(eyebrow)
                .font(VTTypography.body().weight(.bold))
                .foregroundStyle(VTColors.brandPrimary)
            Text(title)
                .font(VTTypography.display(34))
                .foregroundStyle(VTColors.textPrimary)
                .accessibilityAddTraits(.isHeader)
            if let subtitle {
                Text(subtitle)
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
