import SceneKit
import UIKit

struct BuildingData {
    let node: SCNNode
    let roofY: Float
    let minX: Float
    let maxX: Float
    let minZ: Float
    let maxZ: Float
}

final class CityGenerator {
    private(set) var buildings: [BuildingData] = []
    private let parentNode = SCNNode()

    var node: SCNNode { parentNode }

    func generate(worldLength: Float = 280, seed: UInt64 = 42) {
        parentNode.childNodes.forEach { $0.removeFromParentNode() }
        buildings.removeAll()

        var rng = SeededRandom(seed: seed)
        var x: Float = -20

        while x < worldLength {
            let width = Float.random(in: 6...14, using: &rng)
            let depth = Float.random(in: 6...14, using: &rng)
            let height = Float.random(in: 12...45, using: &rng)
            let gap = Float.random(in: 4...12, using: &rng)

            let building = makeBuilding(width: width, depth: depth, height: height, rng: &rng)
            building.position = SCNVector3(x + width * 0.5, height * 0.5, Float.random(in: -8...8, using: &rng))
            parentNode.addChildNode(building)

            let pos = building.position
            buildings.append(BuildingData(
                node: building,
                roofY: pos.y + height * 0.5,
                minX: pos.x - width * 0.5,
                maxX: pos.x + width * 0.5,
                minZ: pos.z - depth * 0.5,
                maxZ: pos.z + depth * 0.5
            ))

            x += width + gap
        }

        addGround(length: worldLength)
        addDistantSkyline(length: worldLength, rng: &rng)
    }

    func roofHeight(atX x: Float, z: Float) -> Float {
        var highest: Float = 0
        for b in buildings {
            if x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ {
                highest = max(highest, b.roofY)
            }
        }
        return highest
    }

    func findWebAnchor(near point: SCNVector3, maxDistance: Float = 55) -> SCNVector3? {
        var best: SCNVector3?
        var bestScore = Float.greatestFiniteMagnitude

        for b in buildings {
            let anchors = [
                SCNVector3(b.minX, b.roofY, (b.minZ + b.maxZ) * 0.5),
                SCNVector3(b.maxX, b.roofY, (b.minZ + b.maxZ) * 0.5),
                SCNVector3((b.minX + b.maxX) * 0.5, b.roofY, b.minZ),
                SCNVector3((b.minX + b.maxX) * 0.5, b.roofY, b.maxZ),
                SCNVector3(b.minX, b.roofY + 2, (b.minZ + b.maxZ) * 0.5),
                SCNVector3(b.maxX, b.roofY + 2, (b.minZ + b.maxZ) * 0.5),
            ]

            for anchor in anchors {
                let dx = anchor.x - point.x
                let dy = anchor.y - point.y
                let dz = anchor.z - point.z
                let dist = sqrt(dx * dx + dy * dy + dz * dz)
                if dist < maxDistance && dist > 8 && dist < bestScore {
                    bestScore = dist
                    best = anchor
                }
            }
        }
        return best
    }

    private func makeBuilding(width: Float, depth: Float, height: Float, rng: inout SeededRandom) -> SCNNode {
        let container = SCNNode()
        container.name = "building"

        let hue = CGFloat.random(in: 0.55...0.65, using: &rng)
        let brightness = CGFloat.random(in: 0.12...0.22, using: &rng)
        let baseColor = UIColor(hue: hue, saturation: 0.2, brightness: brightness, alpha: 1)

        let box = SCNBox(width: CGFloat(width), height: CGFloat(height), length: CGFloat(depth), chamferRadius: 0.15)
        box.firstMaterial?.diffuse.contents = baseColor
        box.firstMaterial?.specular.contents = UIColor(white: 0.1, alpha: 1)
        let body = SCNNode(geometry: box)
        container.addChildNode(body)

        addWindows(to: container, width: width, height: height, depth: depth, rng: &rng)

        let shape = SCNPhysicsShape(geometry: box, options: nil)
        container.physicsBody = SCNPhysicsBody(type: .static, shape: shape)
        container.physicsBody?.categoryBitMask = PhysicsCategory.building
        container.physicsBody?.collisionBitMask = PhysicsCategory.player

        return container
    }

    private func addWindows(to building: SCNNode, width: Float, height: Float, depth: Float, rng: inout SeededRandom) {
        let rows = Int(height / 3)
        let cols = Int(width / 2.2)

        for row in 1..<rows {
            for col in 0..<cols {
                guard Bool.random(probability: 0.55, using: &rng) else { continue }
                let lit = Bool.random(probability: 0.45, using: &rng)
                let winColor = lit
                    ? UIColor(red: 1, green: 0.92, blue: 0.55, alpha: 0.9)
                    : UIColor(red: 0.08, green: 0.1, blue: 0.16, alpha: 0.9)

                let win = SCNBox(width: 0.8, height: 1.2, length: 0.05, chamferRadius: 0.02)
                win.firstMaterial?.diffuse.contents = winColor
                win.firstMaterial?.emission.contents = lit ? winColor.withAlphaComponent(0.4) : UIColor.black

                let winNode = SCNNode(geometry: win)
                let xOff = -width * 0.5 + 1.2 + Float(col) * 2.2
                winNode.position = SCNVector3(xOff, -height * 0.5 + Float(row) * 3, depth * 0.5 + 0.03)
                building.addChildNode(winNode)
            }
        }
    }

    private func addGround(length: Float) {
        let ground = SCNFloor()
        ground.firstMaterial?.diffuse.contents = UIColor(red: 0.05, green: 0.06, blue: 0.1, alpha: 1)
        ground.firstMaterial?.roughness.contents = 0.9
        let groundNode = SCNNode(geometry: ground)
        groundNode.position = SCNVector3(length * 0.5, 0, 0)
        groundNode.physicsBody = SCNPhysicsBody(type: .static, shape: nil)
        groundNode.physicsBody?.categoryBitMask = PhysicsCategory.ground
        parentNode.addChildNode(groundNode)
    }

    private func addDistantSkyline(length: Float, rng: inout SeededRandom) {
        var x: Float = 0
        while x < length {
            let w = Float.random(in: 8...20, using: &rng)
            let h = Float.random(in: 30...80, using: &rng)
            let box = SCNBox(width: CGFloat(w), height: CGFloat(h), length: CGFloat(w), chamferRadius: 0)
            let hue = CGFloat.random(in: 0.55...0.7, using: &rng)
            box.firstMaterial?.diffuse.contents = UIColor(hue: hue, saturation: 0.15, brightness: 0.08, alpha: 1)

            let node = SCNNode(geometry: box)
            node.position = SCNVector3(x, h * 0.5, -40 + Float.random(in: -10...10, using: &rng))
            node.opacity = 0.35
            parentNode.addChildNode(node)
            x += w + Float.random(in: 2...8, using: &rng)
        }
    }
}

// MARK: - Seeded RNG

struct SeededRandom: RandomNumberGenerator {
    private var state: UInt64

    init(seed: UInt64) {
        state = seed == 0 ? 1 : seed
    }

    mutating func next() -> UInt64 {
        state ^= state << 13
        state ^= state >> 7
        state ^= state << 17
        return state
    }
}

extension Float {
    static func random(in range: ClosedRange<Float>, using generator: inout SeededRandom) -> Float {
        let t = Float.random(in: 0...1, using: &generator)
        return range.lowerBound + (range.upperBound - range.lowerBound) * t
    }
}

extension CGFloat {
    static func random(in range: ClosedRange<CGFloat>, using generator: inout SeededRandom) -> CGFloat {
        let t = Double.random(in: 0...1, using: &generator)
        return range.lowerBound + (range.upperBound - range.lowerBound) * CGFloat(t)
    }
}

extension Bool {
    static func random(probability: Double, using generator: inout SeededRandom) -> Bool {
        Double.random(in: 0...1, using: &generator) < probability
    }
}
