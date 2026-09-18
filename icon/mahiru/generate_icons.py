from __future__ import annotations

import math
import subprocess
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


SOURCE_DIR = Path("/Users/itsuki/Library/CloudStorage/GoogleDrive-itsuki1498tp@gmail.com/マイドライブ/真昼")
CODEX_REFERENCE = Path("/var/folders/gc/hkvjkx4d5nb3ps67_jjb2dbc0000gn/T/codex-clipboard-65dd7bbb-2752-4e23-81d6-0a28cb8e06eb.png")
OUT_DIR = Path("/Users/itsuki/workspace/MusicSketchIR/streamdeck_mahiru_icons_original_base")
TMP_DIR = Path("/private/tmp/streamdeck_mahiru_original_base")
S = 576

FONT_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc"


def font(size: int):
    return ImageFont.truetype(FONT_PATH, size)


def resolve_source(name: str) -> Path:
    direct = SOURCE_DIR / name
    if direct.exists():
        return direct
    wanted = unicodedata.normalize("NFC", name)
    for candidate in SOURCE_DIR.glob("*.jpg"):
        if unicodedata.normalize("NFC", candidate.name) == wanted:
            return candidate
    raise FileNotFoundError(name)


def convert_icns(src: str) -> Path:
    src_path = Path(src)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    dest = TMP_DIR / f"{src_path.stem}.png"
    if not dest.exists():
        subprocess.run(["sips", "-s", "format", "png", str(src_path), "--out", str(dest)], check=True, stdout=subprocess.DEVNULL)
    return dest


def load_image(path: str | Path) -> Image.Image:
    p = Path(path)
    if p.suffix.lower() == ".icns":
        p = convert_icns(str(p))
    return Image.open(p).convert("RGBA")


def app_logo(path: str, max_size=160) -> Image.Image:
    im = load_image(path)
    im.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    return im


def simple_logo(kind: str, size=170) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = size / 2
    if kind == "apps_mac":
        d.rounded_rectangle((12, 12, size - 12, size - 12), radius=34, fill=(45, 156, 231, 255), outline=(255, 255, 255, 255), width=6)
        cols = [(242, 97, 99, 255), (255, 196, 58, 255), (70, 188, 118, 255), (155, 105, 219, 255)]
        for i, col in enumerate(cols):
            x = 37 + (i % 2) * 48
            y = 37 + (i // 2) * 48
            d.rounded_rectangle((x, y, x + 32, y + 32), radius=7, fill=col)
    elif kind == "apps_windows":
        d.rounded_rectangle((12, 12, size - 12, size - 12), radius=30, fill=(34, 111, 210, 255), outline=(255, 255, 255, 255), width=6)
        col = (255, 255, 255, 255)
        d.rectangle((38, 37, 79, 78), fill=col)
        d.rectangle((91, 37, 132, 78), fill=col)
        d.rectangle((38, 91, 79, 132), fill=col)
        d.rectangle((91, 91, 132, 132), fill=col)
    elif kind == "link":
        d.ellipse((16, 55, 91, 121), outline=(43, 135, 213, 255), width=18)
        d.ellipse((79, 55, 154, 121), outline=(43, 135, 213, 255), width=18)
        d.line((55, 87, 115, 87), fill=(43, 135, 213, 255), width=18)
        d.line((114, 32, 143, 32), fill=(255, 140, 71, 255), width=12)
        d.line((143, 32, 143, 61), fill=(255, 140, 71, 255), width=12)
        d.line((143, 32, 108, 67), fill=(255, 140, 71, 255), width=12)
    elif kind == "file":
        d.rounded_rectangle((28, 12, size - 28, size - 12), radius=18, fill=(255, 253, 240, 255), outline=(81, 65, 50, 255), width=7)
        d.polygon([(size - 65, 12), (size - 28, 49), (size - 65, 49)], fill=(222, 210, 193, 255))
        for y in (74, 103, 132):
            d.rounded_rectangle((54, y, size - 50, y + 10), radius=5, fill=(103, 91, 77, 255))
    elif kind == "windows_folder":
        d.rounded_rectangle((16, 55, size - 16, size - 18), radius=22, fill=(255, 194, 49, 255), outline=(91, 65, 45, 255), width=7)
        d.rounded_rectangle((24, 37, 86, 68), radius=12, fill=(255, 211, 69, 255), outline=(91, 65, 45, 255), width=7)
        d.rectangle((76, 75, 112, 111), fill=(255, 255, 255, 255))
        d.rectangle((117, 75, 153, 111), fill=(255, 255, 255, 255))
        d.rectangle((76, 116, 112, 152), fill=(255, 255, 255, 255))
        d.rectangle((117, 116, 153, 152), fill=(255, 255, 255, 255))
    elif kind == "mic":
        d.rounded_rectangle((64, 18, 106, 108), radius=22, fill=(77, 182, 231, 255), outline=(74, 58, 51, 255), width=7)
        d.arc((39, 55, 131, 135), 0, 180, fill=(74, 58, 51, 255), width=8)
        d.line((85, 134, 85, 158), fill=(74, 58, 51, 255), width=8)
        d.line((64, 158, 106, 158), fill=(74, 58, 51, 255), width=8)
    elif kind == "mic_off":
        im = simple_logo("mic", size)
        d = ImageDraw.Draw(im)
        d.line((28, 28, 142, 142), fill=(224, 71, 82, 255), width=16)
        return im
    elif kind == "camera":
        d.rounded_rectangle((22, 47, size - 22, size - 23), radius=22, fill=(85, 96, 110, 255), outline=(74, 58, 51, 255), width=7)
        d.rounded_rectangle((45, 31, 79, 53), radius=8, fill=(85, 96, 110, 255), outline=(74, 58, 51, 255), width=7)
        d.ellipse((57, 62, 113, 118), fill=(121, 214, 235, 255), outline=(255, 255, 255, 255), width=7)
    elif kind == "scissors":
        d.ellipse((22, 25, 64, 67), outline=(78, 62, 51, 255), width=9)
        d.ellipse((22, 110, 64, 152), outline=(78, 62, 51, 255), width=9)
        d.line((60, 64, 148, 24), fill=(78, 62, 51, 255), width=9)
        d.line((60, 110, 148, 152), fill=(78, 62, 51, 255), width=9)
    elif kind == "home":
        d.polygon([(17, 75), (85, 15), (153, 75), (139, 75), (139, 152), (31, 152), (31, 75)], fill=(90, 177, 225, 255), outline=(78, 62, 51, 255))
        d.rectangle((76, 104, 96, 152), fill=(255, 244, 219, 255))
    elif kind == "settings":
        d.ellipse((41, 41, 129, 129), fill=(157, 159, 173, 255), outline=(78, 62, 51, 255), width=7)
        for i in range(8):
            a = math.radians(i * 45)
            x, y = c + math.cos(a) * 56, c + math.sin(a) * 56
            d.rounded_rectangle((x - 14, y - 14, x + 14, y + 14), radius=5, fill=(157, 159, 173, 255))
        d.ellipse((68, 68, 102, 102), fill=(77, 67, 60, 255))
    elif kind == "youtube":
        d.rounded_rectangle((14, 46, size - 14, size - 45), radius=28, fill=(232, 63, 67, 255), outline=(78, 62, 51, 255), width=7)
        d.polygon([(73, 66), (73, 116), (121, 91)], fill=(255, 255, 255, 255))
    elif kind == "twitter":
        d.ellipse((15, 15, size - 15, size - 15), fill=(45, 58, 70, 255), outline=(78, 62, 51, 255), width=7)
        d.text((c, c - 4), "X", font=font(66), anchor="mm", fill=(255, 255, 255, 255))
    elif kind == "back":
        d.line((146, 86, 37, 86), fill=(55, 138, 207, 255), width=18)
        d.line((40, 86, 83, 43), fill=(55, 138, 207, 255), width=18)
        d.line((40, 86, 83, 129), fill=(55, 138, 207, 255), width=18)
    elif kind == "note":
        d.rounded_rectangle((23, 12, size - 23, size - 12), radius=17, fill=(255, 238, 112, 255), outline=(78, 62, 51, 255), width=7)
        for y in (59, 91, 123):
            d.line((52, y, 136, y), fill=(130, 113, 65, 255), width=8)
    elif kind == "asmr":
        im = simple_logo("mic", size)
        d = ImageDraw.Draw(im)
        d.arc((14, 28, 55, 135), 270, 90, fill=(255, 255, 255, 255), width=7)
        d.arc((115, 28, 156, 135), 90, 270, fill=(255, 255, 255, 255), width=7)
        return im
    elif kind == "danime":
        d.ellipse((18, 18, size - 18, size - 18), fill=(227, 65, 89, 255), outline=(78, 62, 51, 255), width=7)
        d.text((c, c - 7), "d", font=font(76), anchor="mm", fill=(255, 255, 255, 255))
    elif kind == "gpt":
        d.ellipse((14, 14, size - 14, size - 14), fill=(31, 35, 38, 255), outline=(78, 62, 51, 255), width=7)
        d.arc((48, 27, 126, 142), 210, 330, fill=(255, 255, 255, 255), width=8)
        d.arc((27, 55, 141, 117), 270, 30, fill=(255, 255, 255, 255), width=8)
        d.line((86, 47, 119, 108), fill=(255, 255, 255, 255), width=8)
    elif kind == "github":
        d.ellipse((14, 14, size - 14, size - 14), fill=(32, 32, 35, 255), outline=(78, 62, 51, 255), width=7)
        d.arc((41, 43, 129, 156), 190, 350, fill=(255, 255, 255, 255), width=9)
        d.ellipse((48, 54, 61, 67), fill=(255, 255, 255, 255))
        d.ellipse((109, 54, 122, 67), fill=(255, 255, 255, 255))
    elif kind == "amazon":
        d.rounded_rectangle((20, 28, size - 20, size - 18), radius=18, fill=(255, 255, 255, 255), outline=(78, 62, 51, 255), width=7)
        d.text((c, 69), "a", font=font(80), anchor="mm", fill=(43, 43, 43, 255))
        d.arc((42, 93, 132, 157), 10, 160, fill=(245, 153, 28, 255), width=8)
    elif kind == "drive":
        d.polygon([(86, 15), (158, 138), (126, 138), (86, 71), (46, 138), (14, 138)], fill=(63, 139, 94, 255), outline=(78, 62, 51, 255))
        d.polygon([(86, 15), (46, 138), (14, 138), (57, 15)], fill=(249, 187, 46, 255), outline=(78, 62, 51, 255))
        d.polygon([(14, 138), (158, 138), (142, 110), (30, 110)], fill=(69, 132, 219, 255))
    elif kind == "vscode":
        d.rounded_rectangle((13, 13, size - 13, size - 13), radius=26, fill=(49, 135, 207, 255), outline=(78, 62, 51, 255), width=7)
        d.polygon([(45, 86), (83, 49), (120, 70), (120, 111), (83, 132)], fill=(255, 255, 255, 255))
        d.line((45, 86, 83, 49), fill=(49, 135, 207, 255), width=12)
        d.line((45, 86, 83, 132), fill=(49, 135, 207, 255), width=12)
    return im


def codex_logo() -> Image.Image:
    im = load_image(CODEX_REFERENCE)
    # The supplied reference has the exact logo centered in a white rounded app tile.
    return ImageOps.fit(im, (170, 170), method=Image.Resampling.LANCZOS, centering=(0.50, 0.50))


def sticker(logo: Image.Image, palette: tuple[int, int, int], size=250) -> Image.Image:
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    d.rounded_rectangle((14, 22, size - 14, size - 14), radius=52, fill=(255, 254, 240, 245), outline=(78, 62, 51, 255), width=10)
    d.rounded_rectangle((25, 33, size - 25, size - 25), radius=42, outline=(*palette, 255), width=8)
    logo = logo.copy()
    logo.thumbnail((size - 64, size - 64), Image.Resampling.LANCZOS)
    out.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2 - 3))
    # Small reference-style sparkles keep the icon from reading as a pasted square.
    sd = ImageDraw.Draw(out)
    for x, y in ((30, 34), (size - 35, size - 48)):
        sd.polygon([(x, y - 15), (x + 5, y - 5), (x + 15, y), (x + 5, y + 5), (x, y + 15), (x - 5, y + 5), (x - 15, y), (x - 5, y - 5)], fill=(255, 223, 92, 255), outline=(78, 62, 51, 255))
    return out


def make_icon(name: str, source_name: str, center: tuple[float, float], logo: Image.Image, palette: tuple[int, int, int], pos: tuple[int, int], logo_scale=1.0):
    src = load_image(resolve_source(source_name)).convert("RGB")
    base = ImageOps.fit(src, (S, S), method=Image.Resampling.LANCZOS, centering=center).convert("RGBA")
    panel = sticker(logo, palette, size=int(250 * logo_scale))
    x, y = pos
    panel = panel.resize((int(panel.width), int(panel.height)), Image.Resampling.LANCZOS)
    # Light shadow only; the source image and the character remain untouched.
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sh = Image.new("RGBA", panel.size, (0, 0, 0, 0))
    sh.alpha_composite(panel, (8, 12))
    alpha = sh.getchannel("A").point(lambda a: int(a * 0.22))
    sh.putalpha(alpha)
    shadow.alpha_composite(sh, (x, y))
    base = Image.alpha_composite(base, shadow)
    base.alpha_composite(panel, (x, y))
    base.resize((144, 144), Image.Resampling.LANCZOS).convert("RGB").save(OUT_DIR / f"{name}.png", quality=95)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    app_folder = "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ApplicationsFolderIcon.icns"
    docs_folder = "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/DocumentsFolderIcon.icns"
    chrome = app_logo("/Applications/Google Chrome.app/Contents/Resources/app.icns", 170)
    discord = app_logo("/Applications/Discord.app/Contents/Resources/electron.icns", 170)
    line = app_logo("/Applications/LINE.app/Contents/Resources/LINE.icns", 170)
    vscode = simple_logo("vscode")
    logos = {
        "chrome": chrome,
        "apps_mac": simple_logo("apps_mac"),
        "apps_win": simple_logo("apps_windows"),
        "link": simple_logo("link"),
        "file": simple_logo("file"),
        "codex": codex_logo(),
        "musescore": Image.new("RGBA", (170, 170), (0, 0, 0, 0)),
        "mic_off": simple_logo("mic_off"),
        "mic": simple_logo("mic"),
        "camera": simple_logo("camera"),
        "scissors": simple_logo("scissors"),
        "home": simple_logo("home"),
        "gpt": simple_logo("gpt"),
        "settings": simple_logo("settings"),
        "vscode": vscode,
        "discord": discord,
        "line": line,
        "github": simple_logo("github"),
        "amazon": simple_logo("amazon"),
        "drive": simple_logo("drive"),
        "asmr": simple_logo("asmr"),
        "danime": simple_logo("danime"),
        "youtube": simple_logo("youtube"),
        "twitter": simple_logo("twitter"),
        "back": simple_logo("back"),
        "note": simple_logo("note"),
    }
    # A hand-drawn score mark for MuseScore.
    md = ImageDraw.Draw(logos["musescore"])
    md.ellipse((47, 73, 78, 104), fill=(93, 153, 225, 255), outline=(78, 62, 51, 255), width=5)
    md.line((73, 87, 73, 37), fill=(78, 62, 51, 255), width=10)
    md.line((73, 37, 123, 52), fill=(78, 62, 51, 255), width=10)
    md.ellipse((98, 89, 129, 120), fill=(235, 104, 113, 255), outline=(78, 62, 51, 255), width=5)
    md.line((124, 103, 124, 53), fill=(78, 62, 51, 255), width=10)
    entries = [
        ("application_folder_mac", "文化祭真昼.jpg", (0.50, 0.44), logos["apps_mac"], (50, 145, 220), (305, 282)),
        ("application_folder_windows", "11巻真昼.jpg", (0.52, 0.43), logos["apps_win"], (48, 129, 220), (305, 286)),
        ("link_folder", "傘真昼.jpg", (0.50, 0.42), logos["link"], (50, 145, 220), (22, 292)),
        ("file_folder", "紅茶真昼.jpg", (0.50, 0.42), logos["file"], (231, 170, 75), (312, 286)),
        ("codex", "ドーナッツ真昼.jpg", (0.50, 0.43), logos["codex"], (93, 104, 235), (302, 282)),
        ("musescore", "黒テレ真昼.jpg", (0.51, 0.47), logos["musescore"], (93, 153, 225), (300, 295)),
        ("discord_mic_mute", "すやすや真昼.jpg", (0.50, 0.47), logos["mic_off"], (224, 71, 82), (304, 292)),
        ("discord_mic_unmute", "微笑み真昼.jpg", (0.50, 0.46), logos["mic"], (77, 182, 231), (306, 292)),
        ("screenshot_mac", "サンタ真昼.jpg", (0.50, 0.44), logos["camera"], (77, 182, 231), (302, 288)),
        ("screenshot_windows", "冬イルミ真昼.jpg", (0.50, 0.44), logos["scissors"], (58, 129, 210), (300, 286)),
        ("home_mac", "全身真昼.jpg", (0.50, 0.45), logos["home"], (90, 177, 225), (298, 286)),
        ("home_windows", "1巻真昼.jpg", (0.50, 0.45), logos["home"], (245, 111, 117), (302, 290)),
        ("chrome", "微笑み真昼.jpg", (0.50, 0.46), logos["chrome"], (241, 174, 64), (20, 300)),
        ("gpt", "お風呂上り真昼.jpg", (0.50, 0.44), logos["gpt"], (80, 90, 105), (300, 286)),
        ("settings", "紅葉真昼.jpg", (0.50, 0.44), logos["settings"], (150, 157, 170), (304, 290)),
        ("vscode", "11巻真昼.jpg", (0.50, 0.45), logos["vscode"], (49, 135, 207), (304, 288)),
        ("discord", "クリス真昼.jpg", (0.50, 0.46), logos["discord"], (128, 95, 225), (302, 290)),
        ("line", "待ち合わせ真昼.jpg", (0.50, 0.44), logos["line"], (77, 184, 96), (302, 288)),
        ("github", "小悪魔真昼.jpg", (0.50, 0.44), logos["github"], (45, 45, 50), (302, 290)),
        ("amazon", "紅茶真昼.jpg", (0.50, 0.43), logos["amazon"], (245, 153, 28), (302, 290)),
        ("google_drive", "エプロン真昼.jpg", (0.50, 0.44), logos["drive"], (66, 133, 244), (302, 290)),
        ("asmr", "寝起き真昼.jpg", (0.50, 0.44), logos["asmr"], (77, 182, 231), (302, 290)),
        ("danime", "お団子パジャ真昼.jpg", (0.50, 0.44), logos["danime"], (224, 47, 77), (302, 290)),
        ("youtube", "ドーナッツ真昼.jpg", (0.50, 0.44), logos["youtube"], (232, 63, 67), (302, 290)),
        ("twitter", "傘真昼.jpg", (0.50, 0.44), logos["twitter"], (45, 58, 70), (302, 290)),
        ("back", "覗き込み真昼.jpg", (0.50, 0.44), logos["back"], (55, 138, 207), (302, 290)),
        ("memo", "文化祭真昼.jpg", (0.50, 0.44), logos["note"], (255, 216, 88), (302, 290)),
    ]
    for entry in entries:
        make_icon(*entry)
    (OUT_DIR / "README.md").write_text(
        "# Stream Deck 真昼アイコン\n\n"
        "元画像を背景・人物・表情・衣装としてそのまま使用し、アイコンだけを大きなステッカー風小物として合成しています。\n"
        "144×144px PNG。ファイル／リンクはOS共通、アプリケーションフォルダのみMac/Windows別です。\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
