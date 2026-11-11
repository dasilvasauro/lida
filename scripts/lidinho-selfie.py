# Gera icons/lidinho/selfie/<título>.webp: a foto de perfil "selfie" do Lidinho de cada título.
# Sem fundo: o círculo é o próprio Lidinho (um recorte de dentro do corpo, com o rosto), contornado
# como o desenho, e o detalhe do título é recortado do desenho inteiro e colocado por cima (broto,
# boina, capelo, coroa, auréola, telas...). Saída: 256 px, transparente fora do círculo.
# Uso: python3 scripts/lidinho-selfie.py icons/lidinho icons/lidinho/selfie
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
N = 640  # escala de trabalho do desenho
S = 512  # escala de trabalho da saída (salva em 256)
INK = (27, 31, 43, 255)

# base: (cx, cy, r) do círculo dentro do corpo, no desenho a 640 px.
# extras: (caixa x0,y0,x1,y1 a 640 px, modo, alvo (u, v, largura) em frações do círculo, giro, espelhar)
#   u, v = canto de cima à esquerda; modos: 'all' (tudo), 'color' (cores fora do roxo), 'dark' (tinta grossa + cores)
CFG = {
    'neofito': ((338, 372, 162), [((222, 30, 432, 172), 'all', (0.24, -0.06, 0.52), 0, False)]),
    'iniciado': ((372, 348, 124), [((470, 330, 640, 565), 'color', (0.66, 0.52, 0.42), -8, False)]),
    'diligente': ((402, 318, 128), [((105, 168, 225, 268), 'color', (0.0, 0.16, 0.3), 0, False)]),
    'perseverante': ((212, 345, 125), []),
    'erudito': ((322, 268, 165), []),
    'obstinado': ((265, 360, 135), []),
    'calejado': ((290, 335, 138), [((156, 32, 522, 192), 'dark', (0.06, -0.1, 0.88), 0, False)]),
    'virtuoso': ((330, 345, 128), [((176, 84, 486, 248), 'dark', (0.06, -0.08, 0.86), 0, False)]),
    'mestre': ((372, 322, 138), [((18, 276, 205, 552), 'color', (-0.14, 0.5, 0.44), 12, False), ((18, 276, 205, 552), 'color', (0.7, 0.5, 0.44), -12, True)]),
    'lifehacker': ((315, 352, 128), [((2, 118, 186, 285), 'all', (-0.02, 0.02, 0.36), -6, False), ((405, 72, 622, 285), 'all', (0.64, -0.02, 0.4), 6, False)]),
    'ancestral': ((315, 385, 130), [((212, 100, 422, 252), 'color', (0.2, -0.04, 0.6), 0, False), ((498, 56, 614, 236), 'color', (0.76, 0.12, 0.24), 0, False)]),
    'soberano': ((322, 272, 120), [((190, 20, 446, 128), 'all', (0.1, -0.03, 0.8), 0, False)]),
}


def hsv(a):
    rgb = a[..., :3].astype(np.float32) / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn + 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0)
    return h, s, mx


def piece(big, box, mode):
    a = np.array(big.crop(box))
    alpha = a[..., 3] > 40
    h, s, v = hsv(a)
    body = (h > 205) & (h < 265) & (s > 0.18) & (v > 0.45)
    dark = v < 0.32
    colored = alpha & ~body & ~dark & ((s > 0.28) | (v > 0.9))
    if mode == 'all':
        m = alpha
    elif mode == 'color':
        near = ndimage.binary_dilation(colored, iterations=7)
        m = colored | (near & dark & alpha)
    else:  # dark: manchas grossas de tinta (boina, capelo) + cores
        thick = ndimage.binary_opening(dark & alpha, iterations=5)
        thick = ndimage.binary_dilation(thick, iterations=6) & alpha & (dark | ~body)
        near = ndimage.binary_dilation(colored, iterations=7)
        m = thick | colored | (near & dark & alpha)
    # só os pedaços grandes (tira restos de contorno soltos)
    lab, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        keep = [i + 1 for i, z in enumerate(sizes) if z >= max(60, 0.04 * sizes.max())]
        m = np.isin(lab, keep)
    out = a.copy()
    out[..., 3] = np.where(m, a[..., 3], 0)
    img = Image.fromarray(out, 'RGBA')
    bb = img.getchannel('A').getbbox()
    return img.crop(bb) if bb else img


def body_disc(color_hi, color, color_lo):
    """Disco com o sombreado do corpo (para tapar o que não for corpo no recorte)."""
    d = Image.new('RGBA', (S, S), color + (255,))
    g = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(g)
    dr.ellipse((S * 0.35, S * 0.4, S * 1.3, S * 1.35), fill=color_lo + (255,))
    d.alpha_composite(g.filter(ImageFilter.GaussianBlur(60)))
    return d


for name, ((cx, cy, r), extras) in CFG.items():
    big = Image.open(f'{SRC}/{name}.webp').convert('RGBA').resize((N, N), Image.LANCZOS)
    a = np.array(big)
    # brancos fechados do desenho viram transparentes (depois o disco cobre)
    white = (a[..., :3].min(axis=2) > 236) & (a[..., 3] > 200)
    lab, n = ndimage.label(white)
    if n:
        sizes = ndimage.sum(white, lab, range(1, n + 1))
        a[np.isin(lab, [i + 1 for i, z in enumerate(sizes) if z > 900]), 3] = 0
    big = Image.fromarray(a, 'RGBA')
    # cor do corpo: mediana dos pixels roxos do recorte
    box = (cx - r, cy - r, cx + r, cy + r)
    crop = big.crop(box).resize((S, S), Image.LANCZOS)
    ca = np.array(crop)
    h, s, v = hsv(ca)
    bodym = (h > 205) & (h < 265) & (s > 0.25) & (v > 0.55) & (ca[..., 3] > 200)
    med = tuple(int(x) for x in np.median(ca[bodym][:, :3], axis=0)) if bodym.any() else (128, 136, 240)
    lo = tuple(int(x * 0.86) for x in med)
    canvas = body_disc(None, med, lo)
    canvas.alpha_composite(crop)
    for (bx, mode, (u, vv, w), rot, flip) in extras:
        p = piece(big, bx, mode)
        if flip:
            p = p.transpose(Image.FLIP_LEFT_RIGHT)
        tw = int(w * S)
        th = int(p.height * tw / p.width)
        p = p.resize((tw, th), Image.LANCZOS)
        if rot:
            p = p.rotate(rot, resample=Image.BICUBIC, expand=True)
        canvas.alpha_composite(p, (int(u * S), int(vv * S)))
    # círculo com contorno de tinta, como o desenho
    mask = Image.new('L', (S * 2, S * 2), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, S * 2 - 1, S * 2 - 1), fill=255)
    mask = mask.resize((S, S), Image.LANCZOS)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask)
    ring = Image.new('RGBA', (S * 2, S * 2), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse((6, 6, S * 2 - 7, S * 2 - 7), outline=INK, width=26)
    out.alpha_composite(ring.resize((S, S), Image.LANCZOS))
    out.resize((256, 256), Image.LANCZOS).save(f'{OUT}/{name}.webp', 'WEBP', quality=90, method=6)
print('ok')
