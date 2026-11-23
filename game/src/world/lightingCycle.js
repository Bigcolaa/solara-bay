// Hour-of-day colour grading: dawn, gold coast daylight, violet sunset and neon night.
(function (SB) {
  const M = SB.M;
  const C = (h) => M.col(h);
  const keys = [
    { h: 0, top: C('#0a1233'), bottom: C('#26204f'), fog: C('#17214b'), sun: C('#6a86c8'), amb: .30, neon: 1, fogD: .0022, name: 'NIGHT' },
    { h: 5.5, top: C('#25335f'), bottom: C('#ef9a6b'), fog: C('#9b7a91'), sun: C('#ffb27c'), amb: .48, neon: .45, fogD: .0028, name: 'DAWN' },
    { h: 8, top: C('#4994d8'), bottom: C('#b8e6ff'), fog: C('#a8d7e8'), sun: C('#fff2d0'), amb: .82, neon: 0, fogD: .0018, name: 'MORNING' },
    { h: 13, top: C('#2f8fe0'), bottom: C('#d6f2ff'), fog: C('#bfe4ee'), sun: C('#ffffff'), amb: .95, neon: 0, fogD: .0015, name: 'MIDDAY' },
    { h: 17.5, top: C('#3a73b8'), bottom: C('#ffb56b'), fog: C('#d9a382'), sun: C('#ffcf8b'), amb: .78, neon: .18, fogD: .0021, name: 'GOLDEN HOUR' },
    { h: 19.5, top: C('#28265e'), bottom: C('#ff7b8e'), fog: C('#8d5b8a'), sun: C('#ff9a76'), amb: .52, neon: .62, fogD: .0026, name: 'SUNSET' },
    { h: 21, top: C('#0d1642'), bottom: C('#4a2b68'), fog: C('#251f53'), sun: C('#8597e0'), amb: .32, neon: 1, fogD: .0023, name: 'NEON NIGHT' },
  ];
  const L = SB.lighting = { hour: 17.2, preset: null, palette: null };
  L.set = (h) => { L.hour = ((h % 24) + 24) % 24; L.preset = null; };
  L.nextPreset = () => { L.set([9, 17.2, 19.4, 22][([9, 17.2, 19.4, 22].findIndex((h) => Math.abs(h - L.hour) < .4) + 1) % 4]); };
  L.update = (dt) => { if (!L.preset) L.hour = (L.hour + dt * .22) % 24; L.palette = L.sample(L.hour); };
  L.sample = (h) => {
    let i = 0; while (i < keys.length - 2 && keys[i + 1].h <= h) i++;
    const a = keys[i], b = keys[i + 1], t = M.smooth((h - a.h) / (b.h - a.h));
    const mix = (k) => M.mixColor(a[k], b[k], t);
    const ang = (h / 24) * M.PI * 2 - M.PI / 2;
    return { top: mix('top'), bottom: mix('bottom'), fog: mix('fog'), sunColor: mix('sun'),
      sun: [Math.cos(ang) * .8, Math.sin(ang) * .9 + .12, -.35],
      amb: M.lerp(a.amb, b.amb, t), neon: M.lerp(a.neon, b.neon, t), fogD: M.lerp(a.fogD, b.fogD, t),
      name: t > .5 ? b.name : a.name };
  };
  L.update(0);
})(window.SB = window.SB || {});
