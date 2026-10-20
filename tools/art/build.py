"""Regenerate every painted asset under public/art/.

    tools/art/.venv/Scripts/python tools/art/build.py            # everything
    tools/art/.venv/Scripts/python tools/art/build.py creation   # one painting

Setup (once): see tools/art/README.md. Source paintings are public domain and are
downloaded into tools/art/.cache/ on first run; model weights go to the Hugging Face
and torch caches.
"""
import sys
import time

import creation
import eden

STEPS = {'creation': creation.build, 'eden': eden.build}

if __name__ == '__main__':
    names = sys.argv[1:] or list(STEPS)
    for name in names:
        t = time.time()
        print(f'{name} …')
        STEPS[name]()
        print(f'{name}: done in {time.time() - t:.0f}s')
