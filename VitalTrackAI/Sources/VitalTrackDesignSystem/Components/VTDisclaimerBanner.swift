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
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "info.circle.fill")
                .foregroundStyle(VTColors.info)
                .accessibilityHidden(true)
            Text(text)
                .font(VTTypography.disclaimer())
                .foregroundStyle(VTColors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(VTColors.disclaimerBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
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
