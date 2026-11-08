# Gera o som das notificações: um "trim-trim" de campainha de bicicleta, sintetizado do zero
# (sem gravação de terceiros). Uso: python3 scripts/make-bell.py
# Saída: android/app/src/main/res/raw/sino_bicicleta.wav (44,1 kHz, mono, 16 bits)
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 44100
DUR = 1.35
t = np.arange(int(SR * DUR)) / SR

def strike(t0, amp=1.0):
    tt = t - t0
    on = tt >= 0
    tt = np.where(on, tt, 0)
    # Parciais inarmônicas de uma campânula de metal; pares próximos criam o "batimento" típico.
    partials = [
        (2280, 1.00, 2.6), (2296, 0.55, 2.4),
        (3610, 0.42, 3.4), (5140, 0.30, 4.8),
        (5163, 0.18, 4.6), (7230, 0.12, 6.5),
    ]
    sig = np.zeros_like(t)
    for f, a, d in partials:
        sig += a * np.sin(2 * np.pi * f * tt + np.random.rand() * 6.28) * np.exp(-d * tt)
    # Ataque do martelinho: ruído curto, filtrado nos agudos.
    b, a_ = butter(2, [3000 / (SR / 2), 9000 / (SR / 2)], btype='band')
    click = lfilter(b, a_, np.random.randn(len(t))) * np.exp(-tt * 90) * 0.35
    env = np.minimum(1, tt / 0.002)
    return np.where(on, (sig + click) * env * amp, 0)

np.random.seed(7)
y = strike(0.0, 1.0) + strike(0.17, 0.85)
fade = np.ones_like(t)
n = int(SR * 0.25)
fade[-n:] = np.linspace(1, 0, n) ** 2
y *= fade
y = y / np.max(np.abs(y)) * 10 ** (-3 / 20)
wavfile.write('android/app/src/main/res/raw/sino_bicicleta.wav', SR, (y * 32767).astype(np.int16))
print('ok', len(y) / SR, 's')
