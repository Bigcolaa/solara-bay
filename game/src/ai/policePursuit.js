// Heat, one-to-five star pursuit, cruiser tactics, lightbars, roadblocks and escape cooldown.
(function (SB) {
  const M = SB.M, C = (h, a) => M.col(h, a), V = SB.vehicles, E = SB.police = { rng: M.rng(0x3c17) };
  const gain = { gunshot: 13, theft: 17, hit: 26, mission: 30, assault: 18, default: 10 };
  const thresholds = [26, 58, 100, 150, 210];
  E.level = 0; E.heat = 0; E.cruisers = []; E.roadblocks = []; E.safeTime = 0; E.lastCrime = -99; E.time = 0;
  E.reset = (game) => {
    E.heat = 0; E.level = 0; E.safeTime = 0;
    for (const c of E.cruisers) { const i = game.cars.indexOf(c); if (i >= 0) game.cars.splice(i, 1); }
    E.cruisers.length = 0; E.roadblocks.length = 0; SB.audio.setSiren(false, 0);
  };
  E.crime = (game, type, x, z) => {
    const before = E.level;
    E.heat = Math.min(240, E.heat + (gain[type] || gain.default));
    E.lastCrime = E.time; E.safeTime = 0;
    E.level = thresholds.filter((t) => E.heat >= t).length;
    if (E.level > before) {
      game.notify('WANTED · ' + E.level + (E.level === 1 ? ' STAR' : ' STARS'), 'warn');
      SB.audio.stinger();
    }
    SB.peds.alert(x, z, type === 'gunshot' ? 75 : 42, 4 + E.level);
  };
  E.setLevel = (game, n) => { E.heat = n <= 0 ? 0 : thresholds[n - 1] + 2; E.lastCrime = E.time; E.update(.01, game); };
  E.spawnCruiser = (game, ahead) => {
    const axis = E.rng() > .5, dir = E.rng() > .5 ? 1 : -1, off = dir > 0 ? -3.3 : 3.3;
    let x, z, yaw;
    if (ahead && game.player.vehicle) {
      const f = game.player.vehicle.fwd;
      x = game.player.x + f[0] * (55 + E.rng() * 45); z = game.player.z + f[1] * (55 + E.rng() * 45);
      yaw = game.player.vehicle.yaw + M.PI;
    } else if (axis) { x = game.player.x + (E.rng() - .5) * 180; z = SB.city.roadsZ[Math.floor(E.rng() * SB.city.roadsZ.length)] + off; yaw = dir > 0 ? M.PI / 2 : -M.PI / 2; }
    else { x = SB.city.roadsX[Math.floor(E.rng() * SB.city.roadsX.length)] + off; z = game.player.z + (E.rng() - .5) * 180; yaw = dir > 0 ? 0 : M.PI; }
    const car = new V.Vehicle(M.clamp(x, -205, 285), M.clamp(z, -205, 150), yaw, 'enforcer', { police: true });
    car.isCruiser = true; E.cruisers.push(car); game.cars.push(car);
    E.pedsAlerted = true;
    return car;
  };
  E.onCruiserHit = (car) => { car.health = Math.max(0, car.health - 3); SB.fx.spark(car.x, 1, car.z); };
  E.roadblock = (game) => {
    const p = game.player, f = p.vehicle ? p.vehicle.fwd : [Math.sin(p.yaw), Math.cos(p.yaw)];
    const x = M.clamp(p.x + f[0] * 95, -195, 280), z = M.clamp(p.z + f[1] * 95, -195, 145);
    E.roadblocks.push({ x, z, a: Math.atan2(f[0], f[1]), life: 24 });
    E.spawnCruiser(game, true); E.spawnCruiser(game, true);
    game.notify('ROADBLOCK AHEAD', 'warn'); SB.peds.alert(x, z, 70, 6);
  };
  E.update = (dt, game) => {
    E.time += dt;
    E.level = thresholds.filter((t) => E.heat >= t).length;
    const want = E.level > 0 ? Math.min(1 + E.level, 6) : 0;
    for (let i = E.cruisers.length - 1; i >= 0; i--) {
      const car = E.cruisers[i];
      if (car.health <= 0) { const j = game.cars.indexOf(car); if (j >= 0) game.cars.splice(j, 1); E.cruisers.splice(i, 1); continue; }
      if (E.level === 0 && (M.d2(car, game.player) > 130 || E.time - E.lastCrime > 14)) {
        const j = game.cars.indexOf(car); if (j >= 0) game.cars.splice(j, 1); E.cruisers.splice(i, 1); continue;
      }
      if (M.d2(car, game.player) > 450) { car.x = game.player.x - 70; car.z = game.player.z - 30; }
    }
    while (E.cruisers.length < want) E.spawnCruiser(game);
    const p = game.player, pv = p.vehicle;
    const lead = pv ? M.clamp(M.d2(p, pv) / 26, 0, 1.5) : 0;
    const v = pv || p, vf = pv ? pv.fwd : [Math.sin(p.yaw), Math.cos(p.yaw)];
    const tx = p.x + vf[0] * lead * 12 + v.vx * .25, tz = p.z + vf[1] * lead * 12 + v.vz * .25;
    let nearest = 1e9;
    for (const car of E.cruisers) {
      const d = M.d2(car, p); nearest = Math.min(nearest, d);
      const wantYaw = Math.atan2(tx - car.x, tz - car.z);
      const steer = M.clamp(M.wrapAngle(wantYaw - car.yaw) * 2.4, -1, 1);
      const throttle = d > 17 ? .95 : d > 9 ? .45 : -.25;
      car.update(dt, { steer, throttle, brake: d < 8 ? .3 : 0, boost: E.level >= 4 }, game);
      if (d < 3.6 && Math.abs(car.speed) > 12) {
        if (pv) pv.health = Math.max(0, pv.health - 9 * dt);
        else SB.player.damage(p, 6 * dt, game);
        if (E.rng() > .8) SB.fx.spark((car.x + p.x) / 2, 1, (car.z + p.z) / 2);
      }
    }
    if (nearest > 88) E.safeTime += dt; else E.safeTime = Math.max(0, E.safeTime - dt * 2.4);
    if (E.safeTime > 7) E.heat = Math.max(0, E.heat - 26 * dt);
    else if (E.time - E.lastCrime > 45) E.heat = Math.max(0, E.heat - 4 * dt);
    E.level = thresholds.filter((t) => E.heat >= t).length;
    for (let i = E.roadblocks.length - 1; i >= 0; i--) { E.roadblocks[i].life -= dt; if (E.roadblocks[i].life <= 0) E.roadblocks.splice(i, 1); }
    if (E.level >= 3 && E.roadblocks.length === 0 && E.time - E.lastCrime > 7) E.roadblock(game);
    SB.audio.setSiren(E.level > 0 && E.cruisers.length > 0, E.level);
  };
  E.submit = (m, pal, time) => {
    for (const c of E.cruisers) c.submit(m, pal);
    for (const r of E.roadblocks) {
      for (let i = -2; i <= 2; i++) {
        const x = r.x + Math.cos(r.a) * i * 2.6, z = r.z - Math.sin(r.a) * i * 2.6;
        m.cone(x, .65, z, .55, 1.3, C('#ff8b3d'), .2, 6);
      }
      const on = Math.floor(time * 6) % 2 === 0;
      m.box(r.x, 1.3, r.z, 13, .28, .4, on ? C('#ff3a4a') : C('#3ba9ff'), 1, -r.a);
    }
  };
})(window.SB = window.SB || {});
