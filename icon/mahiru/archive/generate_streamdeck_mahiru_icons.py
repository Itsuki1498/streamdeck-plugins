from __future__ import annotations

import math
import shutil
import subprocess
import unicodedata
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps


SOURCE_DIR = Path("/Users/itsuki/Library/CloudStorage/GoogleDrive-itsuki1498tp@gmail.com/マイドライブ/真昼")
OUT_DIR = Path("/Users/itsuki/workspace/MusicSketchIR/streamdeck_mahiru_icons")
TMP_DIR = Path("/private/tmp/streamdeck_mahiru_icon_sources")
SIZE = 144

FONT_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc"


def font(size: int):
    return ImageFont.truetype(FONT_PATH, size)


def convert_icns(src: Path) -> Path:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    dest = TMP_DIR / f"{src.stem}.png"
    if not dest.exists():
        subprocess.run(["sips", "-s", "format", "png", str(src), "--out", str(dest)], check=True, stdout=subprocess.DEVNULL)
    return dest


def load_logo(path: str | Path, size: int = 42) -> Image.Image:
    src = Path(path)
    if src.suffix.lower() == ".icns":
        src = convert_icns(src)
    im = Image.open(src).convert("RGBA")
    im.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return canvas


def source(name: str, center=(0.5, 0.46)) -> tuple[Path, tuple[float, float]]:
    return SOURCE_DIR / name, center


def resolve_source(name: str) -> Path:
    direct = SOURCE_DIR / name
    if direct.exists():
        return direct
    wanted = unicodedata.normalize("NFC", name)
    for candidate in SOURCE_DIR.glob("*.jpg"):
        if unicodedata.normalize("NFC", candidate.name) == wanted:
            return candidate
    raise FileNotFoundError(f"Source image not found: {name}")


def crop_source(path: Path, center: tuple[float, float]) -> Image.Image:
    im = Image.open(path).convert("RGB")
    # A square crop keeps the face/upper body in frame and uses the original artwork directly.
    return ImageOps.fit(im, (SIZE, SIZE), method=Image.Resampling.LANCZOS, centering=center)


def draw_simple_logo(kind: str, size: int = 42) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = size / 2
    if kind == "windows":
        pane = int(size * 0.34)
        gap = int(size * 0.05)
        x0 = int((size - pane * 2 - gap) / 2)
        y0 = x0
        col = (31, 113, 230, 255)
        d.rectangle((x0, y0, x0 + pane, y0 + pane), fill=col)
        d.rectangle((x0 + pane + gap, y0, x0 + pane * 2 + gap, y0 + pane), fill=col)
        d.rectangle((x0, y0 + pane + gap, x0 + pane, y0 + pane * 2 + gap), fill=col)
        d.rectangle((x0 + pane + gap, y0 + pane + gap, x0 + pane * 2 + gap, y0 + pane * 2 + gap), fill=col)
    elif kind == "finder":
        d.rounded_rectangle((3, 3, size - 3, size - 3), radius=9, fill=(45, 169, 235, 255), outline=(255, 255, 255, 255), width=2)
        d.line((c, 4, c, size - 4), fill=(255, 255, 255, 255), width=2)
        d.arc((10, 10, 22, 25), 180, 360, fill=(20, 40, 70, 255), width=2)
        d.arc((size - 22, 10, size - 10, 25), 180, 360, fill=(20, 40, 70, 255), width=2)
        d.arc((size * .28, size * .24, size * .72, size * .70), 10, 170, fill=(20, 40, 70, 255), width=2)
    elif kind == "folder":
        d.rounded_rectangle((4, 12, size - 4, size - 6), radius=6, fill=(255, 194, 45, 255), outline=(255, 255, 255, 255), width=2)
        d.rounded_rectangle((8, 7, size * .58, 17), radius=4, fill=(255, 210, 67, 255), outline=(255, 255, 255, 255), width=2)
    elif kind == "file":
        d.rounded_rectangle((9, 4, size - 9, size - 4), radius=5, fill=(246, 249, 255, 255), outline=(45, 79, 133, 255), width=2)
        d.polygon([(size - 19, 4), (size - 9, 14), (size - 19, 14)], fill=(198, 215, 240, 255))
        d.line((16, 22, size - 16, 22), fill=(80, 109, 160, 255), width=2)
        d.line((16, 28, size - 16, 28), fill=(80, 109, 160, 255), width=2)
    elif kind == "home":
        d.polygon([(5, 20), (c, 5), (size - 5, 20), (size - 9, 20), (size - 9, size - 5), (9, size - 5), (9, 20)], fill=(245, 111, 117, 255), outline=(255, 255, 255, 255))
        d.rectangle((c - 4, size - 20, c + 4, size - 5), fill=(255, 245, 225, 255))
    elif kind == "camera":
        d.rounded_rectangle((5, 12, size - 5, size - 8), radius=6, fill=(49, 54, 68, 255), outline=(255, 255, 255, 255), width=2)
        d.rounded_rectangle((13, 7, 25, 14), radius=3, fill=(49, 54, 68, 255), outline=(255, 255, 255, 255), width=2)
        d.ellipse((size * .30, size * .32, size * .70, size * .74), fill=(94, 205, 235, 255), outline=(255, 255, 255, 255), width=2)
    elif kind == "scissors":
        d.ellipse((8, 7, 20, 19), outline=(255, 255, 255, 255), width=3)
        d.ellipse((8, size - 19, 20, size - 7), outline=(255, 255, 255, 255), width=3)
        d.line((19, 18, size - 6, size - 7), fill=(255, 255, 255, 255), width=3)
        d.line((19, size - 18, size - 6, 7), fill=(255, 255, 255, 255), width=3)
    elif kind == "mic":
        d.rounded_rectangle((size * .34, 6, size * .66, size * .63), radius=9, fill=(77, 190, 234, 255), outline=(255, 255, 255, 255), width=2)
        d.arc((size * .17, size * .40, size * .83, size * .82), 0, 180, fill=(255, 255, 255, 255), width=3)
        d.line((c, size * .80, c, size - 5), fill=(255, 255, 255, 255), width=3)
    elif kind == "mic_off":
        base = draw_simple_logo("mic", size)
        d = ImageDraw.Draw(base)
        d.line((6, size - 7, size - 6, 7), fill=(255, 82, 94, 255), width=5)
        return base
    elif kind == "back":
        d.line((size - 7, c, 9, c), fill=(255, 255, 255, 255), width=6)
        d.line((10, c, 23, c - 13), fill=(255, 255, 255, 255), width=6)
        d.line((10, c, 23, c + 13), fill=(255, 255, 255, 255), width=6)
    elif kind == "gear":
        d.ellipse((11, 11, size - 11, size - 11), fill=(150, 157, 170, 255), outline=(255, 255, 255, 255), width=2)
        for i in range(8):
            a = math.radians(i * 45)
            x = c + math.cos(a) * (size * .38)
            y = c + math.sin(a) * (size * .38)
            d.rounded_rectangle((x - 5, y - 5, x + 5, y + 5), radius=2, fill=(150, 157, 170, 255))
        d.ellipse((size * .37, size * .37, size * .63, size * .63), fill=(48, 52, 63, 255))
    elif kind == "note":
        d.rounded_rectangle((7, 4, size - 7, size - 4), radius=5, fill=(255, 244, 119, 255), outline=(255, 255, 255, 255), width=2)
        d.line((14, 17, size - 14, 17), fill=(147, 133, 62, 255), width=2)
        d.line((14, 24, size - 14, 24), fill=(147, 133, 62, 255), width=2)
        d.line((14, 31, size - 23, 31), fill=(147, 133, 62, 255), width=2)
    elif kind == "youtube":
        d.rounded_rectangle((3, 10, size - 3, size - 10), radius=9, fill=(238, 44, 58, 255), outline=(255, 255, 255, 255), width=2)
        d.polygon([(size * .44, size * .28), (size * .44, size * .72), (size * .73, size * .50)], fill=(255, 255, 255, 255))
    elif kind == "twitter":
        d.ellipse((3, 3, size - 3, size - 3), fill=(30, 38, 48, 255), outline=(255, 255, 255, 255), width=2)
        d.text((c, c - 1), "X", font=font(25), anchor="mm", fill=(255, 255, 255, 255))
    elif kind == "amazon":
        d.rounded_rectangle((3, 3, size - 3, size - 3), radius=10, fill=(255, 255, 255, 255), outline=(255, 255, 255, 255), width=2)
        d.text((c, c - 5), "a", font=font(27), anchor="mm", fill=(33, 33, 33, 255))
        d.arc((10, 22, size - 8, size - 4), 10, 160, fill=(255, 153, 0, 255), width=3)
        d.polygon([(size - 11, size - 10), (size - 4, size - 12), (size - 10, size - 4)], fill=(255, 153, 0, 255))
    elif kind == "gpt":
        d.ellipse((3, 3, size - 3, size - 3), fill=(17, 24, 28, 255), outline=(255, 255, 255, 255), width=2)
        d.text((c, c - 1), "GPT", font=font(12), anchor="mm", fill=(255, 255, 255, 255))
    elif kind == "danime":
        d.ellipse((3, 3, size - 3, size - 3), fill=(224, 47, 77, 255), outline=(255, 255, 255, 255), width=2)
        d.text((c, c - 1), "d", font=font(25), anchor="mm", fill=(255, 255, 255, 255))
    elif kind == "drive":
        d.polygon([(c, 4), (size - 5, size - 7), (size - 17, size - 7), (c, 15)], fill=(41, 164, 99, 255))
        d.polygon([(c, 4), (10, size - 7), (22, size - 7), (c + 7, 15)], fill=(251, 188, 4, 255))
        d.polygon([(10, size - 7), (size - 5, size - 7), (size - 12, size - 19), (17, size - 19)], fill=(66, 133, 244, 255))
    elif kind == "github":
        d.ellipse((3, 3, size - 3, size - 3), fill=(28, 28, 31, 255), outline=(255, 255, 255, 255), width=2)
        d.arc((10, 9, size - 10, size + 8), 190, 350, fill=(255, 255, 255, 255), width=3)
        d.ellipse((14, 13, 20, 19), fill=(255, 255, 255, 255))
        d.ellipse((size - 20, 13, size - 14, 19), fill=(255, 255, 255, 255))
        d.line((c, 22, c, size - 7), fill=(255, 255, 255, 255), width=3)
    return im


def make_icon(name: str, src_path: Path, center, label: str, logo: Image.Image, logo_bg=(20, 24, 35, 215)):
    base = crop_source(src_path, center).convert("RGBA")

    # A restrained color wash helps the small badge and label stay legible without hiding the artwork.
    wash = Image.new("RGBA", (SIZE, SIZE), (22, 25, 44, 36))
    base = Image.alpha_composite(base, wash)
    gradient = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gradient)
    for y in range(82, SIZE):
        alpha = int(155 * ((y - 82) / (SIZE - 82)) ** 1.15)
        gd.line((0, y, SIZE, y), fill=(8, 13, 26, alpha))
    base = Image.alpha_composite(base, gradient)

    d = ImageDraw.Draw(base)
    # Label sits on the lower-left, leaving the face area unobstructed.
    bbox = d.textbbox((0, 0), label, font=font(14))
    label_w = bbox[2] - bbox[0] + 16
    d.rounded_rectangle((7, SIZE - 28, min(96, label_w + 7), SIZE - 7), radius=8, fill=(10, 15, 28, 182), outline=(255, 255, 255, 90), width=1)
    d.text((15, SIZE - 25), label, font=font(14), fill=(255, 255, 255, 255))

    # Small app badge at lower-right; it never covers the central face.
    bx0, by0, bx1, by1 = 96, 94, 137, 135
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((bx0 + 2, by0 + 3, bx1 + 2, by1 + 3), radius=11, fill=(0, 0, 0, 120))
    base = Image.alpha_composite(base, shadow)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle((bx0, by0, bx1, by1), radius=11, fill=logo_bg, outline=(255, 255, 255, 235), width=2)
    base.alpha_composite(logo, (98, 96))

    # Fine border for Stream Deck's dark bezel.
    d = ImageDraw.Draw(base)
    d.rounded_rectangle((2, 2, SIZE - 3, SIZE - 3), radius=8, outline=(255, 255, 255, 110), width=2)
    base.convert("RGB").save(OUT_DIR / f"{name}.png", quality=95)


def app_icon(rel: str, fallback_kind: str | None = None, size: int = 38):
    path = Path(rel)
    if path.exists():
        return load_logo(path, size)
    if fallback_kind:
        return draw_simple_logo(fallback_kind, size)
    return draw_simple_logo("file", size)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    app_folder = "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ApplicationsFolderIcon.icns"
    docs_folder = "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/DocumentsFolderIcon.icns"
    finder_folder = "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericFolderIcon.icns"
    sidebar_home = "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/SidebarHomeFolder.icns"

    logos = {
        "apps_mac": app_icon(app_folder),
        "apps_win": draw_simple_logo("windows"),
        "links_mac": app_icon(finder_folder),
        "links_win": draw_simple_logo("windows"),
        "files_mac": app_icon(docs_folder),
        "files_win": draw_simple_logo("folder"),
        "codex": load_logo("/Applications/ChatGPT.app/Contents/Resources/icon-codex-dark-color.png"),
        "musescore": app_icon("/Applications/MuseScore 4.app/Contents/Resources/AppIcon.icns"),
        "chrome": app_icon("/Applications/Google Chrome.app/Contents/Resources/app.icns"),
        "discord": app_icon("/Applications/Discord.app/Contents/Resources/electron.icns"),
        "vscode": app_icon("/Applications/Visual Studio Code.app/Contents/Resources/default.icns"),
        "line": app_icon("/Applications/LINE.app/Contents/Resources/LINE.icns"),
        "github": draw_simple_logo("github"),
        "drive": draw_simple_logo("drive"),
        "gpt": draw_simple_logo("gpt"),
        "settings": draw_simple_logo("gear"),
        "screenshot_mac": draw_simple_logo("camera"),
        "screenshot_win": draw_simple_logo("scissors"),
        "home_mac": app_icon(sidebar_home),
        "home_win": draw_simple_logo("home"),
        "mic": draw_simple_logo("mic"),
        "mic_off": draw_simple_logo("mic_off"),
        "back": draw_simple_logo("back"),
        "note": draw_simple_logo("note"),
        "amazon": draw_simple_logo("amazon"),
        "asmr": draw_simple_logo("mic"),
        "danime": draw_simple_logo("danime"),
        "youtube": draw_simple_logo("youtube"),
        "twitter": draw_simple_logo("twitter"),
    }

    # Each entry uses a different source crop when practical; every source is user-provided artwork.
    entries = [
        ("application_folder_mac", "文化祭真昼.jpg", (0.50, 0.44), "Apps", logos["apps_mac"]),
        ("application_folder_windows", "11巻真昼.jpg", (0.52, 0.43), "Apps", logos["apps_win"]),
        ("link_folder_mac", "傘真昼.jpg", (0.50, 0.42), "Links", logos["links_mac"]),
        ("link_folder_windows", "待ち合わせ真昼.jpg", (0.50, 0.43), "Links", logos["links_win"]),
        ("file_folder_mac", "紅茶真昼.jpg", (0.50, 0.42), "Files", logos["files_mac"]),
        ("file_folder_windows", "エプロン真昼.jpg", (0.50, 0.44), "Files", logos["files_win"]),
        ("codex", "ドーナッツ真昼.jpg", (0.50, 0.43), "Codex", logos["codex"]),
        ("musescore", "黒テレ真昼.jpg", (0.51, 0.47), "MuseScore", logos["musescore"]),
        ("discord_mic_mute", "すやすや真昼.jpg", (0.50, 0.47), "Mute", logos["mic_off"]),
        ("discord_mic_unmute", "微笑み真昼.jpg", (0.50, 0.46), "Unmute", logos["mic"]),
        ("screenshot_mac", "サンタ真昼.jpg", (0.50, 0.44), "Shot", logos["screenshot_mac"]),
        ("screenshot_windows", "冬イルミ真昼.jpg", (0.50, 0.44), "Shot", logos["screenshot_win"]),
        ("home_mac", "全身真昼.jpg", (0.50, 0.45), "Home", logos["home_mac"]),
        ("home_windows", "1巻真昼.jpg", (0.50, 0.45), "Home", logos["home_win"]),
        ("chrome", "冬イルミ真昼.jpg", (0.50, 0.43), "Chrome", logos["chrome"]),
        ("gpt", "お風呂上り真昼.jpg", (0.50, 0.44), "GPT", logos["gpt"]),
        ("settings", "紅葉真昼.jpg", (0.50, 0.44), "Settings", logos["settings"]),
        ("vscode", "11巻真昼.jpg", (0.50, 0.45), "VSCode", logos["vscode"]),
        ("discord", "クリス真昼.jpg", (0.50, 0.46), "Discord", logos["discord"]),
        ("line", "待ち合わせ真昼.jpg", (0.50, 0.44), "LINE", logos["line"]),
        ("github", "小悪魔真昼.jpg", (0.50, 0.44), "GitHub", logos["github"]),
        ("amazon", "紅茶真昼.jpg", (0.50, 0.43), "Amazon", logos["amazon"]),
        ("google_drive", "エプロン真昼.jpg", (0.50, 0.44), "Drive", logos["drive"]),
        ("asmr", "寝起き真昼.jpg", (0.50, 0.44), "ASMR", logos["asmr"]),
        ("danime", "お団子パジャ真昼.jpg", (0.50, 0.44), "dアニメ", logos["danime"]),
        ("youtube", "ドーナッツ真昼.jpg", (0.50, 0.44), "YouTube", logos["youtube"]),
        ("twitter", "傘真昼.jpg", (0.50, 0.44), "Twitter", logos["twitter"]),
        ("back", "覗き込み真昼.jpg", (0.50, 0.44), "Back", logos["back"]),
        ("memo", "文化祭真昼.jpg", (0.50, 0.44), "Notes", logos["note"]),
    ]
    for name, filename, center, label, logo in entries:
        make_icon(name, resolve_source(filename), center, label, logo)

    (OUT_DIR / "README.md").write_text(
        "# Stream Deck 真昼アイコン\n\n"
        "144×144px PNG。指定フォルダの真昼画像を背景に使い、顔の位置を避けて右下へ小さなアプリアイコン／記号を合成しています。\n\n"
        "OS差分は `*_mac.png` / `*_windows.png` です。\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
