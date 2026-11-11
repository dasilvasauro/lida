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
    'neofito': ((330, 366, 140), [((222, 30, 432, 172), 'all', (0.31, -0.02, 0.4), -6, False)]),
    'iniciado': ((402, 362, 132), []),
    'diligente': ((372, 302, 134), [('draw', 'tails')]),
    'perseverante': ((240, 334, 130, -7), [('draw', 'scarf')]),
    'erudito': ((322, 268, 165), []),
    'obstinado': ((265, 360, 135), []),
    'calejado': ((290, 335, 138), [((156, 32, 522, 192), 'dark', (0.06, -0.1, 0.88), 0, False)]),
    'virtuoso': ((330, 345, 128), [((176, 84, 486, 248), 'dark', (0.06, -0.08, 0.86), 0, False)]),
    'mestre': ((372, 322, 140), [('draw', 'cape')]),
    'lifehacker': ((315, 322, 128), [('draw', 'screen')]),
    'ancestral': ((318, 392, 128), [((212, 100, 422, 252), 'color', (0.22, -0.17, 0.56), -6, False), ((498, 56, 614, 236), 'color', (0.78, 0.2, 0.22), 0, False)]),
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


def draw_extra(canvas, kind):
    """Detalhes desenhados aqui mesmo, no traço do Lidinho (tinta escura, cores chapadas)."""
    k = 4  # desenha grande e reduz (bordas suaves)
    layer = Image.new('RGBA', (S * k, S * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    W = 13 * k
    P = lambda pts: [(x * S * k, y * S * k) for x, y in pts]
    if kind == 'cape':
        # gola da capa: duas abas vermelhas que sobem dos ombros e se fecham num broche dourado
        red, red_lo = (238, 98, 106, 255), (196, 66, 80, 255)
        left = P([(-0.05, 0.66), (0.33, 0.76), (0.47, 1.05), (-0.05, 1.05)])
        right = P([(1.05, 0.66), (0.67, 0.76), (0.53, 1.05), (1.05, 1.05)])
        for poly, c in ((left, red), (right, red_lo)):
            d.polygon(poly, fill=c)
            d.line(poly + [poly[0]], fill=INK, width=W, joint='curve')
        cx, cy, r = 0.5 * S * k, 0.84 * S * k, 0.08 * S * k
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(245, 200, 76, 255), outline=INK, width=W)
        d.ellipse((cx - r * 0.35, cy - r * 0.55, cx - r * 0.05, cy - r * 0.25), fill=(255, 240, 190, 255))
    elif kind == 'screen':
        # tela flutuante translúcida, inclinada, saindo pelo canto de cima
        sc = Image.new('RGBA', (int(0.46 * S * k), int(0.32 * S * k)), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sc)
        w, h = sc.size
        sd.rounded_rectangle((W, W, w - W, h - W), radius=int(0.04 * S * k), fill=(196, 236, 248, 215), outline=INK, width=W)
        for i, f in enumerate((0.34, 0.52, 0.7)):
            x1 = w * (0.72 if i else 0.56)
            sd.line((w * 0.18, h * f, x1, h * f), fill=(110, 170, 200, 255), width=int(W * 0.8))
        sd.ellipse((w * 0.78, h * 0.26, w * 0.86, h * 0.38), fill=(240, 120, 130, 255))
        sc = sc.rotate(-14, resample=Image.BICUBIC, expand=True)
        layer.alpha_composite(sc, (int(0.54 * S * k), int(-0.06 * S * k)))
        sc2 = sc.transpose(Image.FLIP_LEFT_RIGHT).resize((int(sc.width * 0.72), int(sc.height * 0.72)), Image.LANCZOS)
        layer.alpha_composite(sc2, (int(0.02 * S * k), int(0.0 * S * k)))
    elif kind == 'scarf':
        # nó do cachecol e a ponta caindo na diagonal, com listras e franja
        yel, yel_lo, stripe = (246, 200, 72, 255), (228, 172, 42, 255), (190, 134, 26, 255)
        tail = P([(0.62, 0.76), (0.76, 0.72), (0.95, 0.9), (0.86, 0.99), (0.7, 0.86)])
        d.polygon(tail, fill=yel_lo)
        d.line(tail + [tail[0]], fill=INK, width=W, joint='curve')
        for a_, b_ in (((0.72, 0.76), (0.66, 0.82)), ((0.81, 0.82), (0.74, 0.89))):
            d.line(P([a_, b_]), fill=stripe, width=int(W * 1.3))
        for f in (0.0, 0.33, 0.66):  # franja
            x0, y0 = 0.95 - f * 0.09, 0.9 + f * 0.09
            d.line(P([(x0, y0), (x0 + 0.04, y0 + 0.04)]), fill=INK, width=int(W * 0.8))
        x0, y0, x1, y1 = (v * S * k for v in (0.57, 0.7, 0.75, 0.84))
        d.ellipse((x0, y0, x1, y1), fill=yel, outline=INK, width=W)
    elif kind == 'tails':
        # nó da faixa do lado esquerdo da cabeça, com as duas pontas caindo
        red, red_lo = (236, 96, 104, 255), (204, 70, 82, 255)
        t1 = P([(0.22, 0.21), (0.07, 0.31), (0.12, 0.39), (0.25, 0.26)])
        t2 = P([(0.25, 0.25), (0.15, 0.44), (0.23, 0.48), (0.3, 0.28)])
        for poly, c in ((t1, red), (t2, red_lo)):
            d.polygon(poly, fill=c)
            d.line(poly + [poly[0]], fill=INK, width=W, joint='curve')
        x, y, r = 0.25 * S * k, 0.2 * S * k, 0.065 * S * k
        d.ellipse((x - r, y - r, x + r, y + r), fill=red, outline=INK, width=W)
    canvas.alpha_composite(layer.resize((S, S), Image.LANCZOS))


def body_disc(color_hi, color, color_lo):
    """Disco com o sombreado do corpo (para tapar o que não for corpo no recorte)."""
    d = Image.new('RGBA', (S, S), color + (255,))
    g = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(g)
    dr.ellipse((S * 0.35, S * 0.4, S * 1.3, S * 1.35), fill=color_lo + (255,))
    d.alpha_composite(g.filter(ImageFilter.GaussianBlur(60)))
    return d


for name, (base, extras) in CFG.items():
    cx, cy, r = base[:3]
    tilt = base[3] if len(base) > 3 else 0  # "muda o ângulo": gira o Lidinho dentro do círculo
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
    if tilt:
        big = big.rotate(tilt, resample=Image.BICUBIC, center=(cx, cy))
    crop = big.crop(box).resize((S, S), Image.LANCZOS)
    ca = np.array(crop)
    h, s, v = hsv(ca)
    bodym = (h > 205) & (h < 265) & (s > 0.25) & (v > 0.55) & (ca[..., 3] > 200)
    med = tuple(int(x) for x in np.median(ca[bodym][:, :3], axis=0)) if bodym.any() else (128, 136, 240)
    lo = tuple(int(x * 0.86) for x in med)
    canvas = body_disc(None, med, lo)
    canvas.alpha_composite(crop)
    for ex in extras:
        if ex[0] == 'draw':
            draw_extra(canvas, ex[1])
            continue
        (bx, mode, (u, vv, w), rot, flip) = ex
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
