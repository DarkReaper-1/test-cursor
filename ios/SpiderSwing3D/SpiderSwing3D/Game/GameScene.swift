import SceneKit

protocol GameSceneDelegate: AnyObject {
    func gameSceneDidUpdate(swingCount: Int, speed: Float, status: String)
}

final class GameScene: SCNScene {
    weak var gameDelegate: GameSceneDelegate?

    let player = PlayerNode()
    let city = CityGenerator()
    let web = WebController()
    let cameraController = CameraController()

    private var lastTime: TimeInterval = 0
    private var moveInput: Float = 0
    private var webAimWorld = SCNVector3Zero
    private var shouldShootWeb = false
    private var shouldReleaseWeb = false
    private var shouldJump = false

    override init() {
        super.init()
        setupEnvironment()
        setupScene()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupEnvironment() {
        background.contents = UIColor(red: 0.04, green: 0.06, blue: 0.14, alpha: 1)

        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.color = UIColor(white: 0.35, alpha: 1)
        rootNode.addChildNode(ambient)

        let sun = SCNNode()
        sun.light = SCNLight()
        sun.light?.type = .directional
        sun.light?.color = UIColor(red: 1, green: 0.95, blue: 0.85, alpha: 1)
        sun.light?.intensity = 900
        sun.light?.castsShadow = true
        sun.eulerAngles = SCNVector3(-Float.pi * 0.4, Float.pi * 0.2, 0)
        rootNode.addChildNode(sun)

        let fill = SCNNode()
        fill.light = SCNLight()
        fill.light?.type = .directional
        fill.light?.color = UIColor(red: 0.4, green: 0.5, blue: 0.8, alpha: 1)
        fill.light?.intensity = 300
        fill.eulerAngles = SCNVector3(-0.3, -1.2, 0)
        rootNode.addChildNode(fill)

        physicsWorld.gravity = SCNVector3(0, -18, 0)
    }

    private func setupScene() {
        city.generate()
        rootNode.addChildNode(city.node)
        rootNode.addChildNode(player)
        rootNode.addChildNode(web.webLineNode)
        rootNode.addChildNode(cameraController.node)

        player.position = SCNVector3(5, city.roofHeight(atX: 5, z: 0) + 1.2, 0)
    }

    func setInput(move: Float, webHeld: Bool, aimScreenX: Float, aimScreenY: Float, viewSize: CGSize, jump: Bool) {
        moveInput = move
        shouldJump = jump

        if webHeld && !web.isActive {
            shouldShootWeb = true
            let ndcX = (aimScreenX / Float(viewSize.width)) * 2 - 1
            let ndcY = 1 - (aimScreenY / Float(viewSize.height)) * 2
            webAimWorld = screenToWorld(ndcX: ndcX, ndcY: ndcY)
        } else if !webHeld && web.isActive {
            shouldReleaseWeb = true
        }
    }

    func update(atTime time: TimeInterval) {
        let delta = lastTime == 0 ? 0.016 : Float(time - lastTime)
        lastTime = time

        if shouldShootWeb {
            if let anchor = city.findWebAnchor(near: player.webAttachPoint) {
                web.attach(to: anchor, from: player.webAttachPoint)
            }
            shouldShootWeb = false
        }

        if shouldReleaseWeb {
            web.release()
            shouldReleaseWeb = false
        }

        if web.isActive {
            web.applySwingPhysics(player: player, deltaTime: delta, inputDirection: moveInput)
        } else {
            applyNormalPhysics(delta: delta)
        }

        player.updateFacing(from: moveInput != 0 ? moveInput : player.velocity.x)

        if player.position.y < -10 {
            respawn()
        }

        cameraController.follow(player: player, deltaTime: delta, isSwinging: web.isActive)

        let speed = sqrt(
            player.velocity.x * player.velocity.x +
            player.velocity.y * player.velocity.y +
            player.velocity.z * player.velocity.z
        )
        let status = web.isActive ? "Swinging!" : (player.isGrounded ? "Ready to swing" : "Airborne")
        gameDelegate?.gameSceneDidUpdate(swingCount: web.swingCount, speed: speed, status: status)
    }

    private func applyNormalPhysics(delta: Float) {
        let gravity: Float = -18
        player.velocity.y += gravity * delta

        if abs(moveInput) > 0.1 {
            player.velocity.x += moveInput * 14 * delta
            player.velocity.z += moveInput * 4 * delta
        }

        player.velocity.x *= 0.92
        player.velocity.z *= 0.92

        var pos = player.position
        pos.x += player.velocity.x * delta
        pos.y += player.velocity.y * delta
        pos.z += player.velocity.z * delta

        let roof = city.roofHeight(atX: pos.x, z: pos.z)
        player.isGrounded = false
        player.isOnWall = false

        if pos.y <= roof + 1.0 {
            pos.y = roof + 1.0
            player.velocity.y = 0
            player.isGrounded = true
        }

        if shouldJump && (player.isGrounded || player.isOnWall) {
            player.velocity.y = 10
            player.velocity.x += player.facing * 4
            player.isGrounded = false
            shouldJump = false
        }

        player.position = pos
    }

    private func respawn() {
        player.position = SCNVector3(5, city.roofHeight(atX: 5, z: 0) + 1.2, 0)
        player.velocity = SCNVector3Zero
        web.release()
    }

    private func screenToWorld(ndcX: Float, ndcY: Float) -> SCNVector3 {
        let dir = cameraController.node.worldFront
        return SCNVector3(
            player.position.x + dir.x * 30 + ndcX * 15,
            player.position.y + 10 + ndcY * 10,
            player.position.z + dir.z * 30
        )
    }
}
