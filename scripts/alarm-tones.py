# Gera os toques de alarme (sons/alarms/*.ogg e a cópia em android/.../res/raw/alarm_*.ogg).
# Sintetizados aqui (sem amostras de terceiros), em laço: o alarme repete até a pessoa responder.
# Uso: python3 scripts/alarm-tones.py
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'sounds', 'alarms')
RAW = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'raw')


def t(sec):
    return np.arange(int(SR * sec)) / SR


def env(n, a=0.005, r=0.08):
    e = np.ones(n)
    na, nr = int(SR * a), int(SR * r)
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] = np.linspace(1, 0, nr)
    return e


def tone(f, sec, harm=((1, 1.0),), a=0.005, r=0.08, decay=0.0):
    x = t(sec)
    y = sum(g * np.sin(2 * np.pi * f * h * x) for h, g in harm)
    if decay:
        y *= np.exp(-decay * x)
    return y * env(len(x), a, r)


def silence(sec):
    return np.zeros(int(SR * sec))


def bell(f, sec=2.4):
    # sino/marimba: parciais inarmônicas com decaimento
    return tone(f, sec, ((1, 1.0), (2.76, 0.35), (5.4, 0.12), (8.93, 0.05)), a=0.002, r=0.3, decay=2.2)


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[: len(p)] += p
    return out


def place(track, sound, at):
    i = int(at * SR)
    end = min(len(track), i + len(sound))
    track[i:end] += sound[: end - i]


def classico():
    # despertador clássico: bip-bip-bip-bip, pausa (quadrada suavizada)
    beep = tone(2100, 0.09, ((1, 1.0), (3, 0.3), (5, 0.12)), a=0.002, r=0.01)
    unit = np.concatenate([beep, silence(0.06)] * 4 + [silence(0.5)])
    return np.tile(unit, 9) * 0.55


def digital():
    # relógio digital: bipes curtos e rápidos que sobem
    track = []
    for k in range(6):
        for f in (1800, 1800, 2400):
            track += [tone(f, 0.07, ((1, 1.0), (2, 0.2)), a=0.002, r=0.01), silence(0.05)]
        track.append(silence(0.35))
    return np.concatenate(track) * 0.5 * np.tile([1], 1)


def sinos():
    # sinos calmos, em escala pentatônica
    notes = [523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33]
    track = np.zeros(int(SR * 16))
    for i, f in enumerate(notes * 2):
        place(track, bell(f) * 0.5, i * 1.0)
    return track


def marimba():
    seq = [392.0, 523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 698.46, 880.0, 698.46, 587.33, 493.88]
    track = np.zeros(int(SR * 14))
    for i, f in enumerate(seq * 2):
        place(track, tone(f, 0.8, ((1, 1.0), (4, 0.25), (10, 0.05)), a=0.002, r=0.2, decay=5) * 0.6, i * 0.55)
    return track


def amanhecer():
    # acordes suaves que crescem devagar
    x = t(18)
    chords = [(261.63, 329.63, 392.0), (293.66, 369.99, 440.0), (246.94, 329.63, 392.0), (261.63, 349.23, 440.0)]
    track = np.zeros(len(x))
    for i, ch in enumerate(chords * 1):
        seg = t(4.5)
        pad = sum(np.sin(2 * np.pi * f * seg) + 0.3 * np.sin(2 * np.pi * 2 * f * seg) for f in ch) / 4
        pad *= env(len(seg), 1.2, 1.2)
        place(track, pad, i * 4.5)
    grow = np.linspace(0.25, 1, len(track))
    return track * grow * 0.7


def passaros():
    # passarinhos sintéticos: piados com glissando
    track = np.zeros(int(SR * 14))
    rng = np.random.default_rng(7)
    at = 0.2
    while at < 13:
        n = rng.integers(2, 5)
        for _ in range(n):
            d = rng.uniform(0.06, 0.12)
            x = t(d)
            f0, f1 = rng.uniform(2600, 3400), rng.uniform(3600, 4800)
            f = np.linspace(f0, f1, len(x)) if rng.random() < 0.6 else np.linspace(f1, f0, len(x))
            chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.005, 0.03) * 0.35
            place(track, chirp, at)
            at += d + rng.uniform(0.03, 0.08)
        at += rng.uniform(0.6, 1.4)
    return track


TONES = {'classico': classico, 'digital': digital, 'sinos': sinos, 'marimba': marimba, 'amanhecer': amanhecer, 'passaros': passaros}

os.makedirs(OUT, exist_ok=True)
os.makedirs(RAW, exist_ok=True)
for name, fn in TONES.items():
    y = fn()
    y = y / (np.abs(y).max() + 1e-9) * 0.85
    pcm = (y * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        path = f.name
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    ogg = os.path.join(OUT, f'{name}.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-c:a', 'libvorbis', '-q:a', '3', ogg], check=True)
    subprocess.run(['cp', ogg, os.path.join(RAW, f'alarm_{name}.ogg')], check=True)
    os.unlink(path)
    print(name, os.path.getsize(ogg))
