# Art pipeline

Regenerates every painted asset in `public/art/` from the public-domain originals:

| Output | What |
|---|---|
| `creation-adam.webp`, `creation-god.webp`, `creation-base.webp` | 2D home hero: Adam and God split along the gap between the fingers, over the wall painted in behind them |
| `creation3d/` | 3D relief: the wall, Adam (with his hill), God's group; colour + depth per layer, `meta.json` |
| `eden-2400.webp`, `eden-1280.webp` | 2D garden backdrop (EdenWorld) |
| `eden3d/` | 3D diorama: 5 depth layers of the garden, each with what it hides painted in |

Adam's loincloth (`drape.py`) is applied to the source before anything else, so it is
part of every derived image and cannot be lost by regenerating.

## Setup (once)

```sh
python -m venv --system-site-packages tools/art/.venv
tools/art/.venv/Scripts/python -m pip install torch transformers opencv-python scipy pillow
# simple-lama-inpainting pins numpy<2, which has no wheel for Python 3.13; its code works with numpy 2:
tools/art/.venv/Scripts/python -m pip install --no-deps simple-lama-inpainting fire termcolor
```

## Run

```sh
cd tools/art
../../tools/art/.venv/Scripts/python build.py            # everything (~5 min on CPU)
../../tools/art/.venv/Scripts/python build.py creation   # or one painting
```

First run downloads the paintings (into `.cache/`), Depth Anything V2 (Hugging Face cache)
and LaMa (`big-lama.pt`, torch cache).

## How the layers are made

1. **Depth**: Depth Anything V2 estimates relative depth for the whole painting.
2. **Cut**: the garden is cut into depth bands (`CUTS` in `eden.py`); the fresco into the
   wall and the two figure groups (height above a surface fitted to the plaster).
3. **Fill**: what each layer hides behind nearer ones is painted in by LaMa, using only that
   layer's own pixels as context (foliage continues as foliage, never as sky).
4. **Depth per layer**: each layer's depth continues past its own edges, so edges never stretch
   towards the background when the camera moves.

Preview the result in the dev server (`npm run dev`): the home page shows the Creation, every other page the garden.
