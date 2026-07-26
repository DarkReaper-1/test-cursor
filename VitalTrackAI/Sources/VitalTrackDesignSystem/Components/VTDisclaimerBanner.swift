import SwiftUI

public struct VTDisclaimerBanner: View {
    public enum Kind {
        case bloodPressure
        case heartRate
        case insights
        case custom(String)
    }

    private let kind: Kind

    public init(_ kind: Kind) {
        self.kind = kind
    }

    public var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "info.circle.fill")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(VTColors.brandPrimary)
                .accessibilityHidden(true)
            Text(text)
                .font(VTTypography.disclaimer())
                .foregroundStyle(VTColors.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(VTColors.disclaimerBackground)
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(VTColors.brandPrimary, lineWidth: 2)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityLabel(text)
    }

    private var text: String {
        switch kind {
        case .bloodPressure: return TrustCopy.shortBPBanner
        case .heartRate: return TrustCopy.shortHRBanner
        case .insights: return TrustCopy.insightsBanner
        case .custom(let value): return value
        }
    }
}
