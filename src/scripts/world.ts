/**
 * The 3D world behind every page: one WebGL renderer, one camera, two painted dioramas.
 *
 *   creation  Michelangelo's fresco as a relief (home page)
 *   garden    Thomas Cole's Garden of Eden in depth layers (everything else)
 *
 * Its canvas lives in components/World.astro, which persists across ClientRouter
 * navigations; each page names a scene and a pose (lib/world.ts) and the camera flies
 * there from wherever it was. Changing diorama passes through heaven's light: touching
 * the spark on the home page flies into the gap between the fingers, the light floods in,
 * and the camera descends from the sky into the garden.
 */
import * as THREE from 'three';
import type { Pose } from '../lib/world';
import { buildDiorama, REF_FOV, type Diorama, type DioramaMeta, type Station } from './diorama';

export type SceneName = 'creation' | 'garden';

interface CamState { pos: THREE.Vector3; look: THREE.Vector3; fov: number; light: number; night: number; veil: number }
interface Flight { from: CamState; to: CamState; t0: number; dur: number; descent: boolean; done?: () => void }

/** High over the garden, in the light (where the descent from the Creation begins). */
const HEAVEN: Station = { pos: [0, 0.9, 0.5], look: [0, 5, -10], fov: 38 };

export interface World {
  /** Fly to a page's place. Resolves once its diorama is loaded and the flight has begun. */
  show(scene: SceneName, pose: Pose): Promise<void>;
  /** Extra wash of the page background over the painting (e.g. scrolling past the home hero). */
  setExtraVeil(v: number): void;
  /** Re-read theme colours. */
  refresh(): void;
  /** Home: Adam and God drift together out of the light. */
  intro(): void;
  /** Home: the fingers meet and the camera flies into the light between them; `done` when it is white. */
  touch(done: () => void): void;
  /** Screen position (CSS px) of the gap between the fingers, while the creation is shown. */
  gapScreen(): { x: number; y: number } | null;
  readonly active: SceneName | null;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);

export function createWorld(canvas: HTMLCanvasElement, artBase: string): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xfbf3df); // heaven's light above the painted sky
  renderer.autoClear = false;

  const camera = new THREE.PerspectiveCamera(REF_FOV, 1, 0.1, 200);

  // ---- dioramas, loaded on first use -------------------------------------------------
  const dioramas = new Map<SceneName, Promise<Diorama>>();
  const load = (name: SceneName) => {
    let p = dioramas.get(name);
    if (!p) {
      const dir = `${artBase}${name === 'creation' ? 'creation3d' : 'eden3d'}/`;
      p = fetch(dir + 'meta.json')
        .then((r) => r.json() as Promise<DioramaMeta>)
        .then(async (meta) => {
          const d = buildDiorama(renderer, dir, meta, { garden: name === 'garden' });
          await d.ready;
          return d;
        });
      dioramas.set(name, p);
    }
    return p;
  };
  let active: Diorama | null = null;
  let activeName: SceneName | null = null;

  // ---- overlays: the page wash and heaven's light ---------------------------------------
  const overlay = new THREE.Scene();
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `varying vec2 vP; void main() { vP = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    m.frustumCulled = false;
    overlay.add(m);
    return m;
  };
  const wash = { color: { value: new THREE.Color() }, amount: { value: 0 } };
  quad(/* glsl */ `
    uniform vec3 color; uniform float amount; varying vec2 vP;
    void main() {
      gl_FragColor = vec4(color, amount);
      #include <colorspace_fragment>
    }`, wash);
  const light = { value: 0 };
  quad(/* glsl */ `
    uniform float uLight; varying vec2 vP;
    void main() {
      vec3 c = mix(vec3(1.0, 0.99, 0.96), vec3(0.95, 0.87, 0.68), length(vP) * 0.5);
      gl_FragColor = vec4(c, uLight);
      #include <colorspace_fragment>
    }`, { uLight: light });
  const refresh = () => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#12140f';
    wash.color.value.set(bg);
  };
  refresh();

  // ---- camera state, stations and flights ---------------------------------------------
  const cur: CamState = { pos: new THREE.Vector3(), look: new THREE.Vector3(0, 0, -10), fov: REF_FOV, light: 1, night: 0, veil: 0 };
  let flight: Flight | null = null;
  let targetPose: Pose | null = null;
  let extraVeil = 0;

  const viewAspect = () => Math.max(0.2, canvas.clientWidth / Math.max(1, canvas.clientHeight));
  const stateFor = (d: Diorama, pose: Pose): CamState => {
    const st = d.station(pose.x, pose.y, pose.z, viewAspect());
    return { pos: new THREE.Vector3(...st.pos), look: new THREE.Vector3(...st.look), fov: st.fov, light: pose.light, night: pose.night, veil: pose.veil };
  };
  const stateOf = (st: Station, extra: Partial<CamState> = {}): CamState => ({
    pos: new THREE.Vector3(...st.pos), look: new THREE.Vector3(...st.look), fov: st.fov, light: 0, night: 0, veil: 0, ...extra,
  });
  const copy = (s: CamState): CamState => ({ ...s, pos: s.pos.clone(), look: s.look.clone() });
  const jump = (s: CamState) => Object.assign(cur, copy(s));
  const fly = (to: CamState, dur: number, done?: () => void) => {
    flight = { from: copy(cur), to, t0: performance.now(), dur, descent: cur.light > 0.5 && to.light < 0.5, done };
  };

  const activate = (name: SceneName, d: Diorama) => {
    active = d;
    activeName = name;
    resetCreation();
  };

  let showSeq = 0;
  async function show(name: SceneName, pose: Pose) {
    const seq = ++showSeq;
    targetPose = pose;
    const d = await load(name);
    if (seq !== showSeq) return; // a newer navigation took over
    const to = stateFor(d, pose);
    if (!active) {
      // First page of the visit: start in place (the home intro animates on its own).
      activate(name, d);
      jump(to);
      if (name === 'garden') { jump(stateOf(HEAVEN, { light: 1 })); fly(to, 3200); }
      return;
    }
    if (active === d) {
      fly(to, 1700);
      return;
    }
    const descend = () => {
      activate(name, d);
      if (name === 'garden') jump(stateOf(HEAVEN, { light: 1, veil: to.veil }));
      else jump({ ...copy(to), light: 1 });
      fly(to, name === 'garden' ? 3600 : 1800);
    };
    // Another diorama: through the light. (After the touch we are already in it.)
    if (cur.light > 0.9) descend();
    else fly({ ...copy(cur), light: 1 }, 520, () => { if (seq === showSeq) descend(); });
  }

  // ---- the Creation: drifting together, breathing, the touch ----------------------------
  let introT = -1;
  let touchT = -1;
  const resetCreation = () => {
    introT = -1;
    touchT = -1;
    for (const n of ['god', 'adam']) active?.layer(n)?.position.set(0, 0, 0);
  };
  function creationFrame(now: number) {
    if (activeName !== 'creation' || !active) return;
    const god = active.layer('god'), adam = active.layer('adam');
    if (!god || !adam) return;
    const t = now / 1000;
    // Out of the light, the two figures drift towards each other.
    let gi = 0, ai = 0;
    if (introT >= 0) {
      gi = 1 - smooth(Math.min(1, (now - introT) / 4200)) ** 0.6;
      ai = 1 - smooth(Math.min(1, (now - introT) / 3800)) ** 0.6;
    }
    // At rest the fingers breathe, never quite touching.
    const b = Math.sin(t * (Math.PI * 2 / 7));
    let gx = 1.7 * gi + 0.035 * b, gy = 0.55 * gi + 0.02 * b, gz = 0.4 * gi;
    let ax = -1.3 * ai - 0.012 * b, ay = -0.35 * ai;
    // The touch: God's finger closes the gap (it sits a little higher than Adam's).
    if (touchT >= 0) {
      const k = smooth(Math.min(1, (now - touchT) / 600));
      gx = -0.04 * k; gy = -0.06 * k; gz = 0.06 * k;
      ax = 0.012 * k; ay = 0.006 * k;
    }
    god.position.set(gx, gy, gz);
    adam.position.set(ax, ay, 0.03 * (touchT >= 0 ? 1 : 0));
  }

  function intro() {
    if (activeName !== 'creation') return;
    introT = performance.now();
    cur.light = 1;
    if (targetPose) fly({ ...stateFor(active!, targetPose), light: 0 }, 2400);
  }

  function touch(done: () => void) {
    if (activeName !== 'creation' || !active?.gap) { done(); return; }
    touchT = performance.now();
    introT = -1;
    const [gu, gv] = active.gap;
    const gap = active.pointAt(gu, gv, 8.2);
    const aim = active.pointAt(gu, gv, 30);
    const look = aim.clone();
    fly({ ...copy(cur), pos: new THREE.Vector3(gap.x * 0.25, gap.y * 0.25, -1.2), look, fov: 34 }, 900, () => {
      fly({ ...copy(cur), pos: new THREE.Vector3(gap.x * 0.98, gap.y * 0.98, gap.z + 0.25), look, fov: 30, light: 1 }, 1500, done);
    });
  }

  const v3 = new THREE.Vector3();
  function gapScreen() {
    if (activeName !== 'creation' || !active?.gap) return null;
    v3.copy(active.pointAt(active.gap[0], active.gap[1], 8)).project(camera);
    return { x: (v3.x * 0.5 + 0.5) * canvas.clientWidth, y: (-v3.y * 0.5 + 0.5) * canvas.clientHeight };
  }

  // ---- pointer parallax ------------------------------------------------------------------
  const pointer = new THREE.Vector2();
  const par = new THREE.Vector2();
  addEventListener('pointermove', (e) => pointer.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5), { passive: true });

  // ---- size ------------------------------------------------------------------------------
  const resize = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = viewAspect();
    // Keep the framing right for the new shape (unless a flight is under way).
    if (!flight && active && targetPose && touchT < 0) {
      const s = stateFor(active, targetPose);
      cur.pos.copy(s.pos);
      cur.look.copy(s.look);
      cur.fov = s.fov;
    }
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // ---- loop --------------------------------------------------------------------------------
  const clock = new THREE.Clock();
  const offset = new THREE.Vector3();
  let lastDraw = 0;
  function frame(now: number) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const busy = !!flight || introT >= 0 || touchT >= 0;
    // Idle scenes only drift: 30 fps is plenty.
    if (!busy && now - lastDraw < 32) return;
    lastDraw = now;
    const dt = Math.min(clock.getDelta(), 0.05);

    if (flight) {
      const f = flight;
      const k = Math.min(1, (now - f.t0) / f.dur), e = ease(k);
      cur.pos.lerpVectors(f.from.pos, f.to.pos, e);
      cur.look.lerpVectors(f.from.look, f.to.look, e);
      cur.fov = f.from.fov + (f.to.fov - f.from.fov) * e;
      // Coming down from the light: it holds while the camera is high (where the diorama's
      // edges would show) and clears as it levels out, like stepping out of a cloud.
      const lk = f.descent ? THREE.MathUtils.smoothstep(e, 0.35, 0.92) : e;
      cur.light = f.from.light + (f.to.light - f.from.light) * lk;
      cur.night = f.from.night + (f.to.night - f.from.night) * e;
      cur.veil = f.from.veil + (f.to.veil - f.from.veil) * e;
      if (k >= 1) {
        flight = null;
        f.done?.();
      }
    }
    if (introT >= 0 && now - introT > 4400) introT = -1;

    if (!active) {
      renderer.clear();
      return;
    }
    creationFrame(now);
    par.lerp(pointer, 1 - Math.exp(-dt * 3));
    // Parallax shrinks with zoom so close-ups stay inside the painting.
    const pk = REF_FOV / Math.max(REF_FOV, cur.fov) * Math.min(1, cur.fov / REF_FOV);
    camera.position.copy(cur.pos).add(offset.set(par.x * 0.36 * pk, -par.y * 0.2 * pk, 0));
    camera.lookAt(cur.look);
    const coverK = camera.aspect > active.aspect ? active.aspect / camera.aspect : 1;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cur.fov / 2)) * coverK)) / 1.06; // slight overscan
    camera.updateProjectionMatrix();

    active.update(now / 1000, { light: cur.light, night: cur.night, pixelScale: canvas.clientHeight * renderer.getPixelRatio() * 0.012 });
    wash.amount.value = 1 - (1 - cur.veil) * (1 - extraVeil);
    light.value = cur.light * cur.light; // the veil lifts quickly, the clouds linger
    renderer.clear();
    renderer.render(active.scene, camera);
    renderer.render(overlay, ortho);
  }
  requestAnimationFrame(frame);

  return {
    show,
    setExtraVeil: (v) => (extraVeil = THREE.MathUtils.clamp(v, 0, 1)),
    refresh,
    intro,
    touch,
    gapScreen,
    get active() { return activeName; },
  };
}
