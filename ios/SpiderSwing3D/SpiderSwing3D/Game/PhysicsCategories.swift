import Foundation

enum PhysicsCategory {
    static let none: Int = 0
    static let player: Int = 1 << 0
    static let building: Int = 1 << 1
    static let ground: Int = 1 << 2
}
