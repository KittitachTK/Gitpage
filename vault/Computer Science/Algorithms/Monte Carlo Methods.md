---
status: draft
tags: [algorithms, simulation]
---

Markov-chain Monte Carlo is how [[Lattice Yang-Mills]] is simulated numerically.

```python
import numpy as np

def metropolis(energy, x, beta, step=0.1):
    y = x + step * np.random.randn(*x.shape)
    if np.random.rand() < np.exp(-beta * (energy(y) - energy(x))):
        return y
    return x
```
