import UIKit
import SceneKit

final class GameViewController: UIViewController, SCNSceneRendererDelegate, GameSceneDelegate {
    private let scnView = SCNView()
    private let hud = GameHUD()
    private let touchInput = TouchInputManager()
    private let gameScene = GameScene()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        scnView.scene = gameScene
        scnView.delegate = self
        scnView.pointOfView = gameScene.cameraController.node
        scnView.antialiasingMode = .multisampling4X
        scnView.preferredFramesPerSecond = 60
        scnView.isPlaying = true
        scnView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scnView)

        hud.translatesAutoresizingMaskIntoConstraints = false
        hud.onJumpTapped = { [weak self] in
            self?.touchInput.handleJumpButton()
        }
        view.addSubview(hud)

        NSLayoutConstraint.activate([
            scnView.topAnchor.constraint(equalTo: view.topAnchor),
            scnView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scnView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scnView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            hud.topAnchor.constraint(equalTo: view.topAnchor),
            hud.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hud.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hud.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        gameScene.gameDelegate = self
        touchInput.configure(viewHeight: view.bounds.height)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        touchInput.configure(viewHeight: view.bounds.height)
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        touchInput.handleTouchesBegan(touches, in: view)
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        touchInput.handleTouchesMoved(touches, in: view)
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        touchInput.handleTouchesEnded(touches, in: view)
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        touchInput.handleTouchesEnded(touches, in: view)
    }

    func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            let s = self.touchInput.state
            self.gameScene.setInput(
                move: self.touchInput.moveDirection,
                webHeld: s.isWebHeld,
                aimScreenX: Float(s.webAimPoint.x),
                aimScreenY: Float(s.webAimPoint.y),
                viewSize: self.view.bounds.size,
                jump: self.touchInput.consumeJump()
            )
            self.hud.updateJoystick(offset: s.moveJoystick)
            self.hud.updateCrosshair(at: s.webAimPoint, visible: s.isWebHeld)
        }
        gameScene.update(atTime: time)
    }

    func gameSceneDidUpdate(swingCount: Int, speed: Float, status: String) {
        DispatchQueue.main.async { [weak self] in
            self?.hud.update(swingCount: swingCount, speed: speed, status: status)
        }
    }

    override var prefersStatusBarHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        .landscape
    }
}
