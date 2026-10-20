/**
 * Painted diorama: one painting as a 3D scene.
 *
 * The painting is cut offline into depth layers (tools/art: Depth Anything V2 → bands →
 * LaMa fills of what each layer hides). Here every layer becomes a finely subdivided
 * plane whose vertices are pushed back to their true distance and "unprojected"
 * through a reference camera at the origin looking down −z, so from the rest pose
 * the scene is exactly the painting, and any camera move reveals real parallax.
 *
 * This module builds scene content only; the camera, flights and rendering belong to
 * the world (scripts/world.ts), which owns the one WebGL renderer of the site.
 */
import * as THREE from 'three';

export interface DioramaMeta {
  width: number;
  height: number;
  layers: { file: string; depth: string; coverage: number }[];
  /** Distances (scene units) of the nearest and farthest disparity. */
  near?: number;
  far?: number;
  /** A point of interest in the painting (0–1), e.g. the gap between the fingers. */
  gap?: [number, number];
}

export interface Station {
  /** Camera position (scene units). */
  pos: [number, number, number];
  /** Point the camera looks at. */
  look: [number, number, number];
  /** Vertical field of view, degrees (before fitting to the viewport). */
  fov: number;
}

/** Field of view of the reference camera the painting is "seen" through. */
export const REF_FOV = 50;
export const TAN_Y = Math.tan(THREE.MathUtils.degToRad(REF_FOV / 2));

const vertex = /* glsl */ `
  uniform sampler2D uDepth;
  uniform vec2 uTan;
  uniform float uNear, uFar;
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vUv = uv;
    float d = texture2D(uDepth, clamp(uv, 0.0, 1.0)).r;
    float dist = 1.0 / (d * (1.0 / uNear - 1.0 / uFar) + 1.0 / uFar);
    vec3 p = vec3((uv * 2.0 - 1.0) * uTan, -1.0) * dist;
    vDist = dist;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uColor;
  uniform vec3 uHaze, uSky;
  uniform float uIndex, uHazeK, uNight, uFar;
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vec4 c = texture2D(uColor, clamp(vUv, 0.0, 1.0));
    // Past the painting's edges: near layers fade out; the farthest one melts into the sky above.
    float outside = max(max(-vUv.x, vUv.x - 1.0), max(-vUv.y, vUv.y - 1.0));
    if (uIndex > 0.5) c.a *= 1.0 - smoothstep(0.0, 0.025, outside);
    if (c.a < 0.01) discard;
    // A breath of aerial perspective: the far valley pales a little more as you move.
    vec3 col = mix(c.rgb, uHaze, smoothstep(uFar * 0.4, uFar, vDist) * 0.12 * uHazeK);
    if (uIndex < 0.5) col = mix(col, uSky, smoothstep(0.0, 0.08, vUv.y - 1.0));
    // Nightfall: moonlit blue, the near trees darkest.
    float lum = dot(col, vec3(0.3, 0.55, 0.15));
    vec3 night = vec3(0.32, 0.4, 0.55) * lum * (0.35 + 0.35 * smoothstep(3.0, uFar, vDist));
    col = mix(col, night, uNight * 0.85);
    gl_FragColor = vec4(col, c.a);
    #include <colorspace_fragment>
  }
`;

export interface Diorama {
  scene: THREE.Scene;
  ready: Promise<void>;
  /** Painting width / height. */
  aspect: number;
  near: number;
  far: number;
  gap?: [number, number];
  /** A layer by name (its file name without extension), e.g. `god`. */
  layer(name: string): THREE.Mesh | undefined;
  /** World position of a point of the painting (0–1 from the top-left) at a distance. */
  pointAt(u: number, v: number, dist: number): THREE.Vector3;
  /** Station looking at a point of the painting, zoomed by `z`, that keeps the view inside the painting. */
  station(u: number, v: number, z: number, viewAspect: number): Station;
  update(time: number, state: { light: number; night: number; pixelScale: number }): void;
  dispose(): void;
}

export function buildDiorama(renderer: THREE.WebGLRenderer, base: string, meta: DioramaMeta, opts: { garden?: boolean } = {}): Diorama {
  const near = meta.near ?? 3, far = meta.far ?? 24;
  const aspect = meta.width / meta.height;
  const tanX = TAN_Y * aspect;
  const scene = new THREE.Scene();
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(d: T) => (disposables.push(d), d);

  const SKY = new THREE.Color(0xcfd6d3);
  const night = { value: 0 };
  const loader = new THREE.TextureLoader();
  // Planes extend a little past the painting (UVs clamp) so edges never show while moving.
  const MARGIN = 0.12;
  const geo = keep(new THREE.PlaneGeometry(1 + MARGIN * 2, 1 + MARGIN * 2, 300, 220));
  {
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (1 + MARGIN * 2) - MARGIN, uv.getY(i) * (1 + MARGIN * 2) - MARGIN);
  }
  const layers: THREE.Mesh[] = [];
  const ready = Promise.all(meta.layers.map(async (l, i) => {
    const [color, depth] = await Promise.all([loader.loadAsync(base + l.file), loader.loadAsync(base + l.depth)]);
    color.colorSpace = THREE.SRGBColorSpace;
    color.anisotropy = renderer.capabilities.getMaxAnisotropy();
    depth.colorSpace = THREE.NoColorSpace;
    depth.minFilter = depth.magFilter = THREE.LinearFilter;
    keep(color);
    keep(depth);
    const mat = keep(new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uColor: { value: color },
        uDepth: { value: depth },
        uTan: { value: new THREE.Vector2(tanX, TAN_Y) },
        uHaze: { value: new THREE.Color(0xd9d6c4) },
        uSky: { value: SKY },
        uIndex: { value: i },
        uNear: { value: near },
        uFar: { value: far },
        uHazeK: { value: opts.garden ? 1 : 0 },
        uNight: night,
      },
      transparent: i > 0,
      depthWrite: false,
      depthTest: false,
    }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = i * 10; // far → near
    mesh.frustumCulled = false;
    mesh.name = l.file.replace(/\.\w+$/, '');
    layers[i] = mesh;
    scene.add(mesh);
  })).then(() => {
    // Compile now so the first flight doesn't stutter.
    const cam = new THREE.PerspectiveCamera(REF_FOV, aspect, 0.1, 200);
    renderer.compile(scene, cam);
  });

  // ---- heaven above the garden: a sky that brightens upwards, and clouds ------------
  const clouds: THREE.Sprite[] = [];
  if (opts.garden) {
    const top = TAN_Y * far; // the painting's top edge at the far distance
    const sky = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(far * 6, far * 4)),
      keep(new THREE.ShaderMaterial({
        uniforms: { uSky: { value: SKY }, uTop: { value: top }, uNight: night },
        vertexShader: /* glsl */ `varying float vY; void main() { vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSky; uniform float uTop, uNight; varying float vY;
          void main() {
            vec3 c = mix(uSky, vec3(0.984, 0.953, 0.875), smoothstep(uTop, uTop + 22.0, vY));
            gl_FragColor = vec4(mix(c, vec3(0.1, 0.13, 0.19), uNight * 0.85), 1.0);
            #include <colorspace_fragment>
          }`,
        depthTest: false,
        depthWrite: false,
      })),
    );
    sky.position.set(0, far * 2 - 2, -far * 1.02);
    sky.renderOrder = -1;
    scene.add(sky);

    const cloudTex = keep((() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d')!;
      for (let i = 0; i < 26; i++) {
        const r = 30 + Math.random() * 60, px = 128 + (Math.random() - 0.5) * 120, py = 128 + (Math.random() - 0.5) * 70;
        const g = x.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, 'rgba(255,250,238,0.5)');
        g.addColorStop(1, 'rgba(255,250,238,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, 256, 256);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })());
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 })));
      m.position.set((Math.random() - 0.5) * 9, 1.6 + Math.random() * 3.5, -(2.5 + Math.random() * 9));
      const sc = 3 + Math.random() * 4;
      m.scale.set(sc * 1.6, sc, 1);
      m.renderOrder = 95;
      clouds.push(m);
      scene.add(m);
    }
  }

  // ---- motes: golden dust by day, fireflies by night -------------------------------
  const N = opts.garden ? 300 : 160;
  const pPos = new Float32Array(N * 3);
  const pSeed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const z = -(near + 0.2 + Math.random() * (far - near) * 0.8);
    pPos.set([(Math.random() - 0.5) * 2 * tanX * -z, (Math.random() - 0.5) * 2 * TAN_Y * -z, z], i * 3);
    pSeed[i] = Math.random();
  }
  const pGeo = keep(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('seed', new THREE.BufferAttribute(pSeed, 1));
  const pMat = keep(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uNight: night, uFar: { value: far }, uSpan: { value: (far - near) * 0.35 } },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime, uScale, uNight, uFar, uSpan;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y += mod(uTime * (0.04 + seed * 0.05) * (1.0 - uNight * 0.7) + seed * 8.0, uSpan) - uSpan * 0.5;
        p.x += sin(uTime * 0.4 + seed * 30.0) * (0.15 + uNight * 0.25);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float blink = pow(max(0.0, sin(uTime * (0.8 + seed) + seed * 40.0)), 3.0);
        gl_PointSize = uScale * (3.0 + seed * 5.0) * (1.0 + uNight * 1.5 * blink) / -mv.z;
        float day = 0.35 + 0.65 * (sin(uTime * (1.0 + seed) + seed * 40.0) * 0.5 + 0.5);
        vA = mix(day * 0.55, blink, uNight) * smoothstep(uFar, 4.0, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNight;
      varying float vA;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(mix(vec3(1.0, 0.9, 0.62), vec3(0.85, 1.0, 0.55), uNight), vA * smoothstep(0.5, 0.0, r));
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const pollen = new THREE.Points(pGeo, pMat);
  pollen.renderOrder = 100;
  pollen.frustumCulled = false;
  scene.add(pollen);

  const pointAt = (u: number, v: number, dist: number) => new THREE.Vector3((u * 2 - 1) * tanX * dist, (1 - v * 2) * TAN_Y * dist, -dist);

  return {
    scene,
    ready,
    aspect,
    near,
    far,
    gap: meta.gap,
    layer: (name) => layers.find((m) => m?.name === name),
    pointAt,
    station(u, v, z, viewAspect) {
      // At zoom z the view covers 1/z of the painting's height (and the viewport's share of its
      // width); it may turn only as far as keeps that window inside the painting.
      // (The world fits the fov to the viewport like object-fit: cover, see world.ts.)
      const zz = Math.max(1, z);
      const coverK = viewAspect > aspect ? aspect / viewAspect : 1;
      const halfH = coverK / zz;
      const halfW = (halfH * viewAspect) / aspect;
      const cu = THREE.MathUtils.clamp(u * 2 - 1, -(1 - halfW), 1 - halfW);
      const cv = THREE.MathUtils.clamp(1 - v * 2, -(1 - halfH), 1 - halfH);
      const look: [number, number, number] = [cu * tanX * 10, cv * TAN_Y * 10, -10];
      // A small step towards the spot, so arriving reads as walking up to it.
      const pos: [number, number, number] = zz > 1.05 ? [look[0] * 0.02, look[1] * 0.015, -0.25] : [0, 0, 0];
      return { pos, look, fov: THREE.MathUtils.radToDeg(2 * Math.atan(TAN_Y / zz)) };
    },
    update(time, s) {
      night.value = s.night;
      pMat.uniforms.uTime.value = time;
      pMat.uniforms.uScale.value = s.pixelScale;
      for (const c of clouds) c.material.opacity = Math.min(1, s.light * 1.4) * 0.9;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
