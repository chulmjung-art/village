import sys; sys.path.insert(0, 'tools')
import numpy as np
from PIL import Image
from seam import vseam, hseam, soften
W, H = 2336, 1744
CW, CH = 5988, 4486
L = lambda f: np.asarray(Image.open(f).convert('RGB')).astype(float)
city = L('capital_piece_2k.png'); p4 = L('piece4_2k_aligned.png'); p6 = L('piece6_2k_aligned.png')
p3 = L('piece3_2k_aligned.png'); p8 = L('piece8_2k_aligned.png'); p5 = L('piece5_2k_aligned.png')
import os
p12 = L('piece12_2k_aligned.png') if os.path.exists('piece12_2k_aligned.png') else None
def fill_black_edges(p):
    # the 2K came back a little small/shifted; mirror real pixels into black margins on each side
    dark = p.sum(-1) < 30
    cols = dark.mean(0) > 0.9; rows = dark.mean(1) > 0.9
    h, w = cols.size and p.shape[:2]
    l = 0
    while l < w//4 and cols[l]: l += 1
    r = w
    while r > 3*w//4 and cols[r-1]: r -= 1
    t = 0
    while t < h//4 and rows[t]: t += 1
    b = h
    while b > 3*h//4 and rows[b-1]: b -= 1
    if l: p[:, :l] = p[:, 2*l:l:-1][:, :l]
    if r < w: p[:, r:] = p[:, r-1:2*r-w-1:-1]
    if t: p[:t] = p[2*t:t:-1][:t]
    if b < h: p[b:] = p[b-1:2*b-h-1:-1]
    return p
if p12 is not None: p12 = fill_black_edges(p12)
p10 = L('piece10_2k_aligned.png') if os.path.exists('piece10_2k_aligned.png') else None
p11 = L('piece11_2k_aligned.png') if os.path.exists('piece11_2k_aligned.png') else None
if p11 is not None: p11 = fill_black_edges(p11)
if p10 is not None:
    p10 = fill_black_edges(p10)
    # the 2K moved the bridge 190px west of the hamlet's road: slide the south land (below the strait) left to line them up
    SPLIT, D = 700, 190
    south = p10[SPLIT:].copy()
    p10[SPLIT:, :W-D] = south[:, D:]
    p10[SPLIT:, W-D:] = p10[SPLIT:, W-2*D:W-D]          # fill the right gap with the trees just left of it
    p10[696:772, 620:760] = p10[696:772, 480:620]        # paint out the old bridge foot/road stub by the shore
# piece 3: rows the model's 2K didn't cover (shifted up 32px) -> mirror real rows
dark = np.where(p3[:80].sum(-1).mean(1) < 30)[0]
if len(dark): k = dark.max()+1; p3[:k] = p3[2*k:k:-1][:k]
# piece 3 sat 14px low against piece 4 (west-east road step): shift it up, mirror the freed bottom rows
SH3 = 14; p3[:-SH3] = p3[SH3:].copy(); p3[-SH3:] = p3[-SH3-1:-2*SH3-1:-1]
SEA_TARGET = np.array([43., 127., 187.])   # the city's sea = palette #297CB8
def fix_sea(p):
    """shift water pixels so their median matches the city's sea"""
    R, G, B = p[..., 0], p[..., 1], p[..., 2]
    w = np.clip((B - R - 60) / 40, 0, 1) * np.clip((B - 140) / 30, 0, 1) * np.clip((B - G - 30) / 30, 0, 1)
    sel = w > 0.9
    if sel.sum() < 1000: return p
    p += w[..., None] * (SEA_TARGET - np.median(p[sel], 0))
    np.clip(p, 0, 255, out=p)
    return p
for _p in (p3, p4, p5, p6, p8): fix_sea(_p)
if p12 is not None: fix_sea(p12)
if p10 is not None: fix_sea(p10)
if p11 is not None: fix_sea(p11)
# piece 4: 2K on top, the original (which matches the city strip) near the city; cut where they agree
p4old = fix_sea(L('piece4_v2_full.png'))
r0, r1 = 600, 1384
m = soften(hseam(p4[r0:r1], p4old[r0:r1]))[..., None]
p4[r0:r1] = p4[r0:r1]*(1-m) + p4old[r0:r1]*m
p4[r1:] = p4old[r1:]
# background: tiled real sea (from piece 3's open water), not a flat colour
tile = p3[120:520, 60:460].copy()
cv = np.tile(tile, (CH // 400 + 1, CW // 400 + 1, 1))[:CH, :CW].copy()
def put(img, x, y, x0=0, y0=0, x1=W, y1=H):
    """paste img[y0:y1, x0:x1] at canvas (x+x0, y+y0), clipped to canvas"""
    y1c = min(y1, CH-y); x1c = min(x1, CW-x)
    cv[y+y0:y+y1c, x+x0:x+x1c] = img[y0:y1c, x0:x1c]
def blend(region, img, x, y, mask):
    (ya, yb, xa, xb) = region
    A = cv[ya:yb, xa:xb]; B = img[ya-y:yb-y, xa-x:xb-x]; m = soften(mask(A, B))[..., None]
    cv[ya:yb, xa:xb] = A*(1-m) + B*m
# city (7) is the anchor
XC, YC = 1828, 1384
put(city, XC, YC)
# piece 4 above the city: interior, then horizontal seam (4 over city) in overlap rows
X4, Y4 = 1828, 0
put(p4, X4, Y4, y1=YC-Y4)
blend((YC, Y4+H, X4, X4+W), p4, X4, Y4, lambda A, B: 1-hseam(B, A, 'T', 'T'))   # p4 above; both ends pinned to the top row
# piece 6 left of the city
X6, Y6 = 0, 1388
put(p6, X6, Y6, x1=XC-X6)
blend((Y6, min(Y6+H, YC+H), XC, X6+W), p6, X6, Y6, lambda A, B: 1-vseam(B, A, 'L', None))
# piece 3 top-left: interior, seam against piece 4 (vertical) and piece 6 (horizontal)
X3, Y3 = 0, 28
put(p3, X3, Y3, x1=XC, y1=Y6-Y3)
blend((Y3, Y6, XC, X3+W), p3, X3, Y3, lambda A, B: 1-vseam(B, A, None, 'L'))
blend((Y6, Y3+H, X3, XC), p3, X3, Y3, lambda A, B: 1-hseam(B, A, None, 'T'))
cv[0:Y3, 0:XC] = cv[2*Y3:Y3:-1, 0:XC][:Y3]
# piece 8 right of the city
X8, Y8 = 3652, 1382
put(p8, X8, Y8, x0=XC+W-X8)
blend((Y8, min(CH, Y8+H), X8, XC+W), p8, X8, Y8, lambda A, B: vseam(A, B, 'R', None))
# piece 5 above piece 8, right of piece 4
X5, Y5 = 3652, 22
put(p5, X5, Y5, x0=X4+W-X5, y1=Y8-Y5)
blend((Y8, Y5+H, X4+W, CW), p5, X5, Y5, lambda A, B: 1-hseam(B, A, 'T', None))
blend((Y5, Y8, X5, X4+W), p5, X5, Y5, lambda A, B: vseam(A, B, None, 'R'))
cv[0:Y5, X4+W:] = cv[2*Y5:Y5:-1, X4+W:][:Y5]
# piece 12 below piece 8 (lighthouse cove)
if p12 is not None:
    X12, Y12 = 3652, 1382+H-384
    put(p12, X12, Y12, y0=Y8+H-Y12)
    blend((Y12, Y8+H, X12, CW), p12, X12, Y12, lambda A, B: hseam(A, B, 'B', None))
# piece 10 below piece 6 (strait bridge + fishing hamlet)
if p10 is not None:
    X10, Y10 = 0, Y6+H-384
    put(p10, X10, Y10, y0=YC+H-Y10)
    blend((Y10, YC+H, X10, X10+W), p10, X10, Y10, lambda A, B: hseam(A, B, None, 'B'))
# piece 11 below the city, between piece 10 and piece 12 (harbour bay + headland)
if p11 is not None:
    X11, Y11 = XC, YC+H-384
    put(p11, X11, Y11, x0=330, y0=YC+H-Y11, x1=X8-X11)
    blend((Y11, YC+H, X11+330, X8), p11, X11, Y11, lambda A, B: hseam(A, B))
    blend((YC+H, CH, X11+40, X11+330), p11, X11, Y11, lambda A, B: vseam(A, B, None, None))
    blend((Y11, CH, X8, X11+W), p11, X11, Y11, lambda A, B: 1-vseam(B, A))
# piece 11: north-facing coasts get piece 10's low shore edge (foam + sandy bumps), not a cliff wall
if p11 is not None:
    T = cv[3428:3472, 1700:1737].copy()          # one clean period of piece 10's edge (foam, bumps, grass)
    def shore(x0, x1, ybot):
        y0 = ybot - (3456 - 3428)                 # line the bump bottoms up
        n = x1 - x0; tile = np.tile(T, (1, n // T.shape[1] + 1, 1))[:, :n]
        m = np.ones(tile.shape[:2]); m[-6:] = np.linspace(1, 0, 6)[:, None]; m[:8] = np.linspace(0, 1, 8)[:, None]
        cv[y0:y0+T.shape[0], x0:x1] = cv[y0:y0+T.shape[0], x0:x1]*(1-m[..., None]) + tile*m[..., None]
        cv[y0-30:y0+2, x0:x1] = cv[y0-30:y0+2, x0-0:x1]   # (sea above left as is)
    shore(2130, 2712, 3452)
    shore(2712, 2926, 3578)
# hand patches (free): keeper's house path from its gate to the road
def gravel_patch(x0, y0, x1, y1, src_box):
    sx0, sy0, sx1, sy1 = src_box
    tex = cv[sy0:sy1, sx0:sx1].copy()
    if (x1-x0) > (y1-y0): tex = tex.transpose(1, 0, 2)
    th, tw = tex.shape[:2]
    tile = np.tile(tex, ((y1-y0)//th+1, (x1-x0)//tw+1, 1))[:y1-y0, :x1-x0]
    m = np.ones((y1-y0, x1-x0)); m[:3] = m[-3:] = 0.5; m[:, :3] *= 0.7; m[:, -3:] *= 0.7
    cv[y0:y1, x0:x1] = cv[y0:y1, x0:x1]*(1-m[..., None]) + tile*m[..., None]
if p12 is not None:
    road = (5000, 3300, 5065, 3500)            # a clean bit of the main north-south road
    gravel_patch(5232, 3598, 5268, 3614, road)  # through the gate
    gravel_patch(5065, 3612, 5272, 3648, road)  # west along the fence to the road
# piece 9 (temple) west of piece 10: widen the canvas to the left
if os.path.exists('piece9_2k_aligned.png'):
    p9 = fix_sea(fill_black_edges(L('piece9_2k_aligned.png')))
    OX = W - 512
    big = np.tile(tile, (CH // 400 + 1, (CW+OX) // 400 + 1, 1))[:CH, :CW+OX].copy()
    big[:, OX:] = cv
    cv = big; CW = CW + OX
    Y9 = Y10
    y1 = min(H, CH-Y9)
    cv[Y9:Y9+y1, 0:OX] = p9[:y1, :OX]
    A = cv[Y9:Y9+y1, OX:OX+480].copy(); B = p9[:y1, OX:OX+480]
    m = soften(vseam(B, A))[..., None]          # 1 = keep the existing map (right of the seam)
    cv[Y9:Y9+y1, OX:OX+480] = B*(1-m) + A*m
# north coast + scholars' island (piece 1) above pieces 4/5: extend the canvas upward
if os.path.exists('piece1_2k_aligned.png'):
    p1 = L('piece1_2k_aligned.png')
    k = int(np.argmax(p1.sum(-1).mean(1) > 30))          # empty rows the 2K left at the top
    p1 = fix_sea(fill_black_edges(p1))
    if k: p1[:k+8] = np.tile(tile, (1, W // 400 + 1, 1))[:k+8, :W]
    OY = H - 384; X1 = 4026 if os.path.exists('piece9_2k_aligned.png') else 4026 - (W - 512)
    big = np.tile(tile, ((CH+OY) // 400 + 1, CW // 400 + 1, 1))[:CH+OY, :CW].copy()
    big[OY:] = cv
    cv = big; CH = CH + OY
    x1 = min(X1+W, CW)
    cv[0:OY, X1:x1] = p1[:OY, :x1-X1]
    A = cv[OY:OY+384, X1:x1].copy(); B = p1[OY:H, :x1-X1]
    m = soften(hseam(B, A))[..., None]          # 1 = keep the existing map (below the seam)
    cv[OY:OY+384, X1:x1] = B*(1-m) + A*m
# remove any dark frame line the model drew along the very top
a = cv[:60].sum(-1)
rows = [y for y in range(60) if (a[y] < 160).mean() > 0.2]
if rows:
    k = max(rows)+3; cv[:k] = cv[2*k:k:-1][:k]
out = Image.fromarray(cv.clip(0, 255).astype('uint8'))
out.save('capital_3_4_5_6_7_8.png')
out.resize((CW//4, CH//4), Image.LANCZOS).save('capital_3_4_5_6_7_8_small.jpg', quality=88)
print('built', out.size, 'top-line rows', rows)
