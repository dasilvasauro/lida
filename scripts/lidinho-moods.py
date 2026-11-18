# Lidinho padrão (sem roupa de título) com expressões, para a ofensiva (widget e app):
#   manha     começo do dia, animado          feito     meta do dia batida, comemorando
#   urgente   fim do dia e nada da meta        pijama    meta batida e hora de dormir
#   quebrada  a ofensiva quebrou (choro)       abandonado  dias sem abrir o Lida (cinza, teia)
# Parte do Neófito: tira o broto, apaga o rosto (inpaint) e desenha olhos, boca e acessórios no
# mesmo traço (contorno de tinta escura, cores chapadas).
# Saída: icons/lidinho/humor/<humor>.webp (320 px), android/.../drawable-nodpi/lidinho_<humor>.webp
# e os PNG dos widgets do Plasma. Uso: python3 scripts/lidinho-moods.py
import math
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
N = 640
K = 2
INK = (27, 31, 43, 255)
WHITE = (255, 255, 255, 255)
BLUSH = (238, 132, 160, 200)
MOODS = ['manha', 'feito', 'urgente', 'pijama', 'quebrada', 'abandonado']


def S(pts):
    return [(x * K, y * K) for x, y in pts]


def big():
    return Image.new('RGBA', (N * K, N * K), (0, 0, 0, 0))


def base_figure():
    im = Image.open(os.path.join(ROOT, 'icons/lidinho/neofito.webp')).convert('RGBA').resize((N, N), Image.LANCZOS)
    a = np.array(im)
    yy, xx = np.mgrid[0:N, 0:N]
    # broto e estrelinhas: tudo acima da cabeça que fica fora do círculo dela
    cx, cy, r = 320, 356, 192
    out = (np.hypot(xx - cx, yy - cy) > r + 6) & (yy < 250) & (xx < 445)
    a[out, 3] = 0
    m = a[..., 3] > 30
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    a[lab != np.argmax(sizes) + 1, 3] = 0
    # apaga o rosto: olhos, boca e bochechas (o que é escuro ou rosado dentro da área do rosto)
    rgb = a[..., :3].astype(int)
    lum = rgb.mean(axis=2)
    face = (yy > 300) & (yy < 455) & (xx > 215) & (xx < 470)
    dark = lum < 110
    pink = rgb[..., 0] > 165
    stem = (yy > 150) & (yy < 215) & (xx > 290) & (xx < 350) & (np.hypot(xx - 320, yy - 367) < 186) & (lum < 160)
    mask = ((face & (dark | pink)) | stem).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((7, 7), np.uint8), iterations=2)
    bgr = cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2BGR)
    fixed = cv2.inpaint(bgr, mask, 12, cv2.INPAINT_TELEA)
    a[..., :3] = cv2.cvtColor(fixed, cv2.COLOR_BGR2RGB)
    # refaz o alto da cabeça onde saía o caule: copia o contorno de um trecho vizinho, girado
    # (círculo da cabeça: centro 320,367, raio 204), com borda suave
    rot = cv2.warpAffine(a, cv2.getRotationMatrix2D((320, 367), -24, 1.0), (N, N), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT)
    d = np.hypot(xx - 320, yy - 367)
    ang = np.degrees(np.arctan2(yy - 367, xx - 320))  # -90 = topo
    w = np.clip(1 - (np.abs(ang + 90) - 9) / 5, 0, 1) * np.clip(1 - (d - 214) / 4, 0, 1) * np.clip((d - 165) / 6, 0, 1)
    w = w[..., None]
    a[:] = np.clip(a * (1 - w) + rot * w, 0, 255).astype(np.uint8)
    return Image.fromarray(a, 'RGBA')


EYE_L, EYE_R = (285, 345), (398, 342)
MOUTH = (341, 420)
CHEEK_L, CHEEK_R = (250, 404), (432, 398)
W = 9  # traço (em 640)


def ell(d, c, rx, ry, **kw):
    x, y = c
    d.ellipse(S([(x - rx, y - ry), (x + rx, y + ry)]), **kw)


def line(d, pts, w=W, fill=INK):
    d.line(S(pts), fill=fill, width=w * K, joint='curve')
    for p in (pts[0], pts[-1]):
        ell(d, p, w / 2, w / 2, fill=fill)


def arc_pts(c, rx, ry, a0, a1, n=24):
    return [(c[0] + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), c[1] + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def eyes_open(d, r=17, ry=21, shine=True):
    for c in (EYE_L, EYE_R):
        ell(d, c, r, ry, fill=INK)
        if shine:
            ell(d, (c[0] + 5, c[1] - 7), 6, 6, fill=WHITE)


def eyes_happy(d):  # ^ ^
    for c in (EYE_L, EYE_R):
        line(d, arc_pts((c[0], c[1] + 8), 18, 18, 200, 340))


def eyes_closed(d):  # dormindo: ‿ ‿
    for c in (EYE_L, EYE_R):
        line(d, arc_pts((c[0], c[1] - 6), 17, 13, 20, 160))


def cheeks(d, color=BLUSH, rx=26, ry=14):
    for c in (CHEEK_L, CHEEK_R):
        ell(d, c, rx, ry, fill=color)


def smile_open(d, w=44, h=34):
    x, y = MOUTH
    pts = [(x - w, y - 8)] + arc_pts((x, y - 8), w, h, 0, 180)[::-1][1:] + [(x + w, y - 8)]
    d.polygon(S(pts), fill=INK)
    ell(d, (x, y + h - 22), w * 0.48, 11, fill=(240, 120, 140, 255))  # língua
    d.polygon(S(pts), outline=INK, width=4 * K)


def shine_layer(fig):
    return fig


def star(d, c, r, fill, outline=INK):
    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36)
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((c[0] + rr * math.cos(a), c[1] + rr * math.sin(a)))
    d.polygon(S(pts), fill=outline)
    inner = [(c[0] + (x - c[0]) * 0.7, c[1] + (y - c[1]) * 0.7) for x, y in pts]
    d.polygon(S(inner), fill=fill)


def sparkle(d, c, r, fill=(120, 230, 200, 255)):
    x, y = c
    pts = [(x, y - r), (x + r * 0.28, y - r * 0.28), (x + r, y), (x + r * 0.28, y + r * 0.28), (x, y + r), (x - r * 0.28, y + r * 0.28), (x - r, y), (x - r * 0.28, y - r * 0.28)]
    d.polygon(S(pts), fill=fill)


def letter_z(d, c, size, w=8, fill=INK):
    x, y = c
    line(d, [(x - size / 2, y - size / 2), (x + size / 2, y - size / 2), (x - size / 2, y + size / 2), (x + size / 2, y + size / 2)], w, fill)


def manha(fig):
    L = big()
    d = ImageDraw.Draw(L)
    # sol nascendo, no canto de cima
    sun = (128, 150)
    for i in range(10):
        a = math.radians(i * 36)
        line(d, [(sun[0] + 48 * math.cos(a), sun[1] + 48 * math.sin(a)), (sun[0] + 66 * math.cos(a), sun[1] + 66 * math.sin(a))], 8, (255, 196, 61, 255))
    ell(d, sun, 38, 38, fill=INK)
    ell(d, sun, 31, 31, fill=(255, 205, 70, 255))
    sparkle(d, (520, 110), 16)
    sparkle(d, (560, 170), 9, (255, 205, 70, 255))
    eyes_open(d, 18, 23)
    cheeks(d)
    smile_open(d, 40, 30)
    fig.alpha_composite(L.resize((N, N), Image.LANCZOS))
    return fig


def feito(fig):
    L = big()
    d = ImageDraw.Draw(L)
    eyes_happy(d)
    cheeks(d, (240, 118, 150, 225), 28, 15)
    smile_open(d, 50, 40)
    # confete e estrelas
    star(d, (118, 210), 30, (255, 205, 70, 255))
    star(d, (548, 112), 24, (255, 205, 70, 255))
    for (x, y, a, c) in [(170, 120, 30, (255, 120, 150, 255)), (470, 70, -20, (110, 210, 255, 255)), (590, 240, 50, (130, 230, 170, 255)), (88, 330, -40, (255, 160, 90, 255)), (250, 70, 70, (170, 140, 255, 255))]:
        r = math.radians(a)
        dx, dy = 14 * math.cos(r), 14 * math.sin(r)
        line(d, [(x - dx, y - dy), (x + dx, y + dy)], 9, c)
    fig.alpha_composite(L.resize((N, N), Image.LANCZOS))
    return fig


def urgente(fig):
    # rosto vermelho de raiva
    red = big()
    rd = ImageDraw.Draw(red)
    ell(rd, (340, 380), 150, 120, fill=(255, 60, 60, 70))
    red = red.filter(ImageFilter.GaussianBlur(30 * K))
    a = np.array(red)
    ba = np.array(fig.getchannel('A').resize(red.size))
    a[..., 3] = np.minimum(a[..., 3], ba)
    fig.alpha_composite(Image.fromarray(a, 'RGBA').resize((N, N), Image.LANCZOS))
    L = big()
    d = ImageDraw.Draw(L)
    # sobrancelhas bravas e olhos menores
    line(d, [(255, 300), (310, 322)], 12)
    line(d, [(428, 298), (373, 320)], 12)
    eyes_open(d, 15, 18)
    # boca de dentes cerrados
    x, y = MOUTH
    d.rounded_rectangle(S([(x - 46, y - 18), (x + 46, y + 22)]), radius=14 * K, fill=INK)
    d.rounded_rectangle(S([(x - 38, y - 11), (x + 38, y + 15)]), radius=9 * K, fill=WHITE)
    for i in (-19, 0, 19):
        line(d, [(x + i, y - 11), (x + i, y + 15)], 4)
    line(d, [(x - 38, y + 2), (x + 38, y + 2)], 4)
    # sinal de raiva e gota de suor
    ax, ay = 168, 196
    for (sx, sy) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        line(d, [(ax + sx * 9, ay + sy * 26), (ax + sx * 9, ay + sy * 9), (ax + sx * 26, ay + sy * 9)], 10, (235, 40, 50, 255))
    dx0 = 46
    drop = [(178 + dx0, 236), (196 + dx0, 268), (196 + dx0, 282), (186 + dx0, 294), (170 + dx0, 294), (160 + dx0, 282), (160 + dx0, 268)]
    d.polygon(S(drop), fill=INK)
    d.polygon(S([(178 + dx0, 246), (189 + dx0, 268), (189 + dx0, 280), (183 + dx0, 287), (173 + dx0, 287), (167 + dx0, 280), (167 + dx0, 268)]), fill=(150, 210, 255, 255))
    # "!" de pressa
    for (x0, y0) in ((560, 300), (588, 262)):
        line(d, [(x0, y0 - 34), (x0, y0 - 6)], 11, (235, 40, 50, 255))
        ell(d, (x0, y0 + 12), 7, 7, fill=(235, 40, 50, 255))
    fig.alpha_composite(L.resize((N, N), Image.LANCZOS))
    return fig


def pijama(fig):
    L = big()
    d = ImageDraw.Draw(L)
    eyes_closed(d)
    cheeks(d, (238, 132, 160, 150))
    x, y = MOUTH
    ell(d, (x, y + 2), 14, 16, fill=INK)  # bocejo pequeno
    ell(d, (x, y + 6), 8, 8, fill=(240, 120, 140, 255))
    # touca de dormir caída para a direita, listrada, com pompom
    cap = [(150, 270), (176, 205), (236, 160), (318, 140), (400, 150), (470, 190), (540, 150), (600, 130), (588, 172), (520, 230), (492, 272), (430, 236), (330, 222), (230, 242)]
    m = Image.new('L', (N * K, N * K), 0)
    ImageDraw.Draw(m).polygon(S(cap), fill=255)
    stripes = big()
    sd = ImageDraw.Draw(stripes)
    sd.polygon(S(cap), fill=(70, 96, 200, 255))
    for i in range(-6, 12):
        x0 = 120 + i * 48
        sd.polygon(S([(x0, 120), (x0 + 22, 120), (x0 + 80, 300), (x0 + 58, 300)]), fill=(245, 247, 255, 255))
    sa = np.array(stripes)
    mm = np.array(m) > 127
    inner = ndimage.binary_erosion(mm, iterations=8 * K)
    out = np.zeros(sa.shape, np.uint8)
    out[mm] = INK
    out[inner] = sa[inner]
    L.alpha_composite(Image.fromarray(out, 'RGBA'))
    d = ImageDraw.Draw(L)
    # barra da touca
    band = [(146, 262), (232, 236), (330, 216), (430, 230), (500, 268), (494, 296), (428, 262), (330, 250), (236, 270), (156, 298)]
    d.polygon(S(band), fill=INK)
    d.polygon(S([(156, 270), (234, 245), (330, 226), (428, 240), (490, 274), (486, 286), (428, 254), (330, 240), (238, 260), (160, 288)]), fill=(245, 247, 255, 255))
    ell(d, (600, 150), 26, 26, fill=INK)
    ell(d, (600, 150), 19, 19, fill=(245, 247, 255, 255))
    # Z z z e a lua
    letter_z(d, (90, 300), 34, 9)
    letter_z(d, (66, 236), 24, 7)
    letter_z(d, (92, 186), 16, 6)
    moon = Image.new('L', (N * K, N * K), 0)
    md = ImageDraw.Draw(moon)
    ell(md, (560, 420), 40, 40, fill=255)
    ell(md, (580, 404), 34, 34, fill=0)
    mo = np.array(moon) > 127
    mi = ndimage.binary_erosion(mo, iterations=7 * K)
    o2 = np.zeros(mo.shape + (4,), np.uint8)
    o2[mo] = INK
    o2[mi] = (255, 214, 90, 255)
    L.alpha_composite(Image.fromarray(o2, 'RGBA'))
    fig.alpha_composite(L.resize((N, N), Image.LANCZOS))
    return fig


def quebrada(fig):
    L = big()
    d = ImageDraw.Draw(L)
    # sobrancelhas tristes, olhos marejados e lágrimas
    line(d, [(258, 312), (304, 296)], 9)
    line(d, [(424, 308), (378, 293)], 9)
    eyes_open(d, 17, 21)
    for c in (EYE_L, EYE_R):
        ell(d, (c[0] - 6, c[1] + 6), 4, 4, fill=WHITE)
    for (x, y0) in ((272, 368), (412, 364)):
        tear = [(x, y0), (x + 14, y0 + 40), (x + 12, y0 + 70), (x, y0 + 80), (x - 12, y0 + 70), (x - 14, y0 + 40)]
        d.polygon(S(tear), fill=INK)
        d.polygon(S([(x, y0 + 10), (x + 8, y0 + 42), (x + 7, y0 + 66), (x, y0 + 72), (x - 7, y0 + 66), (x - 8, y0 + 42)]), fill=(140, 205, 255, 255))
    line(d, arc_pts((MOUTH[0], MOUTH[1] + 22), 30, 20, 200, 340))
    # chama apagada (cinza, rachada), com fumaça
    fx, fy = 118, 214

    def flame(scale):
        pts = arc_pts((fx, fy + 10), 36 * scale, 34 * scale, -10, 190, 30)  # base redonda
        pts += [(fx - 30 * scale, fy - 18 * scale), (fx - 12 * scale, fy - 30 * scale), (fx - 6 * scale, fy - 52 * scale), (fx + 10 * scale, fy - 72 * scale), (fx + 14 * scale, fy - 44 * scale), (fx + 32 * scale, fy - 26 * scale)]
        return [(fx + (x - fx), y) for x, y in pts]

    d.polygon(S(flame(1.0)), fill=INK)
    d.polygon(S(flame(0.78)), fill=(156, 162, 176, 255))
    line(d, [(fx - 2, fy + 34), (fx + 10, fy + 10), (fx - 6, fy - 8), (fx + 4, fy - 30)], 6)  # rachadura
    for (sx, sy, r) in [(150, 120, 11), (166, 94, 8), (158, 70, 6)]:
        ell(d, (sx, sy), r, r, outline=(150, 156, 170, 255), width=4 * K)
    fig.alpha_composite(L.resize((N, N), Image.LANCZOS))
    return fig


def abandonado(fig):
    # desbotado: perde a cor
    a = np.array(fig).astype(float)
    gray = a[..., :3].mean(axis=2, keepdims=True)
    a[..., :3] = a[..., :3] * 0.35 + gray * 0.65
    fig = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
    L = big()
    d = ImageDraw.Draw(L)
    # olhos sem vida e boca reta
    for c in (EYE_L, EYE_R):
        line(d, [(c[0] - 16, c[1] + 2), (c[0] + 16, c[1] + 2)], 9)
    line(d, [(MOUTH[0] - 22, MOUTH[1] + 6), (MOUTH[0] + 22, MOUTH[1] + 6)], 8)
    # teia de aranha no alto da cabeça e no canto
    web = (150, 156, 170, 255)
    hub = (196, 214)
    spokes = [math.radians(a) for a in (180, 205, 230, 255, 280, 305)]
    for r0 in (34, 62, 92):
        pts = [(hub[0] + r0 * math.cos(t), hub[1] + r0 * math.sin(t)) for t in spokes]
        line(d, pts, 3, web)
    for t in spokes:
        line(d, [hub, (hub[0] + 104 * math.cos(t), hub[1] + 104 * math.sin(t))], 3, web)
    # aranhinha pendurada
    line(d, [(560, 40), (560, 150)], 3, web)
    ell(d, (560, 162), 12, 12, fill=INK)
    for sx in (-1, 1):
        for dy in (-6, 2, 10):
            line(d, [(560 + sx * 10, 162 + dy), (560 + sx * 24, 162 + dy - 6)], 3)
    # poeira
    for (x, y, r) in [(250, 560, 5), (440, 575, 4), (500, 520, 3), (130, 470, 4), (580, 380, 3), (90, 420, 3)]:
        ell(d, (x, y), r, r, fill=(150, 156, 170, 200))
    fig.alpha_composite(L.resize((N, N), Image.LANCZOS))
    return fig


DRAW = {'manha': manha, 'feito': feito, 'urgente': urgente, 'pijama': pijama, 'quebrada': quebrada, 'abandonado': abandonado}


def main():
    base = base_figure()
    out_web = os.path.join(ROOT, 'icons/lidinho/humor')
    out_and = os.path.join(ROOT, 'android/app/src/main/res/drawable-nodpi')
    os.makedirs(out_web, exist_ok=True)
    os.makedirs(out_and, exist_ok=True)
    plasma = [os.path.join(ROOT, f'desktop/plasmoids/{w}/contents/images') for w in ('org.lida.ofensiva',)]
    for p in plasma:
        os.makedirs(p, exist_ok=True)
    for name in MOODS:
        fig = DRAW[name](base.copy())
        small = fig.resize((320, 320), Image.LANCZOS)
        small.save(os.path.join(out_web, f'{name}.webp'), 'WEBP', quality=90, method=6)
        fig.resize((256, 256), Image.LANCZOS).save(os.path.join(out_and, f'lidinho_{name}.webp'), 'WEBP', quality=88, method=6)
        for p in plasma:
            fig.resize((200, 200), Image.LANCZOS).quantize(256, method=Image.FASTOCTREE).save(os.path.join(p, f'{name}.png'), optimize=True)
    print('ok', len(MOODS))


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--blank':
        base_figure().save(sys.argv[2])
    elif len(sys.argv) > 1 and sys.argv[1] == '--preview':
        base = base_figure()
        sheet = Image.new('RGBA', (3 * 330, 2 * 330), (236, 238, 244, 255))
        for i, name in enumerate(MOODS):
            fig = DRAW[name](base.copy()).resize((320, 320), Image.LANCZOS)
            sheet.alpha_composite(fig, ((i % 3) * 330 + 5, (i // 3) * 330 + 5))
        sheet.save(sys.argv[2])
    else:
        main()
