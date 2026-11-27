# Hand path fixes painted onto the finished island map with real road texture (free).
# usage: python3 patch_paths.py MAP_IN MAP_OUT
import sys, numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1:3]
im = Image.open(src).convert("RGB"); a = np.asarray(im).astype(float)
def gravel(x0, y0, x1, y1, tex_box, feather=6):
    tx0, ty0, tx1, ty1 = tex_box
    tex = a[ty0:ty1, tx0:tx1]
    th, tw = tex.shape[:2]
    tile = np.tile(tex, ((y1 - y0) // th + 1, (x1 - x0) // tw + 1, 1))[:y1 - y0, :x1 - x0]
    m = np.zeros((y1 - y0, x1 - x0)); m[feather:-feather, feather:-feather] = 1
    m = np.asarray(Image.fromarray((m * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(feather / 2))) / 255.0
    a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - m[..., None]) + tile * m[..., None]
CITY_ROAD = (4140, 3606, 4300, 3642)     # a clean stretch of city gravel road
TEMPLE_ROAD = (1420, 5126, 1600, 5172)   # the hamlet road just east of the temple
# 1) city: lanes inside the palace wall, from the gate building to each side house's front path
# (removed: inner lanes; replaced by two side gates in the wall, pasted from the city gates edit below)
# 2) temple: a forecourt joining the hamlet road to the side gate's opening
# (temple forecourt patch replaced by the temple road edit below)
# 3) palace wall side gates: paste the two gate areas from the city gates edit (aligned to the city piece at 3652,2744)
import os
GE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../assets/new-world/pieces2/capital-07-gates-edit.webp")
g = np.asarray(Image.open(GE).convert("RGB")).astype(float)
def paste(x0, y0, x1, y1, feather=24):
    m = np.zeros((y1 - y0, x1 - x0)); m[feather:-feather, feather:-feather] = 1
    m = np.asarray(Image.fromarray((m * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(feather / 2))) / 255.0
    a[2744 + y0:2744 + y1, 3652 + x0:3652 + x1] = a[2744 + y0:2744 + y1, 3652 + x0:3652 + x1] * (1 - m[..., None]) + g[y0:y1, x0:x1] * m[..., None]
paste(480, 270, 760, 640)      # west gate + path (local city coordinates)
paste(1560, 270, 1840, 640)    # east gate + path
def paste_from(path, ox, oy, x0, y0, x1, y1, feather=24):
    e = np.asarray(Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), path)).convert("RGB")).astype(float)
    m = np.zeros((y1 - y0, x1 - x0)); m[feather:-feather, feather:-feather] = 1
    m = np.asarray(Image.fromarray((m * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(feather / 2))) / 255.0
    a[oy + y0:oy + y1, ox + x0:ox + x1] = a[oy + y0:oy + y1, ox + x0:ox + x1] * (1 - m[..., None]) + e[y0:y1, x0:x1] * m[..., None]
# 4) bottom-right big city house: fence fixed (city piece at 3652,2744)
paste_from("../../assets/new-world/pieces2/capital-07-fence-edit.webp", 3652, 2744, 1430, 1130, 2085, 1505, feather=16)  # whole yard + road ring, so no green seam
# 5) temple road straight into the side gate (temple piece at 0,4108)
paste_from("../../assets/new-world/pieces2/capital-09-road-edit.webp", 0, 4108, 1200, 940, 2200, 1280, feather=40)
# join the new temple road to the hamlet's road between the two house rows
NEW_ROAD = (1450, 5212, 1600, 5248)
GRASS = (1500, 5135, 1700, 5195)                  # plain grass with small flowers, west of the hamlet
gravel(1640, 5096, 1950, 5266, GRASS, feather=4)   # clear the old blob and the stub behind the house
gravel(1600, 5205, 1760, 5255, NEW_ROAD, feather=3)  # temple road, east end
gravel(1708, 5110, 1760, 5255, NEW_ROAD, feather=3)  # neat turn north
gravel(1708, 5110, 2250, 5176, NEW_ROAD, feather=3)  # east along the corridor to the hamlet road
Image.fromarray(a.clip(0, 255).astype("uint8")).save(dst, quality=86, method=6) if dst.endswith(".webp") else Image.fromarray(a.clip(0, 255).astype("uint8")).save(dst)
print("patched", dst)
