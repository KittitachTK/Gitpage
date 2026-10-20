"""Thomas Cole, *The Garden of Eden* (1828): the 2D backdrop and the 3D diorama layers."""
import cv2
import numpy as np

from common import PUBLIC_ART, depth, fetch, inpaint, push_pull, write_layer, write_meta

TW = 2400                        # 3D texture width
CUTS = [0.12, 0.36, 0.5, 0.66]   # disparity thresholds between layers (far → near)


def build() -> None:
    src = fetch('eden')

    # 2D backdrop (EdenWorld.astro) and its small variant.
    for w, q in ((2400, 78), (1280, 76)):
        img = cv2.resize(src, (w, round(src.shape[0] * w / src.shape[1])), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(PUBLIC_ART / f'eden-{w}.webp'), img, [cv2.IMWRITE_WEBP_QUALITY, q])

    # 3D diorama.
    th = round(src.shape[0] * TW / src.shape[1])
    img = cv2.resize(src, (TW, th), interpolation=cv2.INTER_AREA)
    print('  eden: depth')
    disp = depth(img)
    # The model puts sky, mountains and lake all at "infinity": give that region a gentle
    # gradient so the valley floor sits nearer than the peaks and the peaks nearer than the sky.
    yy = np.linspace(0, 1, th)[:, None].repeat(TW, 1).astype(np.float32)
    far = np.clip(1 - disp / CUTS[0], 0, 1)
    disp = cv2.bilateralFilter(disp + far * 0.1 * np.clip((yy - 0.15) / 0.55, 0, 1), 9, 0.05, 5)
    band = np.digitize(disp, CUTS)

    out = PUBLIC_ART / 'eden3d'
    layers = []
    small = lambda a: cv2.resize(a, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    for j in range(len(CUTS) + 1):
        print(f'  eden: layer {j}')
        color = img.copy()
        hole = cv2.dilate((band > j).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        if hole.any():
            # What this layer hides behind nearer things, painted in by LaMa from this layer's
            # own pixels only (foliage behind foliage): farther layers' sky would otherwise
            # bleed in and show as pale mist when the near layer slides aside.
            fill = inpaint(img, hole | (band < j))
            m = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 1.5)[..., None]
            color = (img * (1 - m) + fill * m).astype(np.uint8)
        alpha = (band >= j).astype(np.uint8) * 255
        if j > 0:
            alpha = cv2.GaussianBlur(cv2.dilate(alpha, np.ones((3, 3), np.uint8)), (0, 0), 1.0)
        # Depth: this layer's own pixels; holes and transparent parts continue from them, so
        # feathered edges and painted-in areas never stretch towards the background.
        own = cv2.erode((band == j).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        if not own.any():
            own = band == j
        spread = cv2.resize(push_pull(small(disp), small(own.astype(np.float32)) > 0.999), (TW, th), interpolation=cv2.INTER_LINEAR)
        layers.append(write_layer(out, f'layer{j}', color, alpha, np.where(own, disp, spread)))
    # Nearest foliage ~3 units away, the sky ~24 (compressed so distant parallax stays within the fills).
    write_meta(out, {'width': TW, 'height': th, 'near': 3, 'far': 24, 'layers': layers})
