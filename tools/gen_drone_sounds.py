"""The drones' loops (public/sounds/vehicles/drone-*.wav), synthesised: no recording needed.
  drone-quad    four rotors a few hertz apart — the beating, sawtooth-rich buzz of a quadcopter
  drone-lancet  one pusher propeller and its electric motor whine, lower and steadier
Every partial a whole number of cycles over the loop, so it repeats without a click.
  py tools/gen_drone_sounds.py"""
import math, wave, array, pathlib, random

RATE = 22050
OUT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'sounds' / 'vehicles'


def write(name, seconds, voices):
    n = RATE * seconds
    buf = [0.0] * n
    for f, amp, partials in voices:
        for k in range(1, partials + 1):
            a = amp / k ** 1.1
            w = 2 * math.pi * f * k / RATE
            ph = random.random() * 6.28
            for i in range(n):
                buf[i] += a * math.sin(w * i + ph)
    peak = max(abs(v) for v in buf) or 1
    pcm = array.array('h', (int(v / peak * 0.8 * 32767) for v in buf))
    with wave.open(str(OUT / name), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes())


random.seed(7)
write('drone-quad.wav', 2, [(196, 1, 7), (203, 0.9, 7), (211, 0.85, 7), (218, 0.8, 7), (6, 0.15, 1)])
write('drone-lancet.wav', 2, [(118, 1, 6), (236, 0.35, 3), (940, 0.12, 2)])
print('written to', OUT)
