"""Shared steps of the art pipeline: fetching paintings, depth, fills, writing layers."""
import json
import urllib.request
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path(__file__).resolve().parent / '.cache'
PUBLIC_ART = ROOT / 'public' / 'art'
UA = {'User-Agent': 'PlanktosArtPipeline/1.0 (personal archive; github.com/KittitachTK/Gitpage)'}

# Public-domain sources on Wikimedia Commons.
SOURCES = {
    'creation': 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg',
    'eden': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Thomas_Cole_-_The_Garden_of_Eden_%281828%29.jpg/3840px-Thomas_Cole_-_The_Garden_of_Eden_%281828%29.jpg',
}


def fetch(name: str) -> np.ndarray:
    """The source painting as BGR, downloaded once into the cache."""
    CACHE.mkdir(exist_ok=True)
    path = CACHE / f'{name}.jpg'
    if not path.exists():
        req = urllib.request.Request(SOURCES[name], headers=UA)
        with urllib.request.urlopen(req) as r:
            data = r.read()
        if data[:3] != b'\xff\xd8\xff':
            raise RuntimeError(f'{name}: download is not a JPEG ({data[:60]!r})')
        path.write_bytes(data)
    img = cv2.imread(str(path))
    if img is None:
        raise RuntimeError(f'cannot read {path}')
    return img


def depth(img: np.ndarray, height: int = 812) -> np.ndarray:
    """Relative inverse depth (0 = far … 1 = near) at the image's size, via Depth Anything V2."""
    import torch
    from PIL import Image
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation

    name = 'depth-anything/Depth-Anything-V2-Base-hf'
    proc = AutoImageProcessor.from_pretrained(name)
    model = AutoModelForDepthEstimation.from_pretrained(name).eval()
    rgb = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    # Finer than the default 518 px for crisper edges; both sides multiples of 14.
    h = height // 14 * 14
    w = round(rgb.width * h / rgb.height / 14) * 14
    inputs = proc(images=rgb, return_tensors='pt', size={'height': h, 'width': w}, keep_aspect_ratio=False)
    with torch.no_grad():
        d = model(**inputs).predicted_depth[0].numpy()
    d = (d - d.min()) / (d.max() - d.min())
    return cv2.resize(d.astype(np.float32), (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)


def push_pull(a: np.ndarray, known: np.ndarray) -> np.ndarray:
    """Fill unknown pixels with a soft multi-scale continuation of the known ones."""
    a = a.astype(np.float32)
    squeeze = a.ndim == 2
    if squeeze:
        a = a[..., None]
    w = known.astype(np.float32)
    pyr = []
    cur, cw = a * w[..., None], w
    while max(cw.shape) > 1:
        pyr.append((cur, cw))
        size = (max(1, cur.shape[1] // 2), max(1, cur.shape[0] // 2))
        cur = cv2.resize(cur, size, interpolation=cv2.INTER_AREA)
        cw = cv2.resize(cw, size, interpolation=cv2.INTER_AREA)
        if cur.ndim == 2:
            cur = cur[..., None]
    filled = cur / np.maximum(cw[..., None], 1e-6)
    for c, cwl in reversed(pyr):
        up = cv2.resize(filled, (c.shape[1], c.shape[0]), interpolation=cv2.INTER_LINEAR)
        if up.ndim == 2:
            up = up[..., None]
        k = np.clip(cwl, 0, 1)[..., None]
        filled = c / np.maximum(cwl[..., None], 1e-6) * k + up * (1 - k)
    return filled[..., 0] if squeeze else filled


_lama = None


def inpaint(img: np.ndarray, hole: np.ndarray, work_width: int = 1600) -> np.ndarray:
    """Paint plausible content into `hole` (bool mask) with LaMa; returns a full-size BGR image."""
    global _lama
    from PIL import Image
    from simple_lama_inpainting import SimpleLama

    if _lama is None:
        _lama = SimpleLama()
    H, W = img.shape[:2]
    s = min(1.0, work_width / W)
    small = cv2.resize(img, (round(W * s), round(H * s)), interpolation=cv2.INTER_AREA)
    m = cv2.resize(hole.astype(np.uint8) * 255, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    out = _lama(Image.fromarray(cv2.cvtColor(small, cv2.COLOR_BGR2RGB)), Image.fromarray(m))
    out = cv2.cvtColor(np.asarray(out), cv2.COLOR_RGB2BGR)[: small.shape[0], : small.shape[1]]
    return cv2.resize(out, (W, H), interpolation=cv2.INTER_CUBIC)


def write_layer(out: Path, name: str, color: np.ndarray, alpha: np.ndarray, disp: np.ndarray, depth_width: int = 512) -> dict:
    """Colour+alpha as WebP, depth (0 far … 255 near) as a small PNG; returns its meta entry."""
    out.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out / f'{name}.webp'), np.dstack([color, alpha]), [cv2.IMWRITE_WEBP_QUALITY, 82])
    h = round(disp.shape[0] * depth_width / disp.shape[1])
    d = cv2.resize(np.clip(disp, 0, 1), (depth_width, h), interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(out / f'{name}-depth.png'), (d * 255).astype(np.uint8))
    return {'file': f'{name}.webp', 'depth': f'{name}-depth.png', 'coverage': round(float((alpha > 127).mean()), 3)}


def write_meta(out: Path, meta: dict) -> None:
    (out / 'meta.json').write_text(json.dumps(meta, indent=1), encoding='utf-8')
