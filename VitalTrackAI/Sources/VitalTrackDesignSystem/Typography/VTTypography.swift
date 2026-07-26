import SwiftUI

/// Comfort-first type scale. Defaults favor readability for adults 40+;
/// still scales with Dynamic Type via system text styles where mapped.
public enum VTTypography {
    /// Expressive display — serif when available, not Inter/Roboto.
    public static func display(_ size: CGFloat = 36) -> Font {
        .system(size: size, weight: .semibold, design: .serif)
    }

    public static func title(_ size: CGFloat = 24) -> Font {
        .system(size: size, weight: .semibold, design: .default)
    }

    /// Body defaults larger than stock HIG 17 for comfort mode.
    public static func body(_ size: CGFloat = 19) -> Font {
        .system(size: size, weight: .regular, design: .default)
    }

    public static func metric(_ size: CGFloat = 52) -> Font {
        .system(size: size, weight: .bold, design: .rounded).monospacedDigit()
    }

    public static func caption(_ size: CGFloat = 16) -> Font {
        .system(size: size, weight: .regular, design: .default)
    }

    /// Disclaimers must remain readable — never tiny legal fine print.
    public static func disclaimer(_ size: CGFloat = 16) -> Font {
        .system(size: size, weight: .medium, design: .default)
    }

    /// Extra-large comfort scale (~AX2) for Settings → Larger Text.
    public static func comfortBody(_ size: CGFloat = 22) -> Font {
        .system(size: size, weight: .regular, design: .default)
    }
}
