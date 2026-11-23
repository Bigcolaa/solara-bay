// Lane-following civilian traffic with car following, intersection turns and player avoidance.
(function (SB) {
  const M = SB.M, V = SB.vehicles, T = SB.traffic = { cars: [], rng: M.rng(0x7ac1) };
  const lane = (dir) => dir > 0 ? -3.3 : 3.3;
  const pick = (arr) => arr[Math.floor(T.rng() * arr.length)];
  T.spawn = (game, near) => {
    const axis = T.rng() > .5 ? 'x' : 'z', dir = T.rng() > .5 ? 1 : -1, offset = lane(dir);
    let x, z, yaw;
    if (axis === 'x') {
      x = near ? M.clamp(near.x + (T.rng() - .5) * 260, -190, 75) : -190 + T.rng() * 265;
      z = pick(SB.city.roadsZ) + offset; yaw = dir > 0 ? M.PI / 2 : -M.PI / 2;
    } else {
      x = pick(SB.city.roadsX) + offset;
      z = near ? M.clamp(near.z + (T.rng() - .5) * 250, -190, 110) : -190 + T.rng() * 300;
      yaw = dir > 0 ? 0 : M.PI;
    }
    const car = new V.Vehicle(x, z, yaw, V.randomId(T.rng), { traffic: true, color: ['#e8e4d8', '#7fa9bb', '#d88d73', '#b8c4c6', '#d4b56e'][Math.floor(T.rng() * 5)] });
    car.axis = axis; car.dir = dir; car.target = 11 + T.rng() * 9; car.turnIn = 3 + T.rng() * 12;
    T.cars.push(car); game.cars.push(car);
    return car;
  };
  T.init = (game, n) => { for (let i = 0; i < (n || 26); i++) T.spawn(game); };
  T.update = (dt, game) => {
    for (let i = T.cars.length - 1; i >= 0; i--) {
      const car = T.cars[i];
      if (car.health <= 0 || M.d2(car, game.player) > 440) {
        const idx = game.cars.indexOf(car); if (idx >= 0) game.cars.splice(idx, 1);
        T.cars.splice(i, 1); T.spawn(game, game.player); continue;
      }
      let want = car.axis === 'x' ? (car.dir > 0 ? M.PI / 2 : -M.PI / 2) : (car.dir > 0 ? 0 : M.PI);
      car.turnIn -= dt;
      const cross = car.axis === 'x' ? SB.city.roadsX : SB.city.roadsZ;
      let atCross = false;
      for (const c of cross) if (Math.abs((car.axis === 'x' ? car.x : car.z) - c) < 9) { atCross = true; break; }
      if (atCross && car.turnIn < 0) {
        car.axis = car.axis === 'x' ? 'z' : 'x'; car.dir = T.rng() > .5 ? 1 : -1;
        const road = car.axis === 'x' ? SB.city.roadsZ : SB.city.roadsX;
        if (car.axis === 'x') car.z = pick(road) + lane(car.dir); else car.x = pick(road) + lane(car.dir);
        car.turnIn = 9 + T.rng() * 15;
        want = car.axis === 'x' ? (car.dir > 0 ? M.PI / 2 : -M.PI / 2) : (car.dir > 0 ? 0 : M.PI);
      }
      const f = car.fwd;
      let throttle = .66, brake = 0;
      for (const other of game.cars) {
        if (other === car) continue;
        const dx = other.x - car.x, dz = other.z - car.z, d = Math.hypot(dx, dz);
        if (d > 24 || d < .1) continue;
        if ((dx * f[0] + dz * f[1]) / d > .74) { throttle = -.2; brake = d < 12 ? .8 : .25; break; }
      }
      const px = game.player.x - car.x, pz = game.player.z - car.z, pd = Math.hypot(px, pz);
      if (pd < 9 && !game.player.vehicle) { throttle = .1; brake = .7; }
      const steer = M.clamp(M.wrapAngle(want - car.yaw) * 2.2, -1, 1);
      if (Math.abs(steer) > .6) throttle = Math.min(throttle, .3);
      if (Math.abs(car.speed) > car.target) throttle = Math.min(throttle, -.15);
      car.update(dt, { steer, throttle, brake }, game);
    }
  };
  T.submit = (m, pal) => { for (const c of T.cars) c.submit(m, pal); };
})(window.SB = window.SB || {});
