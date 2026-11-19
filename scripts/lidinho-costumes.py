# Fantasias do Lidinho (desbloqueadas para todo mundo): pinguim, robô e dragão. Desenhadas por cima
# do Lidinho Neófito (sem o broto), no mesmo traço: contorno de tinta escura e cores chapadas.
# Mais o Kaizen (365 dias de ofensiva): o Lidinho inteiro em fogo, com óculos escuros.
# Saída: icons/lidinho/<fantasia>.webp (320 px, fundo transparente). As selfies saem do
# scripts/lidinho-selfie.py. Uso: python3 scripts/lidinho-costumes.py icons/lidinho [nomes...]
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

DIR = sys.argv[1]
N = 640
K = 2  # desenha a 1280 e reduz
INK = (27, 31, 43, 255)
OUTLINE = 11


def base_figure():
    im = Image.open(f'{DIR}/neofito.webp').convert('RGBA').resize((N, N), Image.LANCZOS)
    a = np.array(im)
    yy, xx = np.mgrid[0:N, 0:N]
    a[(yy < 178) & (xx < 445), 3] = 0  # tira o broto e as estrelinhas
    m = a[..., 3] > 30
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    a[lab != np.argmax(sizes) + 1, 3] = 0
    return Image.fromarray(a, 'RGBA')


ARM = [(436, 186), (486, 162), (548, 186), (562, 268), (528, 334), (492, 384), (466, 340), (456, 296), (440, 252)]
HEAD = (320, 354, 190)  # centro e raio da cabeça


def big():
    return Image.new('RGBA', (N * K, N * K), (0, 0, 0, 0))


def S(pts):
    return [(x * K, y * K) for x, y in pts]


def outlined(mask_img, fill, w=OUTLINE):
    """Pinta a máscara com a cor e contorna com tinta (o contorno sai da própria forma)."""
    m = np.array(mask_img) > 127
    inner = ndimage.binary_erosion(m, iterations=w * K // 2)
    out = np.zeros(m.shape + (4,), np.uint8)
    out[m] = INK
    out[inner] = fill
    return Image.fromarray(out, 'RGBA')


def hood_mask(opening, bottom=468, grow=8):
    cx, cy, r = HEAD
    m = Image.new('L', (N * K, N * K), 0)
    d = ImageDraw.Draw(m)
    d.ellipse(S([(cx - r - grow, cy - r - grow), (cx + r + grow, cy + r + grow)]), fill=255)
    d.rectangle(S([(0, bottom), (N, N)]), fill=0)
    ox, oy, rx, ry = opening
    d.ellipse(S([(ox - rx, oy - ry), (ox + rx, oy + ry)]), fill=0)
    return m


def shade(layer, mask, color, at=(0.3, 0.2)):
    """Brilho suave em cima à esquerda, como no desenho original."""
    hl = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(hl)
    w, h = layer.size
    d.ellipse((w * at[0] - w * 0.12, h * at[1] - h * 0.06, w * at[0] + w * 0.08, h * at[1] + h * 0.04), fill=color)
    hl = hl.filter(ImageFilter.GaussianBlur(10 * K))
    hl.putalpha(Image.fromarray(np.minimum(np.array(hl.getchannel('A')), np.array(mask)), 'L'))
    layer.alpha_composite(hl)


def arm_on_top(fig, base):
    m = Image.new('L', (N, N), 0)
    ImageDraw.Draw(m).polygon(ARM, fill=255)
    arm = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    arm.paste(base, (0, 0), Image.fromarray(np.minimum(np.array(m), np.array(base.getchannel('A'))), 'L'))
    fig.alpha_composite(arm)


def body_clip(img, base):
    """Mantém o desenho só por cima do corpo (não vaza para fora do contorno)."""
    a = np.array(img)
    ba = np.array(base.getchannel('A').resize(img.size, Image.LANCZOS))
    a[..., 3] = np.minimum(a[..., 3], ba)
    return Image.fromarray(a, 'RGBA')


def feet(layer, color):
    d = ImageDraw.Draw(layer)
    for box in ((206, 548, 302, 598), (338, 548, 452, 598)):
        d.ellipse(S([box[:2], box[2:]]), fill=INK)
        x0, y0, x1, y1 = box
        d.ellipse(S([(x0 + 7, y0 + 7), (x1 - 7, y1 - 7)]), fill=color)


def finish(fig, name):
    fig = fig.resize((320, 320), Image.LANCZOS)
    fig.save(f'{DIR}/{name}.webp', 'WEBP', quality=90, method=6)


def penguin(base):
    fig = base.copy()
    L = big()
    # barriga branca
    belly = Image.new('L', (N * K, N * K), 0)
    ImageDraw.Draw(belly).ellipse(S([(222, 452), (452, 560)]), fill=255)
    L.alpha_composite(body_clip(outlined(belly, (244, 246, 251, 255), 8), base))
    # capuz de pinguim com a abertura do rosto
    hm = hood_mask((345, 372, 150, 112))
    hood = outlined(hm, (46, 52, 70, 255))
    shade(hood, hm, (120, 130, 160, 150), (0.36, 0.3))
    L.alpha_composite(hood)
    d = ImageDraw.Draw(L)
    # olhos do capuz e o bico
    for x in (292, 392):
        d.ellipse(S([(x - 19, 205), (x + 19, 243)]), fill=INK)
        d.ellipse(S([(x - 13, 211), (x + 13, 237)]), fill=(250, 250, 252, 255))
        d.ellipse(S([(x - 6, 218), (x + 6, 232)]), fill=INK)
    beak = [(318, 248), (366, 248), (342, 282)]
    d.polygon(S(beak), fill=INK)
    d.polygon(S([(325, 253), (359, 253), (342, 275)]), fill=(247, 166, 52, 255))
    feet(L, (247, 166, 52, 255))
    fig.alpha_composite(L.resize((N, N), Image.LANCZOS))
    arm_on_top(fig, base)
    finish(fig, 'pinguim')


def robot(base):
    fig = base.copy()
    L = big()
    silver, silver_lo = (205, 213, 224, 255), (160, 170, 186, 255)
    # capacete prateado (sem antenas)
    hm = hood_mask((345, 400, 170, 112), bottom=440, grow=10)
    helm = outlined(hm, silver)
    shade(helm, hm, (255, 255, 255, 170), (0.33, 0.27))
    L.alpha_composite(helm)
    d = ImageDraw.Draw(L)
    # faixa do capacete e parafusos laterais
    d.rounded_rectangle(S([(190, 268), (500, 292)]), radius=10 * K, fill=silver_lo, outline=INK, width=8 * K)
    for x, y in ((158, 392), (500, 382)):
        d.ellipse(S([(x - 24, y - 24), (x + 24, y + 24)]), fill=INK)
        d.ellipse(S([(x - 17, y - 17), (x + 17, y + 17)]), fill=silver)
        d.line(S([(x - 9, y), (x + 9, y)]), fill=INK, width=5 * K)
    # placa no peito com luzinhas
    d.rounded_rectangle(S([(270, 470), (410, 532)]), radius=12 * K, fill=INK)
    d.rounded_rectangle(S([(278, 478), (402, 524)]), radius=9 * K, fill=silver)
    for i, c in enumerate(((240, 96, 106, 255), (246, 200, 72, 255), (96, 210, 160, 255))):
        x = 304 + i * 36
        d.ellipse(S([(x - 10, 491), (x + 10, 511)]), fill=c, outline=INK, width=4 * K)
    feet(L, silver_lo)
    fig.alpha_composite(L.resize((N, N), Image.LANCZOS))
    # viseira translúcida por cima dos olhos
    V = big()
    vd = ImageDraw.Draw(V)
    vd.rounded_rectangle(S([(228, 300), (462, 372)]), radius=30 * K, fill=(120, 220, 240, 70), outline=INK, width=9 * K)
    vd.line(S([(252, 316), (300, 316)]), fill=(255, 255, 255, 200), width=6 * K)
    fig.alpha_composite(V.resize((N, N), Image.LANCZOS))
    arm_on_top(fig, base)
    finish(fig, 'robo')


def dragon(base):
    orange, orange_lo, cream = (244, 140, 60, 255), (214, 104, 40, 255), (255, 228, 170, 255)
    # asas e rabo atrás do corpo
    B = big()
    bd = ImageDraw.Draw(B)
    for wing in ([(168, 296), (96, 204), (64, 214), (84, 252), (46, 262), (78, 300), (52, 322), (104, 340), (160, 372)],):
        bd.polygon(S(wing), fill=INK)
        inner = Image.new('L', (N * K, N * K), 0)
        ImageDraw.Draw(inner).polygon(S(wing), fill=255)
        B.alpha_composite(outlined(inner, orange_lo, 9))
    tail = [(470, 500), (560, 470), (600, 420), (620, 470), (590, 500), (520, 540)]
    tm = Image.new('L', (N * K, N * K), 0)
    ImageDraw.Draw(tm).polygon(S(tail), fill=255)
    B.alpha_composite(outlined(tm, orange, 9))
    fig = B.resize((N, N), Image.LANCZOS)
    fig.alpha_composite(base)
    L = big()
    # barriga de listras creme
    belly = Image.new('L', (N * K, N * K), 0)
    ImageDraw.Draw(belly).ellipse(S([(236, 462), (440, 556)]), fill=255)
    bl = body_clip(outlined(belly, cream, 8), base)
    bdr = ImageDraw.Draw(bl)
    for y in (490, 516):
        bdr.line(S([(262, y), (414, y)]), fill=(222, 180, 120, 255), width=5 * K)
    L.alpha_composite(bl)
    # capuz laranja com espinhos, chifrinhos e focinho
    d = ImageDraw.Draw(L)
    for sp in ([(296, 176), (316, 132), (334, 172)], [(334, 170), (356, 120), (376, 170)], [(374, 172), (394, 134), (410, 178)]):
        d.polygon(S(sp), fill=INK)
        d.polygon(S([(sp[0][0] + 6, sp[0][1] - 2), (sp[1][0], sp[1][1] + 12), (sp[2][0] - 6, sp[2][1] - 2)]), fill=orange_lo)
    hm = hood_mask((345, 380, 150, 110))
    hood = outlined(hm, orange)
    shade(hood, hm, (255, 220, 170, 160), (0.36, 0.3))
    L.alpha_composite(hood)
    d = ImageDraw.Draw(L)
    for horn in ([(212, 222), (168, 142), (246, 196)], [(452, 214), (504, 140), (424, 192)]):
        d.polygon(S(horn), fill=INK)
        hx = [(horn[0][0] + (6 if horn[0][0] < 300 else -6), horn[0][1] - 4), (horn[1][0], horn[1][1] + 14), (horn[2][0] + (-4 if horn[0][0] < 300 else 4), horn[2][1] + 2)]
        d.polygon(S(hx), fill=cream)
    for x in (326, 362):  # narinas no capuz
        d.ellipse(S([(x - 7, 244), (x + 7, 258)]), fill=INK)
    feet(L, orange_lo)
    fig.alpha_composite(L.resize((N, N), Image.LANCZOS))
    arm_on_top(fig, base)
    finish(fig, 'dragao')


def fire_body(base):
    """Troca o lavanda do corpo por fogo: sombra vermelha, meio laranja, brilho amarelo."""
    a = np.array(base).astype(np.float32)
    rgb = a[..., :3] / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / (mx + 1e-6)
    alive = a[..., 3] > 0
    blue = (a[..., 2] > a[..., 0] + 20) & (sat > 0.15) & alive
    # borda (tinta misturada com o lavanda): vira um marrom-fogo escuro, sem pontinhos claros
    edge = blue & (mx < 0.42)
    v = np.clip((mx - 0.42) / 0.55, 0, 1)[..., None]
    lo = np.array([206, 52, 18], np.float32)
    mid = np.array([255, 110, 22], np.float32)
    hi = np.array([255, 168, 54], np.float32)
    col = np.where(v < 0.72, lo + (mid - lo) * (v / 0.72), mid + (hi - mid) * ((v - 0.72) / 0.28))
    a[..., :3] = np.where(blue[..., None], col, a[..., :3])
    a[edge, :3] = (70, 26, 14)
    # bochechas rosadas viram um vermelho-brasa
    pink = (a[..., 0] > 170) & (a[..., 0] > a[..., 1] + 40) & (a[..., 2] > 110) & ~blue & alive
    a[pink, :3] = (232, 60, 40)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')


def flame_poly(cx, base_y, w, h, lean=0.0):
    """Uma labareda: base larga, ponta fina, com leve curva."""
    pts = []
    for i in range(0, 21):
        t = i / 20
        x = cx - w / 2 + w * t
        bulge = np.sin(np.pi * t)
        y = base_y - bulge ** 0.6 * h * 0.35
        pts.append((x, y))
    tip = (cx + lean * h, base_y - h)
    left = [(cx - w / 2, base_y), (cx - w * 0.42 + lean * h * 0.3, base_y - h * 0.45), (cx - w * 0.18 + lean * h * 0.7, base_y - h * 0.8), tip]
    right = [tip, (cx + w * 0.16 + lean * h * 0.6, base_y - h * 0.62), (cx + w * 0.44 + lean * h * 0.25, base_y - h * 0.3), (cx + w / 2, base_y)]
    return left + right[1:] + [(cx, base_y + h * 0.08)]


def flames(layer, specs, outline=9):
    """Labaredas contornadas: fora vermelho-laranja, dentro laranja e o miolo amarelo."""
    for cx, by, w, h, lean in specs:
        for scale, color, ol in ((1.0, (240, 84, 30, 255), outline), (0.66, (255, 150, 40, 255), 0), (0.36, (255, 226, 110, 255), 0)):
            m = Image.new('L', (N * K, N * K), 0)
            ImageDraw.Draw(m).polygon(S(flame_poly(cx, by, w * scale, h * scale, lean)), fill=255)
            layer.alpha_composite(outlined(m, color, ol) if ol else Image.merge('RGBA', (*[Image.new('L', m.size, c) for c in color[:3]], m)))


def kaizen(base):
    body = fire_body(base)
    # brilho de fogo em volta de tudo
    glow = Image.new('RGBA', (N, N), (255, 120, 30, 0))
    ga = np.array(base.getchannel('A')).astype(np.float32)
    g = Image.fromarray(ga.astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(26))
    glow.putalpha(Image.fromarray((np.array(g).astype(np.float32) * 0.75).astype(np.uint8), 'L'))
    fig = glow
    # labaredas atrás do corpo (cabeça e laterais)
    B = big()
    flames(B, [
        (250, 200, 120, 190, -0.25), (330, 182, 150, 250, 0.0), (410, 196, 120, 200, 0.22),
        (190, 262, 90, 140, -0.45), (470, 252, 90, 150, 0.4), (150, 360, 70, 110, -0.6), (520, 340, 64, 100, 0.55),
    ])
    fig.alpha_composite(B.resize((N, N), Image.LANCZOS))
    fig.alpha_composite(body)
    L = big()
    # topete de fogo por cima da cabeça
    flames(L, [(300, 214, 90, 120, -0.2), (352, 206, 100, 150, 0.05), (400, 214, 80, 110, 0.25)], 8)
    # chamas nos pés
    flames(L, [(250, 560, 60, 70, -0.15), (300, 556, 50, 56, 0.1), (370, 560, 60, 70, -0.1), (424, 556, 50, 60, 0.2)], 7)
    fig.alpha_composite(L.resize((N, N), Image.LANCZOS))
    # boca: em vez do "o" de surpresa, um sorriso de canto confiante
    M = big()
    md = ImageDraw.Draw(M)
    fill = tuple(np.array(body)[416, 300][:3]) + (255,)
    md.ellipse(S([(314, 392), (366, 448)]), fill=fill)
    md.arc(S([(306, 386), (380, 438)]), start=20, end=150, fill=INK, width=9 * K)
    md.line(S([(372, 414), (382, 404)]), fill=INK, width=8 * K)
    fig.alpha_composite(M.resize((N, N), Image.LANCZOS))
    # óculos escuros
    G = big()
    gd = ImageDraw.Draw(G)
    lens = [((236, 318), (318, 378)), ((350, 312), (440, 372))]
    gd.line(S([(318, 334), (350, 330)]), fill=INK, width=12 * K)  # ponte
    gd.line(S([(236, 330), (196, 318)]), fill=INK, width=10 * K)  # hastes
    gd.line(S([(440, 326), (474, 312)]), fill=INK, width=10 * K)
    for (x0, y0), (x1, y1) in lens:
        gd.rounded_rectangle(S([(x0, y0), (x1, y1)]), radius=22 * K, fill=INK)
        gd.rounded_rectangle(S([(x0 + 6, y0 + 6), (x1 - 6, y1 - 6)]), radius=17 * K, fill=(40, 30, 46, 255))
        # reflexo
        gd.line(S([(x0 + 16, y0 + 18), (x0 + 34, y0 + 14)]), fill=(255, 255, 255, 210), width=6 * K)
        gd.line(S([(x0 + 14, y0 + 30), (x0 + 22, y0 + 28)]), fill=(255, 255, 255, 150), width=4 * K)
    fig.alpha_composite(G.resize((N, N), Image.LANCZOS))
    arm_on_top(fig, body)
    finish(fig, 'kaizen')


b = base_figure()
DRAW = {'pinguim': penguin, 'robo': robot, 'dragao': dragon, 'kaizen': kaizen}
for name in sys.argv[2:] or list(DRAW):
    DRAW[name](b)
print('ok')
