import UIKit
import SceneKit

final class GameHUD: UIView {
    private let titleLabel = UILabel()
    private let statusLabel = UILabel()
    private let swingLabel = UILabel()
    private let speedLabel = UILabel()
    private let joystickBase = UIView()
    private let joystickKnob = UIView()
    private let jumpButton = UIButton(type: .system)
    private let webHintLabel = UILabel()
    private let crosshair = UIView()

    var onJumpTapped: (() -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = true
        setup()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setup() {
        backgroundColor = .clear

        titleLabel.text = "SPIDER SWING 3D"
        titleLabel.font = .systemFont(ofSize: 15, weight: .heavy)
        titleLabel.textColor = UIColor(red: 0.9, green: 0.15, blue: 0.2, alpha: 1)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(titleLabel)

        statusLabel.font = .systemFont(ofSize: 13, weight: .medium)
        statusLabel.textColor = UIColor(red: 0.37, green: 0.92, blue: 0.83, alpha: 1)
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(statusLabel)

        swingLabel.font = .monospacedDigitSystemFont(ofSize: 12, weight: .regular)
        swingLabel.textColor = UIColor(white: 0.75, alpha: 1)
        swingLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(swingLabel)

        speedLabel.font = .monospacedDigitSystemFont(ofSize: 12, weight: .regular)
        speedLabel.textColor = UIColor(white: 0.75, alpha: 1)
        speedLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(speedLabel)

        joystickBase.backgroundColor = UIColor(white: 1, alpha: 0.12)
        joystickBase.layer.cornerRadius = 55
        joystickBase.layer.borderColor = UIColor(white: 1, alpha: 0.2).cgColor
        joystickBase.layer.borderWidth = 2
        joystickBase.translatesAutoresizingMaskIntoConstraints = false
        addSubview(joystickBase)

        joystickKnob.backgroundColor = UIColor(red: 0.9, green: 0.15, blue: 0.2, alpha: 0.85)
        joystickKnob.layer.cornerRadius = 24
        joystickKnob.translatesAutoresizingMaskIntoConstraints = false
        joystickBase.addSubview(joystickKnob)

        jumpButton.setTitle("↑", for: .normal)
        jumpButton.titleLabel?.font = .systemFont(ofSize: 28, weight: .bold)
        jumpButton.backgroundColor = UIColor(white: 1, alpha: 0.15)
        jumpButton.tintColor = .white
        jumpButton.layer.cornerRadius = 32
        jumpButton.layer.borderColor = UIColor(white: 1, alpha: 0.25).cgColor
        jumpButton.layer.borderWidth = 2
        jumpButton.translatesAutoresizingMaskIntoConstraints = false
        jumpButton.addTarget(self, action: #selector(jumpTapped), for: .touchUpInside)
        addSubview(jumpButton)

        webHintLabel.text = "Hold right side → shoot web"
        webHintLabel.font = .systemFont(ofSize: 11, weight: .medium)
        webHintLabel.textColor = UIColor(white: 1, alpha: 0.45)
        webHintLabel.textAlignment = .right
        webHintLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(webHintLabel)

        crosshair.backgroundColor = .clear
        crosshair.layer.borderColor = UIColor(red: 0.37, green: 0.92, blue: 0.83, alpha: 0.7).cgColor
        crosshair.layer.borderWidth = 2
        crosshair.layer.cornerRadius = 12
        crosshair.translatesAutoresizingMaskIntoConstraints = false
        addSubview(crosshair)

        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 12),
            titleLabel.centerXAnchor.constraint(equalTo: centerXAnchor),

            statusLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            statusLabel.centerXAnchor.constraint(equalTo: centerXAnchor),

            swingLabel.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 6),
            swingLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 20),

            speedLabel.centerYAnchor.constraint(equalTo: swingLabel.centerYAnchor),
            speedLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20),

            joystickBase.widthAnchor.constraint(equalToConstant: 110),
            joystickBase.heightAnchor.constraint(equalToConstant: 110),
            joystickBase.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 35),
            joystickBase.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor, constant: -35),

            joystickKnob.widthAnchor.constraint(equalToConstant: 48),
            joystickKnob.heightAnchor.constraint(equalToConstant: 48),
            joystickKnob.centerXAnchor.constraint(equalTo: joystickBase.centerXAnchor),
            joystickKnob.centerYAnchor.constraint(equalTo: joystickBase.centerYAnchor),

            jumpButton.widthAnchor.constraint(equalToConstant: 64),
            jumpButton.heightAnchor.constraint(equalToConstant: 64),
            jumpButton.leadingAnchor.constraint(equalTo: joystickBase.trailingAnchor, constant: 16),
            jumpButton.bottomAnchor.constraint(equalTo: joystickBase.bottomAnchor, constant: -10),

            webHintLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -24),
            webHintLabel.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor, constant: -24),

            crosshair.widthAnchor.constraint(equalToConstant: 24),
            crosshair.heightAnchor.constraint(equalToConstant: 24),
            crosshair.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -80),
            crosshair.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
    }

    func update(swingCount: Int, speed: Float, status: String) {
        statusLabel.text = status
        swingLabel.text = "Swings: \(swingCount)"
        speedLabel.text = String(format: "%.1f m/s", speed)
    }

    func updateJoystick(offset: CGPoint) {
        joystickKnob.transform = CGAffineTransform(translationX: offset.x * 0.85, y: offset.y * 0.85)
    }

    func updateCrosshair(at point: CGPoint, visible: Bool) {
        crosshair.isHidden = !visible
        if visible {
            crosshair.center = point
        }
    }

    @objc private func jumpTapped() {
        onJumpTapped?()
    }
}
