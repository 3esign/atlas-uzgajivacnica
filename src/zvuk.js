// Zvuk bez snimki (nema licenci): vjetar iz filtriranog šuma i sintetizirani cvrkut. Pali se tek na korisnikov dodir.
export function zvuk() {
  let ac = null, glavni, cvrkut, vjetar, blizu = 0.3, tajmer = 0;
  function upali() {
    if (!ac) {
      ac = new AudioContext();
      glavni = ac.createGain(); glavni.gain.value = 0; glavni.connect(ac.destination);
      const n = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate), d = n.getChannelData(0);
      let b = 0; for (let i = 0; i < d.length; i++) { b = 0.985 * b + 0.015 * (Math.random() * 2 - 1); d[i] = b * 6; } // smeđi šum
      const src = ac.createBufferSource(); src.buffer = n; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      vjetar = ac.createGain(); vjetar.gain.value = 0.35;
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.18;
      lfo.connect(lg).connect(vjetar.gain); lfo.start();
      src.connect(lp).connect(vjetar).connect(glavni); src.start();
      cvrkut = ac.createGain(); cvrkut.gain.value = 0.5; cvrkut.connect(glavni);
    }
    ac.resume(); glavni.gain.setTargetAtTime(0.5, ac.currentTime, 0.6); fraza();
  }
  function ugasi() { if (!ac) return; glavni.gain.setTargetAtTime(0, ac.currentTime, 0.3); clearTimeout(tajmer); tajmer = 0; }
  // Fraza: 3–9 kratkih tonova 2,5–6 kHz s kliznim zavijanjem, nasumično u prostoru.
  function fraza() {
    clearTimeout(tajmer);
    const t0 = ac.currentTime + 0.05, f0 = 2500 + Math.random() * 3500, n = 3 + Math.floor(Math.random() * 7);
    const pan = ac.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(cvrkut);
    for (let i = 0, t = t0; i < n; i++) {
      const o = ac.createOscillator(), g = ac.createGain(), du = 0.04 + Math.random() * 0.1, f = f0 * (0.85 + Math.random() * 0.4);
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.35 : 0.7), t + du);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 + blizu * 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + du);
      o.connect(g).connect(pan); o.start(t); o.stop(t + du + 0.02);
      t += du + 0.02 + Math.random() * 0.08;
    }
    tajmer = setTimeout(fraza, (2600 - blizu * 2000) * (0.4 + Math.random()));
  }
  return { upali, ugasi, blizina: v => { blizu = Math.max(0, Math.min(1, v)); }, get radi() { return !!tajmer; } };
}
