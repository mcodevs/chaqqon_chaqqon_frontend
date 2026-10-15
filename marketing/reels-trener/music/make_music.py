"""Background bed for the Reels, synthesised from scratch so no platform can claim it.

    ~/.venvs/mlx-whisper/bin/python music/make_music.py

Writes public/music.wav: 100 BPM, C–G–Am–F, a soft pad + bass + pluck arpeggio + light drums.
It sits under the voice, so it stays out of the speech band's way: no lead melody, mellow tones.
"""

from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
LENGTH = 85.0  # seconds; the voice is 82 s
N = int(LENGTH * SR)
rng = np.random.default_rng(7)

OUT = Path(__file__).resolve().parent.parent / "public" / "music.wav"


def hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


# C, G, Am, F — root midi notes and triads (pad voicing around middle C).
CHORDS = [
    (48, [60, 64, 67, 72]),
    (43, [59, 62, 67, 71]),
    (45, [60, 64, 69, 72]),
    (41, [60, 65, 69, 72]),
]

left = np.zeros(N)
right = np.zeros(N)


def add(sig: np.ndarray, start: float, pan: float = 0.0, gain: float = 1.0) -> None:
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    left[i : i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    right[i : i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))


def lowpass(sig: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, cutoff, "low", fs=SR, output="sos"), sig)


def highpass(sig: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, cutoff, "high", fs=SR, output="sos"), sig)


def bandpass(sig: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), sig)


def pad_note(midi: int, dur: float) -> np.ndarray:
    t = np.arange(int((dur + 0.8) * SR)) / SR
    f = hz(midi)
    s = np.zeros_like(t)
    for detune in (-0.12, 0.0, 0.12):  # cents-ish chorus
        ff = f * 2 ** (detune / 12)
        for h in range(1, 7):
            s += np.sin(2 * np.pi * ff * h * t + rng.uniform(0, 6.28)) / h
    env = np.minimum(t / 0.45, 1.0) * np.where(t > dur, np.exp(-(t - dur) / 0.35), 1.0)
    return lowpass(s * env, 1400) / 9


def pluck(midi: int) -> np.ndarray:
    t = np.arange(int(0.9 * SR)) / SR
    f = hz(midi)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    env = np.exp(-t / 0.22) * np.minimum(t / 0.004, 1.0)
    return s * env


def bass(midi: int, dur: float) -> np.ndarray:
    t = np.arange(int(dur * SR)) / SR
    f = hz(midi)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(t / 0.01, 1.0) * np.exp(-t / 0.5)
    return lowpass(s * env, 500)


def kick() -> np.ndarray:
    t = np.arange(int(0.35 * SR)) / SR
    f = 48 + 90 * np.exp(-t / 0.03)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t / 0.12)


def clap() -> np.ndarray:
    t = np.arange(int(0.25 * SR)) / SR
    return bandpass(rng.standard_normal(len(t)), 900, 3500) * np.exp(-t / 0.06)


def hat() -> np.ndarray:
    t = np.arange(int(0.06 * SR)) / SR
    return highpass(rng.standard_normal(len(t)), 7000) * np.exp(-t / 0.015)


bars = int(np.ceil(LENGTH / BAR))
FULL_FROM = 4  # bars of pad + arp only, under the opening hook
OUTRO_BAR = int(79.0 // BAR)  # the end card: drums drop, last chord rings

for b in range(bars):
    t0 = b * BAR
    root, notes = CHORDS[b % 4]
    last = b >= OUTRO_BAR
    dur = BAR * (2 if last and b == OUTRO_BAR else 1)
    if b > OUTRO_BAR:
        break
    for k, m in enumerate(notes):
        add(pad_note(m, dur), t0, pan=(-0.4 + 0.27 * k), gain=0.55)

    # Arpeggio in eighths, an octave above the pad.
    arp = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 12, notes[3] + 12, notes[2] + 12, notes[1] + 12, notes[2] + 12]
    for e, m in enumerate(arp):
        if last and e > 0:
            break
        add(pluck(m), t0 + e * BEAT / 2, pan=0.35 if e % 2 else -0.35, gain=0.16 if b >= 1 else 0.1)

    if b >= FULL_FROM and not last:
        for beat in range(4):
            bt = t0 + beat * BEAT
            if beat in (0, 2):
                add(kick(), bt, gain=0.55)
            if beat in (1, 3):
                add(clap(), bt, gain=0.12)
            add(hat(), bt + BEAT / 2, pan=0.2, gain=0.07)
        add(bass(root, BEAT * 1.4), t0, gain=0.42)
        add(bass(root, BEAT * 0.9), t0 + 2 * BEAT, gain=0.36)
        add(bass(root + 12 if b % 2 else root, BEAT * 0.5), t0 + 3.5 * BEAT, gain=0.28)
    elif last:
        add(bass(root, BAR * 2), t0, gain=0.4)

# Fade in a touch, fade out at the very end.
env = np.ones(N)
fi = int(0.3 * SR)
env[:fi] = np.linspace(0, 1, fi)
fo_start = int((LENGTH - 2.5) * SR)
env[fo_start:] = np.linspace(1, 0, N - fo_start)
stereo = np.stack([left * env, right * env], axis=1)

# Gentle glue: soft clip, then normalise to -1 dBFS peak.
stereo = np.tanh(stereo * 1.2)
stereo /= np.max(np.abs(stereo)) / 0.89
wavfile.write(OUT, SR, (stereo * 32767).astype(np.int16))
print("wrote", OUT, f"{LENGTH:.1f}s")
