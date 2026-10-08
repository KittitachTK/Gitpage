/**
 * Zero-gravity bookshelf for the Library.
 *
 * Shelf modules float in a space-station archive bay: each note is a book on
 * a shelf (section pages), or each section is a shelf module (library hall).
 * Every book/module is backed by a real <a href> rendered by ShelfStage.astro;
 * this script only positions those links over the 3D scene, so keyboard,
 * screen readers and "open in new tab" keep working, and without WebGL the
 * page simply falls back to the list view.
 */
import * as THREE from 'three';
import { motionEnabled, onMotionChange } from './motion';
import { mountStarfield } from './starfield';

export interface ShelfBook {
  id: string;
  url: string;
  title: string;
  path: string;
  type?: string;
  date?: string;
  minutes: number;
  excerpt?: string;
}

export interface ShelfBoard {
  id: string;
  label: string;
  /** CSS custom property holding the section colour, e.g. `--sec-mathematics`. */
  color: string;
  books: ShelfBook[];
  url?: string;
  count?: number;
  blurb?: string;
}

export interface ShelfData {
  /** `books`: each book is a link (section shelf). `boards`: each module is a link (library hall). */
  mode: 'books' | 'boards';
  boards: ShelfBoard[];
}

// ---- dimensions (scene units) ---------------------------------------------------

export const BOOK_H = 1;
export const BOOK_D = 0.62;
const GAP = 0.018;
const PAD = 0.16;
const MIN_BOARD_W = 1.5;
const LABEL_SPACE = 0.95; // room under each shelf for its label
const NARROW = 768;
const FOV = 32;

const CELL_H = 768; // spine texture height in px
const ATLAS_W = 4096;
const ATLAS_STRIPS = 2;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export const thickness = (minutes: number) => 0.075 + 0.115 * clamp(Math.log1p(minutes) / Math.log1p(80), 0, 1);
export const heightOf = (id: string) => BOOK_H * (0.86 + 0.14 * hash(id));

const TYPE_ABBR: Record<string, string> = {
  summary: 'SUM', exam: 'EXAM', lab: 'LAB', solution: 'SOL', worksheet: 'WKS', assignment: 'ASGN',
  course: 'CRS', guide: 'GDE', log: 'LOG', idea: 'IDEA', 'research-project': 'PROJ',
};

// ---- spine atlas ---------------------------------------------------------------

interface AtlasCell { texture: THREE.CanvasTexture; u0: number; u1: number; v0: number; v1: number }

export class SpineAtlas {
  private canvases: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture; x: number; strip: number }[] = [];

  constructor(private fonts: { display: string; mono: string }, private colors: Palette) {}

  private page(width: number) {
    let p = this.canvases[this.canvases.length - 1];
    if (p && p.x + width > ATLAS_W) {
      p.strip++;
      p.x = 0;
      if (p.strip >= ATLAS_STRIPS) p = undefined!;
    }
    if (!p) {
      const canvas = document.createElement('canvas');
      canvas.width = ATLAS_W;
      canvas.height = CELL_H * ATLAS_STRIPS;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      p = { canvas, ctx: canvas.getContext('2d')!, texture, x: 0, strip: 0 };
      this.canvases.push(p);
    }
    return p;
  }

  draw(book: ShelfBook, base: THREE.Color, t: number, h: number): AtlasCell {
    const w = Math.max(24, Math.round((CELL_H * t) / h));
    const p = this.page(w);
    const { ctx } = p;
    const x = p.x, y = p.strip * CELL_H;
    p.x += w + 2;

    // Cloth: section colour sunk toward deep space, darker at the rounded edges.
    const cloth = base.clone().lerp(this.colors.bg, 0.22);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, `#${cloth.clone().multiplyScalar(0.55).getHexString()}`);
    g.addColorStop(0.45, `#${cloth.clone().multiplyScalar(1.12).getHexString()}`);
    g.addColorStop(1, `#${cloth.clone().multiplyScalar(0.6).getHexString()}`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, CELL_H);

    // Foil bands.
    const gold = `#${this.colors.accent.getHexString()}`;
    ctx.fillStyle = gold;
    ctx.globalAlpha = 0.85;
    for (const by of [34, 42, CELL_H - 128, CELL_H - 120]) ctx.fillRect(x + 4, y + by, w - 8, 2);
    ctx.globalAlpha = 1;

    // Star mark at the head of the spine.
    ctx.fillStyle = gold;
    ctx.font = `${Math.round(Math.min(w * 0.42, 20))}px ${this.fonts.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', x + w / 2, y + 19);

    // Note type at the foot.
    const abbr = book.type ? TYPE_ABBR[book.type] ?? book.type.slice(0, 4).toUpperCase() : '';
    if (abbr) {
      ctx.fillStyle = gold;
      let size = Math.min(w * 0.3, 17);
      ctx.font = `600 ${size}px ${this.fonts.mono}`;
      while (ctx.measureText(abbr).width > w - 8 && size > 7) ctx.font = `600 ${(size -= 1)}px ${this.fonts.mono}`;
      ctx.fillText(abbr, x + w / 2, y + CELL_H - 72);
    }

    // Title, running down the spine (top to bottom, as on English spines).
    const room = CELL_H - 60 - 150;
    let size = clamp(w * 0.44, 12, 40);
    ctx.save();
    ctx.translate(x + w / 2, y + 60);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = `#${this.colors.text.getHexString()}`;
    ctx.font = `500 ${size}px ${this.fonts.display}`;
    let title = book.title;
    while (ctx.measureText(title).width > room && size > 15) ctx.font = `500 ${(size -= 1)}px ${this.fonts.display}`;
    if (ctx.measureText(title).width > room) {
      while (title.length > 1 && ctx.measureText(title + '…').width > room) title = title.slice(0, -1);
      title = title.trimEnd() + '…';
    }
    ctx.fillText(title, 0, 1);
    ctx.restore();

    p.texture.needsUpdate = true;
    return {
      texture: p.texture,
      u0: x / ATLAS_W,
      u1: (x + w) / ATLAS_W,
      v1: 1 - y / (CELL_H * ATLAS_STRIPS),
      v0: 1 - (y + CELL_H) / (CELL_H * ATLAS_STRIPS),
    };
  }

  dispose() {
    this.canvases.forEach((c) => c.texture.dispose());
  }
}

// ---- palette -------------------------------------------------------------------

export interface Palette { bg: THREE.Color; text: THREE.Color; accent: THREE.Color; accent2: THREE.Color; page: THREE.Color }

export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const c = (name: string, fallback: string) => new THREE.Color(cs.getPropertyValue(name).trim() || fallback);
  return {
    bg: c('--bg', '#07090e'),
    text: c('--text', '#e6e2d8'),
    accent: c('--accent', '#d6b98c'),
    accent2: c('--accent-2', '#a9a3c6'),
    page: new THREE.Color('#e8dfcb'),
  };
}

// ---- scene objects -------------------------------------------------------------

interface Book {
  data: ShelfBook;
  board: ShelfBoard;
  t: number;
  h: number;
  slot: THREE.Group; // position on its shelf
  mover: THREE.Group; // hover / filter offsets
  mesh: THREE.Mesh;
  mats: THREE.MeshStandardMaterial[];
  cell: AtlasCell;
  link?: HTMLAnchorElement;
  phase: number;
  out: number; // current slide-out amount (0..1)
  dim: number; // current dimming (0..1)
  filtered: boolean;
}

interface Segment {
  board: ShelfBoard;
  books: Book[];
  part: string;
  w: number;
  group: THREE.Group;
  label?: HTMLElement;
  link?: HTMLAnchorElement;
  phase: number;
  hover: number;
}

interface Tween { start: number; dur: number; ease: (t: number) => number; step: (k: number) => void; done?: () => void }

export function mountShelf(stage: HTMLElement, data: ShelfData) {
  const glCanvas = stage.querySelector<HTMLCanvasElement>('canvas.shelf-gl')!;
  const overlay = stage.querySelector<HTMLElement>('.shelf-overlay')!;
  const holo = stage.querySelector<HTMLElement>('.shelf-holo');
  const sky = stage.querySelector<HTMLCanvasElement>('canvas.shelf-sky');
  const prevBtn = stage.querySelector<HTMLButtonElement>('.shelf-prev');
  const nextBtn = stage.querySelector<HTMLButtonElement>('.shelf-next');

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    stage.dispatchEvent(new CustomEvent('shelf-fallback', { bubbles: true }));
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0);

  if (sky) mountStarfield(sky);

  const palette = readPalette(stage);
  const cs = getComputedStyle(stage);
  const fonts = {
    display: cs.getPropertyValue('--font-display').trim() || 'sans-serif',
    mono: cs.getPropertyValue('--font-mono').trim() || 'monospace',
  };
  const sectionColor = (name: string) => new THREE.Color(cs.getPropertyValue(name).trim() || '#8e939c');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

  // Light from a distant star, a cool rim from the station, and faint fill.
  scene.add(new THREE.HemisphereLight(0x9aa6c8, 0x07090e, 0.55));
  const star = new THREE.DirectionalLight(0xffe7c4, 1.5);
  star.position.set(-4, 5, 6);
  scene.add(star);
  const rim = new THREE.DirectionalLight(0xa8b8ff, 0.8);
  rim.position.set(5, 2, -5);
  scene.add(rim);
  const glow = new THREE.PointLight(palette.accent, 0, 4, 1.6);
  scene.add(glow);

  // Shared materials / geometry.
  const pageTex = (() => {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 64;
    const x = c.getContext('2d')!;
    x.fillStyle = '#e8dfcb';
    x.fillRect(0, 0, 8, 64);
    for (let i = 0; i < 64; i += 3) {
      x.fillStyle = i % 2 ? 'rgba(120,100,70,0.18)' : 'rgba(255,255,255,0.25)';
      x.fillRect(0, i, 8, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x46506a, metalness: 0.6, roughness: 0.34 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2a3244, metalness: 0.8, roughness: 0.3 });
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const disposables: { dispose(): void }[] = [pageTex, glowTex, boardMat, capMat];

  const atlas = new SpineAtlas(fonts, palette);

  // ---- build books ----
  const books: Book[] = [];
  const makeBook = (b: ShelfBook, board: ShelfBoard): Book => {
    const t = thickness(b.minutes);
    const h = heightOf(b.id);
    const base = sectionColor(board.color);
    // Each volume gets its own binding: the section hue, nudged and richer.
    const tint = base.clone().offsetHSL((hash(b.id + 'hue') - 0.5) * 0.045, 0.16, -0.06 + (hash(b.id + 'shade') - 0.5) * 0.12);
    const cloth = tint.clone().lerp(palette.bg, 0.22);
    const cell = atlas.draw(b, tint, t, h);

    const geo = new THREE.BoxGeometry(t, h, BOOK_D);
    // Map the spine face (+z, vertices 16..19) to this book's atlas cell.
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 16; i < 20; i++) uv.setXY(i, cell.u0 + uv.getX(i) * (cell.u1 - cell.u0), cell.v0 + uv.getY(i) * (cell.v1 - cell.v0));
    uv.needsUpdate = true;
    disposables.push(geo);

    const cover = new THREE.MeshStandardMaterial({ color: cloth, roughness: 0.82, metalness: 0.05 });
    const pages = new THREE.MeshStandardMaterial({ color: 0xffffff, map: pageTex, roughness: 0.95 });
    const spine = new THREE.MeshStandardMaterial({ color: 0xffffff, map: cell.texture, roughness: 0.7, metalness: 0.08 });
    const mats = [cover, cover, pages, pages, spine, pages];
    disposables.push(cover, pages, spine);

    const mesh = new THREE.Mesh(geo, mats);
    mesh.position.y = h / 2;
    const mover = new THREE.Group();
    mover.add(mesh);
    const slot = new THREE.Group();
    slot.add(mover);
    // A slight, fixed lean so the row reads as hand-placed.
    mesh.rotation.z = (hash(b.id + 'lean') - 0.5) * 0.035;
    const book: Book = { data: b, board, t, h, slot, mover, mesh, mats: [cover, pages, spine], cell, phase: hash(b.id) * Math.PI * 2, out: 0, dim: 0, filtered: false };
    books.push(book);
    return book;
  };
  const boardBooks = new Map<ShelfBoard, Book[]>();
  for (const board of data.boards) boardBooks.set(board, board.books.map((b) => makeBook(b, board)));

  // Link elements rendered by Astro.
  const links = [...overlay.querySelectorAll<HTMLAnchorElement>('a.shelf-link')];
  if (data.mode === 'books') {
    for (const a of links) {
      const book = books.find((b) => b.data.id === a.dataset.id);
      if (book) book.link = a;
    }
  }

  // ---- layout ----
  let segments: Segment[] = [];
  let narrow = false;
  let current = 0; // carousel index (narrow screens)
  let W = 1, H = 1;
  const camBase = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  function buildSegment(board: ShelfBoard, list: Book[], part: string, color: THREE.Color): Segment {
    const content = list.reduce((s, b) => s + b.t, 0) + GAP * Math.max(0, list.length - 1);
    const w = Math.max(MIN_BOARD_W, content + PAD * 2);
    const group = new THREE.Group();

    const plank = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, BOOK_D + 0.18), boardMat);
    plank.position.y = -0.025;
    group.add(plank);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.25) }));
    strip.position.set(0, -0.022, (BOOK_D + 0.18) / 2 + 0.004);
    group.add(strip);
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.14, 20), capMat);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(side * (w / 2 + 0.06), -0.025, 0);
      group.add(cap);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 8, 24), new THREE.MeshBasicMaterial({ color: palette.accent }));
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side * (w / 2 + 0.135), -0.025, 0);
      group.add(ring);
    }
    // Soft glow cast by the shelf's light strip.
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.25, 0.9),
      new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    halo.position.set(0, -0.2, -BOOK_D / 2 - 0.05);
    group.add(halo);

    let x = -content / 2;
    for (const b of list) {
      b.slot.position.set(x + b.t / 2, 0.006, 0);
      x += b.t + GAP;
      group.add(b.slot);
    }
    if (!list.length && data.mode === 'boards') {
      // An empty module: a faint hologram where volumes will dock.
      const ghost = new THREE.Mesh(
        new THREE.BoxGeometry(w - PAD * 2, 0.7, BOOK_D * 0.8),
        new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.18 }),
      );
      ghost.position.y = 0.36;
      group.add(ghost);
    }
    return { board, books: list, part, w, group, phase: hash(board.id + part) * Math.PI * 2, hover: 0 };
  }

  function clearSegments() {
    for (const s of segments) {
      for (const b of s.books) s.group.remove(b.slot);
      s.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          const mat = m.material as THREE.Material;
          if (mat !== boardMat && mat !== capMat) mat.dispose();
        }
      });
      scene.remove(s.group);
      s.label?.remove();
    }
    segments = [];
  }

  function layout() {
    W = stage.clientWidth || 1;
    narrow = W < NARROW;
    clearSegments();

    const maxPer = data.mode === 'books' ? (narrow ? 6 : 12) : Infinity;
    for (const board of data.boards) {
      const list = boardBooks.get(board)!;
      const color = sectionColor(board.color);
      if (data.mode === 'boards' || list.length <= maxPer) {
        segments.push(buildSegment(board, list, '', color));
      } else {
        const parts = Math.ceil(list.length / maxPer);
        const per = Math.ceil(list.length / parts);
        for (let i = 0; i < parts; i++) segments.push(buildSegment(board, list.slice(i * per, (i + 1) * per), `${i + 1}/${parts}`, color));
      }
    }

    // Position modules: a carousel on narrow screens, a grid otherwise.
    const labelSpace = data.mode === 'boards' ? 1.6 : LABEL_SPACE;
    const rowH = BOOK_H + labelSpace;
    let bw: number, bh: number, cx: number, cy: number;
    if (narrow) {
      let x = 0;
      segments.forEach((s, i) => {
        if (i) x += segments[i - 1].w / 2 + 1.4 + s.w / 2;
        s.group.position.set(x, 0, 0);
      });
      current = clamp(current, 0, segments.length - 1);
      const s = segments[current];
      bw = s.w + 0.7;
      bh = rowH + 0.25;
      cx = s.group.position.x;
      cy = BOOK_H / 2 - labelSpace / 2 + 0.05;
    } else {
      const n = segments.length;
      const cols = data.mode === 'boards' ? Math.min(3, n) : n <= 2 ? n : n <= 4 ? 2 : 3;
      const colW = Math.max(...segments.map((s) => s.w));
      const gapX = 0.9;
      const rows = Math.ceil(segments.length / cols);
      segments.forEach((s, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const inRow = Math.min(cols, segments.length - r * cols);
        s.group.position.set((c - (inRow - 1) / 2) * (colW + gapX), -r * rowH, (r % 2 ? -0.15 : 0) + (c % 2 ? 0.1 : 0));
      });
      bw = cols * colW + (cols - 1) * gapX + 0.8;
      bh = rows * rowH + 0.1;
      cx = 0;
      cy = BOOK_H + 0.12 - bh / 2;
    }
    for (const s of segments) {
      s.group.userData.y = s.group.position.y;
      scene.add(s.group);
    }

    // Stage height follows the content's shape.
    const ideal = narrow ? W * (bh / bw) * 1.05 : W * (bh / bw) * 1.02;
    H = Math.round(clamp(ideal, narrow ? 360 : 420, Math.min(narrow ? 560 : 860, innerHeight * 0.86)));
    stage.style.height = `${H}px`;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;

    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = Math.max(bh / 2 / tan, bw / 2 / (tan * camera.aspect)) + BOOK_D;
    camBase.set(cx, cy + dist * 0.12, dist);
    camLook.set(cx, cy, 0);
    camTarget.copy(camBase);
    lookTarget.copy(camLook);
    if (!camInit || !motionEnabled()) {
      camera.position.copy(camBase);
      camLookCur.copy(camLook);
      camInit = true;
    }
    camera.updateProjectionMatrix();

    // Labels under each module.
    for (const s of segments) {
      if (data.mode === 'books') {
        const el = document.createElement('div');
        el.className = 'shelf-label';
        el.setAttribute('aria-hidden', 'true');
        el.style.setProperty('--dot', `var(${s.board.color})`);
        el.innerHTML = `<span class="shelf-label-dot"></span><span class="shelf-label-name"></span><span class="shelf-label-count"></span>`;
        el.querySelector('.shelf-label-name')!.textContent = s.board.label + (s.part ? ` · ${s.part}` : '');
        el.querySelector('.shelf-label-count')!.textContent = String(s.books.length);
        overlay.appendChild(el);
        s.label = el;
      } else {
        s.link = links.find((a) => a.dataset.id === s.board.id);
      }
    }
    syncNav();
    applyFilter(filter, true);
    kick();
  }
  let camInit = false;
  const camLookCur = new THREE.Vector3();

  // ---- carousel (narrow) ----
  function syncNav() {
    if (prevBtn) prevBtn.hidden = !narrow || current <= 0;
    if (nextBtn) nextBtn.hidden = !narrow || current >= segments.length - 1;
    stage.toggleAttribute('data-carousel', narrow);
  }
  function goTo(i: number) {
    if (!narrow) return;
    const n = clamp(i, 0, segments.length - 1);
    if (n === current) return;
    current = n;
    const s = segments[current];
    const dx = s.group.position.x - camLook.x;
    camBase.x += dx;
    camLook.x += dx;
    camTarget.copy(camBase);
    lookTarget.copy(camLook);
    if (!motionEnabled()) {
      camera.position.copy(camBase);
      camLookCur.copy(camLook);
    }
    syncNav();
    kick();
  }
  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));

  // Swipe between modules on touch screens; a swipe never opens a book.
  let swipe: { x: number; y: number; id: number } | null = null;
  let swallowClick = false;
  stage.addEventListener('pointerdown', (e) => {
    if (narrow && e.pointerType !== 'mouse') swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  stage.addEventListener('pointerup', (e) => {
    if (!swipe || swipe.id !== e.pointerId) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swallowClick = true;
      setTimeout(() => (swallowClick = false), 400);
      goTo(current + (dx < 0 ? 1 : -1));
    }
  });
  stage.addEventListener('pointercancel', () => (swipe = null));
  stage.addEventListener('click', (e) => {
    if (swallowClick) {
      e.preventDefault();
      e.stopPropagation();
      swallowClick = false;
    }
  }, true);

  // ---- hover / focus ----
  let hovered: Book | null = null;
  let hoveredSeg: Segment | null = null;
  let selecting = false;

  function setHover(b: Book | null) {
    if (selecting || hovered === b) return;
    hovered = b;
    if (b && narrow) {
      const i = segments.findIndex((s) => s.books.includes(b));
      if (i >= 0) goTo(i);
    }
    showHolo(b);
    kick();
  }

  function showHolo(b: Book | null) {
    if (!holo) return;
    if (!b) {
      holo.classList.remove('shown');
      return;
    }
    const d = b.data;
    holo.querySelector('.holo-path')!.textContent = d.path || b.board.label;
    holo.querySelector('.holo-title')!.textContent = d.title;
    holo.querySelector('.holo-meta')!.textContent = [d.type && d.type[0].toUpperCase() + d.type.slice(1), d.date, `${d.minutes} min read`].filter(Boolean).join(' · ');
    const x = holo.querySelector<HTMLElement>('.holo-excerpt')!;
    x.textContent = d.excerpt ?? '';
    x.hidden = !d.excerpt;
    holo.style.setProperty('--holo', `var(${b.board.color})`);
    holo.classList.add('shown');
  }

  if (data.mode === 'books') {
    for (const b of books) {
      const a = b.link;
      if (!a) continue;
      a.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setHover(b); });
      a.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && hovered === b && document.activeElement !== a) setHover(null); });
      a.addEventListener('focus', () => setHover(b));
      a.addEventListener('blur', () => { if (hovered === b) setHover(null); });
      a.addEventListener('click', (e) => onSelect(e, b));
      a.addEventListener('keydown', (e) => onArrow(e, b));
    }
  } else {
    for (const a of links) {
      a.addEventListener('pointerenter', () => { hoveredSeg = segments.find((s) => s.link === a) ?? null; kick(); });
      a.addEventListener('pointerleave', () => { hoveredSeg = null; kick(); });
      a.addEventListener('focus', () => {
        hoveredSeg = segments.find((s) => s.link === a) ?? null;
        if (hoveredSeg && narrow) goTo(segments.indexOf(hoveredSeg));
        kick();
      });
      a.addEventListener('blur', () => { hoveredSeg = null; kick(); });
      a.addEventListener('click', (e) => onSelectBoard(e, a));
    }
  }

  // Arrow keys move between books (←/→) and shelves (↑/↓).
  function onArrow(e: KeyboardEvent, b: Book) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const visible = segments.map((s) => s.books.filter((x) => !x.filtered && x.link));
    const si = visible.findIndex((l) => l.includes(b));
    if (si < 0) return;
    const bi = visible[si].indexOf(b);
    let target: Book | undefined;
    if (e.key === 'ArrowRight') target = visible[si][bi + 1] ?? visible.slice(si + 1).find((l) => l.length)?.[0];
    if (e.key === 'ArrowLeft') target = visible[si][bi - 1] ?? [...visible.slice(0, si)].reverse().find((l) => l.length)?.slice(-1)[0];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const step = e.key === 'ArrowDown' ? 1 : -1;
      for (let i = si + step; i >= 0 && i < visible.length; i += step) {
        if (visible[i].length) { target = visible[i][Math.min(bi, visible[i].length - 1)]; break; }
      }
    }
    if (target?.link) {
      e.preventDefault();
      target.link.focus({ preventScroll: true });
    }
  }

  // ---- filter ----
  let filter = stage.dataset.filter ?? '';
  function applyFilter(type: string, instant = false) {
    filter = type;
    for (const b of books) {
      b.filtered = !!type && b.data.type !== type;
      if (b.link) {
        b.link.toggleAttribute('data-dim', b.filtered);
        b.link.tabIndex = b.filtered ? -1 : 0;
      }
      if (instant || !motionEnabled()) b.dim = b.filtered ? 1 : 0;
    }
    if (hovered?.filtered) setHover(null);
    kick();
  }
  stage.addEventListener('shelf-filter', (e) => applyFilter((e as CustomEvent<string>).detail ?? ''));

  // ---- selection: pull the book out, turn its cover to the reader, open it ----
  const tweens: Tween[] = [];
  const tween = (dur: number, ease: Tween['ease'], step: Tween['step'], delay = 0, done?: () => void) => {
    tweens.push({ start: performance.now() + delay, dur, ease, step, done });
    kick();
  };

  function onSelect(e: MouseEvent, b: Book) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!motionEnabled() || selecting) return; // reduced motion: plain navigation
    e.preventDefault();
    selecting = true;
    stage.classList.add('is-selecting');
    holo?.classList.remove('shown');
    const url = b.link!.href;

    // Build an openable copy of the book: page block, back cover, spine and a hinged front cover.
    const world = new THREE.Matrix4().copy(b.mesh.matrixWorld);
    const book = new THREE.Group();
    world.decompose(book.position, book.quaternion, book.scale);
    const { t, h } = b;
    const [coverMat, pagesMat, spineMat] = b.mats;
    const ct = 0.012;
    const block = new THREE.Mesh(new THREE.BoxGeometry(t - ct * 2, h * 0.97, BOOK_D * 0.97), pagesMat);
    block.position.z = -BOOK_D * 0.015;
    const back = new THREE.Mesh(new THREE.BoxGeometry(ct, h, BOOK_D), coverMat);
    back.position.x = -t / 2 + ct / 2;
    const spineGeo = new THREE.BoxGeometry(t, h, ct);
    const suv = spineGeo.attributes.uv as THREE.BufferAttribute;
    const cell = b.cell;
    for (let i = 16; i < 20; i++) suv.setXY(i, cell.u0 + suv.getX(i) * (cell.u1 - cell.u0), cell.v0 + suv.getY(i) * (cell.v1 - cell.v0));
    const spine = new THREE.Mesh(spineGeo, [coverMat, coverMat, coverMat, coverMat, spineMat, coverMat]);
    spine.position.z = BOOK_D / 2 - ct / 2;
    const hinge = new THREE.Group();
    hinge.position.set(t / 2 - ct / 2, 0, BOOK_D / 2);
    const art = coverArt(b, coverMat.userData.cloth as THREE.Color, h);
    const artMat = new THREE.MeshStandardMaterial({ map: art, roughness: 0.75, metalness: 0.1 });
    disposables.push(art, artMat);
    const front = new THREE.Mesh(new THREE.BoxGeometry(ct, h, BOOK_D), [artMat, pagesMat, coverMat, coverMat, coverMat, coverMat]);
    front.position.z = -BOOK_D / 2;
    hinge.add(front);
    book.add(block, back, spine, hinge);
    scene.add(book);
    b.mesh.visible = false;
    disposables.push(block.geometry, back.geometry, spineGeo, front.geometry);

    // Others fade back a little.
    for (const o of books) if (o !== b) o.filtered = true;

    const p0 = book.position.clone();
    const q0 = book.quaternion.clone();
    const outDir = new THREE.Vector3(0, 0, 1).applyQuaternion(q0);
    const p1 = p0.clone().addScaledVector(outDir, BOOK_D * 0.95);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = h / (2 * tan * 0.62);
    const p2 = camera.position.clone().addScaledVector(fwd, dist).add(new THREE.Vector3(BOOK_D * 0.35, 0, 0).applyQuaternion(camera.quaternion));
    const q2 = camera.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)));

    tween(300, easeOut, (k) => book.position.lerpVectors(p0, p1, k));
    tween(560, easeInOut, (k) => {
      book.position.lerpVectors(p1, p2, k);
      book.quaternion.slerpQuaternions(q0, q2, k);
    }, 240);
    tween(480, easeInOut, (k) => {
      hinge.rotation.y = -2.75 * k;
      glow.position.copy(book.position).addScaledVector(fwd, -0.5);
      glow.intensity = 3.2 * k;
    }, 760);
    tween(1, easeOut, () => revealTitle(b, book), 1060);
    tween(1, easeOut, () => {}, 1260, () => location.assign(url));
  }

  // Front cover for the volume being opened: cloth, a foil frame, the title and its shelf.
  function coverArt(b: Book, cloth: THREE.Color, h: number) {
    const w = 420, ch = Math.round((w * h) / BOOK_D);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = ch;
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, w, ch);
    g.addColorStop(0, `#${cloth.clone().multiplyScalar(1.15).getHexString()}`);
    g.addColorStop(1, `#${cloth.clone().multiplyScalar(0.7).getHexString()}`);
    x.fillStyle = g;
    x.fillRect(0, 0, w, ch);
    // Spine shadow by the hinge.
    const s = x.createLinearGradient(0, 0, 40, 0);
    s.addColorStop(0, 'rgba(0,0,0,0.35)');
    s.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = s;
    x.fillRect(0, 0, 40, ch);
    const gold = `#${palette.accent.getHexString()}`;
    x.strokeStyle = gold;
    x.lineWidth = 2;
    x.strokeRect(34, 30, w - 64, ch - 60);
    x.lineWidth = 1;
    x.strokeRect(42, 38, w - 80, ch - 76);
    x.fillStyle = gold;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = `28px ${fonts.display}`;
    x.fillText('✦', w / 2, 96);
    x.font = `500 13px ${fonts.mono}`;
    x.fillText((b.board.label || '').toUpperCase().split('').join(' '), w / 2, ch - 78);
    // Title, wrapped. Thai has no spaces between words, so break on word segments.
    x.font = `500 30px ${fonts.display}`;
    const maxW = w - 120;
    const seg = (str: string, granularity: 'word' | 'grapheme') =>
      typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('th', { granularity }).segment(str)].map((p) => p.segment) : str.split(granularity === 'word' ? /(\s+)/ : '');
    const lines: string[] = [];
    let line = '';
    for (const word of seg(b.data.title, 'word')) {
      if (x.measureText(line + word).width <= maxW) { line += word; continue; }
      if (line.trim()) lines.push(line.trim());
      line = '';
      for (const g of seg(word.trimStart(), 'grapheme')) {
        if (x.measureText(line + g).width > maxW) { lines.push(line); line = ''; }
        line += g;
      }
    }
    if (line.trim()) lines.push(line.trim());
    const shown = lines.slice(0, 6);
    const lh = 40;
    const y0 = ch / 2 - ((shown.length - 1) * lh) / 2 - 10;
    x.fillStyle = `#${palette.text.getHexString()}`;
    shown.forEach((l, i) => x.fillText(l, w / 2, y0 + i * lh));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  // The link's own title takes the opened book's place so the page heading can morph from it.
  function revealTitle(b: Book, book: THREE.Object3D) {
    const a = b.link;
    const span = a?.querySelector<HTMLElement>('.shelf-link-title');
    if (!a || !span) return;
    const box = new THREE.Box3().setFromObject(book);
    const r = projectBox(box);
    // Stretch the link over the stage so its title can sit over the opened book.
    a.classList.add('is-opening');
    a.style.transform = 'none';
    a.style.width = `${W}px`;
    a.style.height = `${H}px`;
    span.style.left = `${((r.x0 + r.x1) / 2).toFixed(1)}px`;
    span.style.top = `${((r.y0 + r.y1) / 2).toFixed(1)}px`;
    span.style.maxWidth = `${Math.max(160, (r.x1 - r.x0) * 0.85).toFixed(0)}px`;
  }

  function onSelectBoard(e: MouseEvent, a: HTMLAnchorElement) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!motionEnabled() || selecting) return;
    const seg = segments.find((s) => s.link === a);
    if (!seg) return;
    e.preventDefault();
    selecting = true;
    stage.classList.add('is-selecting');
    a.classList.add('is-opening');
    const from = camera.position.clone();
    const look0 = camLookCur.clone();
    const centre = seg.group.position.clone().add(new THREE.Vector3(0, BOOK_H * 0.45, 0));
    const to = centre.clone().add(new THREE.Vector3(0, 0.15, 1.5));
    tween(620, easeIn, (k) => {
      camera.position.lerpVectors(from, to, k);
      camLookCur.lerpVectors(look0, centre, k);
    }, 0, () => {
      try { sessionStorage.setItem('planktos:arrive', 'dock'); } catch {}
      location.assign(a.href);
    });
  }

  function resetSelection() {
    if (!selecting) return;
    selecting = false;
    stage.classList.remove('is-selecting');
    tweens.length = 0;
    glow.intensity = 0;
    scene.children.filter((o) => o.type === 'Group' && !segments.some((s) => s.group === o)).forEach((o) => scene.remove(o));
    for (const b of books) {
      b.mesh.visible = true;
      b.link?.classList.remove('is-opening');
      b.link?.querySelector<HTMLElement>('.shelf-link-title')?.removeAttribute('style');
    }
    links.forEach((a) => a.classList.remove('is-opening'));
    applyFilter(filter, true);
    camera.position.copy(camBase);
    camLookCur.copy(camLook);
    kick();
  }
  // Coming back via the back button restores the page from bfcache: put the book back.
  addEventListener('pageshow', (e) => { if (e.persisted) resetSelection(); });

  // ---- projection helpers ----
  const v = new THREE.Vector3();
  const toScreen = (p: THREE.Vector3) => {
    v.copy(p).project(camera);
    return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
  };
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  function projectBox(box: THREE.Box3) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      const x = ((v.x + 1) / 2) * W, y = ((1 - v.y) / 2) * H;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { x0, y0, x1, y1 };
  }
  const coarse = matchMedia('(pointer: coarse)').matches;
  const box3 = new THREE.Box3();

  function placeOverlays() {
    if (data.mode === 'books') {
      for (const b of books) {
        const a = b.link;
        if (!a || a.classList.contains('is-opening')) continue;
        const ht = b.t / 2, hh = b.h / 2, hd = BOOK_D / 2;
        corners[0].set(-ht, -hh, hd); corners[1].set(ht, -hh, hd); corners[2].set(-ht, hh, hd); corners[3].set(ht, hh, hd);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const c of corners) {
          const s = toScreen(b.mesh.localToWorld(c));
          x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y);
        }
        const minW = coarse ? 44 : 14;
        if (x1 - x0 < minW) { const c = (x0 + x1) / 2; x0 = c - minW / 2; x1 = c + minW / 2; }
        const off = x1 < -40 || x0 > W + 40;
        a.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)`;
        a.style.width = `${(x1 - x0).toFixed(1)}px`;
        a.style.height = `${(y1 - y0).toFixed(1)}px`;
        a.style.visibility = off ? 'hidden' : '';
      }
      for (const s of segments) {
        if (!s.label) continue;
        const p = toScreen(v.set(s.group.position.x, s.group.position.y - 0.12, s.group.position.z + BOOK_D / 2 + 0.1));
        s.label.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translateX(-50%)`;
        s.label.style.visibility = p.x < -200 || p.x > W + 200 ? 'hidden' : '';
      }
      if (holo && hovered && holo.classList.contains('shown') && hovered.link) {
        const a = hovered.link;
        const r = a.getBoundingClientRect(), sr = stage.getBoundingClientRect();
        const hw = holo.offsetWidth, hh = holo.offsetHeight;
        let x = r.left - sr.left + r.width / 2 - hw / 2;
        x = clamp(x, 12, W - hw - 12);
        let y = r.top - sr.top - hh - 14;
        if (y < 12) y = Math.min(H - hh - 12, r.bottom - sr.top + 14);
        holo.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    } else {
      for (const s of segments) {
        const a = s.link;
        if (!a) continue;
        box3.setFromObject(s.group);
        box3.min.y = Math.min(box3.min.y, s.group.position.y - 0.05);
        box3.max.y = Math.max(box3.max.y, s.group.position.y + BOOK_H);
        const r = projectBox(box3);
        a.style.transform = `translate(${r.x0.toFixed(1)}px, ${r.y0.toFixed(1)}px)`;
        a.style.width = `${(r.x1 - r.x0).toFixed(1)}px`;
        a.style.height = `${(r.y1 - r.y0).toFixed(1)}px`;
        a.style.visibility = r.x1 < -40 || r.x0 > W + 40 ? 'hidden' : '';
      }
    }
  }

  // ---- pointer parallax ----
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    par.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    par.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    kick();
  });
  stage.addEventListener('pointerleave', () => { par.tx = par.ty = 0; kick(); });

  // ---- loop ----
  let raf = 0;
  let visible = false;
  let last = 0;
  let elapsed = 0;

  function frame(now: number) {
    raf = 0;
    const dt = last ? Math.min(now - last, 64) / 1000 : 1 / 60;
    last = now;
    const moving = motionEnabled();
    if (moving) elapsed += dt;
    let settling = false;
    const approach = (cur: number, to: number, rate: number) => {
      if (!moving) return to;
      const n = cur + (to - cur) * (1 - Math.exp(-rate * dt));
      if (Math.abs(n - to) > 0.001) settling = true;
      return Math.abs(n - to) > 0.001 ? n : to;
    };

    // Tweens.
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const k = clamp((now - tw.start) / tw.dur, 0, 1);
      if (now < tw.start) continue;
      tw.step(tw.ease(k));
      if (k >= 1) {
        tweens.splice(i, 1);
        tw.done?.();
      }
    }

    // Camera: carousel pan + gentle parallax (not while a selection drives it).
    if (!selecting) {
      par.x = approach(par.x, moving ? par.tx : 0, 4);
      par.y = approach(par.y, moving ? par.ty : 0, 4);
      const px = camTarget.x + par.x * 0.22, py = camTarget.y - par.y * 0.14;
      camera.position.x = approach(camera.position.x, px, 5);
      camera.position.y = approach(camera.position.y, py, 5);
      camera.position.z = approach(camera.position.z, camTarget.z, 5);
      camLookCur.x = approach(camLookCur.x, lookTarget.x, 5);
      camLookCur.y = approach(camLookCur.y, lookTarget.y, 5);
      camLookCur.z = lookTarget.z;
    }
    camera.lookAt(camLookCur);

    // Zero gravity: modules bob and roll; books hover a hair above their shelf.
    for (const s of segments) {
      const hoverTo = s === hoveredSeg ? 1 : 0;
      s.hover = approach(s.hover, hoverTo, 7);
      const bob = moving ? Math.sin(elapsed * 0.55 + s.phase) * 0.035 : 0;
      s.group.rotation.z = moving ? Math.sin(elapsed * 0.33 + s.phase) * 0.012 : 0;
      s.group.rotation.x = moving ? Math.sin(elapsed * 0.27 + s.phase * 1.7) * 0.01 : 0;
      s.group.position.y = baseY(s) + bob + s.hover * 0.12;
    }
    for (const b of books) {
      const outTo = b === hovered ? 1 : 0;
      b.out = approach(b.out, outTo, 9);
      b.dim = approach(b.dim, b.filtered ? 1 : 0, 6);
      // Hovered: slides out, lifts and tips its head toward the reader.
      b.mover.position.z = b.out * BOOK_D * 0.38 - b.dim * 0.14;
      b.mover.position.y = b.out * 0.07 + (moving ? Math.sin(elapsed * 1.1 + b.phase) * 0.004 : 0);
      b.mover.rotation.x = b.out * 0.09;
      b.mover.rotation.y = moving ? Math.sin(elapsed * 0.7 + b.phase) * 0.012 : 0;
      const lum = 1 - b.dim * 0.72;
      const [cover, pages, spine] = b.mats;
      cover.color.copy(cover.userData.cloth as THREE.Color).multiplyScalar(lum);
      pages.color.setScalar(lum);
      spine.color.setScalar(lum);
      spine.emissive.copy(palette.accent).multiplyScalar(b.out * 0.16);
    }

    renderer.render(scene, camera);
    placeOverlays();

    if (tweens.length || settling || (moving && visible && !document.hidden)) kick();
  }
  const baseY = (s: Segment) => s.group.userData.y as number;

  function kick() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  // ---- lifecycle ----
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    last = 0;
    kick();
  });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => { last = 0; kick(); });
  onMotionChange(() => { last = 0; kick(); });

  let lastW = 0;
  const ro = new ResizeObserver(() => {
    const w = stage.clientWidth;
    if (Math.abs(w - lastW) < 1) return;
    lastW = w;
    layout();
  });

  // Covers keep their cloth colour; dimming scales it.
  for (const b of books) b.mats[0].userData.cloth = b.mats[0].color.clone();

  ro.observe(stage);
  lastW = stage.clientWidth;
  layout();
  stage.classList.add('is-ready');

  // Arriving from the home station's warp (or docking from another shelf):
  // the camera pulls back out of the bay while the modules drift into place.
  const arrive = stage.dataset.arrive;
  delete stage.dataset.arrive;
  if (arrive && motionEnabled()) {
    if (arrive === 'warp' && stage.getBoundingClientRect().top > innerHeight * 0.3) stage.scrollIntoView({ block: 'center' });
    stage.classList.add('is-arriving');
    selecting = true;
    const start = camLook.clone().add(new THREE.Vector3(0, 0.25, 1.4));
    const fov0 = arrive === 'warp' ? 78 : 52;
    camera.position.copy(start);
    camera.fov = fov0;
    camera.updateProjectionMatrix();
    segments.forEach((s) => (s.group.position.z -= 7));
    // Render once first so shader compilation doesn't eat the animation.
    camera.lookAt(camLookCur);
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    tween(1500, easeOut, (k) => {
      camera.position.lerpVectors(start, camBase, k);
      camera.fov = fov0 + (FOV - fov0) * k;
      camera.updateProjectionMatrix();
    }, 0, () => {
      selecting = false;
      stage.classList.remove('is-arriving');
    });
    segments.forEach((s, i) => {
      const z = s.group.position.z + 7;
      tween(1300, easeOut, (k) => (s.group.position.z = z - 7 * (1 - k)), 80 * i);
    });
  }

  // ?book=<slug>: coming back from a note, find its book again.
  const want = new URLSearchParams(location.search).get('book');
  const wanted = want ? books.find((b) => b.data.id === want) : undefined;
  if (wanted?.link) {
    requestAnimationFrame(() => {
      wanted.link!.focus({ preventScroll: true });
      setHover(wanted);
    });
  }

  addEventListener('pagehide', (e) => {
    if (e.persisted) return;
    io.disconnect();
    ro.disconnect();
    clearSegments();
    atlas.dispose();
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
  });
}
