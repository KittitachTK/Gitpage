---
status: studying
updated: 2026-10-02
tags: [Yang-Mills, operator-theory]
---

## Definition

> [!definition] Spectral gap
> Let $H \ge 0$ be a self-adjoint Hamiltonian with ground state $\Omega$, $H\Omega = 0$. The **spectral gap** is
> $$\Delta = \inf\big(\sigma(H)\setminus\{0\}\big).$$ ^gap-def

## Lattice formulation

For the [[Transfer Matrix]] $T = e^{-aH}$ the gap is $-\tfrac1a \log(\lambda_1/\lambda_0)$.

> [!theorem]- Gap ⇒ clustering
> If $\Delta > 0$ then truncated correlations decay like $e^{-\Delta |x|}$. See [[Exponential Clustering]].

> [!proof]-
> Insert a spectral resolution of $T$ between the two observables and bound every term with $\lambda \le \lambda_1$. $\blacksquare$

Back to [[Mass Gap]].
