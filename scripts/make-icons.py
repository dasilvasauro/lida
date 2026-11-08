"""Gera todos os ícones do Lida a partir de art/icons/*.svg.

    python3 scripts/make-icons.py

Precisa de: playwright (Chromium, para desenhar os SVGs com o brilho) e Pillow.
Saídas:
  icons/            web/PWA (192, 512, maskable, apple-touch, favicon, icon.svg) e bandeja do Linux
  android/.../res/  ícone do app (legado, redondo e adaptativo com camada monocromática), splash
Os PNGs gerados ficam no repositório: não é preciso rodar isto para compilar o app.
"""

import io
import shutil
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "icons"  # fontes (fora de icons/, que vai junto com o app)
ICONS = ROOT / "icons"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
BG = (0x0F, 0x12, 0x17)
DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def svg_only_bg(svg):
    """O ícone sem o alfa (fundo + halos), para a camada de trás do ícone adaptativo."""
    out = []
    for line in svg.splitlines():
        if line.strip().startswith("<path"):
            continue
        out.append(line)
    return "\n".join(out)


class Renderer:
    def __init__(self, pw):
        self.browser = pw.chromium.launch()
        self.page = self.browser.new_page()

    def png(self, svg, size):
        html = f"<html><body style='margin:0;background:transparent'><div style='width:{size}px;height:{size}px'>{svg.replace('<svg ', f'<svg width=\"{size}\" height=\"{size}\" ', 1)}</div></body></html>"
        self.page.set_viewport_size({"width": size, "height": size})
        self.page.set_content(html)
        data = self.page.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": size, "height": size})
        return Image.open(io.BytesIO(data)).convert("RGBA")


def circle(img):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).ellipse((0, 0, img.size[0] - 1, img.size[1] - 1), fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), m)
    return out


def main():
    icon = (SRC / "icon.svg").read_text(encoding="utf-8")
    full = (SRC / "full.svg").read_text(encoding="utf-8")
    glyph = (SRC / "glyph.svg").read_text(encoding="utf-8")
    tray = (SRC / "tray.svg").read_text(encoding="utf-8")
    with sync_playwright() as pw:
        r = Renderer(pw)

        # ---- web / PWA
        shutil.copy(SRC / "icon.svg", ICONS / "icon.svg")
        r.png(icon, 192).save(ICONS / "pwa-192x192.png")
        r.png(icon, 512).save(ICONS / "pwa-512x512.png")
        r.png(full, 512).save(ICONS / "maskable-512x512.png")
        r.png(full, 180).convert("RGB").save(ICONS / "apple-touch-icon.png")
        r.png(icon, 256).save(ICONS / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

        # ---- bandeja (Linux): contorno branco; o Plasma recolore o SVG pela cor do painel
        shutil.copy(SRC / "tray.svg", ICONS / "tray.svg")
        white = tray.replace("currentColor", "#ffffff")
        for s in (22, 44, 64):
            r.png(white, s).save(ICONS / f"tray-{s}.png")

        # ---- Android: ícone do app
        bg_only = svg_only_bg(full)
        for d, k in DENS.items():
            folder = RES / f"mipmap-{d}"
            folder.mkdir(parents=True, exist_ok=True)
            n = round(48 * k)
            r.png(icon, n).save(folder / "ic_launcher.png")
            circle(r.png(full, n)).save(folder / "ic_launcher_round.png")
            a = round(108 * k)
            r.png(bg_only, a).convert("RGB").save(folder / "ic_launcher_background.png")
            # Alfa um pouco menor que o canvas, dentro da zona segura (círculo de 66 dp).
            fg = Image.new("RGBA", (a, a), (0, 0, 0, 0))
            g = r.png(glyph, round(a * 0.9))
            fg.paste(g, ((a - g.size[0]) // 2, (a - g.size[1]) // 2), g)
            fg.save(folder / "ic_launcher_foreground.png")

        # ---- Android: splash (fundo do app + ícone no centro)
        for f in RES.glob("drawable*/splash.png"):
            w, h = Image.open(f).size
            img = Image.new("RGB", (w, h), BG)
            s = round(min(w, h) * 0.3)
            ic = r.png(icon, s)
            img.paste(ic, ((w - s) // 2, (h - s) // 2), ic)
            img.save(f)
        r.browser.close()
    print("Ícones gerados.")


if __name__ == "__main__":
    main()
