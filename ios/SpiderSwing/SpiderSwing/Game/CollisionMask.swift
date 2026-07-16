import Foundation

enum CollisionMask {
    static let player   = 1 << 0
    static let building = 1 << 1
    static let ground   = 1 << 2
}
