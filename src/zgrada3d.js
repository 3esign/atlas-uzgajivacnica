// Zgrada iz Lucijinog DWG-a (data/zgrada.json) + 2.5D CAD sloj (kote, osovine, živi Presjek A-A) + 2.5D/3D maketa regije i 10 tipoloških objekata u holu.
export async function zgrada({ THREE, s }) {
  const [Z, A] = await Promise.all(['data/zgrada.json', 'atlas.json'].map(u => fetch(u).then(x => x.json())));
  // Kote iz presjeka A-A: gotov pod, strop i atika/vijenac.
  const ETAZE = [
    ['prizemlje', 0.00, 2.75, 0.30],
    ['kat1',      2.95, 5.70, 3.35],
    ['kat2',      5.90, 8.65, 6.30],
    ['krov',      8.85, 8.85, 9.25],
  ];
  const VISINA = { Zidovi: 1, 'Armirani beton': 1, Pzid: 0.42, 'Providna ograda': 1 };
  const presek = new THREE.Plane(new THREE.Vector3(0, 0, -1), 99);
  const cp = [presek];

  // Materijali arhitektonske makete (gips, topli kamen, drvo, čelični okvir i fina mreža volijere)
  const zidM = new THREE.MeshStandardMaterial({ color: 0xf1e9d8, roughness: 0.86, metalness: 0.02, side: THREE.DoubleSide, clippingPlanes: cp, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const pzidM = new THREE.MeshStandardMaterial({ color: 0xdfd2ba, roughness: 0.9, side: THREE.DoubleSide, clippingPlanes: cp });
  const plocaM = new THREE.MeshStandardMaterial({ color: 0xd6cab4, roughness: 0.85, clippingPlanes: cp });
  const atikaM = new THREE.MeshStandardMaterial({ color: 0xe5dac6, roughness: 0.84, clippingPlanes: cp });
  const stolM = new THREE.MeshStandardMaterial({ color: 0x7c5c3e, roughness: 0.65, metalness: 0.1, side: THREE.DoubleSide, clippingPlanes: cp });
  const okvirM = new THREE.MeshStandardMaterial({ color: 0x36423f, roughness: 0.45, metalness: 0.55, side: THREE.DoubleSide, clippingPlanes: cp });
  const mrezaM = new THREE.MeshStandardMaterial({
    color: 0x9ec0ba, roughness: 0.25, metalness: 0.3, transparent: true, opacity: 0.20,
    side: THREE.DoubleSide, depthWrite: false, clippingPlanes: cp,
  });
  const ivicaM = new THREE.LineBasicMaterial({ color: 0x3b352c, transparent: true, opacity: 0.55, clippingPlanes: cp });
  const mrezaLinM = new THREE.LineBasicMaterial({ color: 0x3b4a46, transparent: true, opacity: 0.42, clippingPlanes: cp });

  const crta = { def: 0x4a4438, PLANTING_AND_SITE: 0x5d7a3a, Stolarija: 0x7c5c3e, 'Namještaj': 0x7a6a55, Crtkano: 0x8a8070 };
  const lm = {}, linMat = k => lm[k] ??= new THREE.LineBasicMaterial({ color: crta[k] ?? crta.def, clippingPlanes: cp, transparent: true, opacity: 0.72 });

  const P = (x, y, h) => [x, h, -y]; // DWG: x istok, y sjever → three: x, y=h, z=-y
  const etaze = {}, SEG = [], SOBE = [], SADNJA = [];

  // Tačni poligoni ploča iz DWG-a (bez konveksne ljuske koja je ranije kvarila obris!)
  const ZVIJEZDA_OBRIS = [
    [-4.19, 3.272], [-1.69, 3.272], [0.06, 5.022], [1.81, 3.272], [4.31, 3.272],
    [4.31, 0.772], [6.06, -0.978], [4.31, -2.728], [4.31, -5.228],
    [1.81, -5.228], [1.378, -5.659], [-1.259, -5.659], [-1.69, -5.228],
    [-4.19, -5.228], [-4.19, -2.728], [-5.94, -0.978], [-4.19, 0.772],
  ];
  const KROV_OBRIS = [[-2.94, 2.022], [3.06, 2.022], [3.06, -3.978], [-2.94, -3.978]];
  const OBRIS = { prizemlje: ZVIJEZDA_OBRIS, kat1: ZVIJEZDA_OBRIS, kat2: ZVIJEZDA_OBRIS, krov: KROV_OBRIS };

  // Pomoćna funkcija: dodaje geometriju + EdgesGeometry crtačke ivice (NPR / ISO 128)
  function dodajMeshSaIvicama(grp, geom, mat, sjena = true, prag = 28) {
    const me = new THREE.Mesh(geom, mat);
    me.castShadow = sjena; me.receiveShadow = true;
    grp.add(me);
    const eg = new THREE.EdgesGeometry(geom, prag);
    grp.add(new THREE.LineSegments(eg, ivicaM));
    return me;
  }

  for (const [list, h0, h1, hAtika] of ETAZE) {
    const L = Z.listovi[list], grp = new THREE.Group(); grp.name = list; s.add(grp); etaze[list] = grp;
    const tri = new Map(), lin = new Map(), mrezaSeg = [];
    const dodaj = (m, ...v) => { if (!tri.has(m)) tri.set(m, []); tri.get(m).push(...v.flat()); };
    const segs = [
      ...L.linije.map(([sl, x1, y1, x2, y2]) => [sl, [[x1, y1], [x2, y2]], false]),
      ...L.polilinije.map(([sl, zat, pts]) => [sl, pts, zat]),
    ];

    for (const [sl, pts, zat] of segs) {
      const pp = zat ? [...pts, pts[0]] : pts;
      if (VISINA[sl] && h1 > h0) {
        const jeMreza = sl === 'Providna ograda';
        const m = jeMreza ? mrezaM : sl === 'Pzid' ? pzidM : zidM;
        const g = h0 + (h1 - h0) * VISINA[sl];
        for (let i = 1; i < pp.length; i++) {
          const a = pp[i - 1], b = pp[i];
          const dx = b[0] - a[0], dy = b[1] - a[1], duz = Math.hypot(dx, dy);
          if (duz < 1e-3) continue;
          dodaj(m, P(...a, h0), P(...b, h0), P(...b, g), P(...a, h0), P(...b, g), P(...a, g));
          if (m !== mrezaM || g - h0 > 0.5) SEG.push([a, b, h0, g]);

          // Za volijere (Providna ograda): dodaj konstruktivne čelične stupove (modul ~1.30 m) i finu rešetku mreže
          if (jeMreza && duz > 0.25) {
            const brPolja = Math.max(1, Math.round(duz / 1.25));
            for (let k = 0; k <= brPolja; k++) {
              const f = k / brPolja, px = a[0] + dx * f, py = a[1] + dy * f;
              mrezaSeg.push(...P(px, py, h0), ...P(px, py, g));
            }
            for (const hk of [h0 + 0.04, h0 + (g - h0) * 0.38, h0 + (g - h0) * 0.72, g - 0.03]) {
              mrezaSeg.push(...P(...a, hk), ...P(...b, hk));
            }
          }
        }
      } else if (sl === 'Stolarija' && h1 > h0) {
        // 3D okviri vrata i prozora (visina 2.00 m iz DWG oznaka 70/75/90 × 200)
        const gStol = Math.min(h1, h0 + 2.02);
        for (let i = 1; i < pp.length; i++) {
          const a = pp[i - 1], b = pp[i], duz = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (duz > 0.12 && duz < 1.05) {
            dodaj(stolM, P(...a, gStol - 0.08), P(...b, gStol - 0.08), P(...b, gStol), P(...a, gStol - 0.08), P(...b, gStol), P(...a, gStol));
          }
          if (!lin.has(sl)) lin.set(sl, []);
          lin.get(sl).push(...P(...a, h0 + 0.015), ...P(...b, h0 + 0.015));
        }
      } else if (sl !== 'Pogled' && sl !== 'Presjek' && sl !== 'Tekst stolarija') {
        if (!lin.has(sl)) lin.set(sl, []);
        for (let i = 1; i < pp.length; i++) lin.get(sl).push(...P(...pp[i - 1], h0 + 0.015), ...P(...pp[i], h0 + 0.015));
      }
    }

    for (const [sl, x, y, rad] of L.krugovi) {
      if (!lin.has(sl)) lin.set(sl, []);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, b = ((i + 1) / 16) * Math.PI * 2;
        lin.get(sl).push(x + Math.cos(a) * rad, h0 + 0.015, -y - Math.sin(a) * rad, x + Math.cos(b) * rad, h0 + 0.015, -y - Math.sin(b) * rad);
      }
    }

    for (const [m, v] of tri) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      g.computeVertexNormals();
      const me = dodajMeshSaIvicama(grp, g, m, m !== mrezaM, 24);
      me.userData.zid = true;
    }
    if (mrezaSeg.length) {
      const mg = new THREE.BufferGeometry();
      mg.setAttribute('position', new THREE.Float32BufferAttribute(mrezaSeg, 3));
      grp.add(new THREE.LineSegments(mg, mrezaLinM));
    }
    for (const [sl, v] of lin) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      grp.add(new THREE.LineSegments(g, linMat(sl)));
    }
    for (const [sl, x, y, rad] of L.krugovi) if (sl === 'PLANTING_AND_SITE') SADNJA.push([x, -y, h0, rad, list]);
    for (const [sl, x, y, t] of L.tekst) if (sl === 'Tekst') {
      const [naziv, povrsina] = t.split('\n');
      SOBE.push({ etaza: list, h: h0, x, z: -y, naziv, povrsina });
    }

    // Ploča etaže po tačnom DWG obrisu + otvor za spiralno stubište na kat1 i kat2
    const pts = OBRIS[list];
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    if (list === 'kat1' || list === 'kat2') {
      const rupa = new THREE.Path();
      rupa.absarc(0.06, -1.40, 1.08, 0, Math.PI * 2, true);
      sh.holes.push(rupa);
    }
    const deb = list === 'prizemlje' ? 0.14 : 0.20;
    const plG = new THREE.ExtrudeGeometry(sh, { depth: deb, bevelEnabled: false });
    plG.rotateX(-Math.PI / 2);
    plG.translate(0, h0 - deb, 0);
    dodajMeshSaIvicama(grp, plG, plocaM, true, 20);

    // Obodni vijenac / atika po presjeku A-A (+0.30, +3.35, +6.30, +9.25)
    const visAtike = hAtika - h0;
    if (visAtike > 0.05) {
      const atSh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const cx = 0.06, cy = -0.978;
      const un = pts.map(([x, y]) => {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
        return new THREE.Vector2(x - (dx / d) * 0.22, y - (dy / d) * 0.22);
      });
      const rupaAt = new THREE.Path(un);
      atSh.holes.push(rupaAt);
      const atG = new THREE.ExtrudeGeometry(atSh, { depth: visAtike, bevelEnabled: false });
      atG.rotateX(-Math.PI / 2);
      atG.translate(0, h0, 0);
      dodajMeshSaIvicama(grp, atG, atikaM, true, 25);
    }
  }

  // Krovni vrtovi na koti +8.85 (4 kvadratne leje smilja i santoline + križna staza od kamene rizle + staklena lanterna)
  const krovLeje = [
    [-2.69, -0.478, -0.44, 1.772, 0x7c8c58], // Smilje SZ
    [0.56, -0.478, 2.81, 1.772, 0x86945c],   // Smilje SI
    [-2.69, -3.728, -0.44, -1.478, 0x6e8268],// Santolina JZ
    [0.56, -3.728, 2.81, -1.478, 0x6e8268],  // Santolina JI
  ];
  for (const [x1, y1, x2, y2, col] of krovLeje) {
    const w = x2 - x1, d = y2 - y1;
    const lg = new THREE.BoxGeometry(w, 0.14, d);
    lg.translate((x1 + x2) / 2, 8.85 + 0.07, -(y1 + y2) / 2);
    dodajMeshSaIvicama(etaze.krov, lg, new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, clippingPlanes: cp }), false);
  }
  // Križna staza od kamene rizle na krovu
  const rizlaM = new THREE.MeshStandardMaterial({ color: 0xe6dfd0, roughness: 0.95, clippingPlanes: cp });
  const rz1 = new THREE.BoxGeometry(5.50, 0.04, 1.00); rz1.translate(0.06, 8.85 + 0.02, 0.978);
  const rz2 = new THREE.BoxGeometry(1.00, 0.04, 5.50); rz2.translate(0.06, 8.85 + 0.02, 0.978);
  etaze.krov.add(new THREE.Mesh(rz1, rizlaM), new THREE.Mesh(rz2, rizlaM));

  // Staklena kupola / lanterna nad stubištem (centrirana na (0.06, -0.978))
  const staklo = new THREE.MeshPhysicalMaterial({
    color: 0xd8ecea, roughness: 0.08, metalness: 0.05, transparent: true,
    opacity: 0.34, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: cp,
  });
  const kup = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), staklo);
  kup.scale.set(1.55, 0.72, 1.55); kup.position.set(0.06, 8.85, 0.978); etaze.krov.add(kup);
  const rebra = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2)),
    new THREE.LineBasicMaterial({ color: 0x4a453b, transparent: true, opacity: 0.55, clippingPlanes: cp })
  );
  rebra.scale.copy(kup.scale); rebra.position.copy(kup.position); etaze.krov.add(rebra);

  // Zavojito stubište u holu (od 0.00 do +8.85)
  const STUB = { x: 0.06, z: 1.4, r: 0.95 };
  const stM = new THREE.MeshStandardMaterial({ color: 0xb59a74, roughness: 0.68, clippingPlanes: cp });
  const stG = new THREE.BoxGeometry(STUB.r, 0.055, 0.32), N = 48, stub = new THREE.InstancedMesh(stG, stM, N);
  const Mx = new THREE.Matrix4(), Qx = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), J = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < N; i++) {
    const a = (i / 16) * Math.PI * 2, h = (i / N) * 8.85;
    Qx.setFromEuler(E.set(0, -a, 0));
    Mx.compose(V.set(STUB.x + Math.cos(a) * STUB.r * 0.5, h, STUB.z + Math.sin(a) * STUB.r * 0.5), Qx, J);
    stub.setMatrixAt(i, Mx);
  }
  stub.castShadow = stub.receiveShadow = true; s.add(stub);
  const os = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 9.1, 10), okvirM);
  os.position.set(STUB.x, 4.55, STUB.z); s.add(os);

  // ============================================================================
  // 2.5D TEHNIČKI INSTRUMENT U 3D PROSTORU (ISO 128 kote, ravan Presjeka A-A, osovine razmicanja)
  // ============================================================================
  const cadGrupa = new THREE.Group(); cadGrupa.name = 'cad25d'; s.add(cadGrupa);
  const cadLinM = new THREE.LineBasicMaterial({ color: 0xc8102e, transparent: true, opacity: 0.78 });
  const cadSivaM = new THREE.LineBasicMaterial({ color: 0x3a352c, transparent: true, opacity: 0.55 });

  // 1) Kotna mreža na tlu (raster 175/250/175/175/250/175 cm i gabarit 12,00 × 12,00 m + os A-A)
  const kotPts = [], osPts = [];
  const yK = 0.03;
  // Vanjski kotni okvir 12 × 12 m
  const xL = -5.94, xR = 6.06, zS = 5.659, zN = -5.022;
  kotPts.push(
    xL, yK, zS + 1.2, xR, yK, zS + 1.2,
    xL, yK, zS + 0.9, xL, yK, zS + 1.45,
    xR, yK, zS + 0.9, xR, yK, zS + 1.45,
    xR + 1.2, yK, zN, xR + 1.2, yK, zS,
    xR + 0.9, yK, zN, xR + 1.45, yK, zN,
    xR + 0.9, yK, zS, xR + 1.45, yK, zS
  );
  // Raster podjela (x-os): -5.94, -4.19, -1.69, 0.06, 1.81, 4.31, 6.06
  for (const xr of [-5.94, -4.19, -1.69, 0.06, 1.81, 4.31, 6.06]) {
    kotPts.push(xr, yK, zN - 0.8, xr, yK, zN - 1.35);
  }
  kotPts.push(-5.94, yK, zN - 1.1, 6.06, yK, zN - 1.1);
  // Os presjeka A-A (z = -0.29 u 3D, tj. y = 0.29 u DWG-u)
  for (let x = -8.2; x < 8.2; x += 0.45) {
    osPts.push(x, yK + 0.01, -0.29, x + 0.25, yK + 0.01, -0.29);
  }
  const kg1 = new THREE.BufferGeometry(); kg1.setAttribute('position', new THREE.Float32BufferAttribute(kotPts, 3));
  const kg2 = new THREE.BufferGeometry(); kg2.setAttribute('position', new THREE.Float32BufferAttribute(osPts, 3));
  cadGrupa.add(new THREE.LineSegments(kg1, cadSivaM), new THREE.LineSegments(kg2, cadLinM));

  // 2) Živi vektorski Presjek A-A iz DWG-a montiran direktno na ravan reza (z = 0)
  const presjekGrupa = new THREE.Group(); presjekGrupa.name = 'presjek_dwg'; presjekGrupa.visible = false; s.add(presjekGrupa);
  const paa = Z.listovi.presjek_aa;
  if (paa) {
    const abPts = [], srPts = [], ostPts = [];
    for (const [sl, x1, y1, x2, y2] of paa.linije) {
      const niz = sl === 'Armirani beton' || sl === 'Zidovi' ? abPts : sl === 'Šrafura' ? srPts : ostPts;
      niz.push(x1, y1, 0.02, x2, y2, 0.02);
    }
    for (const [sl, zat, pts] of paa.polilinije) {
      const pp = zat ? [...pts, pts[0]] : pts;
      for (let i = 1; i < pp.length; i++) ostPts.push(pp[i - 1][0], pp[i - 1][1], 0.02, pp[i][0], pp[i][1], 0.02);
    }
    const dodLin = (pts, col, op) => {
      if (!pts.length) return;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      presjekGrupa.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op })));
    };
    dodLin(abPts, 0xc8102e, 0.95);
    dodLin(srPts, 0xd96b43, 0.45);
    dodLin(ostPts, 0x22201c, 0.65);
  }

  // 3) Vertikalne isprekidane osovine za rasklopljeni 2.5D pogled (spajaju uglove etaža)
  const osovineGrupa = new THREE.Group(); osovineGrupa.visible = false; s.add(osovineGrupa);
  const kutoviOsovina = [[-4.19, 3.272], [4.31, 3.272], [4.31, -5.228], [-4.19, -5.228], [0.06, 5.022], [6.06, -0.978], [-5.94, -0.978]];
  const osovPts = [];
  for (const [ox, oy] of kutoviOsovina) {
    for (let h = 0; h < 14.0; h += 0.35) osovPts.push(ox, h, -oy, ox, h + 0.18, -oy);
  }
  const osovG = new THREE.BufferGeometry(); osovG.setAttribute('position', new THREE.Float32BufferAttribute(osovPts, 3));
  osovineGrupa.add(new THREE.LineSegments(osovG, cadLinM));

  // ============================================================================
  // 2.5D MAKETA REGIJE U SREDIŠNJEM HOLU + 10 TIPOLOŠKIH MODELA UZGAJIVAČNICA (CGA-lite gramatika)
  // ============================================================================
  // Prstenasti arhitektonski stol oko spiralnog stubišta u središnjem holu (prizemlje, y = 0.72 m)
  const holMaketa = new THREE.Group(); holMaketa.name = 'holMaketa'; etaze.prizemlje.add(holMaketa);
  const stolPrsten = new THREE.RingGeometry(1.18, 1.72, 32);
  stolPrsten.rotateX(-Math.PI / 2); stolPrsten.translate(STUB.x, 0.74, STUB.z);
  const stolBaza = new THREE.CylinderGeometry(1.72, 1.65, 0.06, 32, 1, true);
  stolBaza.translate(STUB.x, 0.71, STUB.z);
  holMaketa.add(
    new THREE.Mesh(stolPrsten, new THREE.MeshStandardMaterial({ color: 0x3b4d54, roughness: 0.6, clippingPlanes: cp })),
    new THREE.Mesh(stolBaza, stolM)
  );

  // CGA-lite generator za 10 terenskih uzgajivačnica (UZ-01..UZ-10):
  // Polja iz objekti.csv -> 3D tipološka minijatura na prstenastom stolu u holu
  const terenObjekti = A.objekti.filter(o => o.vrsta_zapisa === 'uzgajivacnica');
  const tipBoje = { A: 0xd4845a, B: 0x6a9a5b, C: 0x4f86a8, D: 0xd8a848 };
  const TIPOLOGIJA = [];
  terenObjekti.forEach((o, i) => {
    const ugao = (i / terenObjekti.length) * Math.PI * 2 - Math.PI / 2;
    const radStola = 1.45;
    const mx = STUB.x + Math.cos(ugao) * radStola, mz = STUB.z + Math.sin(ugao) * radStola;
    const mg = new THREE.Group();
    mg.position.set(mx, 0.75, mz);
    mg.rotation.y = -ugao;

    const imaPov = Number.isFinite(parseFloat(o.povrsina_m2));
    const m2 = imaPov ? parseFloat(o.povrsina_m2) : 25;
    // Razmera osnove iz kvadratnog korena površine (pravilo rekonstrukcije!)
    const sxy = Math.max(0.08, Math.min(0.22, Math.sqrt(m2) * 0.024));
    const matTip = new THREE.MeshStandardMaterial({ color: tipBoje[o.tip] || 0xcccccc, roughness: 0.7, clippingPlanes: cp });

    if (!imaPov) {
      // ART_BIBLE §2: nepoznata površina = isprekidana žičana kontura, ne lažni puni volumen!
      const wg = new THREE.WireframeGeometry(new THREE.BoxGeometry(sxy, 0.09, sxy));
      mg.add(new THREE.LineSegments(wg, cadLinM));
    } else if (o.tip === 'A') {
      // Tip A (unutarnja prostorija s boksovima uz zid): poluotvorena ljuska + redovi boksova
      const podG = new THREE.BoxGeometry(sxy, 0.015, sxy); podG.translate(0, 0.008, 0);
      const zidG = new THREE.BoxGeometry(sxy, 0.09, 0.015); zidG.translate(0, 0.045, -sxy * 0.45);
      const boksG = new THREE.BoxGeometry(sxy * 0.85, 0.06, sxy * 0.28); boksG.translate(0, 0.04, -sxy * 0.25);
      mg.add(new THREE.Mesh(podG, plocaM), new THREE.Mesh(zidG, zidM), new THREE.Mesh(boksG, matTip));
    } else if (o.tip === 'B') {
      // Tip B (vrtna žičana volijera): izduženi mrežasti paviljon
      const volG = new THREE.BoxGeometry(sxy * 1.35, 0.085, sxy * 0.7); volG.translate(0, 0.043, 0);
      mg.add(dodajMeshSaIvicama(mg, volG, matTip, false, 20));
    } else if (o.tip === 'C') {
      // Tip C (kombinirana unutarnja + vanjski prelet): puni zidani kubus + mrežasti ispust
      const unG = new THREE.BoxGeometry(sxy * 0.65, 0.095, sxy * 0.8); unG.translate(-sxy * 0.28, 0.048, 0);
      const vanG = new THREE.BoxGeometry(sxy * 0.75, 0.075, sxy * 0.8); vanG.translate(sxy * 0.35, 0.038, 0);
      mg.add(new THREE.Mesh(unG, zidM), dodajMeshSaIvicama(mg, vanG, matTip, false, 20));
    } else {
      // Tip D (niz samostojećih volijera): 3 modula u nizu
      for (const k of [-1, 0, 1]) {
        const modG = new THREE.BoxGeometry(sxy * 0.32, 0.08, sxy * 0.85);
        modG.translate(k * sxy * 0.38, 0.04, 0);
        mg.add(new THREE.Mesh(modG, matTip));
      }
    }
    holMaketa.add(mg);
    TIPOLOGIJA.push({ objekt: o, x: mx, y: 0.82, z: mz });
  });

  // Razmicanje etaža (presjek kao na Lucijinom crtežu): 0 = sastavljeno, 1 = razmaknuto.
  let raz = 0, cilj = 0;
  const razmakni = v => { cilj = v; osovineGrupa.visible = v > 0.05; };
  const tick = (dt, C) => {
    if (Math.abs(raz - cilj) < 1e-3) return;
    raz += (cilj - raz) * Math.min(1, dt * 4); if (Math.abs(raz - cilj) < 1e-3) raz = cilj;
    ETAZE.forEach(([k], i) => { etaze[k].position.y = raz * i * 2.1; });
    stub.visible = os.visible = raz < 0.05;
    osovineGrupa.visible = raz > 0.05;
    C.sjene();
  };

  return {
    etaze, SADNJA, SEG, ETAZE, SOBE, OBRIS, presek, STUB,
    cadGrupa, presjekGrupa, osovineGrupa, holMaketa, TIPOLOGIJA, Z,
    razmakni, zgradaTick: tick,
  };
}
