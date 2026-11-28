/* eslint-disable */
// @ts-nocheck
/**
 * The 3D "paper city" behind the landing page's scroll story, ported from the design file (Runivo City.html).
 * It is a near-verbatim port of that scene, so type checking is off for this one file; everything around it
 * (components/city/CityStory.tsx, lib/city/timeline.ts, content/city.ts) is typed.
 *
 * Differences from the design file: it is scoped to a root element instead of the page; progress comes from
 * setProgress() (the story section's own scroll) instead of window scroll; the loop runs only while setActive(true);
 * everything is released in dispose(); the heart-rate visuals are gone and the points use the app's real PACE rules.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AANYA_FROM, CHECK_AT, CLAIM_AT, NODES, RIVAL_AT, lerp, seg, ss, stepsAt } from '@/lib/city/timeline';
import { CITY_COPY, CITY_ECONOMY } from '@/content/city';

export interface CityScene {
  /** Scroll progress 0 to 1 through the story. `snap` jumps there instead of easing. */
  setProgress(p: number, snap?: boolean): void;
  /** Start or stop the render loop (stopped while the story is off screen). */
  setActive(on: boolean): void;
  resize(): void;
  dispose(): void;
}

export function createCityScene(root: HTMLElement, avatars: { me: string; aanya: string }): CityScene | null {
  const copy = CITY_COPY, ECON = CITY_ECONOMY;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = id => root.querySelector(`[data-id="${id}"]`);
  const fmt = n => Math.round(n).toLocaleString("en");
  let innerWidth = root.clientWidth || 1, innerHeight = root.clientHeight || 1;   // the stage's size, not the window's
  const isPhone = () => innerWidth <= 760;
  $("aanyaAv").src = avatars.aanya;
  $("coinHint").textContent = matchMedia("(hover: none)").matches ? copy.store.hintTouch : copy.store.hintMouse;

  /* ================= world (1 unit = 50 m) ================= */
const PITCH = 4.8, BLOCK = 3.6, STRIP = 0.48;
const gx = (i, j) => new THREE.Vector3(i * PITCH, 0, -j * PITCH);
const ROUTE = (() => {
  const pts = NODES.map(([i, j]) => gx(i, j)), out = [], cum = [], rad = 0.9;
  const push = v => { if (out.length) { const dd = v.distanceTo(out[out.length - 1]); if (dd < 1e-4) return; cum.push(cum[cum.length - 1] + dd / PITCH); } else cum.push(0); out.push(v.clone()); };
  push(pts[0]);
  for (let k = 1; k < pts.length - 1; k++) {
    const a = pts[k - 1], b = pts[k], c = pts[k + 1];
    const d1 = b.clone().sub(a).normalize(), d2 = c.clone().sub(b).normalize();
    const p1 = b.clone().addScaledVector(d1, -rad), p2 = b.clone().addScaledVector(d2, rad);
    const st = out[out.length - 1].clone(), n = Math.max(1, Math.ceil(st.distanceTo(p1) / 0.15));
    for (let s = 1; s <= n; s++) push(st.clone().lerp(p1, s / n));
    for (let s = 1; s <= 10; s++) { const u = s / 10; push(p1.clone().multiplyScalar((1 - u) ** 2).addScaledVector(b, 2 * u * (1 - u)).addScaledVector(p2, u * u)); }
  }
  const last = pts[pts.length - 1], st = out[out.length - 1].clone(), n = Math.ceil(st.distanceTo(last) / 0.15);
  for (let s = 1; s <= n; s++) push(st.clone().lerp(last, s / n));
  const total = cum[cum.length - 1]; for (let i = 0; i < cum.length; i++) cum[i] *= 22 / total;
  return { pts: out, cum };
})();
let APATH; const mkAPath = () => {
  const pts = [], cum = [0];
  for (let s = 17.2; s <= 19.0001; s += 0.02) pts.push(routeAt(s, 0.72).pos);
  const last = pts[pts.length - 1].clone();
  for (let k = 1; k <= 160; k++) pts.push(last.clone().add(new THREE.Vector3(0, 0, -k * 0.1)));
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1]));
  return { pts, cum };
};
function aAt(d) {
  const { pts, cum } = APATH; d = Math.max(0, Math.min(cum[cum.length - 1], d));
  let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; }
  const u = (d - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
  const pos = pts[lo].clone().lerp(pts[hi], u), dir = pts[Math.min(pts.length - 1, hi + 1)].clone().sub(pts[Math.max(0, lo - 1)]).normalize();
  return { pos, dir, i: lo };
}
function idxAt(steps) { const { cum } = ROUTE; let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < steps) lo = m; else hi = m; } return { lo, hi, u: Math.min(1, Math.max(0, (steps - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]))) }; }
function routeAt(steps, side = 0) {
  const { pts } = ROUTE;
  steps = Math.max(0, Math.min(22, steps));
  const { lo, hi, u } = idxAt(steps);
  const pos = pts[lo].clone().lerp(pts[hi], u);
  const a = pts[Math.max(0, lo - 2)], b = pts[Math.min(pts.length - 1, hi + 2)];
  const dir = b.clone().sub(a).normalize();
  if (side) pos.add(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(side));
  return { pos, dir, idx: lo + u };
}
APATH = mkAPath();
  let target = 0, P = 0;
  const panels = [...root.querySelectorAll(".panel")].map(el => ({ el, a: +el.dataset.in, b: +el.dataset.out }));
  const CHECKS = copy.pacex.checks, CHK_AT = CHECK_AT;

function updateDOM(P) {
  const mobile = isPhone();
  for (const p of panels) {
    const k = Math.min(seg(P, p.a, p.a + 0.018), 1 - seg(P, p.b - 0.018, p.b));
    const dy = (1 - k) * 20;
    p.el.style.opacity = k.toFixed(3);
    p.el.style.transform = p.el.classList.contains("final") ? (mobile ? `translateY(${dy}px)` : `translate(-50%, calc(-50% + ${dy}px))`) : (mobile ? `translateY(${dy}px)` : `translateY(calc(-50% + ${dy}px))`);
    p.el.classList.toggle("on", k > 0.6);
    p.el.inert = k <= 0.6; p.el.setAttribute("aria-hidden", String(k <= 0.6));
  }
  // the thought: three lines in turn
  const l2 = seg(P, 0.03, 0.045), l3 = seg(P, 0.07, 0.085);
  $("th1").style.opacity = (1 - 0.72 * l2).toFixed(2);
  $("th2").style.opacity = (l2 * (1 - 0.72 * l3)).toFixed(2); $("th2").style.transform = `translateY(${(1 - l2) * 10}px)`;
  $("th3").style.opacity = l3.toFixed(2); $("th3").style.transform = `translateY(${(1 - l3) * 10}px)`;
  $("cue").style.opacity = (1 - l2).toFixed(2);
  // run stats: 0 -> 5.00 km, 0:00 -> 28:41
  const run = seg(P, 0.128, 0.248);
  $("sKm").textContent = (5 * run).toFixed(2);
  const secs = 1721 * run; $("sTime").textContent = `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;
  // PaceX checks, typed and ticked
  CHECKS.forEach((txt, i) => {
    const el = $("c" + (i + 1)), k = seg(P, CHK_AT[i] - 0.02, CHK_AT[i]);
    if (!el.dataset.set) { el.querySelector(".tx").textContent = txt; el.dataset.set = 1; }
    el.style.setProperty("--k", k.toFixed(3));
    el.classList.toggle("ok", k >= 1);
  });
}

  /* ================= 3D ================= */
  const canvas = $("stage");
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { return null; }

const COL = { bg: 0xF4F5F1, orange: 0xFF4518, blue: 0x3D7BFF, amber: 0xF2A43A, ink: 0x17181A, grey: 0xB8BDB4 };
let scene, camera, bld, bldColors = [], claimIdx = [], rivalIdx = [], strip, aStrip, me, aanya, rahul, mei, meRing, aRing, dust,
    claimPlate, rivalPlate, extraPlates = [], coins = [], stack, startLine, finishLine, plazaPos, sparks;
const RAND = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

function roundedBox(w, d, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); return g;
}
function plateFor(cells, color, y = 0.03, pad = 0.15) {
  let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9;
  cells.forEach(([i, j]) => { i0 = Math.min(i0, i); i1 = Math.max(i1, i + 1); j0 = Math.min(j0, j); j1 = Math.max(j1, j + 1); });
  const m = new THREE.Mesh(roundedBox((i1 - i0) * PITCH + pad * 2, (j1 - j0) * PITCH + pad * 2, 0.05, 0.6), new THREE.MeshStandardMaterial({ color, roughness: 0.85, transparent: true, opacity: 0 }));
  m.position.set((i0 + i1) / 2 * PITCH, y, -(j0 + j1) / 2 * PITCH); m.receiveShadow = true; scene.add(m); return m;
}
function ribbonGeo(side = 0, y = 0.035, src = ROUTE) {
  const pos = [], idx = [], { pts } = src;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    const t = b.clone().sub(a).normalize(), n = new THREE.Vector3(-t.z, 0, t.x);
    const c = pts[k].clone().addScaledVector(n, side);
    const L = c.clone().addScaledVector(n, STRIP / 2), R = c.clone().addScaledVector(n, -STRIP / 2);
    pos.push(L.x, y, L.z, R.x, y, R.z);
    if (k < pts.length - 1) { const v = k * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.setDrawRange(0, 0);
  return g;
}
function coinTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  x.fillStyle = "#FF4518"; x.beginPath(); x.arc(64, 64, 64, 0, 7); x.fill();
  x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 50, 0, 7); x.stroke();
  x.fillStyle = "#fff"; x.font = "700 70px Inter, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("P", 66, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* sparks: a pooled particle system for bursts, fireworks and kudos trails */
function makeSparks(N = 1600) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), alpha = new Float32Array(N), size = new Float32Array(N);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1)); g.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { scale: { value: innerHeight / 2 } },
    vertexShader: "attribute float alpha; attribute float size; varying float vA; varying vec3 vC; uniform float scale; void main(){ vA=alpha; vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*scale/-mv.z; gl_Position=projectionMatrix*mv; }",
    fragmentShader: "varying float vA; varying vec3 vC; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d); if(r>.5) discard; float s=smoothstep(.5,.15,r); gl_FragColor=vec4(vC, vA*s); }",
    vertexColors: true,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
  const P_ = []; for (let i = 0; i < N; i++) P_.push({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color(), s: 0.1, g: 4 });
  let head = 0;
  return {
    mat,
    emit(at, n, colors, speed = 3, opts = {}) {
      for (let k = 0; k < n; k++) {
        const q = P_[head]; head = (head + 1) % N;
        q.p.copy(at); const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1) * (opts.up ? 0.5 : 1);
        const sp = speed * (0.45 + Math.random() * 0.55);
        q.v.set(Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp * (opts.up ? 1.2 : 1), Math.sin(ph) * Math.sin(th) * sp);
        q.c.set(colors[k % colors.length]); q.max = q.life = (opts.life || 0.9) * (0.7 + Math.random() * 0.5); q.s = (opts.size || 0.12) * (0.7 + Math.random() * 0.6); q.g = opts.g ?? 4;
      }
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        const q = P_[i];
        if (q.life > 0) { q.life -= dt; q.v.y -= q.g * dt; q.v.multiplyScalar(1 - 1.4 * dt); q.p.addScaledVector(q.v, dt); }
        pos[i * 3] = q.p.x; pos[i * 3 + 1] = q.p.y; pos[i * 3 + 2] = q.p.z;
        col[i * 3] = q.c.r; col[i * 3 + 1] = q.c.g; col[i * 3 + 2] = q.c.b;
        alpha[i] = q.life > 0 ? Math.min(1, q.life / q.max * 1.6) : 0; size[i] = q.s;
      }
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.alpha.needsUpdate = g.attributes.size.needsUpdate = true;
    },
  };
}

function mkArrow(col) {
  const s = new THREE.Shape(); s.moveTo(0, 0.42); s.lineTo(0.3, -0.3); s.lineTo(0, -0.15); s.lineTo(-0.3, -0.3); s.lineTo(0, 0.42);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3 });
  g.rotateX(-Math.PI / 2); g.translate(0, -0.05, 0);
  const grp = new THREE.Group();
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.4, clearcoat: 0.6, emissive: col, emissiveIntensity: 0 }));
  m.castShadow = true; grp.add(m); grp.userData.mesh = m; scene.add(grp); return grp;
}
/* Snap-Map style pin: round portrait, white rim, coloured ring, small tail; a direction chevron sits on the street below */
function pinCanvas(src, ring, grey, initial) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 300; const x = c.getContext("2d");
  const draw = img => {
    x.clearRect(0, 0, 256, 300);
    x.fillStyle = "rgba(23,24,26,.18)"; x.beginPath(); x.arc(128, 134, 120, 0, 7); x.fill();
    x.fillStyle = "#fff"; x.beginPath(); x.arc(128, 126, 120, 0, 7); x.fill();
    x.beginPath(); x.moveTo(98, 236); x.lineTo(128, 296); x.lineTo(158, 236); x.fill();
    x.fillStyle = ring; x.beginPath(); x.arc(128, 126, 112, 0, 7); x.fill();
    x.save(); x.beginPath(); x.arc(128, 126, 100, 0, 7); x.clip();
    if (img) {
      x.drawImage(img, 28, 26, 200, 200);
      if (grey) { const d = x.getImageData(28, 26, 200, 200); for (let k = 0; k < d.data.length; k += 4) { const g = d.data[k] * .3 + d.data[k + 1] * .59 + d.data[k + 2] * .11; d.data[k] = d.data[k + 1] = d.data[k + 2] = g * 0.9 + 12; } x.putImageData(d, 28, 26); }
    } else {
      x.fillStyle = "#EEF0EC"; x.fillRect(28, 26, 200, 200);
      x.fillStyle = "#5F635D"; x.font = "600 104px Inter, -apple-system, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(initial, 128, 132);
    }
    x.restore();
    if (tex) tex.needsUpdate = true;
  };
  let tex = null;
  draw(null);
  if (src) { const im = new Image(); im.onload = () => draw(im); im.src = src; }
  tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
const PIN = 0.64;
function pinSprite(tex) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.center.set(0.5, 0); sp.scale.set(PIN, PIN * 300 / 256); sp.position.y = 0.02; sp.renderOrder = 10; return sp;
}
function mkPin(col, src, ring, initial, withGrey) {
  const grp = mkArrow(col);
  grp.userData.mesh.scale.setScalar(0.55); grp.userData.mesh.position.y = -0.36;
  const sp = pinSprite(pinCanvas(src, ring, false, initial)); grp.add(sp); grp.userData.pin = sp;
  if (withGrey) { const g = pinSprite(pinCanvas(src, "#17181A", true, initial)); grp.add(g); grp.userData.grey = g; }
  return grp;
}
function mkRing(col) { const r = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.47, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false })); r.rotation.x = -Math.PI / 2; scene.add(r); return r; }

function build() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, isPhone() ? 1.5 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); scene.background = new THREE.Color(COL.bg); scene.fog = new THREE.Fog(COL.bg, 40, 120);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
  camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfcac0, 0.55));
  const key = new THREE.DirectionalLight(0xfff3e4, 2.6); key.position.set(-26, 24, 14); key.target.position.set(6, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 120 });
  key.shadow.bias = -0.0005; key.shadow.radius = 6; scene.add(key, key.target);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0xE1E3DC, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const PARK = new Set(["-3,1", "-2,1", "-3,2", "-2,2"]), PLAZA = "2,-2";
  const inClaim = (i, j) => i >= 0 && i < 2 && j >= 0 && j < 2, inRival = (i, j) => i === 4 && j === -1;
  const plinths = [], lots = [];
  for (let i = -7; i < 10; i++) for (let j = -7; j < 7; j++) {
    const key_ = `${i},${j}`; if (PARK.has(key_)) continue;
    const cx = (i + 0.5) * PITCH, cz = -(j + 0.5) * PITCH; plinths.push([cx, cz]);
    if (key_ === PLAZA) continue;
    const split = RAND() < 0.25 ? 1 : RAND() < 0.5 ? 2 : 4, g = 0.28, inner = BLOCK - 0.5;
    const nx = split === 4 ? 2 : split === 2 ? (RAND() < 0.5 ? 2 : 1) : 1, nz = split === 4 ? 2 : split === 2 ? (nx === 2 ? 1 : 2) : 1;
    const dist = Math.hypot(cx - 6, cz) / 50;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const w = (inner - g * (nx - 1)) / nx, d = (inner - g * (nz - 1)) / nz;
      lots.push({ x: cx - inner / 2 + w / 2 + a * (w + g), z: cz - inner / 2 + d / 2 + b * (d + g), w: w * (0.86 + RAND() * 0.12), d: d * (0.86 + RAND() * 0.12),
        h: 0.35 + Math.pow(RAND(), 1.6) * 2.6 * (1 - Math.min(0.6, dist)), claim: inClaim(i, j), rival: inRival(i, j) });
    }
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const pl = new THREE.InstancedMesh(roundedBox(BLOCK, BLOCK, 0.12, 0.35), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), plinths.length);
  plinths.forEach(([x, z], k) => { m4.makeTranslation(x, 0, z); pl.setMatrixAt(k, m4); }); pl.receiveShadow = pl.castShadow = true; scene.add(pl);
  bld = new THREE.InstancedMesh(roundedBox(1, 1, 1, 0.08), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), lots.length);
  lots.forEach((L, k) => {
    ps.set(L.x, 0.12, L.z); sc.set(L.w, L.h, L.d); m4.compose(ps, q, sc); bld.setMatrixAt(k, m4);
    const tone_ = 0.955 + RAND() * 0.045, c = new THREE.Color(tone_, tone_, tone_ * 0.99); bldColors.push(c); bld.setColorAt(k, c);
    if (L.claim) claimIdx.push(k); if (L.rival) rivalIdx.push(k);
  });
  bld.castShadow = bld.receiveShadow = true; scene.add(bld);

  // park with pond and paper trees
  const park = new THREE.Mesh(roundedBox(PITCH * 2 - 1.2, PITCH * 2 - 1.2, 0.1, 0.8), new THREE.MeshStandardMaterial({ color: 0xDCEBC8, roughness: 1 }));
  park.position.set(-2 * PITCH, 0, -2 * PITCH); park.receiveShadow = true; scene.add(park);
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.06, 48), new THREE.MeshStandardMaterial({ color: 0xD6E6EF, roughness: 0.3 }));
  pond.scale.set(1.4, 1, 0.9); pond.position.set(-2.3 * PITCH, 0.12, -1.8 * PITCH); scene.add(pond);
  const trees = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), 26);
  for (let k = 0; k < 26; k++) {
    let x, z; do { x = -2 * PITCH + (RAND() - 0.5) * (PITCH * 2 - 2.2); z = -2 * PITCH + (RAND() - 0.5) * (PITCH * 2 - 2.2); } while (Math.hypot((x + 2.3 * PITCH) / 1.4, (z + 1.8 * PITCH) / 0.9) < 2.2);
    const s = 0.7 + RAND() * 0.6; m4.compose(ps.set(x, 0.5 * s, z), q, sc.set(s, s * 1.1, s)); trees.setMatrixAt(k, m4);
  }
  trees.castShadow = true; scene.add(trees);

  // the PACE Store plaza: an open paper square beside the route
  plazaPos = new THREE.Vector3(2.5 * PITCH, 0.13, 1.5 * PITCH);
  const plz = new THREE.Mesh(roundedBox(BLOCK - 0.6, BLOCK - 0.6, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: 0xFDF0DF, roughness: 0.9 }));
  plz.position.set(plazaPos.x, 0.12, plazaPos.z); plz.receiveShadow = true; scene.add(plz);

  // zones: yours (orange), friends' (blue), rivals' (amber)
  claimPlate = plateFor([[0, 0], [1, 1]], COL.orange);
  rivalPlate = plateFor([[4, -1]], COL.amber); rivalPlate.material.opacity = 0.92;
  const EXTRA = [[[-5, -3], [-4, -2]], [[6, 2], [6, 2]], [[-1, -5], [0, -5]], [[7, -4], [7, -4]], [[-6, 3], [-6, 3]], [[3, 4], [4, 4]]];
  [COL.orange, COL.blue, COL.orange, COL.amber, COL.blue, COL.amber].forEach((c, k) => extraPlates.push(plateFor(EXTRA[k], c, 0.025)));

  // run strips: you (orange) and Aanya (blue, alongside)
  strip = new THREE.Mesh(ribbonGeo(0), new THREE.MeshStandardMaterial({ color: COL.orange, roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
  strip.frustumCulled = false; strip.receiveShadow = true; scene.add(strip);
  aStrip = new THREE.Mesh(ribbonGeo(0, 0.037, APATH), new THREE.MeshStandardMaterial({ color: COL.blue, roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 }));
  aStrip.frustumCulled = false; scene.add(aStrip);

  // start and finish lines (paper strips across the street)
  const mkLine = (steps, checker) => {
    const r = routeAt(steps), grp = new THREE.Group();
    for (let k = 0; k < 8; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.16), new THREE.MeshStandardMaterial({ color: checker ? (k % 2 ? 0x17181A : 0xffffff) : 0xffffff, roughness: 0.8 }));
      m.position.set((k - 3.5) * 0.16, 0, 0); grp.add(m);
      if (checker) { const m2 = m.clone(); m2.material = new THREE.MeshStandardMaterial({ color: k % 2 ? 0xffffff : 0x17181A }); m2.position.z = 0.16; grp.add(m2); }
    }
    grp.position.set(r.pos.x, 0.05, r.pos.z); grp.rotation.y = Math.atan2(r.dir.x, r.dir.z); scene.add(grp); return grp;
  };
  startLine = mkLine(0.06, false); finishLine = mkLine(21.94, true);

  // runners
  me = mkPin(COL.orange, avatars.me, "#FF4518", "", true); meRing = mkRing(COL.orange);
  aanya = mkPin(COL.blue, avatars.aanya, "#3D7BFF", ""); aRing = mkRing(COL.blue); aanya.visible = false;
  rahul = mkPin(0x9aa096, null, "#B8BDB4", "R"); mei = mkPin(0x9aa096, null, "#B8BDB4", "M"); rahul.visible = mei.visible = false;
  dust = new THREE.Group();
  for (let k = 0; k < 10; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0, roughness: 1 })); p.userData.a = k / 10 * Math.PI * 2; dust.add(p); }
  scene.add(dust);


  // coins along the route, and the stack on the plaza
  const ctex = coinTexture(), edge = new THREE.MeshStandardMaterial({ color: 0xE83A10, roughness: 0.45, metalness: 0.2 });
  const face = new THREE.MeshStandardMaterial({ map: ctex, roughness: 0.4, metalness: 0.1 });
  const cg = new THREE.CylinderGeometry(0.28, 0.28, 0.07, 40);
  for (let k = 0; k < ECON.kmCoins; k++) {
    const m = new THREE.Mesh(cg, [edge, face, face]); m.castShadow = true;
    const stp = 15.3 + k * (2.5 / (ECON.kmCoins - 1));
    m.userData = { step: stp, clicked: false, bonus: false, at: null, from: null, landed: false, ph: RAND() * 6.28, side: (k % 2 ? 1 : -1) * 0.12 };
    scene.add(m); coins.push(m);
  }
  stack = new THREE.InstancedMesh(cg, [edge, face, face], 40); stack.count = 0; stack.castShadow = true; stack.frustumCulled = false; scene.add(stack);

  sparks = makeSparks();
  resize();
}

function resize() {
  if (!renderer) return;
  innerWidth = root.clientWidth || 1; innerHeight = root.clientHeight || 1;
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (sparks) sparks.mat.uniforms.scale.value = innerHeight / 2;
}

/* camera: [P, angle, height, distance, follow, heading-relative, fov] */
const PI = Math.PI;
const CAM = [
  [0.000, -0.55, 50, 44, 0.0, 0, 30],
  [0.050, 0.55, 3.2, 8.4, 1.0, 1, 30],
  [0.110, 0.70, 2.7, 7.2, 1.0, 1, 30],
  [0.140, PI + 0.2, 6.4, 8.0, 1.0, 1, 34],
  [0.240, PI + 0.55, 5.8, 7.6, 1.0, 1, 34],
  [0.290, -0.45, 24, 17, 0.6, 0, 32],
  [0.370, 0.25, 34, 5, 0.45, 0, 32],
  [0.425, 0.95, 13, 16, 0.25, 0, 30],
  [0.465, PI / 2, 6.0, 7.6, 1.0, 1, 30],
  [0.535, PI / 2 + 0.5, 6.4, 8.2, 1.0, 1, 30],
  [0.570, 0.70, 9.5, 12.5, 0.75, 0, 32],
  [0.680, 1.05, 10.5, 13, 0.75, 0, 32],
  [0.712, PI + 0.85, 4.6, 8.4, 1.0, 1, 32],
  [0.800, PI + 0.35, 4.2, 7.6, 1.0, 1, 32],
  [0.828, 0.55, 12, 12, 1.0, 0, 32],
  [0.900, 1.15, 13, 12.5, 0.85, 0, 32],
  [0.960, -0.62, 34, 46, 0.0, 0, 30],
  [1.000, -0.50, 33, 48, 0.0, 0, 30]];
function camAt(P) {
  for (let i = 0; i < CAM.length - 1; i++) { const a = CAM[i], b = CAM[i + 1]; if (P <= b[0]) { const k = ss((P - a[0]) / (b[0] - a[0])); return a.map((v, j) => v + (b[j] - v) * k); } }
  return CAM[CAM.length - 1];
}

/* ================= interactions ================= */
let balance = ECON.exampleBalance, spent = 0, zoneBonus = 0;
const projectiles = [];   // flying sparks for kudos
function fly(from, to, color, n, onArrive, delay = 0) {
  for (let k = 0; k < n; k++) projectiles.push({ from: from.clone(), to, color, t: -delay - k * 0.07, dur: 0.75, h: 1.6 + Math.random() * 0.6, done: false, onArrive: k === n - 1 ? onArrive : null, j: (Math.random() - 0.5) * 0.6 });
}
let kudos = copy.friend.kudosStart, kudosBusy = false, autoDemo = false;
const labelTimers = { kudos: -9, back: -9 };
function sendKudos() {
  if (kudosBusy || !renderer) return; kudosBusy = true;
  fly(me.position, () => aanya.position, 0xFF4518, 5, () => {
    sparks.emit(aanya.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 70, [0xFF4518, 0xFFB08F, 0xffffff], 4.2, { size: 0.14 });
    kudos += 1; $("kCount").textContent = kudos; labelTimers.kudos = clock.elapsedTime;
    setTimeout(() => {
      fly(aanya.position, () => me.position, 0x3D7BFF, 1, () => { sparks.emit(me.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 60, [0x3D7BFF, 0x9DBBFF, 0xffffff], 3.8, { size: 0.13 }); labelTimers.back = clock.elapsedTime; kudosBusy = false; });
    }, 700);
  });
}
function sendCheer() {
  if (!renderer) return;
  const mid = me.position.clone().lerp(aanya.position, 0.5);
  [0, 380, 760].forEach((d, r) => setTimeout(() => {
    const at = mid.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.4, 3.2 + r * 0.5, (Math.random() - 0.5) * 2.4));
    sparks.emit(at, 120, [0xFF4518, 0xF2A43A, 0x3D7BFF, 0xffffff], 5.2, { size: 0.15, life: 1.3, g: 2.2 });
  }, d));
}
$("bKudos").addEventListener("click", () => { sendKudos(); });
$("bCheer").addEventListener("click", () => { sendCheer(); });

const rws = [...document.querySelectorAll(".rw")];
function earned() { return coins.reduce((s, c) => s + (c.userData.landed ? ECON.perKm : 0), 0) + zoneBonus; }
function refreshRewards() {
  const bal = balance + earned() - spent;
  rws.forEach(el => {
    const cost = +el.dataset.cost, bar = el.querySelector(".bar i"), st = el.querySelector(".st"), b = el.querySelector(".btn");
    if (el.classList.contains("red")) { bar.style.width = "100%"; st.textContent = copy.reward.done; return; }
    bar.style.width = Math.min(100, bal / cost * 100).toFixed(1) + "%";
    st.textContent = bal >= cost ? copy.reward.can : `${fmt(cost - bal)} ${copy.reward.toGo}`;
  });
}
rws.forEach(el => el.querySelector(".btn").addEventListener("click", ev => {
  if (el.classList.contains("red")) return;
  const cost = +el.dataset.cost, b = ev.currentTarget, bal = balance + earned() - spent;
  if (bal >= cost) {
    spent += cost; el.classList.add("red"); b.textContent = copy.reward.redeemed;
    if (renderer) sparks.emit(plazaPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 110, [0xFF4518, 0xF2A43A, 0xffffff], 4.5, { up: true, size: 0.14 });
  } else {
    b.textContent = `Need ${fmt(cost - bal)}`; setTimeout(() => { if (!el.classList.contains("red")) b.textContent = copy.reward.redeem; }, 1400);
  }
  refreshRewards();
}));

const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
function coinUnder(ev) {
  if (!renderer || P < 0.55 || P > 0.70) return null;
  mouse.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera);
  const live = coins.filter(c => c.visible && c.userData.at === null);
  const hit = ray.intersectObjects(live, false)[0]; return hit ? hit.object : null;
}
canvas.addEventListener("pointermove", ev => canvas.classList.toggle("hot", !!coinUnder(ev)));
canvas.addEventListener("pointerdown", ev => { const c = coinUnder(ev); if (c) { c.userData.clicked = true; } });

/* ================= frame ================= */
const WORLD = new THREE.Vector3(7, 0, 0);
const camPos = new THREE.Vector3(-20, 50, 40), look = new THREE.Vector3(7, 0, 0), lookT = new THREE.Vector3(), base = new THREE.Vector3(), tmp = new THREE.Vector3(), tv = new THREE.Vector3();
let heading = 0, lastP = 0, burstDone = false, landed = false, lastBeat = -1;
const clock = new THREE.Clock();
const tagEls = Object.fromEntries(["tZone", "tPace", "tDone", "tPts", "tKudos", "tBack", "tRahul", "tMei", "tKabir", "tTaken"].map(id => [id, $(id)]));

function project(v) { tv.copy(v).project(camera); return { x: (tv.x * 0.5 + 0.5) * innerWidth, y: (-tv.y * 0.5 + 0.5) * innerHeight, ok: tv.z < 1 }; }
function placeTag(el, v, k, dx = 0, dy = 0) {
  if (k <= 0.01) { el.style.opacity = 0; return; }
  const p = project(v); if (!p.ok) { el.style.opacity = 0; return; }
  el.style.opacity = k.toFixed(3);
  el.style.transform = `translate(${(p.x - el.offsetWidth / 2 + dx).toFixed(1)}px, ${(p.y - el.offsetHeight / 2 + dy - (1 - k) * 10).toFixed(1)}px) scale(${el.dataset.s || 1})`;
}
const flash = (t0, now, d = 2.2) => { const u = now - t0; return u < 0 || u > d ? 0 : Math.min(1, u / 0.15) * Math.min(1, (d - u) / 0.35); };

/* quality: if the first second of frames is slow (a weak GPU or software rendering), switch shadows off and render at 1x */
let qLevel = 0, qFrames = 0, qTime = 0;
function adaptQuality(raw) {
  if (qLevel !== 0) return;
  qFrames++;
  if (qFrames <= 20) return;                       // the first frames include shader compiling
  qTime += raw;
  if (qFrames < 70) return;
  if (qTime / 50 > 0.045) {
    qLevel = 1; renderer.shadowMap.enabled = false; renderer.setPixelRatio(1);
    scene.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; ms.forEach(m => { m.needsUpdate = true; }); });
    resize();
  } else qLevel = -1;
}

function frame() {
  if (!running) return;
  const raw = clock.getDelta(), dt = Math.min(0.05, raw), t = clock.elapsedTime;
  adaptQuality(raw);
  P = reduce ? target : P + (target - P) * (1 - Math.pow(0.002, dt));
  updateDOM(P);
  if (!renderer) return;
  const steps = stepsAt(P);
  const r = routeAt(steps), ap = r.pos.clone();
  let dA = Math.atan2(r.dir.x, r.dir.z) - heading; while (dA > PI) dA -= 2 * PI; while (dA < -PI) dA += 2 * PI;
  heading += dA * (reduce ? 1 : 1 - Math.pow(0.001, dt));

  // the thought: a dark arrow over the start line, then "go"
  const GO = 0.106;
  if (P >= GO && lastP < GO && !burstDone) { burstDone = true; sparks.emit(ap.clone().add(new THREE.Vector3(0, 1.7, 0)), 140, [0xFF4518, 0xFF8A5B, 0xF2A43A, 0xffffff], 4.6, { size: 0.13 }); }
  if (P < GO - 0.02) burstDone = false;
  const goK = seg(P, GO, GO + 0.006);
  me.userData.mesh.material.color.setHex(COL.orange);
  me.userData.pin.material.opacity = goK; me.userData.grey.material.opacity = 1 - goK;
  me.userData.mesh.material.emissive.setHex(COL.orange); me.userData.mesh.material.emissiveIntensity = 0.1 * goK;
  const hover = 1 - seg(P, 0.112, 0.128);              // floats, then drops onto the street
  const meY = 0.42 + hover * 0.75 + Math.sin(t * 2.2) * (0.03 + hover * 0.07);
  me.position.set(ap.x, meY, ap.z);
  me.rotation.set(0, heading + PI, 0);
  me.userData.mesh.rotation.set(0, 0, 0); me.userData.mesh.scale.setScalar(0.55 * Math.max(0.0001, 1 - hover));
  me.userData.mesh.position.y = -0.36 - hover * 0.75;
  const runBob = (1 - hover) * Math.abs(Math.sin(t * 7)) * 0.06 * (P > 0.13 && P < 0.92 ? 1 : 0);
  me.userData.pin.position.y = me.userData.grey.position.y = 0.02 + runBob;
  // landing: ripple + dust puff
  if (P >= 0.127 && lastP < 0.127 && !landed) { landed = true; dust.userData.t0 = t; }
  if (P < 0.115) landed = false;
  const du = dust.userData.t0 !== undefined ? (t - dust.userData.t0) / 0.9 : 2;
  dust.children.forEach(p => { const a = p.userData.a; p.position.set(ap.x + Math.cos(a) * (0.2 + du * 0.9), 0.12 + Math.sin(du * PI) * 0.25, ap.z + Math.sin(a) * (0.2 + du * 0.9)); p.scale.setScalar(0.6 + du); p.material.opacity = du < 1 ? 0.75 * (1 - du) : 0; });
  const ringOn = goK * (1 - hover);
  const ru = du < 1 ? du : (t * 0.8) % 1;
  meRing.position.set(ap.x, 0.05, ap.z); meRing.scale.setScalar(0.8 + ru * (du < 1 ? 3.2 : 1.8)); meRing.material.opacity = (du < 1 ? 0.8 : 0.5) * (1 - ru) * ringOn;
  startLine.visible = P < 0.3;

  // trail
  strip.geometry.setDrawRange(0, Math.max(0, Math.floor(r.idx)) * 6);

  // claim + rival zones
  const claimK = steps >= CLAIM_AT - 0.01 ? seg(P, 0.378, 0.405) : 0;
  zoneBonus = claimK > 0.5 ? ECON.newZone : 0;
  claimPlate.material.opacity = 0.92 * claimK; claimPlate.position.y = 0.03 + 0.02 * claimK;
  const rivalK = steps >= RIVAL_AT - 0.01 ? seg(P, 0.898, 0.91) : 0;
  rivalPlate.material.color.setHex(COL.amber).lerp(new THREE.Color(COL.orange), rivalK);
  const col = new THREE.Color();
  claimIdx.forEach(k => { col.copy(bldColors[k]).lerp(new THREE.Color(0xffc9b6), claimK); bld.setColorAt(k, col); });
  rivalIdx.forEach(k => { col.set(0xFCE3BD).lerp(new THREE.Color(0xffc9b6), rivalK); bld.setColorAt(k, col); });
  bld.instanceColor.needsUpdate = true;
  const finK = seg(P, 0.92, 0.96);
  extraPlates.forEach((m, k) => { m.material.opacity = 0.6 * Math.max(seg(P, 0.92 + k * 0.006, 0.945 + k * 0.006), 0.75 * (1 - seg(P, 0.02, 0.05))); });


  // PACE Store: coins
  const storeK = seg(P, 0.552, 0.565) * (1 - seg(P, 0.695, 0.71));
  let landedN = 0;
  coins.forEach(c => {
    const u = c.userData, collected = u.clicked || steps >= u.step;
    if (collected && u.at === null) { u.at = t; u.from = c.position.clone(); sparks.emit(c.position.clone(), 24, [0xFF4518, 0xF2A43A, 0xffffff], 2.6, { size: 0.09, life: 0.5 }); }
    if (!collected && u.at !== null && !u.clicked) { u.at = null; u.landed = false; }
    if (u.at === null) {
      const p_ = routeAt(u.step, u.side).pos;
      c.position.set(p_.x, 1.0 + Math.sin(t * 2 + u.ph) * 0.1, p_.z);
      c.rotation.set(PI / 2, 0, t * 2.2 + u.ph); c.scale.setScalar(storeK || 0.0001); c.visible = storeK > 0.01;
    } else {
      const e = t - u.at;
      if (e < 0.15) { c.scale.setScalar(1 + e / 0.15 * 0.5); c.visible = true; }
      else if (e < 0.85) {
        const k = ss((e - 0.15) / 0.7), to = plazaPos.clone().add(new THREE.Vector3(0, 0.1 + Math.min(39, landedN) * 0.075, 0));
        c.position.copy(u.from).lerp(to, k); c.position.y += Math.sin(k * PI) * 2.2; c.rotation.x += dt * 9; c.scale.setScalar(1.5 - 0.5 * k); c.visible = true;
      } else { c.visible = false; if (!u.landed) { u.landed = true; refreshRewards(); } }
    }
    if (u.landed) landedN++;
  });
  stack.count = Math.min(40, landedN);
  const sm = new THREE.Matrix4(), sq = new THREE.Quaternion(), ssv = new THREE.Vector3(1, 1, 1);
  for (let k = 0; k < stack.count; k++) {
    const col_ = k % 3, lev = Math.floor(k / 3);
    sq.setFromEuler(new THREE.Euler(0, k * 0.7, 0));
    sm.compose(new THREE.Vector3(plazaPos.x + (col_ - 1) * 0.62, 0.17 + lev * 0.075, plazaPos.z + (col_ === 1 ? -0.3 : 0.2)), sq, ssv); stack.setMatrixAt(k, sm);
  }
  stack.instanceMatrix.needsUpdate = true;
  const runPts = earned();
  $("ptsRun").textContent = "+" + fmt(runPts); $("ptsBal").textContent = fmt(balance + runPts - spent); $("ptsTag").textContent = `+${fmt(runPts)} PACE`;

  // Friends: Aanya catches up and runs beside you; Rahul and Mei elsewhere
  // beside you until the corner, then she peels off up her own street and away
  const aK = seg(P, 0.70, 0.715) * (1 - seg(P, 0.885, 0.90)), catchup = seg(P, 0.705, 0.748);
  const aSteps = Math.max(AANYA_FROM, lerp(steps - 1.3, steps, catchup));
  const cornerD = APATH.cum[Math.round((19 - 17.2) / 0.02)];
  const aD = aSteps < 19 ? APATH.cum[Math.min(APATH.cum.length - 1, Math.round((aSteps - 17.2) / 0.02))] : cornerD + seg(P, 0.81, 0.885) * 14;
  const ar = aAt(aD);
  aanya.visible = aK > 0.01;
  aanya.position.set(ar.pos.x, 0.42 + Math.sin(t * 3 + 1) * 0.035, ar.pos.z); aanya.rotation.set(0, Math.atan2(ar.dir.x, ar.dir.z) + PI, 0); aanya.userData.mesh.rotation.set(0, 0, 0); aanya.userData.pin.position.y = 0.02 + Math.abs(Math.sin(t * 7 + 1)) * 0.06; aanya.userData.pin.material.opacity = aK;
  const aru = (t * 0.8 + 0.4) % 1; aRing.position.set(ar.pos.x, 0.05, ar.pos.z); aRing.scale.setScalar(0.8 + aru * 1.8); aRing.material.opacity = 0.5 * (1 - aru) * aK;
  aStrip.geometry.setDrawRange(0, seg(P, 0.70, 0.715) > 0.01 ? ar.i * 6 : 0);
  const fK = seg(P, 0.705, 0.72) * (1 - seg(P, 0.80, 0.815));
  const rp = gx(-2, 3).lerp(gx(5, 3), (t * 0.035) % 1), mp_ = gx(7, -4).lerp(gx(7, 4), (t * 0.028) % 1);
  rahul.visible = mei.visible = fK > 0.01;
  rahul.position.set(rp.x, 0.42, rp.z); rahul.userData.pin.material.opacity = mei.userData.pin.material.opacity = fK; rahul.rotation.set(0, PI / 2 + PI, 0);
  mei.position.set(mp_.x, 0.42, mp_.z); mei.rotation.set(0, PI, 0);
  if (!autoDemo && P > 0.752 && P < 0.80) { autoDemo = true; setTimeout(sendKudos, 300); }

  // kudos projectiles
  for (const pr of projectiles) {
    if (pr.done) continue; pr.t += dt; if (pr.t < 0) continue;
    const k = Math.min(1, pr.t / pr.dur), to = pr.to();
    tmp.copy(pr.from).lerp(to, k); tmp.y = lerp(pr.from.y, to.y, k) + 0.4 + Math.sin(k * PI) * pr.h; tmp.x += Math.sin(k * PI) * pr.j;
    sparks.emit(tmp, 2, [pr.color, 0xffffff], 0.4, { size: 0.11, life: 0.35, g: 0.5 });
    if (k >= 1) { pr.done = true; if (pr.onArrive) pr.onArrive(); }
  }
  for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].done) projectiles.splice(i, 1);
  finishLine.visible = P > 0.82;

  sparks.update(dt);

  // camera
  const [, ang, hgt, dist, fw, hr, fov] = camAt(P);
  const mobile = isPhone();
  base.copy(WORLD).lerp(ap, fw);
  if (P > 0.555 && P < 0.70) base.lerp(plazaPos, 0.35 * storeK);
  if (P > 0.70 && P < 0.82) base.lerp(aanya.position, 0.3 * aK);
  const ca = ang + hr * heading + (reduce ? 0 : Math.sin(t * 0.2) * 0.03);
  const dm = mobile ? 1.55 : 1, hm = mobile ? 1.3 : 1;
  tmp.set(base.x + Math.sin(ca) * dist * dm, hgt * hm, base.z + Math.cos(ca) * dist * dm);
  lookT.copy(base); lookT.y = hr * 0.85 + (P < 0.12 ? hover * 0.6 : 0);
  const kk = reduce ? 1 : 1 - Math.pow(0.015, dt);
  camPos.lerp(tmp, kk); look.lerp(lookT, kk);
  camera.position.copy(camPos); camera.lookAt(look);
  camera.fov = lerp(camera.fov, mobile ? fov + 10 : fov, kk);
  const d = camPos.distanceTo(look); scene.fog.near = d * 1.35; scene.fog.far = d * 3.4 + 30;
  if (mobile) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.2, innerWidth, innerHeight);
  else camera.setViewOffset(innerWidth, innerHeight, -innerWidth * (0.17 - 0.06 * Math.min(1, Math.max(0, (14 - dist) / 8))) * (1 - finK), 0, innerWidth, innerHeight);
  camera.updateProjectionMatrix();

  // anchored labels
  const up = (v, h) => v.clone().add(new THREE.Vector3(0, h, 0));
  placeTag(tagEls.tZone, new THREE.Vector3(PITCH, 0.6, -PITCH), seg(P, 0.388, 0.40) * (1 - seg(P, 0.43, 0.445)));
  placeTag(tagEls.tPace, up(me.position, 0.9), seg(P, CHK_AT[1], CHK_AT[1] + 0.006) * (1 - seg(P, 0.53, 0.54)), 95, 0);
  placeTag(tagEls.tDone, up(me.position, 0.9), seg(P, CHK_AT[2], CHK_AT[2] + 0.006) * (1 - seg(P, 0.535, 0.545)), -95, 0);
  placeTag(tagEls.tPts, up(plazaPos, 1.0 + Math.min(13, Math.floor(landedN / 3)) * 0.075 + 0.6), storeK * (landedN > 0 ? 1 : 0.6));
  placeTag(tagEls.tKudos, up(me.position, 1.45), flash(labelTimers.kudos, t) * (1 - seg(P, 0.80, 0.815)));
  placeTag(tagEls.tBack, up(me.position, 1.45), flash(labelTimers.back, t) * (1 - seg(P, 0.80, 0.815)), 0, -40);
  placeTag(tagEls.tRahul, up(rahul.position, 1.4), fK);
  placeTag(tagEls.tMei, up(mei.position, 1.4), fK);
  placeTag(tagEls.tKabir, new THREE.Vector3(4.5 * PITCH, 0.6, 0.5 * PITCH), seg(P, 0.83, 0.845) * (1 - seg(P, 0.885, 0.898)));
  placeTag(tagEls.tTaken, new THREE.Vector3(4.5 * PITCH, 0.7, 0.5 * PITCH), seg(P, 0.905, 0.912) * (1 - seg(P, 0.926, 0.934)));

  // Aanya's card
  const card = $("aanya"), cK = seg(P, 0.745, 0.755) * (1 - seg(P, 0.80, 0.81));
  card.classList.toggle("on", cK > 0.6); card.inert = cK <= 0.6;
  if (cK > 0.01) {
    const p = project(up(aanya.position, 1.4));
    const x = Math.min(innerWidth - card.offsetWidth - 12, Math.max(12, p.x - card.offsetWidth / 2)), y = Math.min(innerHeight - card.offsetHeight - 12, Math.max(80, p.y - card.offsetHeight - 14));
    card.style.transform = `translate(${x.toFixed(1)}px, ${(y + (1 - cK) * 12).toFixed(1)}px)`;
  }
  card.style.opacity = cK.toFixed(3);

  // reward cards beside the coin stack
  const rwEl = $("rewards"), rK = seg(P, 0.628, 0.64) * (1 - seg(P, 0.69, 0.70));
  rwEl.classList.toggle("on", rK > 0.6); rwEl.inert = rK <= 0.6; rwEl.style.opacity = rK > 0.001 ? 1 : 0;
  rws.forEach((el, i) => { const k = seg(P, 0.628 + i * 0.014, 0.64 + i * 0.014) * (1 - seg(P, 0.69, 0.70)); el.style.setProperty("--o", k.toFixed(3)); el.style.setProperty("--dy", ((1 - k) * 14).toFixed(1) + "px"); });
  if (!mobile && rK > 0.001) {
    const p = project(up(plazaPos, 1.0));
    const x = Math.min(innerWidth - rwEl.offsetWidth - 20, p.x + 70), y = Math.min(innerHeight - rwEl.offsetHeight - 70, Math.max(80, p.y - rwEl.offsetHeight / 2));
    rwEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  lastP = P;
  renderer.render(scene, camera);
  raf = requestAnimationFrame(frame);
}

  /* ================= lifecycle ================= */
  let running = false, raf = 0;
  build();
  refreshRewards();
  return {
    setProgress(p, snap) { target = p; if (snap) P = p; },
    setActive(on) {
      if (!renderer || on === running) return;
      running = on;
      if (on) { clock.getDelta(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
    },
    resize,
    dispose() {
      running = false; cancelAnimationFrame(raf);
      if (!renderer) return;
      scene.traverse(o => {
        o.geometry?.dispose?.();
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        ms.forEach(m => { m.map?.dispose?.(); m.dispose?.(); });
      });
      scene.environment?.dispose?.();
      renderer.dispose(); renderer.forceContextLoss(); renderer = null;
    },
  };
}
