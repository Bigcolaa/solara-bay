// Deterministic city construction: street grid, architecture, coast, bridge, landmarks and props.
(function (SB) {
  const M = SB.M, C = (h, a) => M.col(h, a);
  const P = {
    asphalt: C('#2c3542'), line: C('#f4d68a'), walk: C('#b9b6a8'), land: C('#87a06d'),
    sand: C('#f2d9a5'), prom: C('#e7c697'), water: C('#0d6e91'), deep: C('#07516f'),
    foam: C('#bff5ef', .55), concrete: C('#9ca7ab'), dark: C('#27303b'), wood: C('#a8784a'),
    glass: C('#29465e'), neonA: C('#ff4fa8'), neonB: C('#49e6ff'), neonC: C('#ffc85c'),
  };
  const roadsX = [], roadsZ = [];
  for (let x = -200; x <= 80; x += 40) roadsX.push(x);
  for (let z = -200; z <= 120; z += 40) roadsZ.push(z);
  const city = {
    roadsX, roadsZ, coast: 100, destructibles: [], props: [], ramps: [], colliders: [],
    landmarks: {
      plaza: { x: -60, z: -20, r: 17 }, garage: { x: 60, z: 60, r: 13 },
      club: { x: -20, z: -140, r: 13 }, pier: { x: 90, z: 40, r: 10 },
      island: { x: 250, z: -120, r: 26 }, ramp: { x: -140, z: 100, r: 11 },
      race: { x: -160, z: 120, r: 12 },
    },
  };
  SB.city = city;
  SB.world = city; // collision queries read the same collider list the generator fills
  const boxCollider = (x, z, w, d) => city.colliders.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]);
  const nearLandmark = (x, z, pad) => Object.keys(city.landmarks).some((k) => M.d2({ x, z }, city.landmarks[k]) < (pad || city.landmarks[k].r) + 10);

  function palm(m, x, z, rng) {
    const h = 7 + rng() * 4, lean = (rng() - .5) * 1.2;
    m.cyl(x, h / 2, z, .34, h, C('#8c6241'), 0, 6);
    const top = [x + lean, h, z];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * M.PI * 2 + rng() * .3, dx = Math.cos(a) * (3.2 + rng() * 1.6), dz = Math.sin(a) * (3.2 + rng() * 1.6);
      m.tri(top, [top[0] + dx * .55, h + .7, top[2] + dz * .55], [top[0] + dx, h - 1.7, top[2] + dz], C(i % 2 ? '#2f9b62' : '#43b86d'), 0);
      m.tri(top, [top[0] + dx, h - 1.7, top[2] + dz], [top[0] + dx * .55, h - 1.9, top[2] + dz * .55], C('#257a4e'), 0);
    }
    m.sphere(top[0], h, top[2], .55, C('#7a5a33'), 0, 6, 4);
  }
  function streetLamp(m, x, z) {
    m.cyl(x, 3.4, z, .13, 6.8, C('#4d5963'), 0, 6);
    m.box(x, 6.85, z, .9, .18, .9, C('#ffdca0'), .85);
  }
  function building(m, x, z, w, d, h, dist, rng) {
    const tall = dist.tag === 'downtown' || (dist.tag === 'bridge & island' && rng() > .6);
    const base = tall ? [C('#3a6b91'), C('#4d789c'), C('#2f597e'), C('#62869f')][Math.floor(rng() * 4)]
      : dist.tag === 'markets' ? [C('#c07b72'), C('#d19a76'), C('#b56f88')][Math.floor(rng() * 3)]
        : [C('#d7b994'), C('#c9a4b4'), C('#a8c2bd'), C('#e0c48d')][Math.floor(rng() * 4)];
    m.box(x, h / 2, z, w, h, d, base, 0);
    m.box(x, .6, z, w + 1.2, 1.2, d + 1.2, C('#6c716e'), 0);
    m.box(x, h + .25, z, w + 1, .5, d + 1, C('#8b918f'), 0);
    const glowCol = [P.neonA, P.neonB, P.neonC][Math.floor(rng() * 3)];
    const bands = tall ? 3 : 1;
    for (let b = 0; b < bands; b++) {
      const y = h * (.35 + b * .22);
      m.box(x, y, z + d / 2 + .05, w * .94, .35, .12, rng() > .35 ? glowCol : C('#ffe0a0'), .55);
      m.box(x, y, z - d / 2 - .05, w * .94, .35, .12, C('#7fb7c9'), .3);
    }
    const rows = Math.min(10, Math.floor(h / 4.8)), cols = Math.max(2, Math.floor(w / 6));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (rng() < .5) continue;
      const wx = x + (c - (cols - 1) / 2) * (w / cols) * .86, wy = 2.8 + r * 4.4;
      const wc = rng() > .72 ? C('#9fe4ff') : C('#ffd79a');
      m.box(wx, wy, z + d / 2 + .09, 1.9, 1.55, .1, wc, .7);
      if (rng() > .55) m.box(wx, wy, z - d / 2 - .09, 1.9, 1.55, .1, wc, .55);
    }
    if (rng() > .58 && !tall) m.box(x, 3.1, z + d / 2 + .4, w * .8, 2.4, .2, glowCol, .35);
    if (h > 45) { m.cyl(x, h + 2.6, z, .12, 5, C('#87939b'), 0, 5); m.sphere(x, h + 5.2, z, .42, C('#ff5f5f'), .95, 6, 4); }
    boxCollider(x, z, w, d);
  }
  function roadGrid(m) {
    for (const x of roadsX) {
      m.flat(x - 6.5, -230, x + 6.5, 170, .04, P.asphalt);
      for (let z = -226; z < 166; z += 13) m.flat(x - .14, z, x + .14, z + 6, .06, P.line);
      m.flat(x - 8.2, -230, x - 6.6, 170, .11, P.walk); m.flat(x + 6.6, -230, x + 8.2, 170, .11, P.walk);
    }
    for (const z of roadsZ) {
      m.flat(-230, z - 6.5, 105, z + 6.5, .05, P.asphalt);
      for (let x = -226; x < 100; x += 13) m.flat(x, z - .14, x + 6, z + .14, .07, C('#e8ecec'));
      m.flat(-230, z - 8.2, 105, z - 6.6, .12, P.walk); m.flat(-230, z + 6.6, 105, z + 8.2, .12, P.walk);
    }
    for (const x of roadsX) for (const z of roadsZ) streetLamp(m, x + 7.4, z + 7.4);
  }
  function blocks(m, rng) {
    for (let ix = 0; ix < roadsX.length - 1; ix++) for (let iz = 0; iz < roadsZ.length - 1; iz++) {
      const x0 = roadsX[ix] + 9, x1 = roadsX[ix + 1] - 9, z0 = roadsZ[iz] + 9, z1 = roadsZ[iz + 1] - 9;
      if (x1 - x0 < 10 || z1 - z0 < 10) continue;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, dist = SB.districts.at(cx, cz);
      for (let sx = 0; sx < 2; sx++) for (let sz = 0; sz < 2; sz++) {
        const w = (x1 - x0) / 2 - 2.2, d = (z1 - z0) / 2 - 2.2;
        const bx = x0 + w / 2 + sx * (w + 4.4), bz = z0 + d / 2 + sz * (d + 4.4);
        const density = dist.tag === 'downtown' ? .96 : dist.tag === 'markets' ? .82 : .68;
        if (rng() > density || nearLandmark(bx, bz, 8)) continue;
        const core = Math.hypot((bx + 20) / 190, (cz + 60) / 170);
        const h = dist.tag === 'downtown' ? 24 + rng() * 62 + (core < 1 ? 30 : 0)
          : dist.tag === 'markets' ? 12 + rng() * 26 : 9 + rng() * 20;
        building(m, bx, bz, w - rng() * 2, d - rng() * 2, h, dist, rng);
      }
    }
  }
  function coastAndBridge(m, rng) {
    m.flat(-230, -230, 100, 170, -.02, P.land);
    m.flat(82, -230, 100, 170, .02, P.sand);
    m.flat(75, -230, 82, 170, .1, P.prom);
    m.flat(98, -230, 104, 170, .13, P.foam);
    for (let z = -218; z < 160; z += 21) { palm(m, 78.5, z, rng); if (rng() > .55) palm(m, 70, z + 6, rng); }
    for (let x = -190; x < 70; x += 27) {
      palm(m, x, 145, rng); palm(m, x, 112, rng);
      if (rng() > .3) { m.cone(x + 4, .6, 148, 1.7, 3.4, C('#ff8f6b'), 0, 7); m.flat(x, 145, x + 8, 152, .12, C('#fff0c9')); }
    }
    // Fishing pier and boardwalk.
    for (let x = 96; x < 186; x += 4) m.box(x, 1.15, 40, 3.8, .34, 9, P.wood, 0);
    for (let x = 100; x < 186; x += 12) {
      m.cyl(x, -.8, 36, .42, 4, C('#6d4c33'), 0, 6); m.cyl(x, -.8, 44, .42, 4, C('#6d4c33'), 0, 6);
      m.cyl(x, 2.4, 45, .12, 3.8, C('#3c4650'), 0, 5); m.sphere(x, 4.4, 45, .34, C('#ffd79a'), .9, 6, 4);
    }
    m.box(180, 1.2, 40, 12, .5, 13, P.wood, 0);
    // Causeway bridge to the east island.
    m.box(170, 2.6, -120, 150, 1.1, 15, P.concrete, 0);
    m.box(170, 3.2, -120, 150, .1, 13, P.asphalt, 0);
    for (let x = 102; x < 242; x += 12) {
      m.box(x, 4.2, -127.4, 1, 2.2, .5, C('#c5d2d4'), 0); m.box(x, 4.2, -112.6, 1, 2.2, .5, C('#c5d2d4'), 0);
      if (x % 36 === 6) { m.cyl(x, -3, -127, 1.4, 12, C('#7b898c'), 0, 8); m.cyl(x, -3, -113, 1.4, 12, C('#7b898c'), 0, 8); }
    }
    m.flat(242, -128, 300, -72, .4, P.sand);
    for (let i = 0; i < 11; i++) {
      const x = 246 + rng() * 44, z = -118 + (rng() - .5) * 34, w = 8 + rng() * 7, d = 8 + rng() * 7, h = 7 + rng() * 12;
      building(m, x, z, w, d, h, SB.districts[3], rng);
    }
    palm(m, 244, -84, rng); palm(m, 262, -80, rng);
    // Ramp approach and landing markers.
    const r = city.landmarks.ramp;
    m.tri([r.x - 9, .15, r.z - 7], [r.x - 9, .15, r.z + 7], [r.x + 9, 3.8, r.z + 7], C('#66808b'), 0);
    m.tri([r.x - 9, .15, r.z - 7], [r.x + 9, 3.8, r.z + 7], [r.x + 9, 3.8, r.z - 7], C('#77929d'), 0);
    for (let i = 0; i < 4; i++) m.flat(r.x + 12 + i * 7, r.z - 4, r.x + 15 + i * 7, r.z + 4, .12, C('#ffd166', .6));
    city.ramps.push({ x: r.x, z: r.z, r: 12, axis: 'x' });
  }
  function landmarks(m, rng) {
    const pl = city.landmarks.plaza;
    m.cyl(pl.x, .4, pl.z, pl.r - 2, .7, C('#d9cfba'), 0, 20);
    m.cyl(pl.x, 1.1, pl.z, 6.5, .7, C('#bdd9e0'), 0, 18);
    m.cyl(pl.x, 2.2, pl.z, 1, 2.8, C('#e7f1ed'), 0, 8);
    m.sphere(pl.x, 4.4, pl.z, 1.3, C('#9fe8ff'), .7, 8, 5);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * M.PI * 2, x = pl.x + Math.cos(a) * 14, z = pl.z + Math.sin(a) * 14;
      m.box(x, 1.6, z, 3.2, 2.6, 2.6, [C('#e08d6b'), C('#71c2bd'), C('#e7bc71')][i % 3], .12, -a);
      m.box(x, 3.1, z, 3.5, .25, 3, C('#fff1c8'), .35, -a);
    }
    const g = city.landmarks.garage;
    m.box(g.x, 4.5, g.z, 22, 9, 17, C('#34414e'), 0);
    m.box(g.x, 4, g.z + 8.7, 14, 7, .4, C('#151d28'), .1);
    m.box(g.x, 8.7, g.z + 9, 16, .7, .5, P.neonB, .95);
    m.box(g.x - 6, 1.4, g.z + 9.3, .5, 2.6, .4, P.neonA, .9);
    m.box(g.x + 6, 1.4, g.z + 9.3, .5, 2.6, .4, P.neonA, .9);
    boxCollider(g.x, g.z, 22, 17);
    const cl = city.landmarks.club;
    m.box(cl.x, 6, cl.z - 4, 26, 12, 14, C('#2b2246'), 0);
    m.box(cl.x, 7, cl.z + 3.2, 18, 8, .5, C('#1a1230'), 0);
    for (let i = -3; i <= 3; i++) m.box(cl.x + i * 2.6, 7, cl.z + 3.5, .5, 7.5, .3, i % 2 ? P.neonA : P.neonB, 1);
    m.box(cl.x, 12.7, cl.z + 3.4, 27, 1, 1, P.neonC, 1);
    boxCollider(cl.x, cl.z - 4, 26, 14);
    for (const bx of [-20, 20, 60]) {
      m.box(bx, 8, -154, 1.2, 16, 1.2, C('#39424b'), 0);
      m.box(bx, 15.8, -154, 12, 1.2, 1.3, P.neonB, .8);
    }
    // Industrial harbour stacks.
    for (let x = -220; x < -90; x += 16) for (let z = 20; z < 110; z += 15) {
      if (rng() > .62) continue;
      const h = 2 + Math.floor(rng() * 3) * 2.4;
      m.box(x, h / 2, z, 12, h, 5.4, [C('#cf795c'), C('#5b9bb0'), C('#d8ac5a')][Math.floor(rng() * 3)], 0);
      boxCollider(x, z, 12, 5.4);
    }
  }
  function makeProps(rng) {
    const kinds = ['bench', 'crate', 'bin', 'cone', 'hydrant'];
    for (let i = 0; i < 150; i++) {
      const x = -205 + rng() * 285, z = -205 + rng() * 340;
      if (nearLandmark(x, z, 6)) continue;
      if (city.colliders.some((b) => M.inside(x, z, b, 2))) continue;
      if (Math.abs((x + 200) % 40) < 11 || Math.abs((z + 200) % 40) < 11) continue;
      const kind = kinds[Math.floor(rng() * kinds.length)];
      city.props.push({ x, z, kind, hp: kind === 'crate' ? 30 : 65, rot: rng() * M.PI * 2, alive: true });
      if (kind === 'crate' || kind === 'bench') {
        const item = city.props[city.props.length - 1];
        item.collider = [x - 1.15, x + 1.15, z - 1.15, z + 1.15];
        city.colliders.push(item.collider); city.destructibles.push(item);
      }
    }
  }
  city.build = () => {
    city.colliders.length = 0; city.props.length = 0; city.destructibles.length = 0; city.ramps.length = 0;
    const rng = M.rng(0x50c0), m = new SB.Mesh(), water = new SB.Mesh();
    roadGrid(m); blocks(m, rng); coastAndBridge(m, rng); landmarks(m, rng); makeProps(rng);
    for (let x = 104; x < 420; x += 16) for (let z = -280; z < 220; z += 16)
      water.flat(x, z, Math.min(x + 16, 420), Math.min(z + 16, 220), .18, (x + z) % 32 < 16 ? P.water : P.deep);
    for (let z = -228; z < 166; z += 8) water.flat(100, z, 108, z + 8, .22, P.foam);
    return { mesh: m, water };
  };
  city.submitProps = (m) => {
    for (const p of city.props) {
      if (!p.alive) continue;
      const a = p.rot;
      if (p.kind === 'bench') { m.box(p.x, .7, p.z, 3.2, .3, 1.1, C('#a9764c'), 0, a); m.box(p.x, 1.1, p.z - .45, 3.2, .8, .2, C('#8d603e'), 0, a); }
      else if (p.kind === 'crate') { m.box(p.x, .9, p.z, 1.8, 1.8, 1.8, C('#b98454'), 0, a); m.box(p.x, .9, p.z, 1.9, .2, .2, C('#7c5738'), 0, a); }
      else if (p.kind === 'bin') m.cyl(p.x, .8, p.z, .65, 1.6, C('#4e7f78'), 0, 7);
      else if (p.kind === 'cone') { m.cone(p.x, .6, p.z, .5, 1.2, C('#ff8a3d'), .1, 7); m.box(p.x, .08, p.z, 1, .12, 1, C('#25252a'), 0); }
      else { m.box(p.x, .55, p.z, .5, 1.1, .5, C('#d6514c'), 0); m.cyl(p.x, .95, p.z, .18, .35, C('#d6514c'), 0, 6); }
    }
  };
  city.breakProp = (p) => {
    if (!p.alive) return;
    p.alive = false;
    if (p.collider) { const i = city.colliders.indexOf(p.collider); if (i >= 0) city.colliders.splice(i, 1); }
    SB.fx && SB.fx.burst(p.x, 1, p.z, p.kind === 'crate' ? C('#c78f58') : C('#9a9a9a'), 12);
  };
})(window.SB = window.SB || {});
