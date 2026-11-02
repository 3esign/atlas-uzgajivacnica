// Javna verzija: 2D ↔ 2.5D ↔ 3D kontinuum (dual-camera Perspective + Orthographic, zgrada, krajina, 2D/2.5D studio i iskustvo).
import * as THREE from 'three';
import { OrbitControls } from 'three/controls/OrbitControls.js';
import { zgrada } from './zgrada3d.js';
import { krajina } from './krajina.js';
import { iskustvo } from './iskustvo.js';

const el = document.getElementById('scena3d');
const dodir = matchMedia('(pointer: coarse)').matches;
const mirno = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KVAL = {
  niska: { dpr: 1, sjene: 0, teren: 70, trava: 0, jato: 14, aa: false },
  srednja: { dpr: 1.5, sjene: 1024, teren: 110, trava: 1500, jato: 24, aa: true },
  visoka: { dpr: 2, sjene: 2048, teren: 160, trava: 4500, jato: 40, aa: true },
};
function procjena() {
  const q = new URLSearchParams(location.search).get('q') || localStorage.getItem('kvaliteta');
  if (KVAL[q]) return q;
  const mem = navigator.deviceMemory || 8, jez = navigator.hardwareConcurrency || 8;
  if (dodir) return mem <= 4 || jez <= 4 ? 'niska' : 'srednja';
  return mem <= 4 || jez <= 4 ? 'srednja' : 'visoka';
}
const razina = procjena(), Q = { ...KVAL[razina], razina };

const r = new THREE.WebGLRenderer({ antialias: Q.aa, powerPreference: 'high-performance' });
const dprMax = Math.min(devicePixelRatio, Q.dpr); let dpr = dprMax;
r.setPixelRatio(dpr); r.localClippingEnabled = true;
r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
r.shadowMap.enabled = Q.sjene > 0; r.shadowMap.type = THREE.PCFShadowMap; r.shadowMap.autoUpdate = false;
el.prepend(r.domElement);

const s = new THREE.Scene(); s.fog = new THREE.Fog(0xcfe0e8, 45, 340);
const pCam = new THREE.PerspectiveCamera(38, 1, 0.08, 1200); pCam.position.set(24, 14, 28);
const oCam = new THREE.OrthographicCamera(-12, 12, 12, -12, -180, 1200); oCam.position.set(24, 18, 24);
let ortoVel = 11.5;

const ctl = new OrbitControls(pCam, r.domElement);
Object.assign(ctl, { enableDamping: true, dampingFactor: 0.08, minDistance: 1.2, maxDistance: 120, maxPolarAngle: Math.PI * 0.495, minZoom: 0.35, maxZoom: 4.5 });
ctl.target.set(0, 4.0, 0);

const hemi = new THREE.HemisphereLight(0xdfeeff, 0x8a7a5a, 1.4); s.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b8, 3.2); sun.position.set(-30, 38, 22); s.add(sun);
if (Q.sjene) {
  sun.castShadow = true; sun.shadow.mapSize.set(Q.sjene, Q.sjene); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.035;
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, far: 160 });
}

function azurirajOrto() {
  const w = el.clientWidth || 1, h = el.clientHeight || 1, a = w / h;
  oCam.left = -ortoVel * a; oCam.right = ortoVel * a;
  oCam.top = ortoVel; oCam.bottom = -ortoVel;
  oCam.updateProjectionMatrix();
}

const C = {
  THREE, s, r, cam: pCam, pCam, oCam, ctl, el, sun, hemi, Q, dodir, mirno, tick: [], kamera: null,
  sjene: () => { r.shadowMap.needsUpdate = true; },
  postaviOrto: (uklj, d = 11.5) => {
    ortoVel = d;
    const nova = uklj ? oCam : pCam;
    if (C.cam !== nova) {
      nova.position.copy(C.cam.position);
      nova.quaternion.copy(C.cam.quaternion);
      C.cam = nova;
      ctl.object = nova;
    }
    if (uklj) { oCam.zoom = 1; azurirajOrto(); } else pCam.updateProjectionMatrix();
    ctl.update();
  },
};

const veo = document.getElementById('veo'), korak = t => { veo.querySelector('.stanje').textContent = t; };
korak('zgrada · building');
Object.assign(C, await zgrada(C));
korak('vrt · garden');
Object.assign(C, await krajina(C));
korak('');
await iskustvo(C);
C.sjene();

function vel() {
  const w = el.clientWidth || 1, h = el.clientHeight || 1;
  r.setSize(w, h, false);
  pCam.aspect = w / h; pCam.updateProjectionMatrix();
  azurirajOrto();
}
new ResizeObserver(vel).observe(el); vel();

let zbroj = 0, n = 0;
function mjeri(dt) {
  zbroj += dt; n++;
  if (zbroj < 1.5) return;
  const ms = (zbroj / n) * 1000; zbroj = n = 0;
  const nova = ms > 22 ? Math.max(0.6, dpr - 0.2) : ms < 13 ? Math.min(dprMax, dpr + 0.1) : dpr;
  if (nova !== dpr) { dpr = nova; r.setPixelRatio(dpr); vel(); }
  C.fps = Math.round(1000 / ms);
}
let vidljivo = true;
new IntersectionObserver(([u]) => { vidljivo = u.isIntersecting; petlja(); }).observe(el);
document.addEventListener('visibilitychange', petlja);
let zadnji = performance.now(), t0 = zadnji;
function petlja() {
  const radi = vidljivo && !document.hidden;
  r.setAnimationLoop(radi ? kadar : null);
  if (radi) zadnji = performance.now();
}
function kadar() {
  const sad = performance.now(), dt = Math.min((sad - zadnji) / 1000, 0.05), t = (sad - t0) / 1000; zadnji = sad;
  mjeri(dt);
  for (const f of C.tick) f(dt, t);
  if (C.kamera) C.kamera(dt, t); else ctl.update();
  r.render(s, C.cam);
}
petlja();
veo.classList.add('spreman');
window.__atlas = { spreman: true, razina, get fps() { return C.fps; }, get dpr() { return dpr; }, pozivi: () => r.info.render.calls, C };
