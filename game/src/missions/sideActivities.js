// Optional street races, checkpoint rings and scored stunt landings.
(function (SB) {
  const M = SB.M, S = SB.side = { race: null, best: {}, stuntBest: 0, lastStunt: 0 };
  S.races = [
    { name: 'COASTAL SPRINT', prize: 3200, limit: 68, points: [[-160, 120], [78, 118], [78, -40], [-160, -40], [-160, 120]] },
    { name: 'NEON MILE LOOP', prize: 4800, limit: 82, points: [[-20, -140], [60, -140], [60, -60], [-180, -60], [-180, -140], [-20, -140]] },
    { name: 'CAUSEWAY GAMBIT', prize: 6200, limit: 96, points: [[40, 40], [180, -120], [268, -120], [180, -120], [40, 40]] },
  ];
  S.start = (game, i) => {
    const r = S.races[i]; if (!r) return;
    S.race = { def: r, cp: 1, time: r.limit, x: r.points[1][0], z: r.points[1][1] };
    game.notify(r.name + ' STARTED', 'mission'); SB.audio.stinger();
  };
  S.stop = () => { S.race = null; };
  S.update = (dt, game) => {
    if (!S.race) return;
    S.race.time -= dt;
    if (S.race.time <= 0) { game.notify('TIME EXPIRED', 'warn'); S.race = null; return; }
    const p = game.player, r = S.race, pts = r.def.points;
    if (p.vehicle && M.d2(p, { x: r.x, z: r.z }) < 15) {
      r.cp++;
      if (r.cp >= pts.length) {
        const reward = Math.round(r.def.prize * (.65 + .35 * r.time / r.def.limit));
        SB.garage.addCash(reward); S.best[r.def.name] = Math.min(S.best[r.def.name] || 1e9, r.def.limit - r.time);
        game.notify('RACE WON  +$' + reward.toLocaleString(), 'good'); SB.audio.stinger(); S.race = null; return;
      }
      r.x = pts[r.cp][0]; r.z = pts[r.cp][1]; SB.audio.blip(880);
    }
  };
  S.stunt = (airTime, height, game) => {
    const score = Math.round(Math.min(900, height * 110 + airTime * 480));
    if (score < 50) return;
    SB.garage.addCash(score); S.stuntBest = Math.max(S.stuntBest, score); S.lastStunt = score;
    game.notify('STUNT LANDED  +$' + score, 'good'); SB.audio.purchase();
  };
  S.waypoint = () => S.race ? { x: S.race.x, z: S.race.z, label: 'CHECKPOINT ' + S.race.cp + '/' + (S.race.def.points.length - 1) } : null;
  S.submit = (m, time) => {
    const w = S.waypoint(); if (!w) return;
    const c = M.col('#47e6ff');
    for (let i = 0; i < 3; i++) m.cyl(w.x, .6 + i * 1.7 + Math.sin(time * 3 + i) * .15, w.z, 4.2 - i * .5, .22, c, 1, 12);
  };
})(window.SB = window.SB || {});
