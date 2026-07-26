import SwiftUI

/// Large +/- control designed for comfort mode (56pt targets).
public struct VTStepperField: View {
    private let title: String
    @Binding private var value: Int
    private let range: ClosedRange<Int>
    private let step: Int

    public init(_ title: String, value: Binding<Int>, range: ClosedRange<Int>, step: Int = 1) {
        self.title = title
        self._value = value
        self.range = range
        self.step = step
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(VTTypography.title(18))
                .foregroundStyle(VTColors.textPrimary)
            HStack(spacing: 12) {
                stepButton(systemImage: "minus", enabled: value > range.lowerBound) {
                    value = max(range.lowerBound, value - step)
                }
                Text("\(value)")
                    .font(VTTypography.metric(36))
                    .foregroundStyle(VTColors.textPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 56)
                    .background(VTColors.elevated)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(VTColors.stroke, lineWidth: 2)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .contentTransition(.numericText())
                    .accessibilityLabel("\(title) \(value)")
                stepButton(systemImage: "plus", enabled: value < range.upperBound) {
                    value = min(range.upperBound, value + step)
                }
            }
        }
    }

    private func stepButton(systemImage: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(enabled ? VTColors.brandDeep : VTColors.textTertiary)
                .frame(width: 56, height: 56)
                .background(VTColors.subtle)
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(VTColors.brandPrimary, lineWidth: 2)
                )
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .disabled(!enabled)
        .buttonStyle(.plain)
        .accessibilityLabel(systemImage == "plus" ? "Increase \(title)" : "Decrease \(title)")
    }
}
