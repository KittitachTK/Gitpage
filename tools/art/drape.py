"""Paint a 'braghettone' over Adam (as Daniele da Volterra did in the Sistine Chapel, 1564):
a loincloth cut from God's own robe, wrapped at the waist and hanging over the groin.

Coordinates are in the full-resolution Wikimedia file (3524 × 1599); `drape(bgr)` returns a
new BGR image. Every derived Creation asset (2D hero layers and the 3D relief) starts from
the draped painting, so the covering can never be lost by regenerating the art."""
import numpy as np, cv2
from scipy.interpolate import griddata, CubicSpline

# Top edge (rolled waistband below the navel, wrapping round the left flank and tucked
# under the raised thigh) and bottom hem (falling across the lap onto the lower thigh).
TOP = np.array([(316, 1222), (360, 1204), (420, 1180), (490, 1152), (560, 1128), (632, 1150), (690, 1198), (714, 1250)], float)
HEM = np.array([(318, 1236), (362, 1240), (430, 1252), (510, 1272), (590, 1290), (655, 1286), (700, 1272), (716, 1257)], float)
# Inner contour of Adam's raised thigh, which passes in front of the cloth.
THIGH = np.array([(585, 1080), (605, 1105), (640, 1148), (675, 1193), (705, 1234), (735, 1272), (760, 1300)], float)
# Source: pale rose folds of God's robe.
SRC = (2300, 700, 2680, 845)

def drape(img, src=SRC):
    im = img.astype(np.float32)
    t = np.linspace(0, 1, len(TOP))
    tx, ty, hx, hy = (CubicSpline(t, c) for c in (TOP[:, 0], TOP[:, 1], HEM[:, 0], HEM[:, 1]))
    U, V = np.meshgrid(np.linspace(0, 1, 500), np.linspace(0, 1, 200))
    # Uneven hem; folds sag in the middle as the cloth lies across the lap.
    wave = 1 + (0.05 * np.sin(29 * U + 0.8) + 0.03 * np.sin(67 * U + 2.1)) * V
    X = tx(U) + (hx(U) - tx(U)) * V
    Y = ty(U) + (hy(U) - ty(U)) * V * wave + 10 * np.sin(np.pi * U) * np.sin(np.pi * V) ** 2
    sx0, sy0, sx1, sy1 = src
    srcx = sx0 + U * (sx1 - sx0)
    srcy = sy0 + V * (sy1 - sy0)
    pad = 24
    bx0, by0 = int(X.min()) - pad, int(Y.min()) - pad
    bx1, by1 = int(X.max()) + pad, int(Y.max()) + pad
    gx, gy = np.meshgrid(np.arange(bx0, bx1), np.arange(by0, by1))
    P = np.c_[X.ravel(), Y.ravel()]
    mapx = griddata(P, srcx.ravel(), (gx, gy), method='linear')
    mapy = griddata(P, srcy.ravel(), (gx, gy), method='linear')
    vmap = griddata(P, V.ravel(), (gx, gy), method='linear')
    inside = ~np.isnan(mapx)
    mapx, mapy, vmap = (np.where(inside, a, 0).astype(np.float32) for a in (mapx, mapy, vmap))
    cloth = cv2.remap(im, mapx, mapy, cv2.INTER_CUBIC)
    # Light from the upper left: a bright rolled waistband with a shadow under it, darker towards the hem.
    band = np.exp(-((vmap - 0.06) / 0.05) ** 2)
    under = np.exp(-((vmap - 0.15) / 0.045) ** 2)
    umap = np.clip((gx - TOP[0, 0]) / (TOP[-1, 0] - TOP[0, 0]), 0, 1)
    # Darker where it tucks under the raised thigh (right) and towards the hem.
    shade = (0.98 + 0.1 * band - 0.14 * under - 0.14 * vmap ** 2) * (1 - 0.28 * np.clip((umap - 0.7) / 0.3, 0, 1) ** 1.5)
    cloth *= shade[..., None]

    # The raised thigh overlaps the cloth: clip along its contour.
    thigh = np.zeros(gx.shape, np.uint8)
    poly = np.vstack([THIGH, [(THIGH[-1, 0] + 400, THIGH[-1, 1]), (THIGH[0, 0] + 400, THIGH[0, 1] - 200)]]) - (bx0, by0)
    cv2.fillPoly(thigh, [poly.astype(np.int32)], 1)
    covered = inside & (thigh == 0)
    alpha = cv2.GaussianBlur(cv2.erode(covered.astype(np.float32), np.ones((3, 3), np.uint8)), (0, 0), 1.1)
    # The cloth darkens as it goes into the shadow under the thigh.
    near = cv2.GaussianBlur(thigh.astype(np.float32), (0, 0), 14)
    cloth *= (1 - 0.45 * near)[..., None]
    region0 = im[by0:by1, bx0:bx1].copy()
    # Michelangelo's dark contour along the edges.
    core = cv2.GaussianBlur(cv2.erode(alpha, np.ones((7, 7), np.uint8)), (0, 0), 1.6)
    cloth *= (1 - 0.4 * np.clip(alpha - core, 0, 1))[..., None]
    # The plaster's own cracks run on across the cloth.
    gray = region0.mean(axis=2)
    cloth += 1.1 * np.minimum(0, gray - cv2.GaussianBlur(gray, (0, 0), 2.5))[..., None]
    # Soft shadow the cloth casts on the skin below and to the right.
    M = np.float32([[1, 0, 5], [0, 1, 8]])
    shadow = cv2.GaussianBlur(cv2.warpAffine(alpha, M, alpha.shape[::-1]), (0, 0), 6)
    region = region0 * (1 - 0.3 * shadow * (1 - alpha))[..., None]
    region = region * (1 - alpha[..., None]) + cloth * alpha[..., None]
    im[by0:by1, bx0:bx1] = region
    return np.clip(im, 0, 255).astype(np.uint8)
