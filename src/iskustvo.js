// Iskustvo: 2D ↔ 2.5D ↔ 3D kontinuum (maketa, 2.5D aksonometrija, 2D nacrt/tipologija, tura, šetnja, let, presjek, tlocrt),
// točke s karticama iz atlas.json, zvuk i doba dana.
import { zvuk } from './zvuk.js';
import { inicijalizirajGrafiku2D } from './grafika2d.js';

export async function iskustvo(C) {
  const { THREE, ctl, el, r, etaze, ETAZE, SOBE, SEG, STUB, presek, TEREN, cadGrupa, presjekGrupa, TIPOLOGIJA, Z } = C;
  const [A, V] = await Promise.all(['atlas.json', 'data/vrt.json'].map(u => fetch(u).then(x => x.json())));
  const L = localStorage.getItem('jezik') || 'hr', T = (hr, en) => (L === 'hr' ? hr : en);
  const $ = q => document.querySelector(q);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }, e = x => String(x ?? '').replace(/[&<>"]/g, c => ESC[c]);
  const izvor = r => `<p class="izvor">${T('izvor', 'source')}: ${e(r.izvor || 'Jurlin_Ptičarnik.dwg')}${r.pouzdanost ? ' · ' + T('pouzdanost', 'reliability') + ': ' + e(r.pouzdanost) : ''}</p>`;
  const dl = p => `<dl>${p.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${e(v)}</dd>`).join('')}</dl>`;
  C.tick.push((dt) => C.zgradaTick(dt, C));

  // ---------- Sadržaj prostorija i terenskih objekata ----------
  const biljka = n => A.biljke.find(b => b.naziv_hr.toLowerCase().startsWith(n.toLowerCase().slice(0, 5)));
  const nesig = r => /autorsko|navedeno/.test(r.pouzdanost || '');
  let kavez = 0;
  const sadrzaj = o => {
    const n = o.naziv, pov = o.povrsina ? ` · ${o.povrsina}` : '';
    if (/Kavez/.test(n)) {
      const b = A.vrste[kavez++ % 7], mj = A.normativi.filter(x => /volijer|kavez|mrež/i.test(x.tema + x.parametar)).slice(0, 4);
      return {
        nas: b.naziv_hr, pod: `<i>${e(b.latinski)}</i> · ${T('kavez', 'cage')}${pov}`, sek: 'kat1',
        html: dl([[T('narodni nazivi', 'folk names'), (b.narodni_nazivi || '').replaceAll(';', ', ')], [T('duljina', 'length'), b.duzina_cm && b.duzina_cm + ' cm'],
          [T('stanište', 'habitat'), (b.staniste || '').replaceAll(';', ', ')], [T('uzgoj', 'breeding'), b.napomena_uzgoj]]) + izvor(b) +
          `<h4>${T('Mjere kaveza', 'Cage measures')}</h4>` + mj.map(x => `<p>${e(x.parametar)}: <b>${e(x.vrijednost)} ${e(x.jedinica)}</b> <span class="izvor">${e(x.pouzdanost)}</span></p>`).join(''),
      };
    }
    if (/Ulazni/.test(n)) return {
      nas: T('Zračna komora', 'Airlock'), pod: T('ulaz', 'entrance') + pov, sek: 'komora',
      html: `<p>${T('Dvoja vrata zaredom: ptica ne može izletjeti dok se ulazi.', 'Two doors in a row: no bird escapes while you enter.')}</p>` +
        `<p>${T('Atlas je izveden iz diplomskog rada', 'This atlas is derived from the diploma thesis of')} <b>Lucije Jurlin Dorbić</b>${T(', mentor', ', supervisor')} <b>${T('doc. dr. Semir Poturak', 'Asst. Prof. Semir Poturak, PhD')}</b>, ${e(A.ustanova)}.</p>`,
    };
    if (/Predprostor i stubište/.test(n)) return {
      nas: T('Središnji hol i maketa regije', 'Central hall & regional model'), pod: T('9 istraženih mjesta + 10 tipoloških modela', '9 surveyed places + 10 typological models') + pov, sek: 'hol',
      html: `<p>${T('Na prstenastom stolu oko stubišta je 10 tipoloških modela terenskih uzgajivačnica (Tip A–D) od Zadra do Banje Luke.', 'Around the stair stands the ring table with 10 typological models of field aviaries (Types A–D) from Zadar to Banja Luka.')}</p>` +
        A.lokaliteti.map(l => `<p><b>${e(l.mjesto)}</b> · ${e(l.regija_rad)}<br><span class="izvor">${e(l.ekoloski_kontekst)}</span></p>`).join(''),
    };
    if (/Stubište i krovna/.test(n)) return {
      nas: T('Stubište i kupola', 'Stair and dome'), pod: T('od terena prema projektu', 'from field to design') + pov, sek: 'stubiste',
      html: A.sinteza.map(s => `<p>${e(s[L])}</p><p class="izvor">${T('iz redova', 'from rows')}: ${s.redovi.map(e).join(', ')}</p>`).join(''),
    };
    if (/Karantena/.test(n)) return {
      nas: T('Karantena', 'Quarantine'), pod: T('što nije provjereno', 'what is not verified') + pov, sek: 'karantena',
      html: `<p>${T('Nova ptica ovdje čeka; u atlasu ovdje čekaju tvrdnje bez izvora.', 'A new bird waits here; in the atlas, claims without a source wait here.')}</p>` +
        [...A.objekti, ...A.normativi].filter(nesig).slice(0, 8).map(r => `<p>${e(r.id)} · ${e(r.mjesto || r.tema + ': ' + r.parametar)} <span class="izvor">${e(r.pouzdanost)}</span></p>`).join(''),
    };
    if (/Spremište za hranu/.test(n)) return {
      nas: T('Spremište hrane', 'Food store'), pod: T('biljke za ishranu', 'feeding plants') + pov, sek: 'spremiste',
      html: A.biljke.filter(b => b.uloga === 'hranjenje').map(b => `<p><b>${e(b.naziv_hr)}</b> <i>${e(b.latinski)}</i></p>`).join(''),
    };
    if (/Prostorija za uzgoj/.test(n)) return {
      nas: T('Prostorija za uzgoj', 'Breeding room'), pod: T('povijest uzgoja', 'history of breeding') + pov, sek: 'uzgoj',
      html: A.kronologija.map(k => `<p><b>${e(k.period)}</b> · ${e(k.dogadjaj)}</p>`).join(''),
    };
    if (/Krovni vrt/.test(n)) return {
      nas: T('Krovni vrt', 'Roof garden'), pod: '+8,85 / +9,25 m', sek: 'krov',
      html: `<p>${T('Zeleni krov (smilje, santolina, kamena rizla) oko staklene kupole; pogled prema Šibeniku.', 'Green roof (immortelle, santolina, stone gravel) around the glass dome; view toward Šibenik.')}</p>`,
    };
    const b = biljka(n);
    if (b) return { nas: b.naziv_hr, pod: `<i>${e(b.latinski)}</i> · ${T('terasa 1. kata', '1st-floor terrace')}`, sek: 'spremiste', html: dl([[T('uloga', 'role'), b.uloga], [T('kontekst', 'context'), b.kontekst]]) + izvor(b) };
    return { nas: n, pod: pov.slice(3), sek: 'krov', html: '' };
  };

  const sadrzajObjekta = o => ({
    nas: `${o.id} · ${o.mjesto}`,
    pod: `${T('Tip', 'Type')} ${e(o.tip || '—')} · ${o.povrsina_m2 ? e(o.povrsina_m2) + ' m²' : T('površina nepoznata (crtkana kontura)', 'area unknown (dashed contour)')}`,
    sek: 'kavezi',
    html: dl([
      [T('kontekst', 'context'), `${o.regija || ''} · ${o.kontekst || ''}`],
      [T('smještaj', 'housing'), o.smjestaj],
      [T('konstrukcija', 'structure'), o.konstrukcija],
      [T('materijal', 'material'), o.materijal],
      [T('ptice', 'birds'), o.ptice],
      [T('svjetlo / oprema', 'light / gear'), [o.svjetlo, o.oprema].filter(Boolean).join(' · ')],
    ]) + izvor(o),
  });

  const vrtK = {
    nas: T('Vrt na parceli k.č. 1004', 'Garden on plot 1004'), pod: `${A.vrt.parcela_m2} m²`, sek: 'krov',
    html: dl(Object.entries(A.vrt.stabla).map(([k, n]) => [k, String(n)]).concat([['lavanda', String(A.vrt.lavanda)], [T('kućice', 'birdhouses'), String(A.vrt.kucice)]])) +
      `<p class="izvor">${T('izvor', 'source')}: Jurlin_Ptičarnik.dwg, list 1 · ${T('oblici stabala stilizirani', 'tree shapes stylised')}</p>`,
  };

  const PIN = SOBE.filter(o => !/^WC/.test(o.naziv)).map(o => ({ ...o, k: sadrzaj(o) }));
  const pj = V.pojiliste[0];
  const [px, py] = C.van(pj.xy), [vx, vy] = C.van([0, -16]);
  PIN.push({ etaza: 'vrt', h: TEREN, x: vx, z: -vy, k: vrtK, vrt: true });
  PIN.push({
    etaza: 'vrt', h: TEREN, x: px, z: -py, vrt: true,
    k: { nas: T('Pojilište', 'Water basin'), pod: T('vrt', 'garden'), sek: 'krov', html: `<p>${T('Voda za divlje ptice vrta.', 'Water for the garden’s wild birds.')}</p>` },
  });

  // ---------- Točke na ekranu ----------
  const pinovi = $('#pinovi');
  const GLAVNI_PIN = /Ulazni|Predprostor i stubište|Stubište i krovna|Karantena|Vrt na parceli/;
  PIN.forEach((p, i) => {
    const b = document.createElement('button');
    const jeGlavni = GLAVNI_PIN.test(p.naziv || p.k.nas || '');
    b.className = 'pin' + (jeGlavni ? ' glavni' : ''); b.dataset.i = i;
    b.innerHTML = `<span class="tocka"></span><span class="oznaka">${e(p.k.nas)}</span>`;
    b.onclick = ev => { ev.stopPropagation(); otvori(p); }; pinovi.appendChild(b); p.el = b; p.glavni = jeGlavni;
  });
  const vv = new THREE.Vector3();
  let pogled = 'maketa', katTlocrt = 'prizemlje';
  const vidljivaEtaza = k => k === 'vrt' || etaze[k]?.visible;
  const najvisa = () => [...ETAZE].reverse().find(([k]) => etaze[k].visible && k !== 'krov')?.[0];
  function pinTick() {
    const w = el.clientWidth, h = el.clientHeight, top = najvisa();
    const cam = C.cam;
    for (const p of PIN) {
      let ok = pogled !== 'let' && pogled !== 'nacrt' && vidljivaEtaza(p.etaza), op = 1;
      const off = p.etaza === 'vrt' ? 0 : etaze[p.etaza].position.y;
      vv.set(p.x, p.h + 1.3 + off, p.z);
      const d = vv.distanceTo(cam.position);
      if (pogled === 'setnja') ok = ok && d < (p.vrt ? 16 : 6.5) && Math.abs(p.h - ja.y) < 1.6;
      else if (pogled === 'maketa' || pogled === 'tura' || pogled === 'akso') ok = ok && (p.vrt || p.etaza === top || etaze[p.etaza].position.y > 0.3 || d < 7);
      else if (pogled === 'tlocrt') ok = ok && (p.etaza === katTlocrt || p.vrt);
      if (ok) { vv.project(cam); ok = vv.z < 1 && Math.abs(vv.x) < 1.05 && Math.abs(vv.y) < 1.05; }
      if (ok && pogled !== 'setnja') op = Math.max(0.38, Math.min(1, 1.65 - d / 48));
      p.el.style.display = ok ? '' : 'none';
      if (ok) { p.el.style.transform = `translate3d(${(vv.x + 1) * w / 2}px,${(1 - vv.y) * h / 2}px,0)`; p.el.style.opacity = op; }
    }
  }
  C.tick.push(pinTick);

  // ---------- Kartica ----------
  const kart = $('#kartica');
  function otvori(p) {
    const k = p.k;
    kart.querySelector('.sadrzaj').innerHTML = `<p class="nad">${e(etazaIme(p.etaza))}</p><h3>${e(k.nas)}</h3><p class="pod">${k.pod}</p>${k.html}`;
    kart.querySelector('.uatlas').href = '#' + k.sek;
    kart.hidden = false; requestAnimationFrame(() => kart.classList.add('otvoreno'));
    if (document.pointerLockElement) document.exitPointerLock();
    zv.blizina(1);
  }
  const zatvori = () => { kart.classList.remove('otvoreno'); setTimeout(() => { kart.hidden = true; }, 250); };
  kart.querySelector('.zatvori').onclick = zatvori;
  kart.querySelector('.uatlas').onclick = () => { zatvori(); };
  const etazaIme = k => ({
    prizemlje: T('Prizemlje ±0,00', 'Ground floor ±0.00'),
    kat1: T('1. kat +2,95', '1st floor +2.95'),
    kat2: T('2. kat +5,90', '2nd floor +5.90'),
    krov: T('Krov +8,85', 'Roof +8.85'),
    vrt: T('Vrt', 'Garden'),
    teren: T('Terenski atlas (HR / BiH)', 'Field Atlas (HR / BiH)'),
  })[k] || k;

  // ---------- Kamera: let do točke ----------
  const eas = x => x * x * x * (x * (6 * x - 15) + 10);
  function leti(poz, cilj, sek = 1.8, gotovo) {
    const cam = C.cam;
    const p0 = cam.position.clone(), c0 = ctl.target.clone(), p1 = new THREE.Vector3(...poz), c1 = new THREE.Vector3(...cilj);
    if (C.mirno) sek = 0.01;
    let t = 0; ctl.enabled = false;
    C.kamera = dt => {
      t = Math.min(1, t + dt / sek); const k = eas(t);
      cam.position.lerpVectors(p0, p1, k); cam.position.y += Math.sin(k * Math.PI) * Math.min(5, p0.distanceTo(p1) * 0.14);
      ctl.target.lerpVectors(c0, c1, k); cam.lookAt(ctl.target);
      if (t >= 1) { C.kamera = null; ctl.enabled = true; ctl.update(); gotovo?.(); }
    };
  }

  // ---------- Etaže, presjek ----------
  const etUI = $('#etaze');
  etUI.innerHTML = ETAZE.map(([k]) => `<button data-et="${k}" class="uklj">${({ prizemlje: 'P', kat1: '1', kat2: '2', krov: 'K' })[k]}</button>`).join('') +
    `<button data-x="raz" title="${T('razmakni etaže', 'explode floors')}">⇕</button><button data-x="rez" title="${T('presjek A-A', 'section A-A')}">A-A</button>`;
  const postaviEtaze = vis => ETAZE.forEach(([k]) => { etaze[k].visible = vis(k); etUI.querySelector(`[data-et=${k}]`).classList.toggle('uklj', etaze[k].visible); });
  let raz = false, rez = false;
  const postaviRaz = (v, faktor = 1) => { raz = !!v; C.razmakni(v ? faktor : 0); etUI.querySelector('[data-x=raz]').classList.toggle('uklj', !!v); };
  const postaviRez = v => {
    rez = v; presek.constant = v ? 0 : 99;
    presjekGrupa.visible = v;
    etUI.querySelector('[data-x=rez]').classList.toggle('uklj', v);
    C.sjene();
  };
  etUI.onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.et) {
      const k = b.dataset.et, i = ETAZE.findIndex(x => x[0] === k);
      if (pogled === 'tlocrt') { katTlocrt = k; postaviEtaze(x => ETAZE.findIndex(y => y[0] === x) <= i); }
      else { etaze[k].visible = !etaze[k].visible; b.classList.toggle('uklj', etaze[k].visible); }
      C.sjene();
    } else if (b.dataset.x === 'raz') postaviRaz(!raz); else postaviRez(!rez);
  };

  // ---------- Tura: od komore do krova ----------
  const STANICE = [
    { p: [10, 2.8, 34], c: [0, 3.5, 0], n: T('Dolazak', 'Arrival'), t: T('Uzgajivačnica u Donjem Polju kraj Šibenika, parcela k.č. 1004. Vrt je iz Lucijina nacrta: čempresi, masline, lavanda i suhozid.', 'An aviary in Donje Polje near Šibenik, plot 1004. The garden follows Lucija’s drawing: cypresses, olives, lavender and dry-stone wall.') },
    { p: [-0.7, 1.7, 10], c: [-0.7, 1.3, 5], n: T('Zračna komora', 'Airlock'), t: T('Ulaz kroz dvoja vrata (4,46 m²), da ptica ne izleti.', 'Entry through two doors (4.46 m²), so no bird escapes.'), pin: /Ulazni/ },
    { p: [1.6, 1.8, 3.6], c: [0.06, 1.1, 1.4], n: T('Hol i 2.5D maketa regije', 'Hall & 2.5D regional table'), t: T('Središnji hol 21,95 m² sa zavojitim stubištem i prstenastim stolom sa 10 tipoloških modela uzgajivačnica (Zadar–Banja Luka).', 'Central hall, 21.95 m², with spiral stair and ring table holding 10 typological models of surveyed aviaries (Zadar–Banja Luka).'), pin: /Predprostor i/ },
    { p: [-8.6, 1.9, 4.6], c: [-4.1, 1.0, 0.3], n: T('Kavezi prizemlja', 'Ground-floor cages'), t: T('Šest kaveza s konstruktivnim čeličnim okvirom i mrežom 25 mm; u svakom autohtona pjevica iz rada.', 'Six cages with structural steel frames and 25 mm mesh, each with a native songbird from the thesis.'), pin: /Kavez/ },
    { p: [-8.5, 5.8, -6.5], c: [-3.7, 3.4, -2.4], n: T('Terase 1. kata', '1st-floor terraces'), t: T('Cvjetne terase: lavanda, cinija, kadifica, smilje, santolina.', 'Flower terraces: lavender, zinnia, marigold, immortelle, santolina.'), pin: /Lavanda/ },
    { p: [6.5, 11.2, 7.5], c: [0.06, 8.9, 0.98], n: T('Krovni vrt i kupola', 'Roof garden and dome'), t: T('Četiri krovne leje smilja i santoline s križnom stazom od kamene rizle oko kupole na +8,85 / +9,25 m.', 'Four roof beds of immortelle and santolina with a gravel cross path around the dome at +8.85 / +9.25 m.'), pin: /Krovni/ },
    { p: [0.6, 10.7, -2.5], c: [-10, 4, 60], n: T('Pogled prema Šibeniku', 'View toward Šibenik'), t: T('Na jugu teren pada prema moru. Nastavi u 2.5D Akso, 2D Nacrt ili šetnju.', 'To the south the land falls to the sea. Continue in 2.5D Axo, 2D Blueprint or walk.') },
  ];
  let st = 0;
  const tura = $('#tura');
  function stanica(i) {
    st = (i + STANICE.length) % STANICE.length; const S = STANICE[st];
    tura.querySelector('.br').textContent = `${st + 1}/${STANICE.length}`;
    tura.querySelector('.n').textContent = S.n; tura.querySelector('.t').textContent = S.t;
    postaviEtaze(() => true); postaviRaz(false); postaviRez(false);
    leti(S.p, S.c, 2.2);
  }
  tura.querySelector('.nazad').onclick = () => stanica(st - 1);
  tura.querySelector('.dalje').onclick = () => stanica(st + 1);
  tura.querySelector('.otvori').onclick = () => { const S = STANICE[st]; const p = S.pin && PIN.find(x => S.pin.test(x.naziv || '')); otvori(p || PIN.at(-2)); };
  let sx = null;
  tura.addEventListener('touchstart', ev => { sx = ev.touches[0].clientX; }, { passive: true });
  tura.addEventListener('touchend', ev => { if (sx == null) return; const d = ev.changedTouches[0].clientX - sx; if (Math.abs(d) > 50) stanica(st + (d < 0 ? 1 : -1)); sx = null; });

  // ---------- Let: ptičja putanja ----------
  const putanja = new THREE.CatmullRomCurve3([[34, 7, 30], [-10, 16, 38], [-38, 10, 6], [-22, 20, -34], [12, 9, -30], [36, 14, -6], [16, 4, 14], [4, 12, 4]].map(p => new THREE.Vector3(...p)), true, 'centripetal');
  let tl = 0;
  const letKamera = (dt) => {
    tl = (tl + dt / 70) % 1;
    const p = putanja.getPointAt(tl), n = putanja.getPointAt((tl + 0.02) % 1);
    C.cam.position.lerp(p, Math.min(1, dt * 2));
    vv.set(0, 4, 0).lerp(n, 0.35); ctl.target.lerp(vv, Math.min(1, dt * 1.5)); C.cam.lookAt(ctl.target);
  };

  // ---------- Šetnja u prvom licu ----------
  const OKO = 1.65, R = 0.3;
  const pod = (x, z, y) => {
    const ax = Math.max(Math.abs(x), Math.abs(z)); let h = ax < 6.4 ? 0 : C.visina(x, z);
    for (const [, h0] of ETAZE) if (h0 > 0 && h0 <= y + 0.45 && ax < (h0 > 5 ? 4.1 : 6.1)) h = Math.max(h, h0);
    return h;
  };
  const sudar = (x, z, y) => {
    if (!rez) for (const [a, b, h0, h1] of SEG) {
      if (h1 < y + 0.35 || h0 > y + 1.7) continue;
      const ax = a[0], az = -a[1], dx = b[0] - ax, dz = -b[1] - az, LL = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / LL));
      if (Math.hypot(x - ax - t * dx, z - az - t * dz) < R) return true;
    }
    return Math.hypot(x, z) > 180;
  };
  const ja = { x: 0, z: 20, y: TEREN, vy: 0, yaw: 0, pitch: 0, penje: null };
  const tipke = {}, joy = { x: 0, y: 0 };
  const uStubistu = () => Math.hypot(ja.x - STUB.x, ja.z - STUB.z) < 2.2;
  const kat = d => {
    const k = ETAZE.map(x => x[1]), i = k.findIndex(h => Math.abs(h - ja.y) < 0.5);
    if (!uStubistu() || i < 0 || ja.penje) return;
    const n = k[Math.max(0, Math.min(k.length - 1, i + d))]; if (n === ja.y) return;
    ja.penje = { od: ja.y, do: n, t: 0, a0: Math.atan2(ja.z - STUB.z, ja.x - STUB.x) };
  };
  let blizi = null;
  const setKamera = (dt, t) => {
    if (ja.penje) {
      const P = ja.penje; P.t = Math.min(1, P.t + dt / 1.6); const k = eas(P.t), a = P.a0 + k * Math.PI * 2 * Math.sign(P.do - P.od) * 0.75;
      ja.x = STUB.x + Math.cos(a) * 1.5; ja.z = STUB.z + Math.sin(a) * 1.5; ja.y = P.od + (P.do - P.od) * k;
      if (P.t >= 1) { ja.penje = null; ja.vy = 0; }
    } else {
      const v = (tipke.ShiftLeft || tipke.ShiftRight ? 6 : 2.8) * dt;
      const f = (tipke.KeyW || tipke.ArrowUp ? 1 : 0) - (tipke.KeyS || tipke.ArrowDown ? 1 : 0) - joy.y;
      const sv = (tipke.KeyD || tipke.ArrowRight ? 1 : 0) - (tipke.KeyA || tipke.ArrowLeft ? 1 : 0) + joy.x;
      const dx = (-Math.sin(ja.yaw) * f + Math.cos(ja.yaw) * sv) * v, dz = (-Math.cos(ja.yaw) * f - Math.sin(ja.yaw) * sv) * v;
      if (!sudar(ja.x + dx, ja.z, ja.y)) ja.x += dx;
      if (!sudar(ja.x, ja.z + dz, ja.y)) ja.z += dz;
      const h = pod(ja.x, ja.z, ja.y);
      if (tipke.Space && ja.y <= h + 0.01) ja.vy = 4.2;
      ja.vy -= 12 * dt; ja.y += ja.vy * dt;
      if (ja.y < h) { ja.y = h; ja.vy = 0; }
      ja.hoda = Math.hypot(dx, dz) > 0.001;
    }
    const korak = ja.hoda && !C.mirno ? Math.sin(t * 9) * 0.035 : 0;
    C.cam.position.set(ja.x, ja.y + OKO + korak, ja.z);
    C.cam.quaternion.setFromEuler(new THREE.Euler(ja.pitch, ja.yaw, 0, 'YXZ'));
    let bd = 2.6; blizi = null;
    for (const p of PIN) { const d = Math.hypot(p.x - ja.x, p.z - ja.z); if (Math.abs(p.h - ja.y) < 1.6 && d < bd) { bd = d; blizi = p; } }
    const kd = Math.min(...C.kavezi.map(k => Math.hypot(k.x - ja.x, k.z - ja.z) + Math.abs(k.h - ja.y) * 2));
    zv.blizina(1 - kd / 10);
    hud.blizu.hidden = !blizi; if (blizi) hud.blizu.querySelector('span').textContent = blizi.k.nas;
    hud.gore.hidden = hud.dolje.hidden = !uStubistu() || !!ja.penje;
  };
  const hud = { blizu: $('#hud-blizu'), gore: $('#hud-gore'), dolje: $('#hud-dolje'), pauza: $('#hud-pauza'), joy: $('#hud-joy') };
  hud.blizu.onclick = () => blizi && otvori(blizi);
  hud.gore.onclick = () => kat(1); hud.dolje.onclick = () => kat(-1);
  hud.pauza.onclick = () => r.domElement.requestPointerLock?.();

  // ---------- Inicijalizacija 2D / 2.5D Grafičkog Studija ----------
  const studioEl = $('#studio2d');
  inicijalizirajGrafiku2D({
    Z, A, V, T,
    naOdabirSobe: (naziv, etaza) => {
      const p = PIN.find(x => (x.naziv || '').startsWith(naziv.slice(0, 6)) && (!etaza || x.etaza === etaza)) || PIN.find(x => (x.naziv || '').startsWith(naziv.slice(0, 6)));
      if (p) otvori(p);
    },
    naOdabirObjekta: (id) => {
      const o = A.objekti.find(x => x.id === id);
      if (o) otvori({ etaza: 'teren', k: sadrzajObjekta(o) });
    },
    uPogled: (p) => postavi(p),
  });

  // ---------- Pogledi (2D ↔ 2.5D ↔ 3D kontinuum) ----------
  const POGLEDI = [
    ['maketa',  '◎', T('3D Maketa', '3D Model')],
    ['akso',    '⬡', T('2.5D Akso', '2.5D Axo')],
    ['nacrt',   '📐', T('2D Nacrt', '2D Plan')],
    ['tura',    '➜', T('Tura', 'Tour')],
    ['setnja',  '👣', T('Šetnja', 'Walk')],
    ['presjek', '⇕', T('Presjek', 'Section')],
    ['tlocrt',  '▦', T('Tlocrt', 'Top Plan')],
    ['let',     '🕊', T('Let', 'Flight')],
  ];
  const dok = $('#dok');
  dok.innerHTML = POGLEDI.map(([k, i, n]) => `<button data-p="${k}" aria-label="${n}"><span class="ik">${i}</span><span>${n}</span></button>`).join('');
  dok.onclick = ev => { const b = ev.target.closest('button'); if (b) postavi(b.dataset.p); };
  let mirovanje = 0;
  ctl.addEventListener('start', () => { mirovanje = 0; ctl.autoRotate = false; });
  C.tick.push(dt => { if (pogled === 'maketa' && !C.kamera && !C.mirno && (mirovanje += dt) > 9) { ctl.autoRotate = true; ctl.autoRotateSpeed = 0.35; } });

  function postavi(p) {
    const bilo = pogled; pogled = p; if (!kart.hidden) zatvori(); mirovanje = 0; ctl.autoRotate = false;
    dok.querySelectorAll('button').forEach(b => b.classList.toggle('akt', b.dataset.p === p));
    el.dataset.pogled = p;
    tura.hidden = p !== 'tura';
    etUI.hidden = !['maketa', 'akso', 'presjek', 'tlocrt'].includes(p);
    if (studioEl) studioEl.classList.toggle('aktivan-studio', p === 'nacrt');
    Object.values(hud).forEach(h => { h.hidden = true; });
    if (bilo === 'setnja' && p !== 'setnja') { document.exitPointerLock?.(); C.pCam.fov = 38; C.pCam.updateProjectionMatrix(); }
    Object.assign(ctl, { enableRotate: true, minPolarAngle: 0, maxPolarAngle: Math.PI * 0.495, minDistance: 0.5, maxDistance: 120 });
    ctl.enabled = true; C.kamera = null;

    // 2.5D / Ortografska kamera za 'akso' i 'tlocrt', 3D perspektiva za ostale
    const jeOrto = p === 'akso' || p === 'tlocrt';
    C.postaviOrto(jeOrto, p === 'tlocrt' ? 8.0 : 11.2);
    cadGrupa.visible = ['maketa', 'akso', 'presjek', 'tlocrt'].includes(p);

    if (p !== 'presjek' && p !== 'akso') { postaviRaz(false); postaviRez(false); }
    if (p !== 'tlocrt') postaviEtaze(() => true);

    if (p === 'maketa') {
      leti([24, 14, 28], [0.06, 4.0, 0.5]);
    } else if (p === 'akso') {
      postaviRaz(true, 0.55); postaviRez(false);
      leti([24, 21, 24], [0.06, 4.6, 0.5], 1.4);
      pomoc(T('2.5D ortografska aksonometrija · paralelna projekcija s ISO 128 kotama i rasklopom etaža',
        '2.5D orthographic axonometric · parallel projection with ISO 128 dimensions & exploded floors'));
    } else if (p === 'nacrt') {
      pomoc(T('2D CAD nacrti iz DWG-a + 2.5D tipološka matrica 10 uzgajivačnica + regionalni kartogram',
        '2D CAD blueprints from DWG + 2.5D typological matrix of 10 aviaries + regional cartogram'));
    } else if (p === 'presjek') {
      postaviRaz(true, 0.85); postaviRez(true);
      leti([-18, 13, 21], [0.06, 4.8, 0], 1.6);
      pomoc(T('Presjek A-A · rasklopljene etaže sa živim vektorskim DWG presjekom u ravnini reza',
        'Section A-A · exploded floors with live vector DWG section on the cut plane'));
    } else if (p === 'tlocrt') {
      katTlocrt = 'prizemlje'; postaviEtaze(k => k === 'prizemlje');
      Object.assign(ctl, { maxPolarAngle: 0.25 });
      leti([0.06, 32, 1.1], [0.06, 0, 0.98], 1.4);
    } else if (p === 'tura') {
      stanica(0);
    } else if (p === 'let') {
      ctl.enabled = false; tl = 0; C.kamera = letKamera;
    } else if (p === 'setnja') {
      ctl.enabled = false; C.pCam.fov = C.dodir ? 75 : 70; C.pCam.updateProjectionMatrix();
      Object.assign(ja, { x: 0.5, z: 15, y: TEREN, vy: 0, yaw: 0.03, pitch: 0.05, penje: null });
      C.kamera = setKamera;
      if (C.dodir) el.closest('#maketa').requestFullscreen?.().catch(() => {});
      else r.domElement.requestPointerLock?.();
      pomoc(T(C.dodir ? 'Lijevo hodaj · desno gledaj · ↑↓ na stubištu · dodirni natpis za karticu' : 'WASD · miš · Shift trk · Space skok · E/Q stubište · F kartica · Esc pauza',
        C.dodir ? 'Left: walk · right: look · ↑↓ at the stair · tap a label for its card' : 'WASD · mouse · Shift run · Space jump · E/Q stair · F card · Esc pause'));
    }
    if (location.hash.slice(1) !== p && !location.hash.startsWith('#' + p)) history.replaceState(null, '', '#' + p);
  }

  addEventListener('keydown', ev => {
    if (ev.target.closest?.('input,select,textarea')) return;
    tipke[ev.code] = true;
    if (pogled === 'setnja') { if (ev.code === 'KeyE') kat(1); if (ev.code === 'KeyQ') kat(-1); if (ev.code === 'KeyF' && blizi) otvori(blizi); }
    if (ev.code === 'Escape') { if (!kart.hidden) zatvori(); else if (pogled !== 'maketa' && pogled !== 'setnja') postavi('maketa'); }
    const br = /^[1-8]$/.test(ev.key) ? +ev.key - 1 : -1; if (br >= 0 && POGLEDI[br] && !ev.ctrlKey && !ev.metaKey && !ev.altKey) postavi(POGLEDI[br][0]);
    if (pogled === 'tura' && ev.code === 'ArrowRight') stanica(st + 1);
    if (pogled === 'tura' && ev.code === 'ArrowLeft') stanica(st - 1);
  });
  addEventListener('keyup', ev => { tipke[ev.code] = false; });
  addEventListener('blur', () => { for (const k in tipke) tipke[k] = false; });
  document.addEventListener('pointerlockchange', () => { if (pogled === 'setnja' && !C.dodir) hud.pauza.hidden = !!document.pointerLockElement || !kart.hidden; });
  r.domElement.addEventListener('click', () => { if (pogled === 'setnja' && !C.dodir && !document.pointerLockElement) r.domElement.requestPointerLock?.(); });
  addEventListener('mousemove', ev => { if (pogled === 'setnja' && document.pointerLockElement) { ja.yaw -= ev.movementX * 0.0022; ja.pitch = Math.max(-1.4, Math.min(1.4, ja.pitch - ev.movementY * 0.0022)); } });

  const prsti = new Map();
  el.addEventListener('touchstart', ev => {
    if (pogled !== 'setnja') return;
    for (const t of ev.changedTouches) {
      const l = t.clientX < innerWidth * 0.45; prsti.set(t.identifier, { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, l });
      if (l) { hud.joy.hidden = false; hud.joy.style.transform = `translate(${t.clientX}px,${t.clientY}px)`; hud.joy.firstElementChild.style.transform = ''; }
    }
  }, { passive: true });
  el.addEventListener('touchmove', ev => {
    if (pogled !== 'setnja') return; ev.preventDefault();
    for (const t of ev.changedTouches) {
      const p = prsti.get(t.identifier); if (!p) continue;
      if (p.l) {
        const dx = t.clientX - p.x0, dy = t.clientY - p.y0, m = Math.min(1, 55 / (Math.hypot(dx, dy) || 1));
        joy.x = Math.max(-1, Math.min(1, dx / 55)); joy.y = Math.max(-1, Math.min(1, dy / 55));
        hud.joy.firstElementChild.style.transform = `translate(${dx * m}px,${dy * m}px)`;
      } else { ja.yaw -= (t.clientX - p.x) * 0.006; ja.pitch = Math.max(-1.4, Math.min(1.4, ja.pitch - (t.clientY - p.y) * 0.006)); p.x = t.clientX; p.y = t.clientY; }
    }
  }, { passive: false });
  const kraj = ev => { for (const t of ev.changedTouches) { if (prsti.get(t.identifier)?.l) { joy.x = joy.y = 0; hud.joy.hidden = true; } prsti.delete(t.identifier); } };
  el.addEventListener('touchend', kraj); el.addEventListener('touchcancel', kraj);

  let pt = 0;
  function pomoc(t) { const h = $('#pomoc3d'); h.textContent = t; h.classList.add('vid'); clearTimeout(pt); pt = setTimeout(() => h.classList.remove('vid'), 6000); }
  el.addEventListener('click', ev => { if (pogled === 'let' && !ev.target.closest('button')) postavi('maketa'); });

  // ---------- Traka: zvuk, postavke, cijeli zaslon ----------
  const zv = zvuk();
  const zb = $('#zvuk');
  zb.onclick = () => { if (zv.radi) { zv.ugasi(); zb.classList.remove('uklj'); } else { zv.upali(); zb.classList.add('uklj'); } };
  $('#cijeli').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $('#maketa').requestFullscreen?.());
  if (!document.fullscreenEnabled) $('#cijeli').hidden = true;
  const pl = $('#ploca');
  $('#postavke').onclick = () => { pl.hidden = !pl.hidden; };
  pl.querySelector('[name=doba]').oninput = ev => C.doba(+ev.target.value);
  const kv = pl.querySelector('[name=kvaliteta]'); kv.value = C.Q.razina;
  kv.onchange = () => { localStorage.setItem('kvaliteta', kv.value); location.reload(); };
  pl.querySelector('.uredu').onclick = () => { pl.hidden = true; };
  setInterval(() => { if (!pl.hidden) pl.querySelector('.fps').textContent = `${C.fps ?? '–'} fps · ${r.info.render.calls} ${T('poziva', 'calls')}`; }, 1000);
  document.querySelectorAll('[data-t-hr]').forEach(n => { n.textContent = n.dataset[L === 'hr' ? 'tHr' : 'tEn']; });

  // ---------- Ulaz ----------
  const h = location.hash.slice(1), poc = POGLEDI.find(([k]) => h.startsWith(k))?.[0];
  const udi = (p = 'maketa') => { $('#veo').classList.add('ode'); postavi(p); };
  $('#ulaz').onclick = () => { udi(); };
  $('#ulaz-zvuk').onclick = () => { zv.upali(); zb.classList.add('uklj'); udi('tura'); };
  if (poc) { $('#veo').classList.add('ode'); C.cam.position.set(24, 14, 28); postavi(poc); if (poc === 'tura' && +h.split('-')[1]) stanica(+h.split('-')[1] - 1); }
  else postavi('maketa');
  window.__iskustvo = { postavi, stanica, otvori: i => otvori(PIN[i]), PIN: PIN.length, TIPOLOGIJA: TIPOLOGIJA.length, ja, get pogled() { return pogled; } };
}
