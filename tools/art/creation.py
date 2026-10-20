"""Michelangelo, *The Creation of Adam* (c. 1512): the 2D hero layers and the 3D relief.

Everything starts from the draped painting (drape.py). The fresco is split along the gap
between the fingers (CUT) so Adam and God can move apart; the wall behind them is painted
in by LaMa so whatever their motion reveals is plaster, not a ghost of the figures.
"""
import cv2
import numpy as np

from common import PUBLIC_ART, depth, fetch, inpaint, push_pull, write_layer, write_meta
from drape import drape

# Through the gap between the fingers, then down through the plaster between the hill
# and God's mantle (full-resolution coordinates, 3524 × 1599).
CUT = [(1336, 0), (1336, 690), (1338, 745), (1326, 790), (1330, 830), (1400, 900), (1560, 1100), (1750, 1300), (1900, 1450), (2010, 1599)]
GAP = (0.3788, 0.4553)   # the gap between the fingers, as a fraction of the painting
TW = 2400


def masks(w: int, h: int, sx: float) -> tuple[np.ndarray, np.ndarray]:
    """Left (Adam) and right (God) halves of the painting, split along CUT."""
    cut = [(x * sx, y * sx) for x, y in CUT]
    adam = np.zeros((h, w), np.uint8)
    god = np.zeros((h, w), np.uint8)
    cv2.fillPoly(adam, [np.array([(0, 0)] + cut + [(0, h)], np.int32)], 255)
    cv2.fillPoly(god, [np.array([(w, 0)] + cut + [(w, h)], np.int32)], 255)
    return adam, god


def figures(img: np.ndarray, disp: np.ndarray, rise: float = 0.08) -> np.ndarray:
    """Where the figures (and Adam's hill) stand out from the wall.

    The wall is not flat in the depth map (it comes nearer towards the bottom), so fit a
    smooth surface to the plaster alone, picked out by its pale low-saturation colour,
    and keep whatever rises above it.
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    plaster = (hsv[..., 1] < 55) & (hsv[..., 2] > 150) & (disp < 0.45)
    plaster = cv2.erode(plaster.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    H, W = disp.shape
    yy, xx = np.mgrid[0:H, 0:W]
    x, y = xx / W, yy / H
    basis = lambda x, y: np.stack([np.ones_like(x), x, y, x * x, x * y, y * y, y ** 3], -1)
    coef, *_ = np.linalg.lstsq(basis(x[plaster], y[plaster]), disp[plaster], rcond=None)
    above = disp - basis(x, y) @ coef
    fig = (above > rise).astype(np.uint8)
    return cv2.morphologyEx(fig, cv2.MORPH_CLOSE, np.ones((17, 17), np.uint8))


def build() -> None:
    src = drape(fetch('creation'))
    H0, W0 = src.shape[:2]
    th = round(H0 * TW / W0)
    img = cv2.resize(src, (TW, th), interpolation=cv2.INTER_AREA)
    adam_half, god_half = masks(TW, th, TW / W0)

    print('  creation: depth')
    disp = depth(img)
    figure = figures(img, disp)

    print('  creation: wall behind the figures (LaMa)')
    wall = inpaint(img, cv2.dilate(figure, np.ones((15, 15), np.uint8)) > 0)

    # ---- 2D hero (index.astro): Adam and God on their halves, over the painted-in wall ----
    adam_a = cv2.GaussianBlur(adam_half, (0, 0), 1.4)
    # God's layer reaches under Adam's feathered edge so the two add up to the original at rest.
    god_a = cv2.GaussianBlur(cv2.dilate(god_half, np.ones((7, 7), np.uint8)), (0, 0), 1.4)
    cv2.imwrite(str(PUBLIC_ART / 'creation-adam.webp'), np.dstack([img, adam_a]), [cv2.IMWRITE_WEBP_QUALITY, 82])
    cv2.imwrite(str(PUBLIC_ART / 'creation-god.webp'), np.dstack([img, god_a]), [cv2.IMWRITE_WEBP_QUALITY, 82])
    cv2.imwrite(str(PUBLIC_ART / 'creation-base.webp'), cv2.resize(wall, (1200, round(th * 1200 / TW)), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, 74])

    # ---- 3D relief: the wall, then each figure group raised from it ----
    out = PUBLIC_ART / 'creation3d'
    small = lambda a: cv2.resize(a, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    wall_disp = push_pull(small(disp), small((1 - figure).astype(np.float32)) > 0.999)
    wall_disp = cv2.GaussianBlur(cv2.resize(wall_disp, (TW, th), interpolation=cv2.INTER_LINEAR), (0, 0), 6)
    layers = [write_layer(out, 'wall', wall, np.full((th, TW), 255, np.uint8), wall_disp)]
    for name, half in (('adam', adam_half), ('god', god_half)):
        own = (figure > 0) & (half > 0)
        n, lab, stats, _ = cv2.connectedComponentsWithStats(own.astype(np.uint8))
        # Keep the figure group itself, not specks of plaster the threshold caught.
        keep = np.isin(lab, [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > own.size * 0.002])
        alpha = cv2.GaussianBlur(cv2.dilate(keep.astype(np.uint8) * 255, np.ones((3, 3), np.uint8)), (0, 0), 1.2)
        spread = cv2.resize(push_pull(small(disp), small(keep.astype(np.float32)) > 0.999), (TW, th), interpolation=cv2.INTER_LINEAR)
        layers.append(write_layer(out, name, img, alpha, np.where(keep, disp, spread)))
    # A shallow relief: the figures stand ~7.2 units from the eye, the wall ~10.
    write_meta(out, {'width': TW, 'height': th, 'near': 7.2, 'far': 10, 'gap': GAP, 'layers': layers})
