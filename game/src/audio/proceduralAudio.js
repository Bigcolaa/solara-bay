// Everything heard in Solara Bay is synthesized at runtime with the Web Audio API.
(function (SB) {
  const M = SB.M;
  const A = SB.audio = { ready: false, muted: false, station: 1, radioOn: true, nextNote: 0, step: 0, noiseRand: M.rng(0xabc123) };
  const stations = [
    { name: 'COAST FM', song: 'Palm Static', bpm: 112, root: 110, scale: [0, 3, 5, 7, 10], wave: 'sawtooth' },
    { name: 'NEON PULSE', song: 'Midnight Causeway', bpm: 126, root: 98, scale: [0, 2, 3, 7, 10], wave: 'square' },
    { name: 'HARBOR BLUES', song: 'Salt Air Slowdown', bpm: 96, root: 82, scale: [0, 3, 5, 7, 9], wave: 'triangle' },
  ];
  A.stations = stations;
  A.init = () => {
    if (A.ready) return;
    const ctx = A.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = A.master = ctx.createGain(); master.gain.value = .5;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 5;
    master.connect(comp); comp.connect(ctx.destination);
    const music = A.music = ctx.createGain(); music.gain.value = .22; music.connect(master);
    const eng = A.eng = { osc: ctx.createOscillator(), sub: ctx.createOscillator(), filter: ctx.createBiquadFilter(), gain: ctx.createGain() };
    eng.osc.type = 'sawtooth'; eng.sub.type = 'square'; eng.filter.type = 'lowpass'; eng.filter.Q.value = 5;
    eng.osc.connect(eng.filter); eng.sub.connect(eng.filter); eng.filter.connect(eng.gain); eng.gain.connect(master);
    eng.osc.start(); eng.sub.start(); eng.gain.gain.value = 0;
    const siren = A.siren = { a: ctx.createOscillator(), b: ctx.createOscillator(), gain: ctx.createGain() };
    siren.a.type = 'sawtooth'; siren.b.type = 'sawtooth'; siren.a.frequency.value = 660; siren.b.frequency.value = 880;
    siren.a.connect(siren.gain); siren.b.connect(siren.gain); siren.gain.connect(master); siren.gain.gain.value = 0;
    siren.a.start(); siren.b.start();
    A.ready = true;
  };
  A.resume = () => { if (A.ready && A.ctx.state === 'suspended') A.ctx.resume(); };
  A.toggleMute = () => { A.muted = !A.muted; if (A.ready) A.master.gain.value = A.muted ? 0 : .5; return A.muted; };
  A.nextStation = () => { A.station = (A.station + 1) % stations.length; A.step = 0; A.blip(660); return stations[A.station]; };
  A.tone = (freq, dur, type, vol, slide) => {
    if (!A.ready || A.muted) return;
    const t = A.ctx.currentTime, o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + .02);
  };
  A.noise = (dur, vol, freq) => {
    if (!A.ready || A.muted) return;
    const t = A.ctx.currentTime, n = Math.floor(A.ctx.sampleRate * dur), buf = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = A.noiseRand() * 2 - 1;
    const src = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = .7;
    g.gain.setValueAtTime(vol || .12, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(A.master); src.start(t);
  };
  A.blip = (f) => A.tone(f || 520, .09, 'triangle', .075, (f || 520) * 1.4);
  A.horn = () => { A.tone(310, .22, 'sawtooth', .07, 285); A.tone(465, .22, 'square', .035, 430); };
  A.shot = () => { A.tone(190, .11, 'square', .12, 60); A.noise(.09, .1, 1800); };
  A.crash = () => { A.noise(.3, .2, 380); A.tone(80, .25, 'sawtooth', .1, 40); };
  A.purchase = () => { A.blip(520); setTimeout(() => A.blip(780), 90); };
  A.stinger = () => { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => A.tone(f, .24, 'triangle', .12), i * 95)); };
  A.setEngine = (rpm, load, driving) => {
    if (!A.ready) return;
    const t = A.ctx.currentTime, e = A.eng;
    e.osc.frequency.setTargetAtTime(48 + rpm * 1.9, t, .06);
    e.sub.frequency.setTargetAtTime(24 + rpm * .93, t, .06);
    e.filter.frequency.setTargetAtTime(280 + rpm * 19 + load * 320, t, .08);
    e.gain.gain.setTargetAtTime(driving ? .028 + Math.min(rpm / 90, 1) * .075 : .012, t, .1);
  };
  A.setSiren = (on, level) => {
    if (!A.ready) return;
    const t = A.ctx.currentTime;
    A.siren.gain.gain.setTargetAtTime(on && !A.muted ? .05 + level * .012 : 0, t, .12);
  };
  const noteFreq = (s, n) => s.root * Math.pow(2, s.scale[n % s.scale.length] / 12 + Math.floor(n / s.scale.length));
  A.tick = () => {
    if (!A.ready) return;
    const now = A.ctx.currentTime;
    if (!A.radioOn || A.muted) { A.nextNote = now; return; }
    const s = stations[A.station], spb = 60 / s.bpm / 2;
    if (A.nextNote < now) A.nextNote = now + .02;
    while (A.nextNote < now + .18) {
      const t = A.nextNote, k = A.step;
      const bass = A.ctx.createOscillator(), bg = A.ctx.createGain();
      bass.type = s.wave; bass.frequency.value = noteFreq(s, k % 8 === 7 ? 3 : 0) / 2;
      bg.gain.setValueAtTime(.0001, t); bg.gain.linearRampToValueAtTime(.085, t + .01); bg.gain.exponentialRampToValueAtTime(.0001, t + spb * .8);
      const filter = A.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 420 + (k % 4) * 90;
      bass.connect(filter); filter.connect(bg); bg.connect(A.music); bass.start(t); bass.stop(t + spb);
      if (k % 2 === 0) {
        const arp = A.ctx.createOscillator(), ag = A.ctx.createGain();
        arp.type = 'triangle'; arp.frequency.value = noteFreq(s, (k * 2 + (k > 15 ? 1 : 0)) % 12);
        ag.gain.setValueAtTime(.0001, t); ag.gain.linearRampToValueAtTime(.045, t + .008); ag.gain.exponentialRampToValueAtTime(.0001, t + spb * .9);
        arp.connect(ag); ag.connect(A.music); arp.start(t); arp.stop(t + spb);
      }
      if (k % 4 === 0) {
        const kick = A.ctx.createOscillator(), kg = A.ctx.createGain();
        kick.frequency.setValueAtTime(150, t); kick.frequency.exponentialRampToValueAtTime(45, t + .13);
        kg.gain.setValueAtTime(.28, t); kg.gain.exponentialRampToValueAtTime(.0001, t + .18);
        kick.connect(kg); kg.connect(A.music); kick.start(t); kick.stop(t + .2);
      }
      A.step++; A.nextNote += spb;
    }
  };
})(window.SB = window.SB || {});
