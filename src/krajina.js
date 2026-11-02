// Krajina oko zgrade: nebo i doba dana, teren s morem prema Šibeniku, parcela k.č. 1004 sa suhozidom, vrt iz data/vrt.json i ptice.
export async function krajina(C) {
  const { THREE, s, sun, hemi, Q, SOBE } = C;
  const V = await (await fetch('data/vrt.json')).json();
  // Vrt i zgrada u DWG-u nisu poravnati: što padne u tlocrt zgrade, gura se radijalno na plato.
  const van = ([x, y]) => { const a = Math.max(Math.abs(x), Math.abs(y)); return a > 6.8 ? [x, y] : [x * 7.2 / (a || 1), y * 7.2 / (a || 1)]; };
  const TEREN = -0.14;
  const P = (xy, h = TEREN) => { const [x, y] = van(xy); return new THREE.Vector3(x, h, -y); };
  C.van = van;
  let seme = 7; const rnd = () => ((seme = (seme * 16807) % 2147483647) / 2147483647);

  // Nebo: gradijent zenit/horizont, sunce i halo; boje prate doba dana.
  const U = { sunce: { value: new THREE.Vector3() }, zenit: { value: new THREE.Color() }, horizont: { value: new THREE.Color() }, sjaj: { value: new THREE.Color() } };
  const nebo = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
    vertexShader: 'varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec3 v; uniform vec3 sunce, zenit, horizont, sjaj;
      void main(){ float h = max(v.y, 0.);
        vec3 c = mix(horizont, zenit, pow(h, .52));
        c = mix(c, horizont * .84, smoothstep(0., -.15, v.y));
        float d = max(dot(v, sunce), 0.); c += sjaj * (pow(d, 900.) * 3.5 + pow(d, 10.) * .32);
        gl_FragColor = vec4(c, 1.); }`,
  }));
  nebo.renderOrder = -1; s.add(nebo);

  // Teren: valovit izvan parcele, pada u more na jugu; parcela k.č. 1004 svijetli šljunak i vapnenac.
  const tg = new THREE.PlaneGeometry(700, 700, Q.teren, Q.teren); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, boje = [];
  const unutra = (x, y, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const visina = (x, z) => {
    const d = Math.hypot(x, z);
    const val = d < 42 ? 0 : (Math.sin(x * 0.03) * Math.cos(z * 0.025) * 5.5 + Math.sin(x * 0.011 + z * 0.017) * 12 + Math.sin(x * 0.004 - 1) * 18) * Math.min((d - 42) / 90, 1);
    const jug = z > 20 ? Math.max(0.1, 1 - (z - 20) / 70) : 1;
    const more = z > 60 && x < 90 ? Math.min((z - 60) * 0.2, 32) : 0;
    return TEREN + val * jug - more;
  };
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), y = visina(x, z); tp.setY(i, y);
    const par = unutra(x, -z, V.parcela), n = rnd() * 0.05, kam = Math.max(0, Math.min(1, (y - 5) / 10));
    const c = par ? [0.83 + n, 0.79 + n, 0.69 + n] : y < -3 ? [0.64 + n, 0.60 + n, 0.49 + n]
      : [0.49 + n + kam * 0.22, 0.54 + n + kam * 0.14, 0.34 + n + kam * 0.18];
    boje.push(...c.map(v => Math.pow(v, 2.2)));
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(boje, 3)); tg.computeVertexNormals();
  const tlo = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98 }));
  tlo.receiveShadow = true; s.add(tlo);

  const more = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1400), new THREE.MeshStandardMaterial({ color: 0x356e8a, roughness: 0.15, metalness: 0.3 }));
  more.rotation.x = -Math.PI / 2; more.position.set(-200, -9, 760); s.add(more);

  // Kameni plato oko zgrade i pristupna staza prema zračnoj komori na jugu
  const platoMat = new THREE.MeshStandardMaterial({ color: 0xdfd5c0, roughness: 0.92 });
  const plato = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.14, 13.6), platoMat);
  plato.position.set(0.06, TEREN + 0.06, 0.978); plato.receiveShadow = true; s.add(plato);
  const staza = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 12.0), new THREE.MeshStandardMaterial({ color: 0xd5c9b0, roughness: 0.95 }));
  staza.position.set(0.06, TEREN + 0.03, 12.5); staza.receiveShadow = true; s.add(staza);

  // Dalmatinski suhozid po obrisu katastarske parcele k.č. 1004 (iz V.parcela)
  if (V.parcela && V.parcela.length > 2) {
    const suhoMat = new THREE.MeshStandardMaterial({ color: 0xbcb29d, roughness: 0.95 });
    const parLin = [];
    for (let i = 0; i < V.parcela.length; i++) {
      const [x1, y1] = V.parcela[i], [x2, y2] = V.parcela[(i + 1) % V.parcela.length];
      const dx = x2 - x1, dz = -y2 - (-y1), duz = Math.hypot(dx, dz);
      const z1 = -y1, z2 = -y2;
      const zidPar = new THREE.Mesh(new THREE.BoxGeometry(duz, 0.55, 0.42), suhoMat);
      zidPar.position.set((x1 + x2) / 2, TEREN + 0.27, (z1 + z2) / 2);
      zidPar.rotation.y = -Math.atan2(dz, dx);
      zidPar.castShadow = zidPar.receiveShadow = true;
      s.add(zidPar);
      parLin.push(x1, TEREN + 0.58, z1, x2, TEREN + 0.58, z2);
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(parLin, 3));
    s.add(new THREE.LineSegments(pg, new THREE.LineBasicMaterial({ color: 0x5c5346, transparent: true, opacity: 0.65 })));
  }

  // Stabla po vrsti iz legende: instancirano po vrsti i dijelu (deblo, krošnja).
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, flatShading: true });
  const kora = mat(0x66503c);
  const KR = {
    cempres: mat(0x2d482a),
    maslina: mat(0x88986e),
    bagrem: mat(0x6b8840),
    lovor: mat(0x3e5c34),
    smokva: mat(0x5b823c),
  };
  const dijelovi = new Map(), M = new THREE.Matrix4(), Qn = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), T = new THREE.Vector3();
  const stavi = (kljuc, geo, m, poz, rot, sk) => {
    if (!dijelovi.has(kljuc)) dijelovi.set(kljuc, { geo, m, mx: [] });
    dijelovi.get(kljuc).mx.push(new THREE.Matrix4().compose(poz.clone(), new THREE.Quaternion().setFromEuler(rot), sk.clone()));
  };
  const G = {
    stozac: new THREE.ConeGeometry(0.95, 1, 8),
    deblo: new THREE.CylinderGeometry(0.55, 1, 1, 6),
    lopta: new THREE.DodecahedronGeometry(1, 1),
  };
  for (const t of V.stabla) {
    const k = (t.krosnja_m || 2) * 0.58, sc = 0.88 + rnd() * 0.25, o = P(t.xy, TEREN);
    if (t.vrsta === 'cempres') {
      const h = (7.5 + rnd() * 2.8) * sc;
      stavi('kora', G.deblo, kora, T.set(o.x, o.y + 0.6, o.z), E.set(0, 0, 0), S.set(0.14 * sc, 1.2, 0.14 * sc));
      stavi('cempres', G.stozac, KR.cempres, T.set(o.x, o.y + h * 0.52 + 0.5, o.z), E.set(0, rnd() * 6, 0), S.set(k * 0.46 * sc, h, k * 0.46 * sc));
    } else {
      const h = (t.vrsta === 'maslina' ? 2.1 : 2.8) * sc;
      stavi('kora', G.deblo, kora, T.set(o.x, o.y + h / 2, o.z), E.set((rnd() - 0.5) * 0.18, 0, (rnd() - 0.5) * 0.22), S.set(0.17 * sc, h, 0.17 * sc));
      for (let i = 0; i < 5; i++) {
        const rr = k * (0.42 + rnd() * 0.28) * sc;
        stavi(t.vrsta, G.lopta, KR[t.vrsta] ?? KR.lovor, T.set(o.x + (rnd() - 0.5) * k * 0.9, o.y + h + rnd() * k * 0.55, o.z + (rnd() - 0.5) * k * 0.9),
          E.set(rnd(), rnd(), 0), S.set(rr * 1.1, rr * 0.72, rr * 1.1));
      }
    }
  }
  for (const { geo, m, mx } of dijelovi.values()) {
    const im = new THREE.InstancedMesh(geo, m, mx.length); mx.forEach((x, i) => im.setMatrixAt(i, x));
    im.castShadow = im.receiveShadow = true; s.add(im);
  }

  // Lavanda na južnom ulazu (234 grma iz DWG-a)
  const lg = new THREE.DodecahedronGeometry(0.28, 1); lg.scale(1, 0.68, 1);
  const cvijece = C.cvijece = [...V.lavanda.map(p => [P(p, TEREN + 0.15), 1])];
  const lav = new THREE.InstancedMesh(lg, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), cvijece.length);
  const lc = new THREE.Color();
  cvijece.forEach(([p], i) => {
    const sc = 0.72 + rnd() * 0.45;
    M.compose(p.setY(TEREN + 0.14), Qn.setFromEuler(E.set(0, rnd() * 6, 0)), S.set(sc, sc, sc));
    lav.setMatrixAt(i, M);
    lav.setColorAt(i, lc.setHSL(0.74 + rnd() * 0.03, 0.34 + rnd() * 0.12, 0.48 + rnd() * 0.1));
  });
  lav.castShadow = lav.receiveShadow = true; s.add(lav);

  // Cvijeće na terasama 1. kata i krovnim vrtovima: krugovi sadnje iz DWG-a.
  const BO = [0xd89b38, 0xc44b3b, 0xe8ca4b, 0x896ec2, 0xdfd8be, 0xcf6a92], fc = new THREE.Color();
  for (const list of new Set(C.SADNJA.map(o => o[4]))) {
    const sv = C.SADNJA.filter(o => o[4] === list);
    const cv = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.85, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), sv.length);
    sv.forEach(([x, z, h, rr], i) => {
      const sc = Math.max(0.07, rr * 0.52);
      M.compose(T.set(x, h + sc * 0.55 + (list === 'krov' ? 0.12 : 0.02), z), Qn.identity(), S.set(sc, sc * 0.65, sc));
      cv.setMatrixAt(i, M); cv.setColorAt(i, fc.setHex(BO[Math.floor(rnd() * BO.length)]));
    });
    cv.castShadow = true; C.etaze[list].add(cv);
  }

  // Kućice za ptice i pojilište.
  for (const k of V.kucice) {
    const g = new THREE.Group();
    const stup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.2), kora); stup.position.y = 1.1;
    const ku = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.34), mat(0xb58e5e)); ku.position.y = 2.38;
    const kro = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.24, 4), mat(0x7a4b32)); kro.position.y = 2.68; kro.rotation.y = Math.PI / 4;
    g.add(stup, ku, kro); g.position.copy(P(k, TEREN)); g.traverse(m => { m.castShadow = true; }); s.add(g);
  }
  const voda = new THREE.MeshStandardMaterial({ color: 0x4b89a4, roughness: 0.06, metalness: 0.45 });
  for (const p of V.pojiliste) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(1, 36), voda); w.scale.set(p.dim_m[0] / 2, p.dim_m[1] / 2, 1);
    w.rotation.x = -Math.PI / 2; w.position.copy(P(p.xy, TEREN + 0.04)); s.add(w);
  }

  // Mediteranska makija/trava izvan parcele, jedan poziv crtanja.
  if (Q.trava) {
    const bg = new THREE.DodecahedronGeometry(0.5, 0); bg.scale(1, 0.55, 1); bg.translate(0, 0.12, 0);
    const tr = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), Q.trava);
    const tc = new THREE.Color();
    for (let i = 0, n = 0; n < Q.trava && i < Q.trava * 4; i++) {
      const a = rnd() * Math.PI * 2, d = 16 + Math.pow(rnd(), 0.7) * 90, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (unutra(x, -z, V.parcela) || visina(x, z) < -3) continue;
      const sc = 0.45 + rnd() * rnd() * 1.9;
      M.compose(T.set(x, visina(x, z), z), Qn.setFromEuler(E.set((rnd() - 0.5) * 0.35, rnd() * 6, 0)), S.set(sc, sc * (0.65 + rnd() * 0.5), sc));
      tr.setMatrixAt(n, M); tr.setColorAt(n, tc.setHSL(0.22 + rnd() * 0.07, 0.28 + rnd() * 0.14, 0.24 + rnd() * 0.12)); n++;
      tr.count = n;
    }
    tr.receiveShadow = true; s.add(tr);
  }

  // Jato: krila kao dvije instancirane plohe, mašu u matrici.
  const kg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.06), new THREE.Vector3(0, 0, 0.09), new THREE.Vector3(0.24, 0, -0.02)]);
  const pm = new THREE.MeshStandardMaterial({ color: 0x35302a, side: THREE.DoubleSide });
  const jato = Array.from({ length: Q.jato }, () => ({ r: 9 + rnd() * 18, h: 11 + rnd() * 9, w: (0.2 + rnd() * 0.22) * (rnd() < 0.5 ? 1 : -1), f: rnd() * 6, ph: rnd() * 6 }));
  const kL = new THREE.InstancedMesh(kg, pm, jato.length), kD = new THREE.InstancedMesh(kg, pm, jato.length);
  kL.frustumCulled = kD.frustumCulled = false; s.add(kL, kD);
  const Mb = new THREE.Matrix4(), Mk = new THREE.Matrix4(), ZR = new THREE.Matrix4(), ZS = new THREE.Matrix4().makeScale(-1, 1, 1);
  C.jato = jato;

  // Ptice u kavezima: svaka soba "Kavez" dobije 3 ptice koje skakuću (češljugar, zelendur, žutarica, zimovka...).
  const kavezi = SOBE.filter(o => /Kavez/.test(o.naziv));
  const pg = new THREE.SphereGeometry(0.075, 8, 6); pg.scale(1, 0.9, 1.55);
  const PB = [0xc8102e, 0x7f9a3a, 0xe2c23a, 0x8a6a4a, 0xe8d24a, 0x5a6a7a, 0xd45b4b];
  const male = kavezi.flatMap((k, i) => [0, 1, 2].map(j => ({ k, b: PB[(i + j * 2) % PB.length], x: k.x, z: k.z, y: k.h + 1.0, tx: k.x, tz: k.z, ty: k.h + 1.0, t0: rnd() * 3 })));
  const mp = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ roughness: 0.55 }), male.length);
  const bc = new THREE.Color(); male.forEach((p, i) => mp.setColorAt(i, bc.setHex(p.b))); s.add(mp);
  C.kavezi = kavezi;

  C.tick.push((dt, t) => {
    if (C.mirno) t *= 0.3;
    jato.forEach((u, i) => {
      const a = t * u.w + u.f;
      T.set(Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + u.ph) * 1.2, Math.sin(a) * u.r);
      Mb.compose(T, Qn.setFromEuler(E.set(0, -a + (u.w > 0 ? 0 : Math.PI), 0)), S.set(1, 1, 1));
      const m = Math.sin(t * 9 + u.ph) * 0.7;
      kL.setMatrixAt(i, Mk.multiplyMatrices(Mb, ZR.makeRotationZ(m)));
      kD.setMatrixAt(i, Mk.multiplyMatrices(Mb, ZR.makeRotationZ(-m).premultiply(ZS)));
    });
    kL.instanceMatrix.needsUpdate = kD.instanceMatrix.needsUpdate = true;
    male.forEach((p, i) => {
      if (t > p.t0) { p.t0 = t + 0.6 + rnd() * 2.2; p.tx = p.k.x + (rnd() - 0.5) * 1.3; p.tz = p.k.z + (rnd() - 0.5) * 1.3; p.ty = p.k.h + 0.25 + rnd() * 1.5; }
      const k = Math.min(1, dt * 7); p.x += (p.tx - p.x) * k; p.z += (p.tz - p.z) * k; p.y += (p.ty - p.y) * k;
      const sk = Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y) > 0.05 ? Math.sin(t * 40) * 0.3 : 0;
      const off = C.etaze[p.k.etaza].position.y;
      M.compose(T.set(p.x, p.y + off + Math.abs(sk) * 0.05, p.z), Qn.setFromEuler(E.set(0, Math.atan2(p.tx - p.x, p.tz - p.z), 0)), S.set(1, 1, 1));
      mp.setMatrixAt(i, M);
    });
    mp.instanceMatrix.needsUpdate = true;
    more.material.color.setHSL(0.55, 0.48, 0.34 + Math.sin(t * 0.4) * 0.015);
  });

  // Doba dana: 0 jutro (istok), 0.5 podne, 1 zalazak (zapad).
  const c1 = new THREE.Color(), c2 = new THREE.Color();
  function doba(f) {
    const a = Math.PI * (0.08 + 0.84 * f), el = Math.sin(a), toplo = Math.pow(1 - el, 1.6);
    sun.position.set(Math.cos(a) * 60, 8 + el * 52, 28);
    U.sunce.value.copy(sun.position).normalize();
    sun.color.copy(c1.setHex(0xfff4e2).lerp(c2.setHex(0xff8c46), toplo)); sun.intensity = 0.9 + el * 2.6;
    hemi.intensity = 0.75 + el * 0.75; hemi.color.copy(c1.setHex(0xe2f0ff).lerp(c2.setHex(0xffc89a), toplo * 0.7));
    U.zenit.value.copy(c1.setHex(0x4272b0).lerp(c2.setHex(0x34407a), toplo * 0.8));
    U.horizont.value.copy(c1.setHex(0xdde9ef).lerp(c2.setHex(0xf6b27a), toplo));
    U.sjaj.value.copy(c1.setHex(0xfff0d0).lerp(c2.setHex(0xff9a50), toplo));
    s.fog.color.copy(U.horizont.value); C.r.toneMappingExposure = 0.96 + el * 0.14;
    C.sjene();
  }
  doba(0.62);
  return { doba, TEREN, visina };
}
