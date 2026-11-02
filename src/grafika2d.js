// Interaktivni 2D i 2.5D kompjutersko-grafički studio:
// 1) 2D CAD vektorski nacrti iz Jurlin_Ptičarnik.dwg (ISO 128 hijerarhija linija, slojevi, Schriftfeld, klikabilne prostorije)
// 2) 2.5D Aksonometrijska tipološka matrica (proceduralna izometrija 30° za svih 10 terenskih uzgajivačnica + projekt Donje Polje)
// 3) 2.5D Regionalni kartogram i tok sinteze (Zadar -> Šibenik -> Mostar -> Sarajevo -> Banja Luka)

export function inicijalizirajGrafiku2D({ Z, A, V, T, naOdabirSobe, naOdabirObjekta, uPogled }) {
  const studio = document.getElementById('studio2d');
  if (!studio) return {};

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  const e = s => String(s ?? '').replace(/[&<>"]/g, c => ESC[c]);

  let aktivniTab = 'cad'; // 'cad' | 'tipologija' | 'regija'
  let aktivniList = 'usporedba'; // 'usporedba' | 'prizemlje' | 'kat1' | 'kat2' | 'krov' | 'presjek_aa' | 'procelje_j' | 'vrt'
  let tamniBlueprint = true;
  const slojevi = { zidovi: true, ograda: true, stolarija: true, kote: true, oznake: true };

  studio.innerHTML = `
    <div class="g2d-zaglavlje">
      <div class="g2d-naslov">
        <span class="g2d-nad">${T('KOMPJUTERSKA GRAFIKA · KONTINUUM DIMENZIJA', 'COMPUTER GRAPHICS · DIMENSIONAL CONTINUUM')}</span>
        <h2>${T('2D Nacrti · 2.5D Tipologija · Regionalna sinteza', '2D Blueprints · 2.5D Typology · Regional Synthesis')}</h2>
      </div>
      <div class="g2d-tabovi" role="tablist">
        <button data-tab="cad" class="akt">📐 ${T('2D CAD Nacrti (DWG)', '2D CAD Blueprints (DWG)')}</button>
        <button data-tab="tipologija">⬡ ${T('2.5D Tipološka matrica (10+1)', '2.5D Typological Matrix (10+1)')}</button>
        <button data-tab="regija">🗺 ${T('2.5D Regionalni kartogram', '2.5D Regional Cartogram')}</button>
        <button data-akcija="u3d" class="g2d-u3d">↗ ${T('U 2.5D / 3D scenu', 'To 2.5D / 3D Stage')}</button>
      </div>
    </div>

    <div id="g2d-cad" class="g2d-panel">
      <div class="g2d-alatna">
        <div class="g2d-listovi">
          <button data-list="usporedba" class="akt">${T('Sinteza (Tlocrt + Presjek + Pročelje)', 'Synthesis (Plan + Section + Elevation)')}</button>
          <button data-list="prizemlje">${T('Prizemlje ±0,00', 'Ground ±0.00')}</button>
          <button data-list="kat1">${T('1. kat +2,95', '1st Floor +2.95')}</button>
          <button data-list="kat2">${T('2. kat +5,90', '2nd Floor +5.90')}</button>
          <button data-list="krov">${T('Krov +8,85', 'Roof +8.85')}</button>
          <button data-list="presjek_aa">${T('Presjek A-A', 'Section A-A')}</button>
          <button data-list="procelje_j">${T('Južno pročelje', 'South Elevation')}</button>
          <button data-list="vrt">${T('Situacija k.č. 1004', 'Site Plan 1004')}</button>
        </div>
        <div class="g2d-filteri">
          <label><input type="checkbox" data-sloj="zidovi" checked> ${T('Zidovi / AB', 'Walls / RC')}</label>
          <label><input type="checkbox" data-sloj="ograda" checked> ${T('Volijere / Mreža', 'Aviary Mesh')}</label>
          <label><input type="checkbox" data-sloj="stolarija" checked> ${T('Stolarija / Šrafura', 'Carpentry / Hatch')}</label>
          <label><input type="checkbox" data-sloj="kote" checked> ${T('Kote (ISO 128)', 'Dimensions')}</label>
          <label><input type="checkbox" data-sloj="oznake" checked> ${T('Prostorije', 'Rooms')}</label>
          <button id="g2d-tema" class="g2d-tema-btn">${T('Tema: Blueprint / Papir', 'Theme: Blueprint / Paper')}</button>
        </div>
      </div>
      <div class="g2d-platno-okvir">
        <canvas id="g2d-canvas" width="1320" height="680"></canvas>
        <div id="g2d-info" class="g2d-info">${T('Klikni prostoriju na nacrtu za dosije i 3D skok.', 'Click a room on the blueprint for its dossier and 3D jump.')}</div>
      </div>
    </div>

    <div id="g2d-tipologija" class="g2d-panel" hidden>
      <p class="g2d-opis">${T(
        'Svaka kartica je proceduralno generirana 2.5D izometrijska projekcija (30°) iz polja u data/objekti.csv: površina određuje gabarit (√m²), tip A–D konstruktivnu gramatiku, a nepoznata površina crta se isprekidanom žičanom konturom (ART BIBLE §2).',
        'Each card is a procedurally generated 2.5D isometric projection (30°) from data/objekti.csv: area drives footprint (√m²), type A–D drives structural grammar, and unknown area renders as a dashed wireframe contour (ART BIBLE §2).'
      )}</p>
      <div id="g2d-matrica" class="g2d-matrica"></div>
    </div>

    <div id="g2d-regija" class="g2d-panel" hidden>
      <div class="g2d-regija-mreza">
        <div id="g2d-karta-svg" class="g2d-karta-okvir"></div>
        <div id="g2d-sinteza-tok" class="g2d-sinteza-okvir"></div>
      </div>
    </div>
  `;

  const canvas = studio.querySelector('#g2d-canvas');
  const ctx = canvas.getContext('2d');
  const infoEl = studio.querySelector('#g2d-info');
  let aktivneTocke = [];

  // Boje po ISO 128 i temi (Blueprint tamni vs Tehnički papir)
  function paleta() {
    return tamniBlueprint ? {
      poz: '#111b22', mreza: 'rgba(130,175,200,0.11)', okvir: 'rgba(210,230,242,0.45)',
      zid: '#f4efe4', pzid: '#b8ceda', ograda: '#5ad2c4', stol: '#e9b85c',
      sraf: 'rgba(233,184,92,0.38)', pogled: 'rgba(180,204,218,0.42)',
      kote: '#ff7a6b', tekst: '#f4efe4', podtekst: '#9ab6c6', akcent: '#e9b85c',
    } : {
      poz: '#f6f2e8', mreza: 'rgba(60,52,40,0.08)', okvir: 'rgba(34,32,28,0.55)',
      zid: '#1e1c18', pzid: '#5a5246', ograda: '#1f7a6e', stol: '#9a5b25',
      sraf: 'rgba(180,60,45,0.32)', pogled: 'rgba(90,82,70,0.38)',
      kote: '#c8102e', tekst: '#1e1c18', podtekst: '#6a6256', akcent: '#c8102e',
    };
  }

  // Crtanje jednog DWG lista u zadani pravokutnik [rx, ry, rw, rh]
  function nacrtajList(imeLista, rx, ry, rw, rh, naslovLista) {
    const P = paleta();
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();

    // Okvir polja
    ctx.strokeStyle = P.okvir; ctx.lineWidth = 1;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

    if (imeLista === 'vrt') {
      // Situacija k.č. 1004 iz V (data/vrt.json)
      const sc = Math.min((rw - 60) / 48, (rh - 70) / 62);
      const cx = rx + rw * 0.52, cy = ry + rh * 0.44;
      const X = x => cx + x * sc, Y = y => cy - y * sc;

      // Parcela
      ctx.beginPath();
      V.parcela.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.closePath();
      ctx.fillStyle = tamniBlueprint ? 'rgba(90,210,196,0.06)' : 'rgba(93,122,58,0.08)';
      ctx.fill();
      ctx.strokeStyle = P.kote; ctx.lineWidth = 1.8; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);

      // Lavanda
      if (slojevi.ograda) {
        ctx.fillStyle = '#9b7ede';
        for (const [lx, ly] of V.lavanda) { ctx.beginPath(); ctx.arc(X(lx), Y(ly), Math.max(1.5, sc * 0.16), 0, Math.PI * 2); ctx.fill(); }
      }
      // Stabla
      const bStab = { cempres: '#2f6e48', maslina: '#9ab072', bagrem: '#7ca848', lovor: '#487a42', smokva: '#6ca044' };
      for (const s of V.stabla) {
        const r = Math.max(3, (s.krosnja_m || 2) * 0.5 * sc);
        ctx.beginPath(); ctx.arc(X(s.xy[0]), Y(s.xy[1]), r, 0, Math.PI * 2);
        ctx.fillStyle = (bStab[s.vrsta] || '#5d7a3a') + '55'; ctx.fill();
        ctx.strokeStyle = bStab[s.vrsta] || '#5d7a3a'; ctx.lineWidth = 1.3; ctx.stroke();
      }
      // Zgrada u sredini
      ctx.strokeStyle = P.zid; ctx.lineWidth = 2.2;
      ctx.strokeRect(X(-4.2), Y(4.2), 8.4 * sc, 8.4 * sc);
      ctx.fillStyle = P.tekst; ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(naslovLista || 'SITUACIJA · k.č. 1004 (1.321,7 m²) · MJ 1:250', rx + 14, ry + 22);
      ctx.restore();
      return;
    }

    const L = Z.listovi[imeLista];
    if (!L) { ctx.restore(); return; }
    const jePresjek = imeLista === 'presjek_aa' || imeLista.startsWith('procelje');
    const rasponX = jePresjek ? 14.5 : 14.2;
    const rasponY = jePresjek ? 11.5 : 13.5;
    const sc = Math.min((rw - 48) / rasponX, (rh - 58) / rasponY);
    const cx = rx + rw * 0.5, cy = jePresjek ? ry + rh * 0.80 : ry + rh * 0.48;
    const X = x => cx + x * sc, Y = y => cy - y * sc;

    // Os presjeka A-A na tlocrtima
    if (!jePresjek && slojevi.kote) {
      ctx.save();
      ctx.strokeStyle = P.kote; ctx.lineWidth = 1; ctx.setLineDash([7, 4, 2, 4]);
      ctx.beginPath(); ctx.moveTo(X(-6.5), Y(0.29)); ctx.lineTo(X(6.5), Y(0.29)); ctx.stroke();
      ctx.fillStyle = P.kote; ctx.font = '600 10px system-ui, sans-serif';
      ctx.fillText('A', X(-6.75), Y(0.29) + 3); ctx.fillText('A', X(6.55), Y(0.29) + 3);
      ctx.restore();
    }

    // Sadnja krugovi
    if (slojevi.ograda && L.krugovi.length) {
      ctx.strokeStyle = '#6ca85a'; ctx.lineWidth = 1;
      for (const [, x, y, r] of L.krugovi) {
        ctx.beginPath(); ctx.arc(X(x), Y(y), Math.max(1.2, r * sc), 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Linije i polilinije po ISO 128 hijerarhiji
    const sveSeg = [
      ...L.linije.map(([sl, x1, y1, x2, y2]) => [sl, [[x1, y1], [x2, y2]], false]),
      ...L.polilinije.map(([sl, zat, pts]) => [sl, pts, zat]),
    ];
    for (const [sl, pts, zat] of sveSeg) {
      const jeZid = sl === 'Zidovi' || sl === 'Armirani beton' || sl === 'Krov';
      const jePzid = sl === 'Pzid';
      const jeOgr = sl === 'Providna ograda';
      const jeStol = sl === 'Stolarija' || sl === 'Namještaj';
      const jeSraf = sl === 'Šrafura';
      if ((jeZid || jePzid) && !slojevi.zidovi) continue;
      if (jeOgr && !slojevi.ograda) continue;
      if ((jeStol || jeSraf) && !slojevi.stolarija) continue;

      ctx.beginPath();
      const pp = zat ? [...pts, pts[0]] : pts;
      pp.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      if ( sl === 'Crtkano' ) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
      ctx.strokeStyle = jeZid ? P.zid : jePzid ? P.pzid : jeOgr ? P.ograda : jeStol ? P.stol : jeSraf ? P.sraf : P.pogled;
      ctx.lineWidth = jeZid ? 2.1 : jeOgr ? 1.5 : jePzid ? 1.3 : jeSraf ? 0.65 : 0.9;
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Kote (ISO 128)
    if (slojevi.kote && L.kote) {
      ctx.fillStyle = P.kote; ctx.font = '10px ui-monospace, monospace';
      L.kote.slice(0, 28).forEach(([, x, y, v], idx) => {
        if (idx % 2 === 0 && typeof v === 'number') {
          ctx.fillText((v / 100).toFixed(2), X(x) - 8, Y(y));
        }
      });
    }

    // Oznake prostorija i klikabilne točke
    if (slojevi.oznake && L.tekst) {
      for (const [sl, x, y, t] of L.tekst) {
        if (sl === 'Tekst' || (jePresjek && sl === 'Kote')) {
          const [n1, n2] = t.split('\n');
          const px = X(x), py = Y(y);
          if (!jePresjek && sl === 'Tekst') {
            ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = P.akcent; ctx.fill();
            aktivneTocke.push({ x: px, y: py, naziv: n1, povrsina: n2, etaza: imeLista });
          }
          ctx.fillStyle = sl === 'Kote' ? P.kote : P.tekst;
          ctx.font = sl === 'Kote' ? '600 10px ui-monospace, monospace' : '600 10.5px system-ui, sans-serif';
          ctx.fillText(n1, px + 7, py + 2);
          if (n2) {
            ctx.fillStyle = P.podtekst; ctx.font = '9.5px ui-monospace, monospace';
            ctx.fillText(n2, px + 7, py + 13);
          }
        }
      }
    }

    // Naslov polja
    ctx.fillStyle = P.tekst; ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(naslovLista || imeLista.toUpperCase(), rx + 12, ry + 20);
    ctx.restore();
  }

  function renderCAD() {
    const P = paleta();
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = P.poz; ctx.fillRect(0, 0, w, h);
    aktivneTocke = [];

    // Tehnička milimetarska/raster mreža
    ctx.strokeStyle = P.mreza; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    if (aktivniList === 'usporedba') {
      // Četverodijelni arhitektonski list sinteze: Prizemlje + 1. kat + Presjek A-A + Krov/Pročelje
      const pw = (w - 36) / 2, ph = (h - 76) / 2;
      nacrtajList('prizemlje', 12, 12, pw, ph, T('1 · TLOCRT PRIZEMLJA (±0,00 · 74,49 m²)', '1 · GROUND FLOOR PLAN (±0.00 · 74.49 m²)'));
      nacrtajList('kat1', 24 + pw, 12, pw, ph, T('2 · TLOCRT 1. KATA (+2,95 · volijere i terase)', '2 · 1ST FLOOR PLAN (+2.95 · aviaries & terraces)'));
      nacrtajList('presjek_aa', 12, 24 + ph, pw, ph, T('3 · PRESJEK A-A (kote -0,80 do +9,25 m)', '3 · SECTION A-A (levels -0.80 to +9.25 m)'));
      nacrtajList('krov', 24 + pw, 24 + ph, pw, ph, T('4 · TLOCRT KROVA (+8,85 · kupola i 4 krovna vrta)', '4 · ROOF PLAN (+8.85 · dome & 4 roof gardens)'));
    } else {
      const naslovi = {
        prizemlje: T('TLOCRT PRIZEMLJA (±0,00 · MJ 1:50)', 'GROUND FLOOR PLAN (±0.00 · SCALE 1:50)'),
        kat1: T('TLOCRT 1. KATA (+2,95 · MJ 1:50)', '1ST FLOOR PLAN (+2.95 · SCALE 1:50)'),
        kat2: T('TLOCRT 2. KATA (+5,90 · MJ 1:50)', '2ND FLOOR PLAN (+5.90 · SCALE 1:50)'),
        krov: T('TLOCRT KROVA (+8,85 / +9,25 · MJ 1:50)', 'ROOF PLAN (+8.85 / +9.25 · SCALE 1:50)'),
        presjek_aa: T('PRESJEK A-A (konstrukcija i visinske kote · MJ 1:50)', 'SECTION A-A (structure & elevations · SCALE 1:50)'),
        procelje_j: T('JUŽNO PROČELJE (ulazna fasada i volijere · MJ 1:50)', 'SOUTH ELEVATION (entrance facade & aviaries · SCALE 1:50)'),
        vrt: T('SITUACIJA PARCELE k.č. 1004 (Donje Polje · MJ 1:250)', 'SITE PLAN PLOT 1004 (Donje Polje · SCALE 1:250)'),
      };
      nacrtajList(aktivniList, 12, 12, w - 24, h - 64, naslovi[aktivniList]);
    }

    // ISO 128 Pečat / Zaglavlje nacrta (Schriftfeld) na dnu
    ctx.strokeStyle = P.okvir; ctx.lineWidth = 1.2;
    ctx.strokeRect(12, h - 44, w - 24, 34);
    ctx.fillStyle = P.tekst; ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText('ISO 128 CAD · Jurlin_Ptičarnik.dwg · Donje Polje (Šibenik) · k.č. 1004 · 12,00 × 12,00 m · P+2 (+9,25 m)', 22, h - 23);
    ctx.fillStyle = P.podtekst; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('Autorica: Lucija Jurlin Dorbić · Mentor: doc. dr. Semir Poturak · Univerzitet u Travniku', w - 520, h - 23);
  }

  canvas.addEventListener('click', ev => {
    const r = canvas.getBoundingClientRect();
    const mx = (ev.clientX - r.left) * (canvas.width / r.width);
    const my = (ev.clientY - r.top) * (canvas.height / r.height);
    const pogodak = aktivneTocke.find(t => Math.hypot(t.x - mx, t.y - my) < 18);
    if (pogodak) {
      infoEl.innerHTML = `<b>${e(pogodak.naziv)}</b> (${e(pogodak.povrsina || '—')}) · <button id="g2d-skok" class="g2d-skok-btn">${T('Prikaži u 2.5D / 3D ↑', 'Show in 2.5D / 3D ↑')}</button>`;
      infoEl.querySelector('#g2d-skok').onclick = () => {
        naOdabirSobe?.(pogodak.naziv, pogodak.etaza);
        document.getElementById('maketa')?.scrollIntoView({ behavior: 'smooth' });
      };
      naOdabirSobe?.(pogodak.naziv, pogodak.etaza);
    }
  });

  // ============================================================================
  // 2) 2.5D IZOMETRIJSKA TIPOLOŠKA MATRICA (Proceduralni SVG generator za 10+1 objekat)
  // ============================================================================
  function isoTocka(x, y, z, cx = 110, cy = 88, sc = 18) {
    const ix = cx + (x - z) * Math.cos(Math.PI / 6) * sc;
    const iy = cy + (x + z) * Math.sin(Math.PI / 6) * sc - y * sc;
    return `${ix.toFixed(1)},${iy.toFixed(1)}`;
  }

  function isoKvadar(x0, y0, z0, dx, dy, dz, cGornja, cLijeva, cDesna, crtkana = false) {
    const p = (x, y, z) => isoTocka(x, y, z);
    const dash = crtkana ? 'stroke-dasharray="4 3" fill-opacity="0.18"' : '';
    const gornja = `${p(x0, y0 + dy, z0)} ${p(x0 + dx, y0 + dy, z0)} ${p(x0 + dx, y0 + dy, z0 + dz)} ${p(x0, y0 + dy, z0 + dz)}`;
    const lijeva = `${p(x0, y0, z0 + dz)} ${p(x0 + dx, y0, z0 + dz)} ${p(x0 + dx, y0 + dy, z0 + dz)} ${p(x0, y0 + dy, z0 + dz)}`;
    const desna  = `${p(x0 + dx, y0, z0)} ${p(x0 + dx, y0, z0 + dz)} ${p(x0 + dx, y0 + dy, z0 + dz)} ${p(x0 + dx, y0 + dy, z0)}`;
    return `<g stroke="#22201c" stroke-width="1" ${dash}>
      <polygon points="${gornja}" fill="${cGornja}"/>
      <polygon points="${lijeva}" fill="${cLijeva}"/>
      <polygon points="${desna}" fill="${cDesna}"/>
    </g>`;
  }

  function generiraj25DSVG(o) {
    const imaPov = Number.isFinite(parseFloat(o.povrsina_m2));
    const m2 = imaPov ? parseFloat(o.povrsina_m2) : (o.id === 'PR-01' ? 74.49 : 25);
    const s = Math.max(1.2, Math.min(3.4, Math.sqrt(m2) * 0.36));
    const crtkano = !imaPov && o.id !== 'PR-01';
    let svg = `<svg viewBox="0 0 220 145" class="g2d-iso-svg" aria-label="${e(o.id)}">`;
    // Izometrijska osnova / mreža
    svg += `<polygon points="${isoTocka(-2.2, 0, -2.2)} ${isoTocka(2.2, 0, -2.2)} ${isoTocka(2.2, 0, 2.2)} ${isoTocka(-2.2, 0, 2.2)}" fill="rgba(180,170,150,0.16)" stroke="rgba(90,82,70,0.35)" stroke-width="0.8"/>`;

    if (o.id === 'PR-01') {
      // Projekt Donje Polje: zvjezdasti tlocrt P+2 sa kupolom
      svg += isoKvadar(-1.5, 0, -1.5, 3.0, 0.85, 3.0, '#e8dfd0', '#cfc4b0', '#b8ad98');
      svg += isoKvadar(-1.3, 0.85, -1.3, 2.6, 0.80, 2.6, '#8ab8b0', '#6d9e96', '#58867e');
      svg += isoKvadar(-0.85, 1.65, -0.85, 1.7, 0.70, 1.7, '#f2eadc', '#d8ceba', '#c2b8a4');
    } else if (o.tip === 'A') {
      // Tip A: unutarnja soba u presjeku + metalni boksovi uz sjeverni/istočni zid
      svg += isoKvadar(-s * 0.5, 0, -s * 0.5, s, 0.1, s, '#e2d8c5', '#c8beab', '#b4aa98', crtkano);
      svg += isoKvadar(-s * 0.5, 0.1, -s * 0.5, s, 1.25, 0.12, '#ece4d4', '#d4cbb8', '#beb5a2', crtkano);
      svg += isoKvadar(-s * 0.42, 0.15, -s * 0.32, s * 0.82, 0.95, s * 0.32, '#e2986b', '#c87c50', '#ad653c', crtkano);
    } else if (o.tip === 'B') {
      // Tip B: vanjska vrtna žičana volijera
      svg += isoKvadar(-s * 0.65, 0, -s * 0.38, s * 1.3, 1.15, s * 0.76, '#88b878', '#6a9a5b', '#568248', crtkano);
    } else if (o.tip === 'C') {
      // Tip C: kombinirana unutarnja zidana + vanjski mrežasti prelet
      svg += isoKvadar(-s * 0.6, 0, -s * 0.45, s * 0.58, 1.25, s * 0.9, '#ece4d4', '#cfc6b4', '#b8af9e', crtkano);
      svg += isoKvadar(-0.02, 0, -s * 0.45, s * 0.65, 1.05, s * 0.9, '#72a8c4', '#568ca8', '#42748e', crtkano);
    } else {
      // Tip D: niz samostojećih modula volijera
      for (const k of [-0.9, 0, 0.9]) {
        svg += isoKvadar(k - 0.32, 0, -s * 0.4, 0.56, 1.1, s * 0.8, '#e5b95c', '#c99d42', '#ad832e', crtkano);
      }
    }
    svg += `<text x="10" y="18" font-size="11" font-weight="700" fill="#22201c">${e(o.id)} · Tip ${e(o.tip || '—')}</text>`;
    svg += `<text x="10" y="136" font-size="10" fill="#5a5348">${imaPov ? e(o.povrsina_m2) + ' m²' : (o.id === 'PR-01' ? '74,49 m² (P+2)' : T('površina nepoznata (crtkano)', 'area unknown (dashed)'))}</text>`;
    svg += `</svg>`;
    return svg;
  }

  function renderTipologija() {
    const matrica = studio.querySelector('#g2d-matrica');
    const lista = [...A.objekti.filter(o => o.vrsta_zapisa === 'uzgajivacnica'), ...A.objekti.filter(o => o.id === 'PR-01')];
    matrica.innerHTML = lista.map((o, idx) => `
      <article class="g2d-tip-kartica" data-id="${e(o.id)}" data-idx="${idx}">
        ${generiraj25DSVG(o)}
        <div class="g2d-tip-tijelo">
          <div class="g2d-tip-vrh">
            <b>${e(o.mjesto)}</b>
            <span class="g2d-bedz tip-${e(o.tip || 'X')}">${T('Tip', 'Type')} ${e(o.tip || '—')}</span>
          </div>
          <p>${e(o.smjestaj || '')} · ${e(o.konstrukcija || '')}</p>
          <p class="izvor">${T('materijal', 'material')}: ${e(o.materijal || '—')} · ${e(o.pouzdanost)} (${e(o.izvor)})</p>
        </div>
      </article>
    `).join('');

    matrica.querySelectorAll('.g2d-tip-kartica').forEach(el => {
      el.onclick = () => {
        const id = el.dataset.id;
        naOdabirObjekta?.(id);
        uPogled?.('akso');
        document.getElementById('maketa')?.scrollIntoView({ behavior: 'smooth' });
      };
    });
  }

  // ============================================================================
  // 3) 2.5D REGIONALNI KARTOGRAM I TOK SINTEZE (Zadar — Banja Luka — Donje Polje)
  // ============================================================================
  function renderRegija() {
    const kartaOkvir = studio.querySelector('#g2d-karta-svg');
    const sintezaOkvir = studio.querySelector('#g2d-sinteza-tok');
    const tocke = A.objekti.filter(o => o.lat && o.lon && o.drzava !== 'IT');
    const W = 580, H = 390;
    const X = lon => 36 + ((+lon - 14.1) / (19.3 - 14.1)) * (W - 72);
    const Y = lat => H - 38 - ((+lat - 43.1) / (45.6 - 43.1)) * (H - 76);
    const dp = A.objekti.find(o => o.id === 'PR-01') || { lat: 43.73, lon: 15.95 };
    const dpx = X(dp.lon), dpy = Y(dp.lat);

    // Deterministički pomaci oznaka protiv preklapanja (Zadar/Bibinje/Sukošan i Šibenik/Sinj/Mostar)
    const pomak = {
      'UZ-01': [0, -11],
      'UZ-02': [8, 2],
      'IZ-01': [4, 14],
      'UZ-03': [4, -10],
      'PR-01': [-14, 18],
      'UZ-04': [8, 4],
      'UZ-05': [6, 12],
      'UZ-06': [6, -6],
      'UZ-07': [6, 10],
      'UZ-08': [6, -4],
      'UZ-09': [-115, -10],
    };

    const lukovi = tocke.filter(o => o.id !== 'PR-01').map(o => {
      const x1 = X(o.lon), y1 = Y(o.lat), mx = (x1 + dpx) / 2, my = Math.min(y1, dpy) - 22;
      return `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${dpx.toFixed(1)},${dpy.toFixed(1)}" fill="none" stroke="rgba(200,16,46,0.35)" stroke-width="1.3" stroke-dasharray="4 3"/>`;
    }).join('');

    const glifovi = tocke.map(o => {
      const [ox, oy] = pomak[o.id] || [6, 3];
      const x = X(o.lon), y = Y(o.lat) + (o.id === 'UZ-07' ? 10 : 0);
      const r = o.id === 'PR-01' ? 8.5 : Math.max(4.8, Math.sqrt(parseFloat(o.povrsina_m2) || 18) * 1.1);
      const col = o.id === 'PR-01' ? '#c8102e' : ({ A: '#d4845a', B: '#6a9a5b', C: '#4f86a8', D: '#d8a848' }[o.tip] || '#7a7265');
      return `<g class="g2d-karta-tocka" data-id="${e(o.id)}" style="cursor:pointer">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" stroke="#fff" stroke-width="1.5"/>
        <text x="${(x + ox).toFixed(1)}" y="${(y + oy).toFixed(1)}" font-size="10" font-weight="600" fill="#22201c">${e(o.id)} ${e(o.mjesto)}</text>
      </g>`;
    }).join('');

    kartaOkvir.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="g2d-regija-svg">
        <rect width="${W}" height="${H}" fill="#efeae0" rx="10"/>
        <polygon points="0,${H} 0,120 180,220 340,${H}" fill="#cfe0e8" opacity="0.65"/>
        <text x="18" y="28" font-size="12" font-weight="700" fill="#22201c">${T('REGIONALNA MREŽA (HR / BiH · ~1 km preciznost općine)', 'REGIONAL NETWORK (HR / BiH · ~1 km municipality precision)')}</text>
        <text x="24" y="${H - 22}" font-size="11" fill="#4f6d7a" font-style="italic">Jadransko more · Adriatic Sea</text>
        ${lukovi}
        ${glifovi}
      </svg>
    `;

    sintezaOkvir.innerHTML = `
      <h3>${T('Kako terenski podaci grade projekt Donje Polje', 'How field data generates the Donje Polje design')}</h3>
      <div class="g2d-pravilo"><b>1 · ${T('Teren → Tip C hibrid', 'Field → Type C Hybrid')}</b><p>${e(A.sinteza[0][T('hr', 'en')])} → ${T('Projekt spaja zaštićenu jezgru i 12 vanjskih volijera.', 'The design merges a sheltered core with 12 outer aviaries.')}</p></div>
      <div class="g2d-pravilo"><b>2 · ${T('Površina → Razmera', 'Area → Scale')}</b><p>${e(A.sinteza[1][T('hr', 'en')])} → ${T('Prizemlje projekta ima točno 74,49 m² (6 kaveza + 4 ugaone sobe + hol 21,95 m²).', 'The design ground floor has exactly 74.49 m² (6 cages + 4 corner rooms + 21.95 m² hall).')}</p></div>
      <div class="g2d-pravilo"><b>3 · ${T('Normativi → Kote u prostoru', 'Norms → Spatial Dimensions')}</b><p>N01 (1,30×2,20×2,00 m) · N03 (mreža 25 mm) · N20 (zračna komora 4,46 m²) · N22–25 (zeleni krov +8,85 m).</p></div>
    `;

    kartaOkvir.querySelectorAll('.g2d-karta-tocka').forEach(g => {
      g.onclick = () => { naOdabirObjekta?.(g.dataset.id); };
    });
  }

  // Upravljanje tabovima i kontrolama
  studio.querySelectorAll('[data-tab]').forEach(b => {
    b.onclick = () => {
      aktivniTab = b.dataset.tab;
      studio.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('akt', x === b));
      studio.querySelector('#g2d-cad').hidden = aktivniTab !== 'cad';
      studio.querySelector('#g2d-tipologija').hidden = aktivniTab !== 'tipologija';
      studio.querySelector('#g2d-regija').hidden = aktivniTab !== 'regija';
      if (aktivniTab === 'cad') renderCAD();
      else if (aktivniTab === 'tipologija') renderTipologija();
      else renderRegija();
    };
  });

  studio.querySelector('[data-akcija="u3d"]').onclick = () => {
    uPogled?.('akso');
    document.getElementById('maketa')?.scrollIntoView({ behavior: 'smooth' });
  };

  studio.querySelectorAll('[data-list]').forEach(b => {
    b.onclick = () => {
      aktivniList = b.dataset.list;
      studio.querySelectorAll('[data-list]').forEach(x => x.classList.toggle('akt', x === b));
      renderCAD();
    };
  });

  studio.querySelectorAll('[data-sloj]').forEach(cb => {
    cb.onchange = () => { slojevi[cb.dataset.sloj] = cb.checked; renderCAD(); };
  });

  studio.querySelector('#g2d-tema').onclick = () => {
    tamniBlueprint = !tamniBlueprint;
    renderCAD();
  };

  renderCAD();
  renderTipologija();
  renderRegija();

  return { renderCAD, otvoriList: l => { aktivniList = l; renderCAD(); } };
}
