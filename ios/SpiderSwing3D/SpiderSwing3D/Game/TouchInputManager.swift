import UIKit

struct TouchState {
    var moveJoystick: CGPoint = .zero
    var isWebHeld = false
    var webAimPoint: CGPoint = .zero
    var jumpPressed = false
}

final class TouchInputManager {
    private(set) var state = TouchState()

    private let joystickCenter = CGPoint(x: 90, y: 0)
    private let joystickRadius: CGFloat = 55
    private var activeJoystickTouch: UITouch?
    private var activeWebTouch: UITouch?
    private var viewHeight: CGFloat = 0

    func configure(viewHeight: CGFloat) {
        self.viewHeight = viewHeight
    }

    func handleTouchesBegan(_ touches: Set<UITouch>, in view: UIView) {
        for touch in touches {
            let loc = touch.location(in: view)
            if loc.x < view.bounds.width * 0.45 {
                activeJoystickTouch = touch
                updateJoystick(touch, in: view)
            } else {
                activeWebTouch = touch
                state.isWebHeld = true
                state.webAimPoint = loc
            }
        }
    }

    func handleTouchesMoved(_ touches: Set<UITouch>, in view: UIView) {
        for touch in touches {
            if touch == activeJoystickTouch {
                updateJoystick(touch, in: view)
            }
            if touch == activeWebTouch {
                state.webAimPoint = touch.location(in: view)
            }
        }
    }

    func handleTouchesEnded(_ touches: Set<UITouch>, in view: UIView) {
        for touch in touches {
            if touch == activeJoystickTouch {
                activeJoystickTouch = nil
                state.moveJoystick = .zero
            }
            if touch == activeWebTouch {
                activeWebTouch = nil
                state.isWebHeld = false
            }
        }
    }

    func handleJumpButton() {
        state.jumpPressed = true
    }

    func consumeJump() -> Bool {
        let pressed = state.jumpPressed
        state.jumpPressed = false
        return pressed
    }

    var moveDirection: Float {
        Float(state.moveJoystick.x / joystickRadius)
    }

    private func updateJoystick(_ touch: UITouch, in view: UIView) {
        let loc = touch.location(in: view)
        let center = CGPoint(x: joystickCenter.x, y: view.bounds.height - 120)
        var delta = CGPoint(x: loc.x - center.x, y: loc.y - center.y)
        let dist = sqrt(delta.x * delta.x + delta.y * delta.y)
        if dist > joystickRadius {
            delta.x = delta.x / dist * joystickRadius
            delta.y = delta.y / dist * joystickRadius
        }
        state.moveJoystick = delta
    }

    var joystickVisualCenter: CGPoint {
        CGPoint(x: joystickCenter.x, y: viewHeight - 120)
    }

    var joystickVisualOffset: CGPoint {
        state.moveJoystick
    }
}
