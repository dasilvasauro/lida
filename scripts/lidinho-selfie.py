# Gera icons/lidinho/selfie/<título>.webp: o rosto do Lidinho e o detalhe da roupa de cada título,
# recortados do desenho inteiro, num círculo com fundo na cor do título (foto de perfil).
# Uso: python3 scripts/lidinho-selfie.py icons/lidinho icons/lidinho/selfie
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
SRC, OUT = sys.argv[1], sys.argv[2]
# (centro x, centro y, lado) no desenho de 320 px: rosto + o detalhe da roupa de cada título
CROP = {
 'neofito': (150, 132, 234, (196, 236, 214)),
 'iniciado': (178, 170, 220, (247, 222, 190)),
 'diligente': (182, 160, 215, (250, 206, 206)),
 'perseverante': (132, 162, 230, (250, 234, 180)),
 'erudito': (160, 128, 240, (226, 214, 196)),
 'obstinado': (150, 172, 220, (250, 204, 210)),
 'calejado': (168, 150, 226, (214, 220, 232)),
 'virtuoso': (163, 150, 222, (214, 228, 250)),
 'mestre': (150, 160, 248, (248, 208, 208)),
 'lifehacker': (160, 165, 252, (196, 232, 240)),
 'ancestral': (160, 160, 232, (250, 228, 170)),
 'soberano': (160, 118, 205, (222, 208, 250)),
}
S = 256
for name, (cx, cy, side, col) in CROP.items():
    im = Image.open(f'{SRC}/{name}.webp').convert('RGBA')
    big = im.resize((640, 640), Image.LANCZOS)
    # Brancos fechados do desenho (entre o braço e o cajado, por exemplo) viram transparentes.
    a = np.array(big)
    white = (a[..., :3].min(axis=2) > 236) & (a[..., 3] > 200)
    lab, n = ndimage.label(white)
    if n:
        sizes = ndimage.sum(white, lab, range(1, n + 1))
        big_ids = [i + 1 for i, sz in enumerate(sizes) if sz > 900]
        a[np.isin(lab, big_ids), 3] = 0
    big = Image.fromarray(a, 'RGBA')
    k = 2
    box = (int((cx - side / 2) * k), int((cy - side / 2) * k), int((cx + side / 2) * k), int((cy + side / 2) * k))
    crop = big.crop(box).resize((S, S), Image.LANCZOS)
    # fundo: um degradê suave da cor do título
    bg = Image.new('RGBA', (S, S), col + (255,))
    light = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(light)
    d.ellipse((-S * 0.3, -S * 0.45, S * 1.0, S * 0.75), fill=(255, 255, 255, 120))
    bg.alpha_composite(light.filter(ImageFilter.GaussianBlur(28)))
    bg.alpha_composite(crop)
    mask = Image.new('L', (S * 4, S * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, S * 4 - 1, S * 4 - 1), fill=255)
    mask = mask.resize((S, S), Image.LANCZOS)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    out.save(f'{OUT}/{name}.webp', 'WEBP', quality=88, method=6)
print('ok')
