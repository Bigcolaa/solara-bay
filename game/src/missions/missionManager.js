// Contract lifecycle: objective checks, waypoint beacon, mission crates, bonuses and cleanup.
(function (SB) {
  const M = SB.M, C = (h, a) => M.col(h, a), MM = SB.missions = { active: null, index: 0, elapsed: 0, crates: [], achieved: false, destroyed: 0 };
  MM.available = (i) => i === 0 || !!SB.garage.completed[SB.story[i - 1].id];
  MM.start = (game, i) => {
    if (!MM.available(i)) { game.notify('COMPLETE THE PREVIOUS CONTRACT FIRST', 'warn'); return false; }
    MM.abandon(game);
    const def = SB.story[i]; MM.active = def; MM.index = 0; MM.elapsed = 0; MM.achieved = false; MM.destroyed = 0;
    if (def.wanted) SB.police.setLevel(game, def.wanted);
    MM.stageCrates(game);
    game.notify('CONTRACT · ' + def.title, 'mission'); SB.audio.stinger();
    return true;
  };
  MM.stageCrates = (game) => {
    const st = MM.active && MM.active.stages[MM.index];
    if (!st || st.type !== 'shoot') return;
    for (let i = 0; i < st.count; i++) {
      const p = { x: -27 + i * 12, z: -96, kind: 'crate', hp: 42, rot: .2, alive: true, mission: true };
      SB.city.props.push(p); SB.city.destructibles.push(p); MM.crates.push(p);
    }
  };
  MM.clearCrates = () => {
    for (const p of MM.crates) {
      let i = SB.city.destructibles.indexOf(p); if (i >= 0) SB.city.destructibles.splice(i, 1);
      i = SB.city.props.indexOf(p); if (i >= 0) SB.city.props.splice(i, 1);
    }
    MM.crates.length = 0;
  };
  MM.abandon = (game) => {
    const had = !!MM.active;
    MM.active = null; MM.index = 0; MM.clearCrates();
    if (had && game && game.notify) game.notify('CONTRACT CANCELLED', 'info');
  };
  MM.next = (game) => {
    const def = MM.active; MM.index++; MM.achieved = false; MM.clearCrates();
    if (MM.index >= def.stages.length) {
      const bonus = Math.max(0, Math.round((190 - MM.elapsed) * 12));
      const total = def.payout + bonus;
      SB.garage.completed[def.id] = true; SB.garage.addCash(total); SB.garage.save();
      game.notify('CONTRACT COMPLETE  +$' + total.toLocaleString(), 'good'); SB.audio.stinger();
      MM.active = null; MM.index = 0; return;
    }
    MM.stageCrates(game);
    game.notify('OBJECTIVE UPDATED · ' + MM.active.stages[MM.index].label, 'mission'); SB.audio.blip(920);
  };
  MM.update = (dt, game) => {
    if (!MM.active) return;
    MM.elapsed += dt;
    const st = MM.active.stages[MM.index], p = game.player;
    let done = false;
    if (st.type === 'goto') done = M.d2(p, st) < st.r;
    else if (st.type === 'vehicle') done = !!p.vehicle && p.vehicle.id === st.id;
    else if (st.type === 'escape') done = SB.police.level === 0;
    else if (st.type === 'jump') { if ((p.vehicle && p.vehicle.y > 2.5) || p.air > .7) MM.achieved = true; done = MM.achieved; }
    else if (st.type === 'shoot') { MM.destroyed = MM.crates.filter((c) => !c.alive).length; done = MM.destroyed >= st.count; }
    if (done) MM.next(game);
  };
  MM.waypoint = () => {
    if (!MM.active) return null;
    const st = MM.active.stages[MM.index];
    if (st.type === 'goto') return { x: st.x, z: st.z, label: st.label };
    if (st.type === 'vehicle') return { x: 60, z: 60, label: st.label };
    if (st.type === 'shoot') return { x: -20, z: -100, label: st.label };
    if (st.type === 'jump') return { x: SB.city.landmarks.ramp.x, z: SB.city.landmarks.ramp.z, label: st.label };
    return null;
  };
  MM.submit = (m, time) => {
    const w = MM.waypoint(); if (!w) return;
    const c = C('#ffd34d'), pulse = .7 + Math.sin(time * 4) * .3;
    m.cyl(w.x, 1.1 + Math.sin(time * 2) * .3, w.z, 1.5, 18, C('#ffd34d', .22), .9, 8);
    for (let i = 0; i < 3; i++) m.cyl(w.x, 3 + i * 5 + (time * 4 % 5), w.z, 2.6 + i * .3, .3, c, 1, 12);
    m.cone(w.x, 20, w.z, 1.2 * pulse, 2.4, c, 1, 6);
  };
})(window.SB = window.SB || {});
