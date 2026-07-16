import UIKit
import SceneKit

final class GameViewController: UIViewController, SCNSceneRendererDelegate, WorldDelegate {
    private let scnView = SCNView()
    private let hud = HUDView()
    private let controls = Controls()
    private let world = World()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        scnView.scene = world
        scnView.delegate = self
        scnView.pointOfView = world.camera.node
        scnView.antialiasingMode = .multisampling4X
        scnView.preferredFramesPerSecond = 60
        scnView.isPlaying = true
        scnView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scnView)

        hud.translatesAutoresizingMaskIntoConstraints = false
        hud.onJump = { [weak self] in self?.controls.queueJump() }
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

        world.delegate = self
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        controls.began(touches, in: view)
    }
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        controls.moved(touches, in: view)
    }
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        controls.ended(touches)
    }
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        controls.ended(touches)
    }

    func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            let s = self.controls.state
            self.world.feed(
                steer: self.controls.steer,
                webHeld: s.webHeld,
                aim: s.aim,
                viewSize: self.view.bounds.size,
                jump: self.controls.consumeJump()
            )
            self.hud.setStick(s.stick)
            self.hud.setCrosshair(s.aim, visible: s.webHeld)
        }
        world.tick(at: time)
    }

    func worldUpdated(swings: Int, speed: Float, status: String) {
        DispatchQueue.main.async { [weak self] in
            self?.hud.refresh(swings: swings, speed: speed, status: status)
        }
    }

    override var prefersStatusBarHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }
}
