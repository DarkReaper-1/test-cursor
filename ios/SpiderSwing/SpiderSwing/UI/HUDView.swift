import UIKit

/// On-screen HUD matching iPhone landscape gameplay.
final class HUDView: UIView {
    var onJump: (() -> Void)?

    private let title = UILabel()
    private let status = UILabel()
    private let swings = UILabel()
    private let speed = UILabel()
    private let stickBase = UIView()
    private let stickKnob = UIView()
    private let jumpBtn = UIButton(type: .system)
    private let hint = UILabel()
    private let crosshair = UIView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = true
        backgroundColor = .clear
        layoutHUD()
    }

    required init?(coder: NSCoder) { fatalError() }

    func refresh(swings n: Int, speed s: Float, status text: String) {
        status.text = text
        swings.text = "Swings  \(n)"
        speed.text = String(format: "%.0f m/s", s)
    }

    func setStick(_ offset: CGPoint) {
        stickKnob.transform = CGAffineTransform(translationX: offset.x * 0.8, y: offset.y * 0.8)
    }

    func setCrosshair(_ point: CGPoint, visible: Bool) {
        crosshair.isHidden = !visible
        if visible { crosshair.center = point }
    }

    private func layoutHUD() {
        title.text = "SPIDER SWING"
        title.font = .systemFont(ofSize: 16, weight: .black)
        title.textColor = UIColor(red: 0.92, green: 0.14, blue: 0.2, alpha: 1)
        title.translatesAutoresizingMaskIntoConstraints = false
        addSubview(title)

        status.font = .systemFont(ofSize: 12, weight: .semibold)
        status.textColor = UIColor(red: 0.35, green: 0.9, blue: 0.82, alpha: 1)
        status.translatesAutoresizingMaskIntoConstraints = false
        addSubview(status)

        for (label, align) in [(swings, NSTextAlignment.left), (speed, .right)] as [(UILabel, NSTextAlignment)] {
            label.font = .monospacedDigitSystemFont(ofSize: 11, weight: .regular)
            label.textColor = UIColor(white: 0.72, alpha: 1)
            label.textAlignment = align
            label.translatesAutoresizingMaskIntoConstraints = false
            addSubview(label)
        }

        stickBase.backgroundColor = UIColor(white: 1, alpha: 0.1)
        stickBase.layer.cornerRadius = 52
        stickBase.layer.borderWidth = 2
        stickBase.layer.borderColor = UIColor(white: 1, alpha: 0.18).cgColor
        stickBase.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stickBase)

        stickKnob.backgroundColor = UIColor(red: 0.9, green: 0.14, blue: 0.2, alpha: 0.9)
        stickKnob.layer.cornerRadius = 22
        stickKnob.translatesAutoresizingMaskIntoConstraints = false
        stickBase.addSubview(stickKnob)

        jumpBtn.setTitle("↑", for: .normal)
        jumpBtn.titleLabel?.font = .systemFont(ofSize: 26, weight: .bold)
        jumpBtn.tintColor = .white
        jumpBtn.backgroundColor = UIColor(white: 1, alpha: 0.14)
        jumpBtn.layer.cornerRadius = 30
        jumpBtn.layer.borderWidth = 2
        jumpBtn.layer.borderColor = UIColor(white: 1, alpha: 0.22).cgColor
        jumpBtn.translatesAutoresizingMaskIntoConstraints = false
        jumpBtn.addTarget(self, action: #selector(jump), for: .touchUpInside)
        addSubview(jumpBtn)

        hint.text = "Hold right → web"
        hint.font = .systemFont(ofSize: 10, weight: .medium)
        hint.textColor = UIColor(white: 1, alpha: 0.4)
        hint.translatesAutoresizingMaskIntoConstraints = false
        addSubview(hint)

        crosshair.isHidden = true
        crosshair.layer.borderColor = UIColor(red: 0.35, green: 0.9, blue: 0.82, alpha: 0.75).cgColor
        crosshair.layer.borderWidth = 2
        crosshair.layer.cornerRadius = 11
        crosshair.translatesAutoresizingMaskIntoConstraints = false
        addSubview(crosshair)

        NSLayoutConstraint.activate([
            title.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 10),
            title.centerXAnchor.constraint(equalTo: centerXAnchor),
            status.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 3),
            status.centerXAnchor.constraint(equalTo: centerXAnchor),
            swings.topAnchor.constraint(equalTo: status.bottomAnchor, constant: 6),
            swings.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 18),
            speed.centerYAnchor.constraint(equalTo: swings.centerYAnchor),
            speed.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -18),
            stickBase.widthAnchor.constraint(equalToConstant: 104),
            stickBase.heightAnchor.constraint(equalToConstant: 104),
            stickBase.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 32),
            stickBase.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor, constant: -28),
            stickKnob.widthAnchor.constraint(equalToConstant: 44),
            stickKnob.heightAnchor.constraint(equalToConstant: 44),
            stickKnob.centerXAnchor.constraint(equalTo: stickBase.centerXAnchor),
            stickKnob.centerYAnchor.constraint(equalTo: stickBase.centerYAnchor),
            jumpBtn.widthAnchor.constraint(equalToConstant: 60),
            jumpBtn.heightAnchor.constraint(equalToConstant: 60),
            jumpBtn.leadingAnchor.constraint(equalTo: stickBase.trailingAnchor, constant: 14),
            jumpBtn.bottomAnchor.constraint(equalTo: stickBase.bottomAnchor, constant: -8),
            hint.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20),
            hint.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor, constant: -20),
            crosshair.widthAnchor.constraint(equalToConstant: 22),
            crosshair.heightAnchor.constraint(equalToConstant: 22),
            crosshair.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -90),
            crosshair.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
    }

    @objc private func jump() { onJump?() }
}
