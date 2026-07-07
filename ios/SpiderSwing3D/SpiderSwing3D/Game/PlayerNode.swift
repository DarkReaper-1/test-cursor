import SceneKit

final class PlayerNode: SCNNode {
    var velocity = SCNVector3Zero
    var isGrounded = false
    var isOnWall = false
    var facing: Float = 1

    private let bodyNode = SCNNode()
    private let headNode = SCNNode()
    private let torsoNode = SCNNode()

    override init() {
        super.init()
        buildCharacter()
        setupPhysics()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func buildCharacter() {
        name = "player"

        let torso = SCNCapsule(capRadius: 0.18, height: 0.55)
        torso.firstMaterial?.diffuse.contents = UIColor(red: 0.9, green: 0.12, blue: 0.18, alpha: 1)
        torsoNode.geometry = torso
        torsoNode.position = SCNVector3(0, 0.55, 0)
        addChildNode(torsoNode)

        let legs = SCNCapsule(capRadius: 0.12, height: 0.5)
        legs.firstMaterial?.diffuse.contents = UIColor(red: 0.11, green: 0.31, blue: 0.85, alpha: 1)
        let legsNode = SCNNode(geometry: legs)
        legsNode.position = SCNVector3(0, 0.15, 0)
        addChildNode(legsNode)

        let head = SCNSphere(radius: 0.2)
        head.firstMaterial?.diffuse.contents = UIColor(red: 0.9, green: 0.12, blue: 0.18, alpha: 1)
        headNode.geometry = head
        headNode.position = SCNVector3(0, 0.95, 0)
        addChildNode(headNode)

        let eyeWhite = SCNSphere(radius: 0.06)
        eyeWhite.firstMaterial?.diffuse.contents = UIColor.white
        let leftEye = SCNNode(geometry: eyeWhite)
        leftEye.position = SCNVector3(-0.08, 0.98, 0.14)
        leftEye.eulerAngles = SCNVector3(0, 0, Float.pi * 0.08)
        headNode.addChildNode(leftEye)

        let rightEye = SCNNode(geometry: eyeWhite)
        rightEye.position = SCNVector3(0.08, 0.98, 0.14)
        rightEye.eulerAngles = SCNVector3(0, 0, Float(-Float.pi * 0.08))
        headNode.addChildNode(rightEye)

        let armGeo = SCNCapsule(capRadius: 0.06, height: 0.45)
        armGeo.firstMaterial?.diffuse.contents = UIColor(red: 0.9, green: 0.12, blue: 0.18, alpha: 1)

        let leftArm = SCNNode(geometry: armGeo)
        leftArm.position = SCNVector3(-0.28, 0.6, 0)
        leftArm.eulerAngles = SCNVector3(0, 0, Float.pi * 0.35)
        addChildNode(leftArm)

        let rightArm = SCNNode(geometry: armGeo)
        rightArm.position = SCNVector3(0.28, 0.6, 0)
        rightArm.eulerAngles = SCNVector3(0, 0, Float(-Float.pi * 0.35))
        addChildNode(rightArm)

        bodyNode.addChildNode(torsoNode)
    }

    private func setupPhysics() {
        let shape = SCNPhysicsShape(
            node: self,
            options: [SCNPhysicsShape.Option.type: SCNPhysicsShape.ShapeType.boundingBox]
        )
        physicsBody = SCNPhysicsBody(type: .kinematic, shape: shape)
        physicsBody?.categoryBitMask = PhysicsCategory.player
        physicsBody?.collisionBitMask = PhysicsCategory.building | PhysicsCategory.ground
        physicsBody?.contactTestBitMask = PhysicsCategory.building | PhysicsCategory.ground
        physicsBody?.isAffectedByGravity = false
    }

    var webAttachPoint: SCNVector3 {
        SCNVector3(position.x, position.y + 0.75, position.z)
    }

    func animateSwing(intensity: Float) {
        let swing = SCNAction.rotateBy(x: 0, y: 0, z: CGFloat(intensity * 0.15), duration: 0.12)
        torsoNode.runAction(swing)
    }

    func updateFacing(from direction: Float) {
        if abs(direction) > 0.1 {
            facing = direction > 0 ? 1 : -1
            eulerAngles.y = facing > 0 ? 0 : Float.pi
        }
    }
}
