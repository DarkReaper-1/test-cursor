import SceneKit
import UIKit

/// Stylized Spider-Man built from SceneKit primitives.
final class SpiderHero: SCNNode {
    var velocity = SCNVector3Zero
    var grounded = false
    var facing: Float = 1

    private let torso = SCNNode()
    private let head = SCNNode()

    override init() {
        super.init()
        name = "hero"
        assemble()
        let body = SCNPhysicsBody(
            type: .kinematic,
            shape: SCNPhysicsShape(node: self, options: [.type: SCNPhysicsShape.ShapeType.boundingBox])
        )
        body.categoryBitMask = CollisionMask.player
        body.collisionBitMask = CollisionMask.building | CollisionMask.ground
        body.contactTestBitMask = CollisionMask.building | CollisionMask.ground
        body.isAffectedByGravity = false
        physicsBody = body
    }

    required init?(coder: NSCoder) { fatalError() }

    var webHand: SCNVector3 {
        SCNVector3(position.x, position.y + 0.8, position.z)
    }

    func face(toward dx: Float) {
        guard abs(dx) > 0.08 else { return }
        facing = dx > 0 ? 1 : -1
        eulerAngles.y = facing > 0 ? 0 : .pi
    }

    private func assemble() {
        let red = UIColor(red: 0.90, green: 0.12, blue: 0.18, alpha: 1)
        let blue = UIColor(red: 0.10, green: 0.28, blue: 0.82, alpha: 1)

        let torsoGeo = SCNCapsule(capRadius: 0.2, height: 0.6)
        torsoGeo.firstMaterial?.diffuse.contents = red
        torso.geometry = torsoGeo
        torso.position = SCNVector3(0, 0.6, 0)
        addChildNode(torso)

        let legs = SCNCapsule(capRadius: 0.13, height: 0.55)
        legs.firstMaterial?.diffuse.contents = blue
        let legsNode = SCNNode(geometry: legs)
        legsNode.position = SCNVector3(0, 0.18, 0)
        addChildNode(legsNode)

        let headGeo = SCNSphere(radius: 0.22)
        headGeo.firstMaterial?.diffuse.contents = red
        head.geometry = headGeo
        head.position = SCNVector3(0, 1.05, 0)
        addChildNode(head)

        let eyeMat = UIColor.white
        for side in [-1.0, 1.0] as [Float] {
            let eye = SCNSphere(radius: 0.055)
            eye.firstMaterial?.diffuse.contents = eyeMat
            let n = SCNNode(geometry: eye)
            n.position = SCNVector3(side * 0.09, 1.08, 0.16)
            addChildNode(n)
        }

        let armGeo = SCNCapsule(capRadius: 0.065, height: 0.5)
        armGeo.firstMaterial?.diffuse.contents = red
        for side in [-1.0, 1.0] as [Float] {
            let arm = SCNNode(geometry: armGeo)
            arm.position = SCNVector3(side * 0.32, 0.65, 0)
            arm.eulerAngles.z = -side * 0.4
            addChildNode(arm)
        }
    }
}
