import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import uniform_filter

def vseam(A, B, start=None, end=None):
    """mask (1 = take B) splitting A|B left-to-right along the best-matching top-to-bottom path.
    start/end: column index the path must pass through at the first/last row ('L','R' or int)."""
    cost = uniform_filter(np.abs(A - B).sum(-1), 7)
    h, w = cost.shape
    pick = lambda v: 0 if v == 'L' else (w-1 if v == 'R' else v)
    if start is not None:
        c = pick(start); cost[0, :] = 1e12; cost[0, c] = 0
    acc = cost.copy(); back = np.zeros((h, w), int)
    for y in range(1, h):
        p = acc[y-1]; l = np.r_[np.inf, p[:-1]]; r = np.r_[p[1:], np.inf]
        st = np.vstack([l, p, r]); acc[y] += st.min(0); back[y] = np.arange(w) + st.argmin(0) - 1
    s = np.zeros(h, int)
    s[-1] = pick(end) if end is not None else acc[-1].argmin()
    for y in range(h-1, 0, -1): s[y-1] = back[y, s[y]]
    return (np.arange(w)[None, :] >= s[:, None]).astype(float)

def hseam(A, B, start=None, end=None):
    """mask (1 = take B) splitting A over B; path runs left-to-right, start/end = row at first/last column ('T','B' or int)"""
    conv = {'T': 'L', 'B': 'R'}
    return vseam(A.transpose(1, 0, 2), B.transpose(1, 0, 2), conv.get(start, start), conv.get(end, end)).T

def soften(m, r=4):
    return np.asarray(Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.GaussianBlur(r))).astype(float)/255
