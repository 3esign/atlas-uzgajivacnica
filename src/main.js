// Tekstualni hortus: ceo sadržaj atlasa poređan redom prostorija zgrade (komora → krov).
'use strict';
(async () => {
  const A = await (await fetch('atlas.json')).json();
  let L = localStorage.getItem('jezik') || 'hr';
  const T = (hr, en) => (L === 'hr' ? hr : en);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  const e = s => String(s ?? '').replace(/[&<>"]/g, c => ESC[c]);
  const v = x => (x ? e(x) : `<span class="nepoznato">${T('nepoznato', 'unknown')}</span>`);
  const izvor = r => `<div class="izvor">${T('izvor', 'source')}: ${v(r.izvor)}` +
    (r.pouzdanost ? ` · ${T('pouzdanost', 'reliability')}: ${e(r.pouzdanost)}` : '') + '</div>';
  const kart = (r, naslov, polja) => `<div class="kartica p-${e((r.pouzdanost || '').split('+')[0])}"><b>${naslov}</b><br>` +
    polja.map(([k, x]) => `${k}: ${v(x)}`).join(' · ') + izvor(r) + '</div>';
  const tab = (rows, cols) => `<div class="tablica"><table><tr>${cols.map(c => `<th>${e(c)}</th>`).join('')}</tr>` +
    rows.map(r => `<tr>${cols.map(c => `<td>${v(r[c])}</td>`).join('')}</tr>`).join('') + '</table></div>';
  const nesig = r => /autorsko|navedeno/.test(r.pouzdanost || '');
  const teren = A.objekti.filter(o => o.vrsta_zapisa === 'uzgajivacnica');
  const objKart = o => kart(o, `${e(o.id)} · ${e(o.mjesto)} · ${T('tip', 'type')} ${e(o.tip)}`, [
    [T('kontekst', 'context'), o.kontekst], [T('smještaj', 'housing'), o.smjestaj], [T('materijal', 'material'), o.materijal],
    [T('površina', 'area'), o.povrsina_m2 && o.povrsina_m2 + ' m²'], [T('ptice', 'birds'), o.ptice], [T('svjetlo', 'light'), o.svjetlo]]);

  const sobe = [
    ['komora', T('Zračna komora', 'Airlock'), T('ulaz · o radu', 'entrance · about'), () =>
      `<p>${T('Atlas je izveden iz diplomskog rada Lucije Jurlin Dorbić (mentor doc. dr. Semir Poturak, Univerzitet u Travniku): terenski zapisi uzgajivačnica između Zadra i Banje Luke i projekt uzgajivačnice u Donjem Polju kraj Šibenika.',
        'This atlas is derived from the diploma thesis of Lucija Jurlin Dorbić (supervisor Asst. Prof. Semir Poturak, PhD, University of Travnik): field records of aviaries between Zadar and Banja Luka and an aviary design in Donje Polje near Šibenik.')}</p>` +
      `<p>${T('Bez imena i adresa; točka je središte općine. Svaki podatak nosi izvor i pouzdanost.',
        'No names or addresses; a point is the municipality centre. Every record carries its source and reliability.')}</p>`],
    ['hol', T('Središnji hol', 'Central hall'), T('istražena mjesta', 'surveyed places'), () =>
      A.lokaliteti.map(l => kart(l, e(l.mjesto), [[T('regija', 'region'), l.regija_rad], [T('ekologija', 'ecology'), l.ekoloski_kontekst]])).join('')],
    ['kavezi', T('Kavezi prizemlja', 'Ground-floor cages'), T('terenski objekti', 'field sites'), () =>
      teren.map(objKart).join('') + `<p class="izvor">${T('Izložbe, referenca i projekt', 'Shows, reference and design')}</p>` +
      A.objekti.filter(o => o.vrsta_zapisa !== 'uzgajivacnica').map(objKart).join('')],
    ['karantena', T('Karantena', 'Quarantine'), T('što nije provjereno', 'what is not verified'), () =>
      `<p>${T('Zapisi samo navedeni u tekstu i autorske tvrdnje bez izvora: hipoteze.', 'Records only stated in text and author claims without a source: hypotheses.')}</p>` +
      [...A.objekti, ...A.normativi].filter(nesig).map(r =>
        `<div class="kartica p-autorsko">${e(r.id)} · ${e(r.mjesto || r.tema + ': ' + r.parametar)}${izvor(r)}</div>`).join('')],
    ['spremiste', T('Spremište hrane', 'Food store'), T('biljke', 'plants'), () => tab(A.biljke, ['latinski', 'naziv_hr', 'uloga', 'kontekst', 'izvor'])],
    ['uzgoj', T('Prostorija za uzgoj', 'Breeding room'), T('povijest uzgoja', 'history of breeding'), () => tab(A.kronologija, ['period', 'dogadjaj', 'prostor', 'izvor'])],
    ['stubiste', T('Stubište', 'Staircase'), T('od terena prema projektu', 'from field to design'), () =>
      A.sinteza.map(s => `<div class="kartica"><b>${e(s[L])}</b><div class="izvor">${T('iz redova', 'from rows')}: ${s.redovi.map(e).join(', ')}</div></div>`).join('')],
    ['kat1', T('1. kat', '1st floor'), T('ptice · mjere · propisi', 'birds · measures · regulations'), () =>
      A.vrste.map(b => kart(b, `${e(b.naziv_hr)} <i>${e(b.latinski)}</i>`,
        [[T('duljina', 'length'), b.duzina_cm && b.duzina_cm + ' cm'], [T('stanište', 'habitat'), b.staniste]])).join('') +
      tab(A.normativi, ['id', 'tema', 'parametar', 'vrijednost', 'jedinica', 'pouzdanost']) +
      tab(A.propisi, ['propis', 'oznaka', 'sta_uredjuje', 'drzava'])],
    ['krov', T('Terase i krov', 'Terraces and roof'), T('projekt Donje Polje · vrt', 'Donje Polje design · garden'), () =>
      tab(A.projekt, ['etaza', 'kota_m', 'prostorija', 'povrsina_m2', 'broj']) +
      `<div class="kartica"><b>${T('Vrt na parceli k.č. 1004', 'Garden on plot 1004')}</b> · ${A.vrt.parcela_m2} m²<br>` +
      Object.entries(A.vrt.stabla).map(([k, n]) => `${e(k)} ${n}`).join(' · ') +
      ` · lavanda ${A.vrt.lavanda} · ${T('kućice', 'birdhouses')} ${A.vrt.kucice} · ${T('pojilište', 'water')} ${A.vrt.pojiliste}` +
      `<div class="izvor">${T('izvor', 'source')}: Jurlin_Ptičarnik.dwg, list 1 · ${T('šljunak: obris nije nacrtan', 'gravel: outline not drawn')}</div></div>`],
  ];

  document.documentElement.lang = L;
  document.querySelectorAll('[data-hr]').forEach(n => { n.textContent = n.dataset[L]; });
  document.querySelectorAll('.autori').forEach(n => { n.textContent = A.autori.join(' · ') + ' · ' + A.ustanova; });
  document.getElementById('jezik').textContent = L === 'hr' ? 'EN' : 'HR';
  document.getElementById('stanice').innerHTML = sobe.map(([id, n]) => `<a href="#${id}">${n}</a>`).join('');
  document.getElementById('vrt').innerHTML = sobe.map(([id, n, p, f]) => `<section id="${id}"><h2>${n}<small>${p}</small></h2>${f()}</section>`).join('');
  document.getElementById('jezik').onclick = () => { localStorage.setItem('jezik', L === 'hr' ? 'en' : 'hr'); location.reload(); };
})();
