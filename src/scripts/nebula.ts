/**
 * Slowly drifting nebula behind the home hero: a small fragment shader (fbm
 * noise, domain-warped) in the site's muted dust tones. Rendered at half
 * resolution and scaled up — it is soft by nature. Animates only while visible
 * with motion on; otherwise a single still frame. Without WebGL the CSS
 * gradients on the hero remain the fallback.
 */
import { animateWhileVisible } from './motion';

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uShift;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y + uShift;
  float t = uTime * 0.012;
  vec2 q = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 - t + 4.3));
  float n = fbm(p * 2.2 + q * 1.4 + vec2(t * 0.6, -t * 0.4));
  float dust = smoothstep(0.38, 0.92, n);

  // Two clouds: lavender upper right, starlight gold lower left, steel haze between.
  float m1 = smoothstep(1.05, 0.0, length(p - vec2(0.48, 0.24)));
  float m2 = smoothstep(0.95, 0.0, length(p - vec2(-0.55, -0.3)));
  vec3 lavender = vec3(0.66, 0.64, 0.78);
  vec3 gold = vec3(0.84, 0.73, 0.55);
  vec3 steel = vec3(0.56, 0.66, 0.77);
  float w1 = dust * m1, w2 = dust * m2 * 0.8, w3 = dust * 0.18;
  float a = clamp((w1 + w2 + w3) * 0.24, 0.0, 0.28);
  vec3 col = (lavender * w1 + gold * w2 + steel * w3) / max(w1 + w2 + w3, 1e-4);
  gl_FragColor = vec4(col * a, a); // premultiplied alpha
}`;

export function mountNebula(canvas: HTMLCanvasElement, parallax: () => { x: number; y: number }) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return () => {};

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return () => {};
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uShift = gl.getUniformLocation(prog, 'uShift');

  let time = 40; 
  const SCALE = 0.35;
  const FRAME_MS = 50;
  let sinceDraw = FRAME_MS;
  const size = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
    render();
  };
  function render() {
    const p = parallax();
    gl!.uniform2f(uRes, canvas.width, canvas.height);
    gl!.uniform1f(uTime, time);
    gl!.uniform2f(uShift, p.x * 0.04, -p.y * 0.03);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  const ro = new ResizeObserver(size);
  ro.observe(canvas);
  size();
  canvas.classList.add('ready');
  const stop = animateWhileVisible(canvas, (_, dt) => {
    time += dt / 1000;
    sinceDraw += dt;
    if (sinceDraw < FRAME_MS) return;
    sinceDraw = 0;
    render();
  }, render);
  return () => { stop(); ro.disconnect(); };
}
