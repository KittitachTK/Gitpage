/**
 * Home hero in 3D: the archive station. A habitat ring turns slowly around a
 * hub whose bay glows behind the title; one shelf module per section orbits
 * the station, stocked with that section's latest volumes.
 *
 * "Enter archive" (or a module) warps the camera through the bay / to the
 * module, then hands over to the Library, whose shelf scene plays the arrival
 * (see `planktos:arrive` in scripts/shelf.ts). Every module is backed by a
 * real link; with motion off the scene is a still frame and links navigate
 * normally; without WebGL the 2D starfield and nebula remain.
 */
import * as THREE from 'three';
import { motionEnabled, onMotionChange } from './motion';
import { BOOK_D, SpineAtlas, hash, heightOf, readPalette, thickness, type ShelfBook } from './shelf';

export interface HomeModule {
  id: string;
  label: string;
  /** CSS custom property holding the section colour. */
  color: string;
  url: string;
  count: number;
  books: ShelfBook[];
}

const RING_R = 3.6;
const ORBIT_R = 5.6;
const FOV = 40;
const MODULE_SCALE = 0.72;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;

function glowTexture(stops: [number, string][]) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [o, col] of stops) g.addColorStop(o, col);
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function mountHome3D(hero: HTMLElement, canvas: HTMLCanvasElement, modules: HomeModule[], opts: { intro: boolean }) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return;
  }
  const small = matchMedia('(max-width: 720px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const palette = readPalette(hero);
  const cs = getComputedStyle(hero);
  const fonts = {
    display: cs.getPropertyValue('--font-display').trim() || 'sans-serif',
    mono: cs.getPropertyValue('--font-mono').trim() || 'monospace',
  };
  const colorOf = (name: string) => new THREE.Color(cs.getPropertyValue(name).trim() || '#8e939c');
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(d: T) => (disposables.push(d), d);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0x9aa6c8, 0x05070b, 0.5));
  const star = new THREE.DirectionalLight(0xffe7c4, 1.7);
  star.position.set(-8, 6, 7);
  scene.add(star);
  const rim = new THREE.DirectionalLight(0xa8b8ff, 0.9);
  rim.position.set(7, 3, -6);
  scene.add(rim);

  // ---- the station ----
  const station = new THREE.Group();
  station.position.set(0, -0.35, -3);
  station.rotation.x = -0.42;
  scene.add(station);
  const spin = new THREE.Group(); // the habitat ring turns; the hub does not
  station.add(spin);

  const hull = keep(new THREE.MeshStandardMaterial({ color: 0x5a6478, metalness: 0.72, roughness: 0.36 }));
  const hullDark = keep(new THREE.MeshStandardMaterial({ color: 0x2b3242, metalness: 0.8, roughness: 0.3 }));
  const gold = keep(new THREE.MeshBasicMaterial({ color: palette.accent }));

  const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(RING_R, 0.22, 24, 160)), hull);
  spin.add(ring);
  // Lit windows around the ring's outer face.
  const winTex = (() => {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 64;
    const x = c.getContext('2d')!;
    for (let i = 0; i < 180; i++) {
      if (hash('w' + i) < 0.28) continue;
      x.fillStyle = hash('c' + i) < 0.82 ? 'rgba(232,212,172,0.95)' : 'rgba(169,163,198,0.9)';
      x.fillRect(i * (2048 / 180) + 2, 26, 6, 12);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return keep(t);
  })();
  const windows = new THREE.Mesh(
    keep(new THREE.TorusGeometry(RING_R, 0.226, 16, 160)),
    keep(new THREE.MeshBasicMaterial({ map: winTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
  );
  spin.add(windows);
  for (const r of [RING_R - 0.27, RING_R + 0.27]) {
    const trim = new THREE.Mesh(keep(new THREE.TorusGeometry(r, 0.025, 8, 160)), hullDark);
    spin.add(trim);
  }
  const spokeGeo = keep(new THREE.CylinderGeometry(0.045, 0.045, RING_R - 0.6, 8));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(spokeGeo, hullDark);
    spoke.position.set(Math.cos(a) * (RING_R / 2 + 0.3), Math.sin(a) * (RING_R / 2 + 0.3), 0);
    spoke.rotation.z = a - Math.PI / 2;
    spin.add(spoke);
  }
  const inner = new THREE.Mesh(keep(new THREE.TorusGeometry(2.1, 0.03, 8, 120)), keep(new THREE.MeshBasicMaterial({ color: palette.accent2, transparent: true, opacity: 0.55 })));
  spin.add(inner);

  // Hub along the ring's axis, with the library bay facing the reader.
  const hub = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.62, 0.62, 2.2, 40)), hull);
  hub.rotation.x = Math.PI / 2;
  station.add(hub);
  for (const z of [-0.7, 0, 0.7]) {
    const band = new THREE.Mesh(keep(new THREE.TorusGeometry(0.63, 0.03, 8, 48)), hullDark);
    band.position.z = z;
    station.add(band);
  }
  const lip = new THREE.Mesh(keep(new THREE.TorusGeometry(0.62, 0.035, 12, 64)), gold);
  lip.position.z = 1.11;
  station.add(lip);
  const bayTex = keep(glowTexture([[0, 'rgba(255,240,214,1)'], [0.35, 'rgba(214,185,140,0.85)'], [0.75, 'rgba(169,163,198,0.35)'], [1, 'rgba(169,163,198,0)']]));
  const bay = new THREE.Mesh(keep(new THREE.CircleGeometry(0.56, 48)), keep(new THREE.MeshBasicMaterial({ map: bayTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  bay.position.z = 1.115;
  station.add(bay);
  const haloTex = keep(glowTexture([[0, 'rgba(255,255,255,0.55)'], [0.3, 'rgba(255,255,255,0.14)'], [1, 'rgba(255,255,255,0)']]));
  const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: haloTex, color: palette.accent2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  halo.scale.set(5, 5, 1);
  halo.position.z = 1.2;
  station.add(halo);
  const bayLight = new THREE.PointLight(palette.accent, 3, 9, 1.6);
  bayLight.position.z = 1.6;
  station.add(bayLight);
  // Antennae off the back of the hub.
  for (const s of [-1, 1]) {
    const mast = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6)), hullDark);
    mast.rotation.x = Math.PI / 2;
    mast.position.set(s * 0.32, 0, -1.9);
    station.add(mast);
    const tip = new THREE.Mesh(keep(new THREE.SphereGeometry(0.05, 10, 10)), gold);
    tip.position.set(s * 0.32, 0, -2.7);
    station.add(tip);
  }

  // ---- shelf modules in orbit ----
  const atlas = new SpineAtlas(fonts, palette);
  const plankMat = keep(new THREE.MeshStandardMaterial({ color: 0x46506a, metalness: 0.6, roughness: 0.34 }));
  const pageMat = keep(new THREE.MeshStandardMaterial({ color: 0xe8dfcb, roughness: 0.95 }));
  interface Mod { data: HomeModule; group: THREE.Group; strip: THREE.MeshBasicMaterial; base: number; link?: HTMLAnchorElement; hover: number; front: boolean; w: number }
  const links = [...hero.querySelectorAll<HTMLAnchorElement>('a.orbit-link')];
  const mods: Mod[] = modules.map((m, i) => {
    const color = colorOf(m.color);
    const group = new THREE.Group();
    const books = m.books.slice(0, 8);
    const content = books.reduce((s, b) => s + thickness(b.minutes), 0) + 0.018 * Math.max(0, books.length - 1);
    const w = Math.max(1.2, content + 0.3);
    const plank = new THREE.Mesh(keep(new THREE.BoxGeometry(w, 0.05, BOOK_D + 0.18)), plankMat);
    plank.position.y = -0.025;
    group.add(plank);
    const strip = keep(new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.25) }));
    const stripMesh = new THREE.Mesh(keep(new THREE.BoxGeometry(w, 0.012, 0.012)), strip);
    stripMesh.position.set(0, -0.022, (BOOK_D + 0.18) / 2 + 0.004);
    group.add(stripMesh);
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.065, 0.14, 16)), hullDark);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(side * (w / 2 + 0.06), -0.025, 0);
      group.add(cap);
    }
    const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })));
    glow.scale.set(w * 1.8, 1.2, 1);
    glow.position.set(0, 0.1, -0.5);
    group.add(glow);
    let x = -content / 2;
    for (const b of books) {
      const t = thickness(b.minutes), h = heightOf(b.id);
      const tint = color.clone().offsetHSL((hash(b.id + 'hue') - 0.5) * 0.045, 0.16, -0.06 + (hash(b.id + 'shade') - 0.5) * 0.12);
      const cell = atlas.draw(b, tint, t, h);
      const geo = keep(new THREE.BoxGeometry(t, h, BOOK_D));
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      for (let k = 16; k < 20; k++) uv.setXY(k, cell.u0 + uv.getX(k) * (cell.u1 - cell.u0), cell.v0 + uv.getY(k) * (cell.v1 - cell.v0));
      const cover = keep(new THREE.MeshStandardMaterial({ color: tint.clone().lerp(palette.bg, 0.22), roughness: 0.82 }));
      const spine = keep(new THREE.MeshStandardMaterial({ map: cell.texture, roughness: 0.7 }));
      const book = new THREE.Mesh(geo, [cover, cover, pageMat, pageMat, spine, pageMat]);
      book.position.set(x + t / 2, h / 2 + 0.006, 0);
      book.rotation.z = (hash(b.id + 'lean') - 0.5) * 0.035;
      group.add(book);
      x += t + 0.018;
    }
    if (!books.length) {
      const ghost = new THREE.Mesh(keep(new THREE.BoxGeometry(w - 0.3, 0.7, BOOK_D * 0.8)), keep(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.2 })));
      ghost.position.y = 0.36;
      group.add(ghost);
    }
    group.scale.setScalar(MODULE_SCALE);
    scene.add(group);
    return { data: m, group, strip, base: (i / modules.length) * Math.PI * 2 + 0.5, link: links.find((a) => a.dataset.id === m.id), hover: 0, front: true, w };
  });

  // ---- stars: points normally, streaks during the warp ----
  const N = small ? 700 : 1400;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 2] = -70 + Math.random() * 84;
  }
  const starGeo = keep(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, keep(new THREE.PointsMaterial({ color: 0xe6e2d8, size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false })));
  scene.add(stars);
  const seg = new Float32Array(N * 6), end = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    seg.set([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], i * 6);
    end[i * 2 + 1] = 1;
  }
  const streakGeo = keep(new THREE.BufferGeometry());
  streakGeo.setAttribute('position', new THREE.BufferAttribute(seg, 3));
  streakGeo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const streakMat = keep(new THREE.ShaderMaterial({
    uniforms: { uStretch: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0xf2e6cf) } },
    vertexShader: `attribute float aEnd; uniform float uStretch; varying float vEnd;
      void main() { vec3 p = position; p.z += aEnd * uStretch; vEnd = aEnd; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying float vEnd;
      void main() { gl_FragColor = vec4(uColor, uOpacity * (1.0 - vEnd * 0.85)); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const streaks = new THREE.LineSegments(streakGeo, streakMat);
  scene.add(streaks);

  // ---- camera ----
  const base = new THREE.Vector3(0, 0.45, 16);
  const look = new THREE.Vector3(0, -0.45, -3);
  const camTarget = new THREE.Vector3();
  let W = 1, H = 1;
  // The station is framed in `.hero-stage` (beside the text on wide screens,
  // below it on narrow ones): the projection is shifted onto that box and the
  // distance fitted so the whole orbit fits inside it.
  const stageEl = hero.querySelector<HTMLElement>('.hero-stage');
  const offset = { x: 0, y: 0 };
  function applyOffset(k = 1) {
    camera.setViewOffset(W, H, offset.x * k, offset.y * k, W, H);
  }
  function resize() {
    W = hero.clientWidth || 1;
    H = hero.clientHeight || 1;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const hr = hero.getBoundingClientRect();
    const fr = stageEl?.getBoundingClientRect();
    const fx = fr && fr.width > 40 ? fr.left - hr.left : 0, fy = fr && fr.height > 40 ? fr.top - hr.top : 0;
    const fw = fr && fr.width > 40 ? fr.width : W, fh = fr && fr.height > 40 ? fr.height : H;
    offset.x = W / 2 - (fx + fw / 2);
    offset.y = H / 2 - (fy + fh / 2);
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const span = { w: ORBIT_R * 2 * 1.12 + 1.6, h: ORBIT_R * 2 * 0.92 * Math.cos(0.42) + 2.2 };
    const d = Math.max((span.w * H) / (2 * tan * fw), (span.h * H) / (2 * tan * fh));
    base.z = d + station.position.z; // camera distance to the station is d
    if (!warping) applyOffset();
    camera.updateProjectionMatrix();
    kick();
  }

  const lookCur = look.clone();
  let raf = 0, last = 0, t = 0, orbitT = 0, orbitSpeed = 1, visible = false;

  // ---- tweens / state ----
  interface Tween { start: number; dur: number; ease: (t: number) => number; step: (k: number) => void; done?: () => void }
  const tweens: Tween[] = [];
  const tween = (dur: number, ease: Tween['ease'], step: Tween['step'], delay = 0, done?: () => void) => {
    tweens.push({ start: performance.now() + delay, dur, ease, step, done });
    kick();
  };
  let warping = false;
  let introK = 1; // 0 → 1 while the opening flight plays
  const startIntro = () => {
    if (!opts.intro || !motionEnabled()) return;
    introK = 0;
    tween(2800, easeOut, (k) => (introK = k), 100);
  };

  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    par.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    par.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    kick();
  });
  hero.addEventListener('pointerleave', () => { par.tx = par.ty = 0; kick(); });
  addEventListener('scroll', () => kick(), { passive: true });

  let hovered: Mod | null = null;
  for (const m of mods) {
    const a = m.link;
    if (!a) continue;
    a.addEventListener('pointerenter', () => { hovered = m; kick(); });
    a.addEventListener('pointerleave', () => { if (hovered === m) hovered = null; kick(); });
    a.addEventListener('focus', () => { hovered = m; kick(); });
    a.addEventListener('blur', () => { if (hovered === m) hovered = null; kick(); });
    a.addEventListener('click', (e) => {
      if (!canWarp(e)) return;
      e.preventDefault();
      const p = m.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.35, 0));
      warp(p, p.clone().add(new THREE.Vector3(0, 0.1, 1.1)), a.href, 'dock');
    });
  }
  for (const a of hero.querySelectorAll<HTMLAnchorElement>('a[data-warp]')) {
    a.addEventListener('click', (e) => {
      if (!canWarp(e)) return;
      e.preventDefault();
      const bayPos = bay.getWorldPosition(new THREE.Vector3());
      const through = bayPos.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(station.quaternion).multiplyScalar(3));
      warp(bayPos, through, a.href, 'warp');
    });
  }
  function canWarp(e: MouseEvent) {
    return !warping && motionEnabled() && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
  }

  // Fly to `focus`, then through to `to`; the screen fades to deep space and the Library takes over.
  function warp(focus: THREE.Vector3, to: THREE.Vector3, url: string, kind: 'warp' | 'dock') {
    warping = true;
    hero.classList.add('is-warping');
    const from = camera.position.clone();
    const look0 = lookCur.clone();
    tween(1150, easeIn, (k) => {
      camera.position.lerpVectors(from, to, k);
      lookCur.lerpVectors(look0, focus, Math.min(1, k * 1.6));
      camera.fov = FOV + 38 * k;
      applyOffset(1 - Math.min(1, k * 1.4)); // swing the bay to the centre of the screen
      camera.updateProjectionMatrix();
      streakMat.uniforms.uStretch.value = 9 * k;
      streakMat.uniforms.uOpacity.value = Math.min(1, k * 1.5);
      (stars.material as THREE.PointsMaterial).opacity = 0.85 * (1 - k);
    }, 0, () => {
      try { sessionStorage.setItem('planktos:arrive', kind); } catch {}
      location.assign(url);
    });
  }
  function resetWarp() {
    if (!warping) return;
    warping = false;
    tweens.length = 0;
    hero.classList.remove('is-warping');
    camera.fov = FOV;
    applyOffset();
    camera.updateProjectionMatrix();
    streakMat.uniforms.uStretch.value = 0;
    streakMat.uniforms.uOpacity.value = 0;
    (stars.material as THREE.PointsMaterial).opacity = 0.85;
    camera.position.copy(base);
    lookCur.copy(look);
    kick();
  }
  addEventListener('pageshow', (e) => { if (e.persisted) resetWarp(); });

  // ---- loop ----
  camera.position.copy(base);
  const v = new THREE.Vector3();
  const box = new THREE.Box3();
  const stationInv = new THREE.Matrix4();
  const intro0 = new THREE.Vector3(0, 3.2, 52);

  function frame(now: number) {
    raf = 0;
    const dt = last ? Math.min(now - last, 64) / 1000 : 1 / 60;
    last = now;
    const moving = motionEnabled();
    let settling = false;
    const approach = (cur: number, to: number, rate: number) => {
      if (!moving) return to;
      const n = cur + (to - cur) * (1 - Math.exp(-rate * dt));
      if (Math.abs(n - to) > 0.0005) settling = true;
      return n;
    };
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      if (now < tw.start) continue;
      const k = clamp((now - tw.start) / tw.dur, 0, 1);
      tw.step(tw.ease(k));
      if (k >= 1) { tweens.splice(i, 1); tw.done?.(); }
    }

    if (moving) {
      t += dt;
      orbitSpeed = approach(orbitSpeed, hovered ? 0 : 1, 3);
      orbitT += dt * 0.045 * orbitSpeed;
      spin.rotation.z += dt * 0.06;
    }

    // Camera: opening flight, scroll dolly and pointer parallax (the warp drives it itself).
    if (!warping) {
      const p = clamp(scrollY / Math.max(1, hero.offsetHeight), 0, 1);
      par.x = approach(par.x, moving ? par.tx : 0, 3);
      par.y = approach(par.y, moving ? par.ty : 0, 3);
      camTarget.set(base.x + par.x * 0.7, base.y - par.y * 0.4 - p * 1.6, base.z - (moving ? p * 6 : 0));
      if (introK < 1) camTarget.lerpVectors(intro0, camTarget, introK);
      camera.position.set(
        approach(camera.position.x, camTarget.x, introK < 1 ? 60 : 4),
        approach(camera.position.y, camTarget.y, introK < 1 ? 60 : 4),
        approach(camera.position.z, camTarget.z, introK < 1 ? 60 : 4),
      );
      lookCur.copy(look);
    }
    camera.lookAt(lookCur);

    // Modules ride an orbit in the ring's plane, kept upright, turned toward the reader.
    station.updateMatrixWorld();
    stationInv.copy(station.matrixWorld);
    for (const m of mods) {
      const a = m.base + orbitT;
      v.set(Math.cos(a) * ORBIT_R * 1.12, Math.sin(a) * ORBIT_R * 0.92, 0).applyMatrix4(stationInv);
      m.hover = approach(m.hover, hovered === m ? 1 : 0, 6);
      const bob = moving ? Math.sin(t * 0.6 + m.base * 3) * 0.08 : 0;
      m.group.position.set(v.x, v.y + bob + m.hover * 0.15, v.z);
      m.group.rotation.y = Math.atan2(camera.position.x - v.x, camera.position.z - v.z) * 0.6;
      m.group.rotation.z = moving ? Math.sin(t * 0.4 + m.base) * 0.03 : 0;
      m.group.scale.setScalar(MODULE_SCALE * (1 + m.hover * 0.12));
      // The orbit is wider than the ring, so modules are never hidden behind the station.
      m.front = true;
      m.strip.color.copy(colorOf(m.data.color)).multiplyScalar(1.25 + m.hover * 0.8);
    }

    renderer.render(scene, camera);

    // Links follow their modules; those behind the station can't be clicked.
    for (const m of mods) {
      const a = m.link;
      if (!a) continue;
      box.setFromObject(m.group);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
        const sx = ((v.x + 1) / 2) * W, sy = ((1 - v.y) / 2) * H;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      a.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)`;
      a.style.width = `${Math.max(44, x1 - x0).toFixed(1)}px`;
      a.style.height = `${Math.max(44, y1 - y0).toFixed(1)}px`;
      // Keep the label on screen: centred under its module, clamped to the hero's edges.
      const label = a.firstElementChild as HTMLElement | null;
      if (label) {
        const lw = label.offsetWidth;
        const left = clamp((x0 + x1) / 2 - lw / 2, 8, Math.max(8, W - lw - 8));
        label.style.transform = `translateX(${(left - x0).toFixed(1)}px)`;
      }
      a.toggleAttribute('data-behind', !m.front);
      a.tabIndex = m.front ? 0 : -1;
    }

    if (tweens.length || settling || (moving && visible && !document.hidden)) kick();
  }
  function kick() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = 0; kick(); });
  io.observe(hero);
  document.addEventListener('visibilitychange', () => { last = 0; kick(); });
  onMotionChange(() => { last = 0; kick(); });
  const ro = new ResizeObserver(resize);
  ro.observe(hero);
  if (stageEl) ro.observe(stageEl);
  resize();
  // Compile shaders and upload textures now, so the opening flight starts on a warm GPU.
  camera.position.copy(opts.intro && motionEnabled() ? intro0 : base);
  camera.lookAt(look);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  startIntro();
  hero.classList.add('has-3d');

  addEventListener('pagehide', (e) => {
    if (e.persisted) return;
    io.disconnect();
    atlas.dispose();
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
  });
}
