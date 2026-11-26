import numpy as np
from PIL import Image
def register(src, ref, region, f=4, scales=np.arange(0.92,1.10,0.01), r=16):
    """find s,ox,oy so that resize(src, s)[y+oy, x+ox] ~ ref[y, x]; region=(x0,y0,x1,y1) in ref px"""
    W,H=ref.size; R=np.asarray(ref.convert('L')).astype(float)[::f,::f]
    x0,y0,x1,y1=[v//f for v in region]; best=None
    for s in scales:
        b=np.asarray(src.convert('L').resize((round(src.size[0]*s/f),round(src.size[1]*s/f)))).astype(float)
        for ox in range(-r,r+1):
            for oy in range(-r,r+1):
                bb=b[y0+oy:y1+oy,x0+ox:x1+ox]
                if bb.shape!=(y1-y0,x1-x0): continue
                d=np.abs(R[y0:y1,x0:x1]-bb).mean()
                if best is None or d<best[0]: best=(d,s,ox*f,oy*f)
    return best
def apply(src, W, H, s, ox, oy):
    return src.resize((round(src.size[0]*s),round(src.size[1]*s)),Image.LANCZOS).crop((ox,oy,ox+W,oy+H))
