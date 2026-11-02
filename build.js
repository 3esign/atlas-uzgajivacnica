// CSV → atlas.json. Node, bez paketa. Redovi se dodaju u data/*.csv, ne menjaju.
'use strict';
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, 'data');

function parseCSV(txt) {
  const rows = []; let row = [], f = '', q = false;
  txt = txt.replace(/^﻿/, '');
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(x => x !== '')) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some(x => x !== '')) rows.push(row);
  const [h, ...body] = rows;
  return body.map(r => Object.fromEntries(h.map((k, j) => [k, (r[j] ?? '').trim()])));
}
const t = n => parseCSV(fs.readFileSync(path.join(D, n + '.csv'), 'utf8'));

function median(a) { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

function build() {
  const objekti = t('objekti'), vrt = JSON.parse(fs.readFileSync(path.join(D, 'vrt.json'), 'utf8'));
  const teren = objekti.filter(o => o.vrsta_zapisa === 'uzgajivacnica');
  const pov = teren.map(o => parseFloat(o.povrsina_m2)).filter(Number.isFinite);
  const tipA = teren.filter(o => o.tip === 'A');
  const brojStabala = {}; for (const s of vrt.stabla) brojStabala[s.vrsta] = (brojStabala[s.vrsta] || 0) + 1;
  return {
    naslov: { hr: 'Atlas uzgajivačnica', en: 'Aviary Atlas' },
    autori: ['Lucija Jurlin Dorbić', 'doc. dr. Semir Poturak'],
    ustanova: 'Univerzitet u Travniku',
    objekti, vrste: t('vrste_ptica'), biljke: t('biljke'), normativi: t('normativi'),
    propisi: t('propisi'), kronologija: t('kronologija'), lokaliteti: t('kontekst_lokaliteta'),
    projekt: t('projekt_donje_polje'),
    vrt: { parcela_m2: 1321.7, stabla: brojStabala, lavanda: vrt.lavanda.length, kucice: vrt.kucice.length, pojiliste: vrt.pojiliste.length, sljunak: vrt.sljunak.napomena },
    sinteza: [
      { id: 'S1', hr: `U gradu se uzgoj seli u kuću: tip A je ${tipA.length} od ${teren.length} terenskih objekata.`,
        en: `In towns, breeding moves indoors: type A is ${tipA.length} of ${teren.length} field sites.`, redovi: tipA.map(o => o.id) },
      { id: 'S2', hr: `Medijan površine ${median(pov)} m², raspon ${Math.min(...pov)}–${Math.max(...pov)} m² (poznato za ${pov.length} od ${teren.length}).`,
        en: `Median area ${median(pov)} m², range ${Math.min(...pov)}–${Math.max(...pov)} m² (known for ${pov.length} of ${teren.length}).`,
        redovi: teren.filter(o => o.povrsina_m2).map(o => o.id) },
    ],
  };
}
module.exports = { parseCSV, build, median };
if (require.main === module) {
  const a = build();
  fs.writeFileSync(path.join(__dirname, 'atlas.json'), JSON.stringify(a));
  console.log('atlas.json:', a.objekti.length, 'objekata,', a.vrste.length, 'vrsta,', a.biljke.length, 'biljaka');
}
