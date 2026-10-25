/**
 * Site-wide WebGL backdrop (fixed, behind the content, not the sidebar).
 *
 * An abstract, very dark field of contour lines: two drifting interference
 * sources warped by noise. It reacts to the music (window.__audio, published
 * by the music player): lines brighten with the bass, and every detected beat
 * sends a faint ring out from the centre of the screen.
 *
 * It also publishes the bass level as `--bass` on `.page-head.fancy`, so the
 * dot lattice of the Articles / About headers can pulse with the music.
 *
 * Rendered at half resolution, capped at ~30 fps, paused when the tab is
 * hidden. With prefers-reduced-motion a single still frame is drawn.
 */
export {};

interface Levels {
  bass: number;
  mid: number;
  high: number;
  level: number;
  beats: number;
}

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uT;
uniform float uBass;
uniform float uLvl;
uniform float uRing;
uniform float uRingA;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uT * 0.04;

  // Domain warp: the whole field slowly breathes and swells with the bass.
  vec2 q = vec2(fbm(p * 1.3 + t), fbm(p * 1.3 - t + 4.0));
  vec2 w = p + (q - 0.5) * (0.9 + uBass * 0.45);

  // Two drifting interference sources + noise relief.
  float r1 = length(w - vec2(0.55 * sin(t * 3.0), 0.35 * cos(t * 2.0)));
  float r2 = length(w + vec2(0.5 * cos(t * 2.5), 0.4 * sin(t * 1.7)));
  float f = sin(r1 * 9.0 - uT * 0.25) + sin(r2 * 7.0 + uT * 0.18);
  f = f * 0.25 + fbm(w * 2.2) * 1.2;

  // Contour lines.
  float d = abs(fract(f * 3.0) - 0.5) * 2.0;
  float line = 1.0 - smoothstep(0.0, 0.10 + uLvl * 0.06, d);

  // Beat ring travelling from the centre, lighting the lines it crosses.
  float rr = length(p);
  float ring = exp(-pow((rr - uRing) * 7.0, 2.0)) * uRingA;
  line *= 1.0 + ring * 2.5;

  // Stronger on the edges, calmer behind the text column.
  float vig = smoothstep(0.12, 0.75, length((uv - 0.5) * vec2(1.0, 1.2)));
  float mask = mix(0.5, 1.0, vig);

  vec3 purple = vec3(0.42, 0.18, 0.72);
  float amp = 0.22 + uBass * 0.20 + uLvl * 0.10;
  vec3 col = purple * line * amp * mask;
  col += vec3(0.16, 0.05, 0.30) * smoothstep(0.55, 1.0, f) * 0.22 * mask;
  col += vec3(0.30, 0.10, 0.55) * ring * 0.10;

  vec3 base = vec3(0.051, 0.067, 0.090);
  vec3 rgb = base + col;
  rgb += (hash(gl_FragCoord.xy + fract(uT)) - 0.5) * (1.5 / 255.0);
  gl_FragColor = vec4(rgb, 1.0);
}
`;

const SCALE = 0.5;
const FRAME_MS = 33;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const readAudio = (): Levels | undefined => (window as unknown as { __audio?: Levels }).__audio;

let started = false;
let pulseEls: HTMLElement[] = [];
let lastPulse = -1;

function collectPulse() {
  pulseEls = [...document.querySelectorAll<HTMLElement>('.page-head.fancy')];
  lastPulse = -1;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

function start() {
  if (started) return;
  const canvas = document.querySelector<HTMLCanvasElement>('[data-backdrop]');
  if (!canvas) return;
  const gl = (canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }) ??
    null) as WebGLRenderingContext | null;
  if (!gl) return;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  started = true;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = {
    res: gl.getUniformLocation(prog, 'uRes'),
    t: gl.getUniformLocation(prog, 'uT'),
    bass: gl.getUniformLocation(prog, 'uBass'),
    lvl: gl.getUniformLocation(prog, 'uLvl'),
    ring: gl.getUniformLocation(prog, 'uRing'),
    ringA: gl.getUniformLocation(prog, 'uRingA'),
  };

  const resize = () => {
    const w = Math.max(2, Math.round(innerWidth * SCALE));
    const h = Math.max(2, Math.round(innerHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  let lastBeats = readAudio()?.beats ?? 0;
  let beatAt = -100;
  let beatStrength = 0;
  let last = 0;
  let clock = 20; // start away from t = 0 so the first frame already has structure

  const draw = (now: number, dt: number) => {
    const au = readAudio();
    const bass = au?.bass ?? 0;
    const level = au?.level ?? 0;
    const sec = now / 1000;
    if (au && au.beats !== lastBeats) {
      lastBeats = au.beats;
      beatAt = sec;
      beatStrength = 0.55 + bass * 0.8;
    }
    const age = sec - beatAt;
    // The field drifts a bit faster when there is sound.
    clock += dt * (1 + level * 1.5);

    resize();
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.t, clock);
    gl.uniform1f(u.bass, bass);
    gl.uniform1f(u.lvl, level);
    gl.uniform1f(u.ring, age * 0.85);
    gl.uniform1f(u.ringA, beatStrength * Math.exp(-age * 2.2));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (Math.abs(bass - lastPulse) > 0.01) {
      lastPulse = bass;
      for (const el of pulseEls) el.style.setProperty('--bass', bass.toFixed(3));
    }
  };

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    if (document.hidden || now - last < FRAME_MS) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    draw(now, dt);
  };

  addEventListener('resize', () => {
    if (reduce) draw(performance.now(), 0);
  });
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());

  if (reduce) draw(performance.now(), 0);
  else requestAnimationFrame(frame);
}

document.addEventListener('astro:page-load', () => {
  start();
  collectPulse();
});
