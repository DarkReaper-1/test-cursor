#!/usr/bin/env python3
"""Generate a structured tutorial MP4 for the Square RE toolkit."""

from __future__ import annotations

import argparse
import subprocess
import textwrap
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Theme
BG = (13, 17, 23)
FG = (201, 209, 217)
GREEN = (63, 185, 80)
CYAN = (121, 192, 255)
YELLOW = (210, 153, 34)
MUTED = (110, 118, 129)
HEADER_BG = (22, 27, 34)
ACCENT = (88, 166, 255)

W, H = 1280, 720
PADDING = 36


@dataclass
class Slide:
    title: str
    subtitle: str = ""
    body: list[str] | None = None
    terminal: list[str] | None = None
    duration: float = 5.0
    step: str = ""


def load_fonts():
    mono = sans = None
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",):
        if Path(path).exists():
            mono = ImageFont.truetype(path, 17)
            break
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",):
        if Path(path).exists():
            sans_b = ImageFont.truetype(path, 42)
            sans = ImageFont.truetype(path.replace("-Bold", ""), 22)
            return mono or ImageFont.load_default(), sans_b, sans or ImageFont.load_default()
    default = ImageFont.load_default()
    return default, default, default


def wrap(text: str, width: int = 72) -> list[str]:
    return textwrap.wrap(text, width=width) or [text]


def render_title_slide(slide: Slide, mono, sans_b, sans) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, W, 6], fill=GREEN)
    if slide.step:
        draw.text((PADDING, 40), slide.step, fill=CYAN, font=sans)

    draw.text((PADDING, 100), slide.title, fill=FG, font=sans_b)

    y = 180
    if slide.subtitle:
        for line in wrap(slide.subtitle, 58):
            draw.text((PADDING, y), line, fill=MUTED, font=sans)
            y += 32

    if slide.body:
        y += 20
        for line in slide.body:
            for wrapped in wrap(line, 64):
                draw.text((PADDING + 20, y), wrapped, fill=FG, font=sans)
                y += 30

    draw.text((PADDING, H - 40), "Square App Reverse Engineering Tutorial", fill=MUTED, font=mono)
    return img


def render_terminal_slide(slide: Slide, mono, sans_b, sans) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, W, 56], fill=HEADER_BG)
    draw.text((PADDING, 10), slide.step or "Terminal", fill=CYAN, font=sans)
    draw.text((PADDING, 30), slide.title, fill=GREEN, font=mono)

    # Terminal window
    tx, ty, tw, th = 40, 72, W - 80, H - 120
    draw.rounded_rectangle([tx, ty, tx + tw, ty + th], radius=8, fill=(10, 14, 20), outline=(40, 48, 58))

    # Window dots
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse([tx + 14 + i * 22, ty + 12, tx + 26 + i * 22, ty + 24], fill=c)

    y = ty + 44
    lines = slide.terminal or []
    for line in lines[:28]:
        color = FG
        if line.startswith("$"):
            color = GREEN
        elif line.startswith("#"):
            color = YELLOW
        elif "PASS" in line or "complete" in line.lower():
            color = GREEN
        elif "Error" in line or "FAIL" in line:
            color = (248, 81, 73)
        elif line.startswith("  "):
            color = MUTED
        for wrapped in wrap(line, 82):
            draw.text((tx + 16, y), wrapped, fill=color, font=mono)
            y += 22
            if y > ty + th - 20:
                break

    if slide.subtitle:
        draw.text((PADDING, H - 36), slide.subtitle, fill=MUTED, font=mono)

    return img


def build_slides(root: Path) -> list[Slide]:
    apk = root / "apks/com.squareup.apk"
    analysis = root / "output/com.squareup/ANALYSIS.md"
    scan = root / "output/com.squareup/scan-report.txt"

    version = "7.13.2"
    package = "com.squareup"
    if analysis.exists():
        for line in analysis.read_text().splitlines():
            if "| Version |" in line:
                version = line.split("|")[-2].strip()
            if "| Package |" in line:
                package = line.split("|")[-2].strip()

    pos_hits = ssl_hits = root_hits = "—"
    if scan.exists():
        text = scan.read_text(errors="replace")
        pos_hits = str(text.count("com.squareup.pos.action"))
        ssl_hits = str(text.count("certificatepinning") + text.count("networkSecurityConfig"))
        root_hits = str(text.count("PlayIntegrity") + text.count("RootBeer"))

    return [
        Slide(
            step="",
            title="Square App Reverse Engineering",
            subtitle="A step-by-step tutorial for analyzing the Square Point of Sale Android app",
            body=[
                "What you'll learn:",
                "• Set up the reverse engineering toolchain",
                "• Download and decompile the Square POS APK",
                "• Run static security scans",
                "• Review findings and run dynamic analysis with Frida",
            ],
            duration=6,
        ),
        Slide(
            step="Step 1 / 6",
            title="Install the Toolchain",
            subtitle="Run once to install jadx, apktool, frida, and adb",
            terminal=[
                "$ chmod +x scripts/*.sh",
                "$ ./scripts/setup.sh",
                "",
                "[setup] Downloading jadx 1.5.1...",
                "[setup] apktool installed",
                "[setup] frida already available",
                "[setup] Setup complete.",
                "",
                "$ source .env.tools",
            ],
            duration=6,
        ),
        Slide(
            step="Step 2 / 6",
            title="Download the Square APK",
            subtitle="Pull from device, or download automatically with apkeep",
            terminal=[
                "# Option A — automatic download (APKPure)",
                "$ ./scripts/download_apk.sh --apkeep",
                "",
                "[download] Fetching com.squareup via apkeep...",
                "[download] Extracted base APK from XAPK",
                "[download] Saved to apks/com.squareup.apk",
                "",
                "# Option B — from USB device",
                "$ ./scripts/download_apk.sh",
            ],
            duration=6,
        ),
        Slide(
            step="Step 3 / 6",
            title="Run the Analysis Pipeline",
            subtitle="Use --fast to skip jadx on large APKs (recommended)",
            terminal=[
                "$ ./scripts/analyze.sh apks/com.squareup.apk --fast",
                "",
                " Square App Reverse Engineering Pipeline",
                " APK:    apks/com.squareup.apk",
                " Mode:   fast (apktool only)",
                "",
                "[1/4] Extracting APK metadata...",
                f" Package: {package}",
                f" Version: {version}",
                "[2/4] Decompiling... (apktool — 37 DEX files)",
                "[3/4] Running static scan...",
                "[4/4] Generating analysis report...",
                " Analysis complete",
            ],
            duration=7,
        ),
        Slide(
            step="Step 4 / 6",
            title="Review Static Analysis Results",
            subtitle="Key files generated in output/com.squareup/",
            terminal=[
                "$ cat output/com.squareup/ANALYSIS.md",
                "",
                f" Package  | {package}",
                f" Version  | {version}",
                "",
                " Key Findings:",
                f"  POS intent API refs   | {pos_hits}",
                f"  SSL pinning refs      | {ssl_hits}",
                f"  Root/integrity refs   | {root_hits}",
                "",
                "$ cat output/com.squareup/scan-report.txt | head",
                "",
                " AndroidManifest.xml — exported activities",
                " com.squareup.pos.action.CHARGE — POS API",
                " ReleaseCertificatePinner — SSL pinning",
                " playintegritywrapper — device attestation",
            ],
            duration=7,
        ),
        Slide(
            step="Step 5 / 6",
            title="What We Found in Square POS",
            subtitle="Automated scan highlights from v7.13.2",
            body=[
                "POS Intent API — com.squareup.pos.action.CHARGE lets third-party apps initiate payments",
                "SSL Pinning — ReleaseCertificatePinner protects API traffic from MITM",
                "Play Integrity — Device attestation blocks rooted/compromised devices",
                "Card Reader — RECORD_AUDIO + NFC + Bluetooth for Square hardware",
                "Main Activity — com.squareup.ui.main.MainActivity",
            ],
            duration=8,
        ),
        Slide(
            step="Step 6 / 6",
            title="Dynamic Analysis with Frida",
            subtitle="Bypass SSL pinning and trace POS intents at runtime",
            terminal=[
                "# Push frida-server to your Android device, then:",
                "",
                "$ frida -U -f com.squareup \\",
                "    -l frida/ssl_pinning_bypass.js \\",
                "    -l frida/root_detection_bypass.js \\",
                "    --no-pause",
                "",
                "# Trace POS intent handling:",
                "$ frida -U com.squareup \\",
                "    -l frida/trace_pos_intents.js",
                "",
                "# Intercept HTTPS with mitmproxy after SSL bypass",
            ],
            duration=7,
        ),
        Slide(
            step="",
            title="You're Ready!",
            subtitle="Full docs in docs/methodology.md and docs/test-results.md",
            body=[
                "Quick commands:",
                "./scripts/test.sh          — run full verification",
                "./scripts/record_tutorial.sh — regenerate this video",
                "",
                "Disclaimer: For authorized security research only.",
            ],
            duration=5,
        ),
    ]


def render_slide(slide: Slide, fonts) -> Image.Image:
    mono, sans_b, sans = fonts
    if slide.terminal:
        return render_terminal_slide(slide, mono, sans_b, sans)
    return render_title_slide(slide, mono, sans_b, sans)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--output", default="/opt/cursor/artifacts/videos/square-re-tutorial.mp4")
    args = parser.parse_args()

    root = Path(args.root)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)

    slides = build_slides(root)
    fonts = load_fonts()
    frames_dir = output.with_suffix("")
    frames_dir.mkdir(parents=True, exist_ok=True)

    frame_paths: list[Path] = []
    concat_lines: list[str] = []

    for i, slide in enumerate(slides):
        frame = render_slide(slide, fonts)
        path = frames_dir / f"tutorial_{i:03d}.png"
        frame.save(path)
        frame_paths.append(path)
        concat_lines.append(f"file '{path}'")
        concat_lines.append(f"duration {slide.duration}")

    if frame_paths:
        concat_lines.append(f"file '{frame_paths[-1]}'")

    concat_file = frames_dir / "tutorial_concat.txt"
    concat_file.write_text("\n".join(concat_lines) + "\n")

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_file),
            "-vf", "format=yuv420p",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(output),
        ],
        check=True,
        capture_output=True,
    )

    total = sum(s.duration for s in slides)
    print(f"Tutorial video: {output}")
    print(f"Duration: ~{total:.0f}s | Slides: {len(slides)}")


if __name__ == "__main__":
    main()
