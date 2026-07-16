import SceneKit
import UIKit

/// Procedural Manhattan-style skyline.
final class CityBuilder {
    private(set) var buildings: [Building] = []
    let root = SCNNode()

    struct Building {
        let node: SCNNode
        let roofY: Float
        let minX, maxX, minZ, maxZ: Float

        var center: SCNVector3 {
            SCNVector3((minX + maxX) * 0.5, roofY, (minZ + maxZ) * 0.5)
        }
    }

    func build(length: Float = 320, seed: UInt64 = 2026) {
        root.childNodes.forEach { $0.removeFromParentNode() }
        buildings.removeAll()

        var rng = LCG(seed: seed)
        addStreet(length: length)
        placeBuildings(length: length, rng: &rng)
        placeDistantSilhouette(length: length, rng: &rng)
    }

    func roofAt(x: Float, z: Float) -> Float {
        var y: Float = 0
        for b in buildings where x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ {
            y = max(y, b.roofY)
        }
        return y
    }

    /// Pick the best web-anchor near the player, biased toward the aim direction.
    func bestAnchor(near origin: SCNVector3, aim: SCNVector3, maxRange: Float = 60) -> SCNVector3? {
        var best: SCNVector3?
        var bestScore = Float.greatestFiniteMagnitude
        let aimDir = SCNVector3(aim.x - origin.x, aim.y - origin.y, aim.z - origin.z).normalized()

        for b in buildings {
            let candidates = [
                SCNVector3(b.minX, b.roofY, b.center.z),
                SCNVector3(b.maxX, b.roofY, b.center.z),
                SCNVector3(b.center.x, b.roofY, b.minZ),
                SCNVector3(b.center.x, b.roofY, b.maxZ),
                SCNVector3(b.minX, b.roofY + 1.5, b.center.z),
                SCNVector3(b.maxX, b.roofY + 1.5, b.center.z),
            ]
            for a in candidates {
                let to = SCNVector3(a.x - origin.x, a.y - origin.y, a.z - origin.z)
                let dist = to.length()
                guard dist > 10, dist < maxRange else { continue }
                let align = 1 - max(0, to.normalized().dot(aimDir)) // 0 = perfect aim
                let score = dist + align * 40
                if score < bestScore {
                    bestScore = score
                    best = a
                }
            }
        }
        return best
    }

    // MARK: - Private

    private func addStreet(length: Float) {
        let floor = SCNFloor()
        floor.reflectivity = 0
        floor.firstMaterial?.diffuse.contents = UIColor(red: 0.07, green: 0.08, blue: 0.12, alpha: 1)
        floor.firstMaterial?.roughness.contents = 0.95
        let node = SCNNode(geometry: floor)
        node.position = SCNVector3(length * 0.5, 0, 0)
        node.physicsBody = SCNPhysicsBody(type: .static, shape: nil)
        node.physicsBody?.categoryBitMask = CollisionMask.ground
        root.addChildNode(node)
    }

    private func placeBuildings(length: Float, rng: inout LCG) {
        var x: Float = -15
        while x < length {
            let w = rng.nextFloat(in: 7...16)
            let d = rng.nextFloat(in: 7...14)
            let h = rng.nextFloat(in: 14...52)
            let gap = rng.nextFloat(in: 3...10)
            let z = rng.nextFloat(in: -10...10)

            let node = makeBuilding(w: w, d: d, h: h, rng: &rng)
            node.position = SCNVector3(x + w * 0.5, h * 0.5, z)
            root.addChildNode(node)

            buildings.append(Building(
                node: node,
                roofY: h,
                minX: x, maxX: x + w,
                minZ: z - d * 0.5, maxZ: z + d * 0.5
            ))
            x += w + gap
        }
    }

    private func makeBuilding(w: Float, d: Float, h: Float, rng: inout LCG) -> SCNNode {
        let container = SCNNode()
        container.name = "building"

        let hue = CGFloat(rng.nextFloat(in: 0.55...0.68))
        let bright = CGFloat(rng.nextFloat(in: 0.10...0.20))
        let color = UIColor(hue: hue, saturation: 0.22, brightness: bright, alpha: 1)

        let box = SCNBox(width: CGFloat(w), height: CGFloat(h), length: CGFloat(d), chamferRadius: 0.2)
        box.firstMaterial?.diffuse.contents = color
        box.firstMaterial?.specular.contents = UIColor(white: 0.08, alpha: 1)
        container.addChildNode(SCNNode(geometry: box))

        decorateWindows(container, w: w, d: d, h: h, rng: &rng)

        // Roof ledge
        let ledge = SCNBox(width: CGFloat(w + 0.4), height: 0.35, length: CGFloat(d + 0.4), chamferRadius: 0.05)
        ledge.firstMaterial?.diffuse.contents = UIColor(white: 0.15, alpha: 1)
        let ledgeNode = SCNNode(geometry: ledge)
        ledgeNode.position = SCNVector3(0, h * 0.5 - 0.1, 0)
        container.addChildNode(ledgeNode)

        let shape = SCNPhysicsShape(geometry: box, options: nil)
        container.physicsBody = SCNPhysicsBody(type: .static, shape: shape)
        container.physicsBody?.categoryBitMask = CollisionMask.building
        container.physicsBody?.collisionBitMask = CollisionMask.player
        return container
    }

    private func decorateWindows(_ building: SCNNode, w: Float, d: Float, h: Float, rng: inout LCG) {
        let rows = Int(h / 3.2)
        let cols = Int(w / 2.4)
        for row in 1..<max(rows, 1) {
            for col in 0..<max(cols, 1) {
                guard rng.nextBool(0.6) else { continue }
                let lit = rng.nextBool(0.42)
                let tint = lit
                    ? UIColor(red: 1, green: 0.9, blue: 0.5, alpha: 0.95)
                    : UIColor(red: 0.06, green: 0.08, blue: 0.14, alpha: 0.9)
                let pane = SCNBox(width: 0.9, height: 1.3, length: 0.06, chamferRadius: 0.02)
                pane.firstMaterial?.diffuse.contents = tint
                pane.firstMaterial?.emission.contents = lit ? tint.withAlphaComponent(0.35) : UIColor.black
                let node = SCNNode(geometry: pane)
                node.position = SCNVector3(
                    -w * 0.5 + 1.3 + Float(col) * 2.4,
                    -h * 0.5 + Float(row) * 3.2,
                    d * 0.5 + 0.04
                )
                building.addChildNode(node)
            }
        }
    }

    private func placeDistantSilhouette(length: Float, rng: inout LCG) {
        var x: Float = 0
        while x < length {
            let w = rng.nextFloat(in: 10...22)
            let h = rng.nextFloat(in: 35...90)
            let box = SCNBox(width: CGFloat(w), height: CGFloat(h), length: CGFloat(w), chamferRadius: 0)
            let hue = CGFloat(rng.nextFloat(in: 0.55...0.7))
            box.firstMaterial?.diffuse.contents = UIColor(hue: hue, saturation: 0.12, brightness: 0.07, alpha: 1)
            let node = SCNNode(geometry: box)
            node.position = SCNVector3(x, h * 0.5, -48 + rng.nextFloat(in: -8...8))
            node.opacity = 0.4
            root.addChildNode(node)
            x += w + rng.nextFloat(in: 2...7)
        }
    }
}

// MARK: - Tiny LCG

struct LCG {
    private var state: UInt64
    init(seed: UInt64) { state = seed == 0 ? 1 : seed }

    mutating func next() -> UInt64 {
        state = state &* 6364136223846793005 &+ 1
        return state
    }

    mutating func nextFloat(in range: ClosedRange<Float>) -> Float {
        let t = Float(next() % 10_000) / 10_000
        return range.lowerBound + (range.upperBound - range.lowerBound) * t
    }

    mutating func nextBool(_ p: Float) -> Bool { nextFloat(in: 0...1) < p }
}

extension SCNVector3 {
    func length() -> Float { sqrt(x * x + y * y + z * z) }
    func normalized() -> SCNVector3 {
        let l = length()
        guard l > 0.0001 else { return SCNVector3Zero }
        return SCNVector3(x / l, y / l, z / l)
    }
    func dot(_ o: SCNVector3) -> Float { x * o.x + y * o.y + z * o.z }
}
