/**
 * Obsidian-style page preview: hovering an internal note link shows the target
 * note (or just the linked section) in a small floating card. Pages are static,
 * so the preview is cut from the target page's own HTML and cached.
 *
 * Mouse-only (pointer: fine); touch and keyboard users simply follow the link.
 */

const OPEN_DELAY = 380;
const CLOSE_DELAY = 220;
const MAX_BLOCKS = 14;

const cache = new Map<string, Promise<Document | null>>();
const fetchPage = (url: string) => {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => (r.ok ? r.text() : Promise.reject())).then((html) => new DOMParser().parseFromString(html, 'text/html')).catch(() => null));
  }
  return cache.get(url)!;
};

const samePage = (u: URL) => u.origin === location.origin && u.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '');

/** Blocks of a heading's section (until the next heading of the same or higher level). */
function sectionBlocks(prose: Element, id: string): Element[] {
  const heading = prose.querySelector(`[id="${CSS.escape(id)}"]`);
  if (!heading) return [];
  const level = /^H([1-6])$/.exec(heading.tagName)?.[1];
  if (!level) return [heading.closest('.prose > *') ?? heading];
  const out = [heading];
  for (let el = heading.nextElementSibling; el; el = el.nextElementSibling) {
    const l = /^H([1-6])$/.exec(el.tagName)?.[1];
    if (l && l <= level) break;
    out.push(el);
  }
  return out;
}

function buildCard(doc: Document, hash: string): HTMLElement | null {
  const prose = doc.querySelector('article.note-main > div.prose') ?? doc.querySelector('.prose');
  if (!prose) return null;
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  let blocks = id ? sectionBlocks(prose, id) : [];
  if (!blocks.length) blocks = [...prose.children];
  const card = document.createElement('div');
  card.className = 'preview-card';

  const head = document.createElement('div');
  head.className = 'preview-head';
  const crumbs = doc.querySelector('.breadcrumbs')?.textContent?.replace(/\s+/g, ' ').trim();
  const title = doc.querySelector('.note-header h1')?.textContent?.trim() ?? doc.title;
  head.innerHTML = `<span class="preview-crumbs"></span><strong></strong>`;
  head.querySelector('.preview-crumbs')!.textContent = crumbs ?? '';
  head.querySelector('strong')!.textContent = title;
  card.append(head);

  const body = document.createElement('div');
  body.className = 'preview-body prose';
  for (const b of blocks.slice(0, MAX_BLOCKS)) {
    if (b.matches('style, script, pre.mermaid')) continue;
    const clone = b.cloneNode(true) as Element;
    // Ids would collide with the current page.
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
    clone.querySelectorAll('pre.mermaid').forEach((e) => e.remove());
    body.append(clone);
  }
  if (blocks.length > MAX_BLOCKS) body.insertAdjacentHTML('beforeend', '<p class="preview-more">…</p>');
  card.append(body);

  // Equations reference shared glyph paths (see mathjax-svg.ts); bring over any this page lacks.
  const glyphs = doc.querySelectorAll('svg.mjx-glyphs path[id]');
  if (glyphs.length && doc !== document) {
    let store = document.querySelector('svg.mjx-glyphs defs');
    if (!store) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'mjx-glyphs');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
      store = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.append(store);
      document.body.prepend(svg);
    }
    for (const g of glyphs) if (!document.getElementById(g.id)) store.append(document.importNode(g, true));
  }

  // MathJax SVG relies on a small stylesheet; borrow it once if this page lacks it.
  if (!document.getElementById('preview-mjx-style')) {
    const mjx = [...doc.querySelectorAll('style')].find((s) => s.textContent?.includes('mjx-container'));
    if (mjx && ![...document.querySelectorAll('style')].some((s) => s.textContent?.includes('mjx-container'))) {
      const s = document.createElement('style');
      s.id = 'preview-mjx-style';
      s.textContent = mjx.textContent;
      document.head.append(s);
    }
  }
  return card;
}

export function initLinkPreviews(root: ParentNode = document) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const pop = document.createElement('div');
  pop.className = 'preview-pop';
  pop.setAttribute('role', 'tooltip');
  pop.hidden = true;
  document.body.append(pop);

  let openTimer = 0, closeTimer = 0;
  let anchor: HTMLAnchorElement | null = null;

  const place = (a: HTMLAnchorElement) => {
    const r = a.getBoundingClientRect();
    const w = Math.min(440, innerWidth - 32);
    pop.style.width = `${w}px`;
    const left = Math.max(16, Math.min(r.left, innerWidth - w - 16));
    const below = r.bottom + 10;
    const h = pop.offsetHeight;
    const top = below + h > innerHeight - 16 && r.top - h - 10 > 16 ? r.top - h - 10 : below;
    pop.style.left = `${left + scrollX}px`;
    pop.style.top = `${top + scrollY}px`;
    pop.dataset.side = top < r.top ? 'above' : 'below';
  };

  const hide = () => {
    clearTimeout(openTimer);
    anchor = null;
    pop.classList.remove('open');
    // Let the fade finish before removing it from layout.
    setTimeout(() => { if (!anchor) pop.hidden = true; }, 200);
  };

  const show = async (a: HTMLAnchorElement) => {
    const url = new URL(a.href);
    const doc = samePage(url) ? document : await fetchPage(url.origin + url.pathname);
    if (anchor !== a || !doc) return;
    const card = buildCard(doc, url.hash);
    if (!card || anchor !== a) return;
    pop.replaceChildren(card);
    pop.hidden = false;
    place(a);
    requestAnimationFrame(() => pop.classList.add('open'));
  };

  const isPreviewable = (a: HTMLAnchorElement) => {
    if (!a.matches('.prose a.wikilink, .embed-title a, .backlinks a')) return false;
    try { return new URL(a.href).origin === location.origin; } catch { return false; }
  };

  root.addEventListener('pointerover', (e) => {
    const a = (e.target as Element).closest?.('a') as HTMLAnchorElement | null;
    if (!a || !isPreviewable(a) || pop.contains(a)) return;
    clearTimeout(closeTimer);
    if (anchor === a) return;
    anchor = a;
    clearTimeout(openTimer);
    openTimer = window.setTimeout(() => show(a), OPEN_DELAY);
  });
  root.addEventListener('pointerout', (e) => {
    const a = (e.target as Element).closest?.('a');
    if (!a || a !== anchor) return;
    closeTimer = window.setTimeout(hide, CLOSE_DELAY);
  });
  // Moving into the card keeps it open (to scroll it or click a link inside).
  pop.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  pop.addEventListener('pointerleave', () => { closeTimer = window.setTimeout(hide, CLOSE_DELAY); });
  addEventListener('scroll', () => { if (!pop.hidden && !pop.matches(':hover')) hide(); }, { passive: true });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  // Following a link closes it.
  root.addEventListener('click', hide);
}
