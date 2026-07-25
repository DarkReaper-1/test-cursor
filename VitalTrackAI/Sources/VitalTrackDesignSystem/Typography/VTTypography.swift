import SwiftUI

public enum VTTypography {
    /// Expressive display — serif when available, not Inter/Roboto.
    public static func display(_ size: CGFloat = 34) -> Font {
        .system(size: size, weight: .medium, design: .serif)
    }

    public static func title(_ size: CGFloat = 22) -> Font {
        .system(size: size, weight: .semibold, design: .default)
    }

    public static func body(_ size: CGFloat = 17) -> Font {
        .system(size: size, weight: .regular, design: .default)
    }

    public static func metric(_ size: CGFloat = 48) -> Font {
        .system(size: size, weight: .bold, design: .rounded).monospacedDigit()
    }

    public static func caption(_ size: CGFloat = 13) -> Font {
        .system(size: size, weight: .regular, design: .default)
    }

    public static func disclaimer(_ size: CGFloat = 12) -> Font {
        .system(size: size, weight: .regular, design: .default)
    }
}
