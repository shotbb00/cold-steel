"""The Iron Star mark for Cold Steel, built as exact SVG: a riveted steel disc, a faceted star
split NATO blue / Pact red, an M7 bayonet down the split, and a chamfered stencil wordmark drawn
from paths. Writes emblem / wordmark / lockups / icon SVGs into the given folder.

  py tools/gen_logo.py build/logo            the SVGs
  py tools/render_icons.py build/logo public/icons   the app icons from them (needs Playwright + Edge)
public/brand/mark.svg is lockup-stacked.svg without its tagline text; public/brand/emblem.svg is emblem.svg."""
import math, sys, os
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
f = lambda v: f'{v:.2f}'.rstrip('0').rstrip('.')

# ------------------------------------------------------------------ the emblem (240 x 266)
CX, CY = 120, 124
R_RIM, R_FACE = 108, 93
LIGHT = (-0.55, -0.83)  # light from the upper left

def star_facets(cx, cy, R, r):
    tips = [(cx + R * math.cos(math.radians(-90 + 72 * k)), cy + R * math.sin(math.radians(-90 + 72 * k))) for k in range(5)]
    vals = [(cx + r * math.cos(math.radians(-54 + 72 * k)), cy + r * math.sin(math.radians(-54 + 72 * k))) for k in range(5)]
    facets = []
    for k in range(5):
        for a, b in ((vals[k - 1], tips[k]), (tips[k], vals[k])):
            # brightness from the facet's outward normal (its edge away from the centre), against the light
            mx, my = (a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy
            d = math.hypot(mx, my) or 1
            lit = (mx * LIGHT[0] + my * LIGHT[1]) / d
            facets.append(((cx, cy), a, b, lit))
    return facets

def shade(base, lit):
    # base (r, g, b); lit -1..1 → darker..lighter
    k = 1 + lit * 0.42
    return '#' + ''.join(f'{max(0, min(255, int(c * k))):02x}' for c in base)

BLUE = (52, 98, 176)   # NATO enamel
RED = (182, 50, 38)    # Pact enamel

def emblem(uid, detail=True):
    s = []
    s.append(f'''<defs>
  <linearGradient id="{uid}-rim" x1="0.15" y1="0.05" x2="0.85" y2="0.95"><stop offset="0" stop-color="#dfe3e5"/><stop offset="0.45" stop-color="#8d959b"/><stop offset="0.7" stop-color="#5d656b"/><stop offset="1" stop-color="#a9b0b5"/></linearGradient>
  <linearGradient id="{uid}-bevel" x1="0.85" y1="0.95" x2="0.15" y2="0.05"><stop offset="0" stop-color="#e2e6e8"/><stop offset="1" stop-color="#3b4146"/></linearGradient>
  <radialGradient id="{uid}-face" cx="0.38" cy="0.3" r="0.85"><stop offset="0" stop-color="#454b50"/><stop offset="0.6" stop-color="#2a2e32"/><stop offset="1" stop-color="#1b1e21"/></radialGradient>
  <linearGradient id="{uid}-blade" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#e3e6e8"/><stop offset="0.55" stop-color="#b2b8bc"/><stop offset="1" stop-color="#7c8388"/></linearGradient>
  <linearGradient id="{uid}-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa1a6"/><stop offset="0.5" stop-color="#5b6268"/><stop offset="1" stop-color="#3a4045"/></linearGradient>
  <clipPath id="{uid}-l"><rect x="0" y="0" width="{CX}" height="270"/></clipPath>
  <clipPath id="{uid}-r"><rect x="{CX}" y="0" width="{CX}" height="270"/></clipPath>
  <filter id="{uid}-sh" x="-30%" y="-10%" width="160%" height="130%"><feGaussianBlur stdDeviation="2.4"/></filter>
</defs>''')
    # the plate: rim, bevel, face
    s.append(f'<circle cx="{CX}" cy="{CY}" r="{R_RIM}" fill="url(#{uid}-rim)"/>')
    s.append(f'<circle cx="{CX}" cy="{CY}" r="{R_FACE + 3}" fill="url(#{uid}-bevel)"/>')
    s.append(f'<circle cx="{CX}" cy="{CY}" r="{R_FACE}" fill="url(#{uid}-face)"/>')
    if detail:
        # rivets on the rim, lit from the upper left
        for k in range(12):
            a = math.radians(-90 + 30 * k + 15)
            x, y = CX + 100.5 * math.cos(a), CY + 100.5 * math.sin(a)
            s.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="3.6" fill="#6a7277" stroke="#2f3438" stroke-width="1"/><circle cx="{f(x - 1.1)}" cy="{f(y - 1.2)}" r="1.4" fill="#eef1f2" opacity="0.8"/>')
        # a fine machined ring inside the face
        s.append(f'<circle cx="{CX}" cy="{CY}" r="{R_FACE - 7}" fill="none" stroke="#3d4347" stroke-width="1.2"/>')
    # the star, faceted, each half its side's enamel
    facets = star_facets(CX, CY + 2, 76, 30)
    for side, base in (('l', BLUE), ('r', RED)):
        s.append(f'<g clip-path="url(#{uid}-{side})">')
        for (c, a, b, lit) in facets:
            s.append(f'<polygon points="{f(c[0])},{f(c[1])} {f(a[0])},{f(a[1])} {f(b[0])},{f(b[1])}" fill="{shade(base, lit)}"/>')
        s.append('</g>')
    # the bayonet's shadow on the plate, then the bayonet (point up)
    blade = 'M111.5 206 L112.6 46 Q113.6 22 119.4 4 L127.4 36 L128.5 206 Z'
    s.append(f'<path d="{blade}" transform="translate(4 5)" fill="#000" opacity="0.55" filter="url(#{uid}-sh)"/>')
    s.append(f'<path d="{blade}" fill="url(#{uid}-blade)" stroke="#40464b" stroke-width="1.3" stroke-linejoin="round"/>')
    if detail:
        s.append('<path d="M121.6 192 L121.9 60" stroke="#7d8489" stroke-width="2.6" stroke-linecap="round"/>')           # the fuller
        s.append('<path d="M112.9 200 L113.7 48 Q114.5 28 118.6 12" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="0.85"/>')  # the edge catching the light
    # the guard with its muzzle ring, the ribbed grip, the pommel
    s.append(f'<circle cx="89" cy="211" r="9.5" fill="none" stroke="url(#{uid}-brass)" stroke-width="5.5"/>')
    s.append(f'<rect x="96" y="205" width="52" height="12" rx="3" fill="url(#{uid}-brass)" stroke="#2c3135" stroke-width="1.2"/>')
    s.append('<rect x="111" y="217" width="18" height="34" rx="3" fill="#1d1f20" stroke="#0c0d0e" stroke-width="1.2"/>')
    if detail:
        for y in range(221, 249, 4):
            s.append(f'<path d="M113 {y} H127" stroke="#3a3d3f" stroke-width="1.4"/>')
    s.append(f'<rect x="109" y="251" width="22" height="11" rx="3" fill="url(#{uid}-brass)" stroke="#2c3135" stroke-width="1.2"/>')
    if detail:
        s.append('<circle cx="124.5" cy="256.5" r="2.2" fill="#262a2d"/>')
    return '\n'.join(s)

# ------------------------------------------------------------------ the wordmark: chamfered stencil block letters
H, W, T, C, C2 = 110, 60, 20, 15, 6
MID0, MID1 = (H - T) / 2, (H + T) / 2

def poly(pts, dx):
    return 'M' + ' L'.join(f'{f(x + dx)} {f(y)}' for x, y in pts) + ' Z'

def letters():
    o_out = [(C, 0), (W - C, 0), (W, C), (W, H - C), (W - C, H), (C, H), (0, H - C), (0, C)]
    o_in = [(T + C2, T), (W - T - C2, T), (W - T, T + C2), (W - T, H - T - C2), (W - T - C2, H - T), (T + C2, H - T), (T, H - T - C2), (T, T + C2)]
    d_out = [(0, 0), (W - 22, 0), (W, 22), (W, H - 22), (W - 22, H), (0, H)]
    d_in = [(T, T), (W - T - 9, T), (W - T, T + 9), (W - T, H - T - 9), (W - T - 9, H - T), (T, H - T)]
    return {
        'C': [[(C, 0), (W, 0), (W, T), (T + C2, T), (T, T + C2), (T, H - T - C2), (T + C2, H - T), (W, H - T), (W, H), (C, H), (0, H - C), (0, C)]],
        'O': [o_out, o_in],
        'L': [[(0, 0), (T, 0), (T, H - T), (W, H - T), (W, H), (C, H), (0, H - C)]],
        'D': [d_out, d_in],
        'S': [[(C, 0), (W, 0), (W, T), (T, T), (T, MID0), (W - C, MID0), (W, MID0 + C), (W, H - C), (W - C, H), (0, H), (0, H - T), (W - T, H - T), (W - T, MID1), (C, MID1), (0, MID1 - C), (0, C)]],
        'T': [[(0, 0), (W, 0), (W, T), ((W + T) / 2, T), ((W + T) / 2, H), ((W - T) / 2, H), ((W - T) / 2, T), (0, T)]],
        'E': [[(C, 0), (W, 0), (W, T), (T, T), (T, MID0), (W - 9, MID0), (W - 9, MID1), (T, MID1), (T, H - T), (W, H - T), (W, H), (C, H), (0, H - C), (0, C)]],
    }
STENCIL = {'O': [(0, T), (W - T, T)], 'D': [(0, T), (W - T, T)], 'C': [(0, T)]}  # breaks through these stems (x, width)
GAP = 6
ADV = W + 13
SPACE = 30

def word(text, x0, uid):
    paths, cuts, x = [], [], x0
    L = letters()
    for ch in text:
        if ch == ' ':
            x += SPACE
            continue
        for p in L[ch]:
            paths.append(poly(p, x))
        for (sx, sw) in STENCIL.get(ch, []):
            cuts.append(f'<rect x="{f(x + sx - 1)}" y="{f(H / 2 - GAP / 2)}" width="{f(sw + 2)}" height="{GAP}" fill="#000"/>')
        x += ADV
    return ' '.join(paths), cuts, x - 13

def wordmark(uid, text='COLD STEEL', y=0):
    d, cuts, w = word(text, 0, uid)
    return d, cuts, w

def mark(uid, lines, fill_id, ink=False):
    """Letters as one path, the stencil breaks cut out through a mask (works on any ground)."""
    out, masks = [], []
    maxw = 0
    for i, line in enumerate(lines):
        d, cuts, w = word(line, 0, uid)
        maxw = max(maxw, w)
        yo = i * (H + 18)
        masks.append(f'<g transform="translate(0 {yo})">' + ''.join(cuts) + '</g>')
        out.append(f'<path transform="translate(0 {yo})" d="{d}" fill-rule="evenodd"/>')
    hgt = len(lines) * H + (len(lines) - 1) * 18
    m = f'<mask id="{uid}-cut" maskUnits="userSpaceOnUse" x="-4" y="-4" width="{maxw + 8}" height="{hgt + 8}"><rect x="-4" y="-4" width="{maxw + 8}" height="{hgt + 8}" fill="#fff"/>{"".join(masks)}</mask>'
    # brushed steel on dark grounds (a soft fall from the top edge); dark ink on light ones
    stops = (('0', '#2e3236'), ('1', '#1a1d20')) if ink else (('0', '#f3f4f1'), ('0.6', '#d9dcd8'), ('1', '#bcc1be'))
    grad = f'<linearGradient id="{fill_id}" x1="0" y1="0" x2="0" y2="{H}" gradientUnits="userSpaceOnUse" spreadMethod="repeat">' + ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops) + '</linearGradient>'
    body = f'<g mask="url(#{uid}-cut)" fill="url(#{fill_id})">' + ''.join(out) + '</g>'
    return f'<defs>{m}{grad}</defs>{body}', maxw, hgt

def write(name, svg):
    open(os.path.join(OUT, name), 'w', encoding='utf-8').write(svg)

# emblem alone
write('emblem.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 266">{emblem("cs")}</svg>')
# stacked lockup: emblem, then COLD / STEEL beside it, the tagline under
wm, ww, wh = mark('csw', ['COLD', 'STEEL'], 'csw-steel')
scale = 228 / wh
lock_w = 240 + 28 + ww * scale
write('lockup-stacked.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(lock_w)} 300">{emblem("cs")}<g transform="translate(268 14) scale({f(scale)})">{wm}</g><text x="270" y="290" font-family="Barlow Semi Condensed, sans-serif" font-weight="600" font-size="26" fill="#d8b25c">World War III, 1985</text></svg>')
# one-line lockup
wm1, ww1, wh1 = mark('csh', ['COLD STEEL'], 'csh-steel')
s1 = 150 / wh1
write('lockup-line.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(240 + 34 + ww1 * s1)} 266">{emblem("cl")}<g transform="translate(274 34) scale({f(s1)})">{wm1}</g><text x="277" y="226" font-family="Barlow Semi Condensed, sans-serif" font-weight="600" font-size="28" fill="#d8b25c">World War III, 1985</text></svg>')
# app icon: the emblem on a dark square, and a simplified one for tiny sizes
write('icon.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#17191b"/><g transform="translate(256 262) scale(1.62) translate(-120 -134)">{emblem("ci")}</g></svg>')
def small(uid):
    """For 48 px and under: a thick rim, the star filling the plate, a wide blade; no grip, no rivets."""
    st = star_facets(256, 268, 170, 68)
    out = [f'<defs><clipPath id="{uid}-l"><rect x="0" y="0" width="256" height="512"/></clipPath><clipPath id="{uid}-r"><rect x="256" y="0" width="256" height="512"/></clipPath></defs>',
           '<rect width="512" height="512" fill="#17191b"/>',
           '<circle cx="256" cy="262" r="222" fill="#a9b0b5"/><circle cx="256" cy="262" r="184" fill="#24282c"/>']
    for side, base in (('l', BLUE), ('r', RED)):
        out.append(f'<g clip-path="url(#{uid}-{side})">' + ''.join(f'<polygon points="{f(c[0])},{f(c[1])} {f(a[0])},{f(a[1])} {f(b[0])},{f(b[1])}" fill="{shade(base, lit * 0.6)}"/>' for c, a, b, lit in st) + '</g>')
    out.append('<path d="M236 470 L238 92 L256 14 L274 92 L276 470 Z" fill="#eef0f1" stroke="#17191b" stroke-width="8"/>')
    out.append('<rect x="186" y="430" width="140" height="30" rx="8" fill="#8d959b" stroke="#17191b" stroke-width="8"/>')
    return ''.join(out)
write('icon-small.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{small("cm")}</svg>')
# the ink lockup for light grounds
wmi, wwi, whi = mark('csi', ['COLD', 'STEEL'], 'csi-ink', ink=True)
write('lockup-stacked-ink.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(240 + 28 + wwi * (228 / whi))} 300">{emblem("ck")}<g transform="translate(268 14) scale({f(228 / whi)})">{wmi}</g><text x="270" y="290" font-family="Barlow Semi Condensed, sans-serif" font-weight="600" font-size="26" fill="#8a6a20">World War III, 1985</text></svg>')
print('ok', f(lock_w), f(240 + 34 + ww1 * s1))
