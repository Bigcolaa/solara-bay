// Sidewalk pedestrians: wandering, panic flight from danger, knockdowns and reactions to crime.
(function (SB) {
  const M = SB.M, C = (h, a) => M.col(h, a), A = SB.peds = { list: [], rng: M.rng(0x9e21) };
  const shirts = ['#e76f8f', '#5fc9c0', '#f2c66d', '#8d9ff0', '#e58d5b', '#c4e082'];
  const pick = (a) => a[Math.floor(A.rng() * a.length)];
  A.spawn = (game) => {
    const axis = A.rng() > .5, side = A.rng() > .5 ? 1 : -1, off = side * (10.5 + A.rng() * 4);
    const x = axis ? pick(SB.city.roadsX) + off : -195 + A.rng() * 275;
    const z = axis ? -195 + A.rng() * 310 : pick(SB.city.roadsZ) + off;
    const p = { x, z, yaw: A.rng() * M.PI * 2, speed: .9 + A.rng() * 1.1, hp: 40, alive: true, panic: 0,
      downTimer: 0, bob: A.rng() * 6, shirt: C(pick(shirts)), target: A.rng() * 6, seed: A.rng() };
    A.list.push(p); game.peds.push(p); return p;
  };
  A.init = (game, n) => { for (let i = 0; i < (n || 62); i++) A.spawn(game); };
  A.alert = (x, z, radius, panic) => {
    for (const p of A.list) if (p.alive && M.d2(p, { x, z }) < radius) p.panic = Math.max(p.panic, panic || 4);
  };
  A.update = (dt, game) => {
    const pl = game.player, pc = pl.vehicle;
    for (const p of A.list) {
      if (!p.alive) {
        p.downTimer -= dt;
        if (p.downTimer <= 0) { p.alive = true; p.hp = 40; p.x = -190 + A.rng() * 270; p.z = -190 + A.rng() * 300; }
        continue;
      }
      let threat = null, td = 1e9;
      if (pc && Math.abs(pc.speed) > 5 && (td = M.d2(p, pc)) < 25) threat = pc;
      if (pl.aiming && M.d2(p, pl) < 27) threat = pl;
      if (threat) p.panic = Math.max(p.panic, 5);
      p.panic = Math.max(0, p.panic - dt);
      let dx, dz;
      if (threat) { dx = p.x - threat.x; dz = p.z - threat.z; }
      else {
        p.target -= dt;
        if (p.target <= 0) { p.target = 2.5 + A.rng() * 5; p.yaw += (A.rng() - .5) * 2.4; }
        dx = Math.sin(p.yaw); dz = Math.cos(p.yaw);
      }
      const len = Math.hypot(dx, dz) || 1, sp = p.speed * (p.panic > 0 ? 3.2 : 1);
      const nx = p.x + dx / len * sp * dt, nz = p.z + dz / len * sp * dt;
      if (threat) p.yaw = Math.atan2(dx, dz);
      let blocked = false;
      if (!M.collides(nx, p.z, .4)) p.x = nx; else blocked = true;
      if (!M.collides(p.x, nz, .4)) p.z = nz; else blocked = true;
      if (blocked && p.panic > 0) p.panic -= dt * 1.5;
      p.x = M.clamp(p.x, -210, 285); p.z = M.clamp(p.z, -210, 150);
      p.bob += dt * sp * 2.1;
      for (const car of game.cars) {
        if (Math.abs(car.speed) < 9 || M.d2(p, car) > 2.5) continue;
        p.hp -= 120; car.speed *= .94; p.panic = 6;
        if (p.hp <= 0) { p.alive = false; p.downTimer = 20; SB.fx.burst(p.x, 1, p.z, C('#ffd0a0'), 4, 3); SB.police.crime(game, 'hit', p.x, p.z); }
        break;
      }
    }
  };
  A.submit = (m) => {
    for (const p of A.list) {
      if (!p.alive) { m.box(p.x, .2, p.z, .5, .35, 1.2, p.shirt, 0, -p.yaw); continue; }
      const sw = Math.sin(p.bob) * (p.panic > 0 ? .7 : .34), y = 0;
      const f = [Math.sin(p.yaw), Math.cos(p.yaw)], r = [f[1], -f[0]];
      const at = (fd, sd) => [p.x + f[0] * fd + r[0] * sd, p.z + f[1] * fd + r[1] * sd];
      m.box(p.x, y + 1.2, p.z, .5, .95, .35, p.shirt, 0, -p.yaw);
      m.sphere(p.x, y + 1.88, p.z, .22, C('#d7a67d'), 0, 6, 4);
      for (const s of [-1, 1]) {
        const a = at(0, s * .32), l = at(0, s * .16);
        m.box(a[0], y + 1.25 + sw * s * .2, a[1], .15, .75, .15, p.shirt, 0, -p.yaw);
        m.box(l[0] + f[0] * sw * s, y + .4, l[1] + f[1] * sw * s, .18, .8, .2, C('#37465e'), 0, -p.yaw);
      }
    }
  };
})(window.SB = window.SB || {});
