// Third-person on-foot movement, jumping, collision and the animated character model.
(function (SB) {
  const M = SB.M, C = (h, a) => M.col(h, a), P = SB.player = {};
  P.create = (x, z) => ({ x, z, y: 0, yaw: 0, vx: 0, vz: 0, vy: 0, bob: 0, health: 100, armor: 50,
    maxHealth: 100, aiming: false, hit: 0, vehicle: null, air: 0, sprint: 0 });
  P.reset = (p, x, z) => {
    p.x = x; p.z = z; p.y = 0; p.vx = p.vz = p.vy = 0; p.health = 100; p.armor = 50; p.maxHealth = 100;
    p.vehicle = null; p.hit = 0; p.air = 0;
  };
  P.update = (p, dt, ctrl, camYaw) => {
    p.hit = Math.max(0, p.hit - dt * 2.2);
    p.aiming = !!ctrl.aim;
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw), rx = fz, rz = -fx;
    let dx = fx * ctrl.forward + rx * ctrl.strafe, dz = fz * ctrl.forward + rz * ctrl.strafe;
    const len = Math.hypot(dx, dz); if (len > 1) { dx /= len; dz /= len; }
    p.sprint = ctrl.sprint && !p.aiming && len > .1 ? Math.min(1, p.sprint + dt * 4) : Math.max(0, p.sprint - dt * 4);
    const speed = p.aiming ? 3 : 5.1 + p.sprint * 2.6;
    p.vx = M.lerp(p.vx, dx * speed, Math.min(1, dt * 12));
    p.vz = M.lerp(p.vz, dz * speed, Math.min(1, dt * 12));
    if (len > .08) {
      const want = Math.atan2(dx, dz);
      p.yaw = p.aiming ? camYaw : M.turn(p.yaw, want, dt * 12);
      p.bob += dt * (speed * 1.7 + .7);
    }
    const nx = p.x + p.vx * dt, nz = p.z + p.vz * dt;
    if (!M.collides(nx, p.z, .55)) p.x = nx; else p.vx *= .3;
    if (!M.collides(p.x, nz, .55)) p.z = nz; else p.vz *= .3;
    p.x = M.clamp(p.x, -214, 288); p.z = M.clamp(p.z, -214, 154);
    if (ctrl.jump && p.y < .05) { p.vy = 7.6; p.air = 0; }
    if (p.y > .01 || p.vy > 0) {
      p.air += dt; p.vy -= 22 * dt; p.y += p.vy * dt;
      if (p.y <= 0) { if (p.air > .75 && SB.game) SB.game.stunt(p.air, 0, null); p.y = 0; p.vy = 0; p.air = 0; }
    }
  };
  P.damage = (p, amount, game) => {
    if (p.hit > .85) return;
    p.hit = 1;
    const absorbed = Math.min(p.armor, amount * .7);
    p.armor -= absorbed; p.health -= amount - absorbed;
    SB.audio.noise(.18, .14, 500);
    if (p.health <= 0 && game) game.die();
  };
  P.submit = (m, p, pal, time) => {
    const sway = Math.sin(p.bob) * (p.aiming ? .05 : .18), stride = Math.sin(p.bob) * .42;
    const y = p.y, c = C('#ef8d5a'), pants = C('#283a54'), skin = C('#d9a579');
    const q = C('#0b1424', .42); m.flat(p.x - 1, p.z - 1, p.x + 1, p.z + 1, .1 + y * 0, q);
    m.box(p.x, y + 1.25 + sway, p.z, .82, 1.15, .48, c, 0, -p.yaw);
    m.box(p.x, y + 2.05 + sway, p.z, .44, .46, .44, skin, 0, -p.yaw);
    m.box(p.x, y + 2.28 + sway, p.z, .52, .18, .5, C('#2d2a36'), 0, -p.yaw);
    const f = [Math.sin(p.yaw), Math.cos(p.yaw)], r = [f[1], -f[0]];
    const at = (fwd, side) => [p.x + f[0] * fwd + r[0] * side, p.z + f[1] * fwd + r[1] * side];
    for (const s of [-1, 1]) {
      const arm = at(p.aiming ? .42 : 0, s * .55), leg = at(0, s * .23);
      m.box(arm[0], y + 1.35 + sway - (p.aiming ? 0 : s * stride * .3), arm[1], .24, .95, .24, c, 0, -p.yaw);
      m.box(leg[0] + f[0] * stride * s, y + .43 + Math.max(0, stride * s) * .2, leg[1] + f[1] * stride * s, .28, .86, .3, pants, 0, -p.yaw);
    }
    if (pal.neon > .6) m.billboard([p.x, y + 2.3, p.z], .7, [1, 0, 0], [0, 1, 0], C('#9fe8ff', .12), .4);
  };
})(window.SB = window.SB || {});
