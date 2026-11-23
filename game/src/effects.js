// Pooled particle effects: smoke, sparks, debris, muzzle flashes and skid marks.
(function (SB) {
  const M = SB.M, F = SB.fx = { parts: [], marks: [] };
  const rand = M.rng(0x1e77);
  const add = (p) => { if (F.parts.length < 420) F.parts.push(p); };
  F.burst = (x, y, z, col, n, speed) => {
    speed = speed || 6;
    for (let i = 0; i < n; i++) {
      const a = rand() * M.PI * 2, s = speed * (.25 + rand());
      add({ x, y, z, vx: Math.cos(a) * s, vy: 2 + rand() * 7, vz: Math.sin(a) * s,
        life: .45 + rand() * .55, max: 1, size: .2 + rand() * .32, col, glow: .35, g: 16, drag: 1.5 });
    }
  };
  F.smoke = (x, y, z, col) => add({ x, y, z, vx: (rand() - .5) * 1.4, vy: 1.3 + rand(), vz: (rand() - .5) * 1.4,
    life: .8 + rand() * .7, max: 1.5, size: .6 + rand() * .7, col: col || M.col('#b9c7d0', .55), glow: 0, g: -1.2, drag: .9 });
  F.spark = (x, y, z) => {
    const col = rand() > .5 ? M.col('#ffd98a') : M.col('#9fe8ff');
    add({ x, y, z, vx: (rand() - .5) * 12, vy: 3 + rand() * 8, vz: (rand() - .5) * 12,
      life: .25 + rand() * .25, max: .5, size: .11 + rand() * .12, col, glow: 1, g: 24, drag: .4 });
  };
  F.flash = (x, y, z) => add({ x, y, z, vx: 0, vy: 0, vz: 0, life: .07, max: .07, size: .85, col: M.col('#fff2b0'), glow: 1, g: 0, drag: 0 });
  F.mark = (x, z, a, w) => { if (F.marks.length < 260) F.marks.push({ x, z, a, w: w || .34, life: 4 }); };
  F.clear = () => { F.parts.length = 0; F.marks.length = 0; };
  F.update = (dt) => {
    for (let i = F.parts.length - 1; i >= 0; i--) {
      const p = F.parts[i]; p.life -= dt;
      if (p.life <= 0) { F.parts.splice(i, 1); continue; }
      p.vy -= p.g * dt; const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vz *= d; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < .1) { p.y = .1; p.vy = Math.abs(p.vy) * .25; }
    }
    for (let i = F.marks.length - 1; i >= 0; i--) { F.marks[i].life -= dt; if (F.marks[i].life <= 0) F.marks.splice(i, 1); }
  };
  F.submit = (m) => {
    const R = SB.renderer, right = R.right || [1, 0, 0], up = R.up || [0, 1, 0];
    for (const k of F.marks) {
      const a = M.clamp(k.life / 4, 0, 1), c = M.col('#141922', .36 * a);
      const dx = Math.cos(k.a) * k.w, dz = Math.sin(k.a) * k.w;
      m.quad([k.x - dx, .09, k.z - dz], [k.x + dx, .09, k.z + dz],
        [k.x + dx, .09, k.z + dz + 1.1], [k.x - dx, .09, k.z - dz + 1.1], c, 0, [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]]);
    }
    for (const p of F.parts) {
      const a = M.clamp(p.life / p.max, 0, 1), col = [p.col[0], p.col[1], p.col[2], p.col[3] * a];
      m.billboard([p.x, p.y, p.z], p.size * (1 + (1 - a) * .8), right, up, col, p.glow);
    }
  };
})(window.SB = window.SB || {});
