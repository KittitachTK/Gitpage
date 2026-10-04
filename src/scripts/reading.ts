/**
 * Reading aids for note pages: a progress bar under the header and a table of
 * contents whose marker follows the section being read. Both are driven by
 * scroll position (not animation), so they work with motion off too; only the
 * marker's glide is a transition, which the motion-off CSS removes.
 */

/** Thin bar under the header showing how far through the article you are. */
export function initReadingProgress(bar: HTMLElement, article: HTMLElement) {
  let raf = 0;
  const update = () => {
    raf = 0;
    const rect = article.getBoundingClientRect();
    const total = rect.height - innerHeight * 0.6;
    const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
    bar.style.transform = `scaleX(${p})`;
    bar.classList.toggle('visible', p > 0.005 && p < 0.999);
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  update();
}

/** Active TOC entry = last heading above the reading line; a marker glides to it. */
export function initToc(toc: HTMLElement) {
  const links = [...toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const pairs = links
    .map((a) => ({ a, h: document.getElementById(decodeURIComponent(a.hash.slice(1))) }))
    .filter((p): p is { a: HTMLAnchorElement; h: HTMLElement } => !!p.h);
  if (!pairs.length) return;

  const list = toc.querySelector('ol')!;
  const marker = document.createElement('span');
  marker.className = 'toc-marker';
  marker.setAttribute('aria-hidden', 'true');
  list.append(marker);

  let current: HTMLAnchorElement | null = null;
  let raf = 0;
  const line = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80;

  const update = () => {
    raf = 0;
    const y = line() + 8;
    let active = pairs[0];
    for (const p of pairs) {
      if (p.h.getBoundingClientRect().top <= y) active = p;
      else break;
    }
    // Before the first heading, nothing is active yet.
    const before = pairs[0].h.getBoundingClientRect().top > y;
    const a = before ? null : active.a;
    if (a === current) return;
    current?.classList.remove('active');
    current?.removeAttribute('aria-current');
    current = a;
    if (!a) { marker.classList.remove('visible'); return; }
    a.classList.add('active');
    a.setAttribute('aria-current', 'location');
    marker.style.transform = `translateY(${a.offsetTop}px)`;
    marker.style.height = `${a.offsetHeight}px`;
    marker.classList.add('visible');
    // Keep the active entry visible inside a long, scrollable TOC.
    const box = toc.closest<HTMLElement>('.note-aside');
    if (box && box.scrollHeight > box.clientHeight) {
      const top = a.offsetTop + list.offsetTop;
      if (top < box.scrollTop + 40 || top > box.scrollTop + box.clientHeight - 80) {
        box.scrollTo({ top: top - box.clientHeight / 3, behavior: 'smooth' });
      }
    }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  update();
}
