#!/usr/bin/env python3
"""Generate a UI walkthrough video of Square Point of Sale using official screenshots."""

from __future__ import annotations

import argparse
import subprocess
import textwrap
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
BG = (18, 18, 20)
FG = (245, 245, 247)
MUTED = (142, 142, 147)
GREEN = (0, 200, 120)
BEZEL = (28, 28, 30)
SCREEN_BG = (0, 0, 0)

# Official Google Play Store screenshots for com.squareup (Square POS)
PLAY_SCREENSHOTS = [
    ("Home / Register", "https://play-lh.googleusercontent.com/dZdZmPBSA5tMqeYe-WsRMSt6ynQ42dAJy555UZ6B2-nAo90NlKQvEMTylXJIM0p-idIePKK18R8ZH7jSU--u=w1052-h592"),
    ("Checkout", "https://play-lh.googleusercontent.com/4ibw6COCx__nmwobpHiMBeP670r3tSRqX2jKRFm5Sc_YjlBWhS4qUn39WKpNJb_dckc12PlooAYG5BU7nMZg=w1052-h592"),
    ("Payment Methods", "https://play-lh.googleusercontent.com/rFFCUnw9gOrGMhIQONIh07mevCWVM6m1c0uNVsF1IxMS78W29TpXL2Qb1r5B-5ooncOoUmAyiH52ZCCOuQ4b=w1052-h592"),
    ("Item Library", "https://play-lh.googleusercontent.com/gUm30PxtVSZ9_0zqjfKQy5QAMobJ5koiF5xibvz5TKm5i4CvNtKOXdSaUzIgwFZI0x2AS4UpNGa0Kv29jcMXm88=w1052-h592"),
    ("Sales Report", "https://play-lh.googleusercontent.com/0fYPOP38hazWOV6g81Is4t3b3_G9OFUdH67gDc68PW4hQ8baO-2tkYS6Tn46to1CUSdiz7X5xpWEB-U6y_Yr=w1052-h592"),
    ("Customer Profiles", "https://play-lh.googleusercontent.com/7LlX-pmEGSd9F72_YfMSAymPPotfeqQoK0uZGaKa8VZHGklCM8fPE1U9MBi57XxMGt3QgXV3F8GrSefh-CE1wLw=w1052-h592"),
    ("Inventory", "https://play-lh.googleusercontent.com/CE58iS8umEd7-D5omYbHWz130G34bta92NRw5bs8wnlomHuTpu5rnyWn7-4PjRjsZsuUiTLCJWrf4CbEUGN6IA=w1052-h592"),
    ("Invoices", "https://play-lh.googleusercontent.com/f3bbq1PU5r3PjTfGoUVX4DDdRaO4Zhesx7bjIjz5gLrYpK5hprhqOyewmSKH7hpTO90gF5QOlmXPMap6_5VG=w1052-h592"),
    ("Appointments", "https://play-lh.googleusercontent.com/IN9sgnw3HNeWsK4_kQJUMgGjrw4p6-SLB0py0qFDHqAImoYvRQrGwQ_LStdcPGjMJIRA2FENhDV3vzn37s4QtQ=w1052-h592"),
    ("Restaurant Mode", "https://play-lh.googleusercontent.com/inTz2HKBMXG5b_Cx4rGV7Pp0LmLGs1fZvc4gorawqH8lWCinNHdNScmanLflVxYV-uTVtx4TPhzTPVv5p1jwiw=w1052-h592"),
    ("Tap to Pay", "https://play-lh.googleusercontent.com/PG2WLER2o9pEd1NI4P8Re7H22i9spwlWvX4xeeoOdi5gaq0vArCpUxjZi26rTilyDJ_O21UQnUkSobU_JCYkwcI=w1052-h592"),
    ("Dashboard", "https://play-lh.googleusercontent.com/tFZdcdvFmHwbqi4b-555G99cwG1lPmjBO1EdX0lMxiHnBhjZwcF6sX8gOUD-10cUHAS0JhV19agFISTu0TwfsQ=w1052-h592"),
    ("Gift Cards", "https://play-lh.googleusercontent.com/XdBqN-P8NF1hjvWJc_FC_lz34bXeuI3PjDRbn6mFmmoMPhfvWuPOrxOql2bX1JUIT1Ykm9fAn7eY-gFwibXE=w1052-h592"),
    ("Team Management", "https://play-lh.googleusercontent.com/ykNH6LisoPSWNIVT5YAgLYypf0cqFPDBVT09YVkrD1dFbSA5GV0VoKwm3JI858nhgcE-RevdGjjVg_MUcd5uJQ=w1052-h592"),
]


def load_fonts():
    bold = regular = small = ImageFont.load_default()
    for path, size in [
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16),
    ]:
        if Path(path).exists():
            if size == 36:
                bold = ImageFont.truetype(path, size)
            elif size == 20:
                regular = ImageFont.truetype(path, size)
            else:
                small = ImageFont.truetype(path, size)
    return bold, regular, small


def download_screenshots(cache_dir: Path) -> list[tuple[str, Path]]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for i, (label, url) in enumerate(PLAY_SCREENSHOTS):
        path = cache_dir / f"screen_{i:02d}.png"
        if not path.exists():
            resp = requests.get(url, timeout=60, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            path.write_bytes(resp.content)
        results.append((label, path))
    return results


def fit_in_phone(screenshot: Image.Image, phone_w: int, phone_h: int) -> Image.Image:
    sw, sh = screenshot.size
    scale = min(phone_w / sw, phone_h / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    resized = screenshot.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (phone_w, phone_h), SCREEN_BG)
    canvas.paste(resized, ((phone_w - nw) // 2, (phone_h - nh) // 2))
    return canvas


def render_intro(bold, regular) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W, 4], fill=GREEN)
    draw.text((60, 120), "Square Point of Sale", fill=FG, font=bold)
    draw.text((60, 180), "Actual App UI Walkthrough", fill=GREEN, font=regular)
    lines = [
        "Package: com.squareup  •  Version: 7.13.2",
        "",
        "Screenshots from the official Google Play Store listing.",
        "These show the real merchant-facing interface — checkout,",
        "payments, inventory, reports, and industry-specific modes.",
    ]
    y = 250
    for line in lines:
        draw.text((60, y), line, fill=MUTED, font=regular)
        y += 32
    draw.text((60, H - 50), "Square App Reverse Engineering Project", fill=MUTED, font=regular)
    return img


def render_ui_frame(label: str, screenshot: Path, idx: int, total: int, bold, regular, small) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Header
    draw.text((40, 28), "Square Point of Sale", fill=MUTED, font=small)
    draw.text((40, 52), label, fill=FG, font=bold)
    draw.text((W - 180, 40), f"{idx + 1} / {total}", fill=MUTED, font=regular)

    # Phone frame
    px, py = 420, 110
    pw, ph = 380, 560
    radius = 28

    # Outer bezel
    draw.rounded_rectangle([px - 12, py - 12, px + pw + 12, py + ph + 12], radius=radius + 8, fill=BEZEL)
    # Screen cutout
    draw.rounded_rectangle([px, py, px + pw, py + ph], radius=radius, fill=SCREEN_BG)

    shot = Image.open(screenshot).convert("RGB")
    screen = fit_in_phone(shot, pw - 8, ph - 8)
    img.paste(screen, (px + 4, py + 4))

    # Notch
    notch_w, notch_h = 90, 22
    draw.rounded_rectangle(
        [px + pw // 2 - notch_w // 2, py + 8, px + pw // 2 + notch_w // 2, py + 8 + notch_h],
        radius=11, fill=BEZEL,
    )

    # Left info panel
    info_x = 40
    info_y = 140
    draw.text((info_x, info_y), "Screen", fill=MUTED, font=small)
    draw.text((info_x, info_y + 24), label, fill=GREEN, font=regular)

    desc = {
        "Home / Register": "Main register grid for ringing up items and starting transactions.",
        "Checkout": "Cart view with line items, taxes, and payment total.",
        "Payment Methods": "Accept cards, cash, Tap to Pay, and digital wallets.",
        "Item Library": "Manage products, variations, and categories.",
        "Sales Report": "Daily sales breakdown by payment type and time.",
        "Customer Profiles": "CRM — customer history, notes, and loyalty.",
        "Inventory": "Stock levels, alerts, and product tracking.",
        "Invoices": "Create and send professional invoices.",
        "Appointments": "Booking and scheduling for service businesses.",
        "Restaurant Mode": "Table management and order entry for restaurants.",
        "Tap to Pay": "Accept contactless payments on the device itself.",
        "Dashboard": "Business analytics and performance overview.",
        "Gift Cards": "Sell and redeem gift cards.",
        "Team Management": "Staff permissions and time tracking.",
    }.get(label, "Square POS merchant interface.")

    y = info_y + 80
    for line in textwrap.wrap(desc, width=34):
        draw.text((info_x, y), line, fill=FG, font=small)
        y += 22

    draw.text((40, H - 40), "Source: Google Play Store (com.squareup)", fill=MUTED, font=small)
    return img


def render_outro(bold, regular) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.text((60, 200), "End of UI Walkthrough", fill=FG, font=bold)
    draw.text((60, 270), "To analyze this app:", fill=GREEN, font=regular)
    cmds = [
        "./scripts/download_apk.sh --apkeep",
        "./scripts/analyze.sh apks/com.squareup.apk --fast",
    ]
    y = 320
    for cmd in cmds:
        draw.text((80, y), cmd, fill=FG, font=regular)
        y += 36
    return img


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="/opt/cursor/artifacts/videos/square-app-ui.mp4")
    parser.add_argument("--cache", default="/opt/cursor/artifacts/videos/ui-screenshots")
    parser.add_argument("--slide-duration", type=float, default=4.0)
    args = parser.parse_args()

    bold, regular, small = load_fonts()
    cache = Path(args.cache)
    screenshots = download_screenshots(cache)
    out = Path(args.output)
    frames_dir = out.with_suffix("")
    frames_dir.mkdir(parents=True, exist_ok=True)

    slides: list[tuple[Image.Image, float]] = []
    slides.append((render_intro(bold, regular), 5.0))
    for i, (label, path) in enumerate(screenshots):
        slides.append((render_ui_frame(label, path, i, len(screenshots), bold, regular, small), args.slide_duration))
    slides.append((render_outro(bold, regular), 5.0))

    concat_lines = []
    for i, (frame, dur) in enumerate(slides):
        p = frames_dir / f"ui_{i:03d}.png"
        frame.save(p)
        concat_lines.append(f"file '{p}'")
        concat_lines.append(f"duration {dur}")
    concat_lines.append(f"file '{frames_dir / f'ui_{len(slides)-1:03d}.png'}'")

    concat_file = frames_dir / "ui_concat.txt"
    concat_file.write_text("\n".join(concat_lines) + "\n")

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", str(concat_file),
            "-vf", "format=yuv420p",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(out),
        ],
        check=True,
        capture_output=True,
    )

    total = sum(d for _, d in slides)
    print(f"UI video: {out}")
    print(f"Duration: ~{total:.0f}s | Screens: {len(screenshots)}")


if __name__ == "__main__":
    main()
