// Solara Bay bootstrap: owns simulation state and drives every subsystem each frame.
(function (SB) {
  const M = SB.M, V = SB.vehicles;
  const G = SB.game = {
    started: false, menu: 'start', time: 0, cars: [], peds: [], fps: 60,
    notify: (text, kind) => SB.hud.toast(text, kind),
    cam: { x: 68, y: 2, z: 34, yaw: 1.05, pitch: -.17, dist: 8.3, fov: 1.08, manual: 0 },
  };
  const hero = [];
  function addCar(x, z, yaw, id, opts) {
    const car = new V.Vehicle(x, z, yaw, id, opts);
    SB.garage.apply(car); G.cars.push(car); return car;
  }
  function init() {
    SB.renderer.init(document.getElementById('gl'));
    const built = SB.city.build(); SB.renderer.uploadStatic(built.mesh, built.water);
    SB.hud.init(); SB.garage.load();
    G.player = SB.player.create(SB.districts.spawn.x, SB.districts.spawn.z);
    G.player.yaw = 1.05;
    hero.push(addCar(76.7, 22, 0, 'comet', { color: '#ff8b3d' }));
    hero.push(addCar(76.7, -18, 0, 'albatross', { color: '#e5d7b6' }));
    hero.push(addCar(36.7, -6, 0, 'cormorant', { color: '#a9b4bd' }));
    SB.traffic.init(G, 24); SB.peds.init(G, 58);
    document.getElementById('boot').classList.add('hidden');
    SB.lighting.set(17.2);
    G.notify('WELCOME TO SOLARA BAY — PRESS M FOR CONTRACTS', 'mission');
  }
  G.start = () => {
    if (G.started) return;
    G.started = true; G.menu = null;
    SB.audio.init(); SB.audio.resume(); SB.audio.station = 1;
    SB.audio.stinger(); G.notify('CLICK TO LOCK THE CAMERA · E TO TAKE A CAR', 'info');
  };
  G.die = () => {
    if (G.menu === 'dead') return;
    G.menu = 'dead'; SB.police.reset(G); SB.garage.cash = Math.max(0, SB.garage.cash - 500);
    SB.audio.tone(120, .7, 'sawtooth', .16, 50);
  };
  G.respawn = () => {
    const g = SB.city.landmarks.garage;
    SB.player.reset(G.player, g.x - 18, g.z + 12);
    SB.fx.clear(); G.menu = null;
    G.notify('BACK ON YOUR FEET', 'good');
  };
  G.stunt = (air, height, car) => SB.side.stunt(air, height, G);
  function nearestCar() {
    let best = null, bd = 5.4;
    for (const c of G.cars) {
      const d = M.d2(G.player, c);
      if (d < bd) { best = c; bd = d; }
    }
    return best;
  }
  function handleMenus() {
    for (const code of Array.from(SB.input.pressed)) {
      if (SB.menus.handle(code, G)) continue;
      if (G.menu) continue;
      if (code === 'KeyM') { G.menu = 'contracts'; SB.audio.blip(520); }
      else if (code === 'KeyG') { G.menu = 'garage'; SB.audio.blip(520); }
      else if (code === 'Tab' || code === 'Escape') { G.menu = 'pause'; SB.audio.blip(400); }
      else if (code === 'KeyT') { SB.lighting.nextPreset(); G.notify('TIME · ' + SB.lighting.palette.name, 'info'); }
      else if (code === 'KeyQ') { const s = SB.audio.nextStation(); G.notify('RADIO · ' + s.name + ' — ' + s.song, 'info'); }
      else if (code === 'KeyR' || code === 'KeyV') {
        const w = SB.combat.current;
        if (w === 'pistol') SB.combat.ammo.pistol = 42;
        else if (w === 'smg' && SB.garage.ownedWeapon('smg')) SB.combat.ammo.smg = 120;
        else if (w === 'rifle' && SB.garage.ownedWeapon('rifle')) SB.combat.ammo.rifle = 30;
        SB.audio.blip(620);
      } else if (code === 'Digit1') SB.combat.select('fists', G);
      else if (code === 'Digit2') SB.combat.select('pistol', G);
      else if (code === 'Digit3') SB.combat.select(SB.garage.ownedWeapon('smg') ? 'smg' : 'rifle', G);
    }
    if (G.menu === 'start' && SB.input.mouse.leftEdge) G.start();
  }
  function camera(active, dt) {
    const c = G.cam, p = G.player, car = p.vehicle;
    if (SB.input.mouse.dx || SB.input.mouse.dy) {
      c.yaw += SB.input.mouse.dx * .0025; c.pitch = M.clamp(c.pitch - SB.input.mouse.dy * .002, -.42, .42); c.manual = 2.3;
    }
    c.manual = Math.max(0, c.manual - dt);
    if (car && c.manual <= 0) c.yaw = M.turn(c.yaw, car.yaw, dt * 1.9);
    c.x = M.lerp(c.x, p.x + (car ? car.fwd[0] * 2.5 : 0), Math.min(1, dt * 9));
    c.z = M.lerp(c.z, p.z + (car ? car.fwd[1] * 2.5 : 0), Math.min(1, dt * 9));
    c.y = M.lerp(c.y, (car ? 1.8 + car.y : 1.9), Math.min(1, dt * 7));
    const want = car ? 9.5 + Math.min(Math.abs(car.speed) * .05, 2.6) : 8.2;
    c.dist = M.lerp(c.dist, want, Math.min(1, dt * 3.5));
    SB.renderer.setCamera(c);
  }
  function update(dt) {
    G.time += dt;
    SB.lighting.update(dt);
    handleMenus();
    if (G.started && !G.menu) {
      const I = SB.input, ax = I.axis(), p = G.player;
      if (p.vehicle) {
        const ctrl = { throttle: ax.forward > 0 ? ax.forward : 0, brake: ax.forward < 0 ? -ax.forward : 0,
          steer: ax.strafe, boost: I.down('ShiftLeft') || I.down('ShiftRight'), handbrake: I.down('Space') };
        p.vehicle.update(dt, ctrl, G);
        p.x = p.vehicle.x; p.z = p.vehicle.z; p.y = p.vehicle.y;
        p.vx = p.vehicle.speed * p.vehicle.fwd[0]; p.vz = p.vehicle.speed * p.vehicle.fwd[1];
        p.yaw = p.vehicle.yaw;
        if (I.just('KeyF')) {
          const f = p.vehicle.fwd;
          let ex = p.x - f[0] * 3.4, ez = p.z - f[1] * 3.4;
          if (M.collides(ex, ez, .6)) { ex = p.x + f[0] * 3.4; ez = p.z + f[1] * 3.4; }
          p.x = ex; p.z = ez; p.y = 0; p.vehicle = null;
          SB.audio.blip(330); G.notify('ON FOOT', 'info');
        }
      } else {
        SB.player.update(p, dt, { forward: ax.forward, strafe: ax.strafe, sprint: I.down('ShiftLeft') || I.down('ShiftRight'),
          jump: I.just('Space'), aim: I.mouse.right }, G.cam.yaw);
        const near = nearestCar();
        if (I.just('KeyE') && near) {
          p.vehicle = near; p.vx = p.vz = 0; p.y = near.y;
          SB.audio.blip(480);
          if (!near.wasStolen && !near.traffic && !near.police && !SB.garage.ownedVehicle(near.id)) {
            near.wasStolen = true; SB.police.crime(G, 'theft', near.x, near.z);
            G.notify('VEHICLE TAKEN · WITNESSES CALLED THE POLICE', 'warn');
          } else if (near.police) { SB.police.crime(G, 'theft', near.x, near.z); G.notify('YOU STOLE A CRUISER!', 'warn'); }
          else G.notify('DRIVING · ' + near.spec.name, 'good');
        }
        if (I.mouse.left) SB.combat.fire(G);
      }
      SB.traffic.update(dt, G);
      SB.peds.update(dt, G);
      SB.police.update(dt, G);
      SB.missions.update(dt, G);
      SB.side.update(dt, G);
      SB.combat.update(dt);
      SB.fx.update(dt);
      SB.garage.stats.distance += Math.abs(p.vx * dt) + Math.abs(p.vz * dt);
      const vp = p.vehicle, rpm = vp ? 12 + Math.abs(vp.speed) * 2.1 : 7 + Math.hypot(p.vx, p.vz) * 1.5;
      SB.audio.setEngine(rpm, vp && vp.boosting ? 1 : .2, !!vp);
      SB.audio.tick();
      // Contextual prompt.
      if (p.vehicle) SB.hud.prompt = cPrompt(p.vehicle);
      else {
        const near = nearestCar(), lg = SB.city.landmarks.garage;
        SB.hud.prompt = near ? 'E · ' + (near.police ? 'HIJACK CRUISER' : 'DRIVE ' + near.spec.name)
          : M.d2(p, lg) < 18 ? 'G · OPEN GARAGE' : 'M · CONTRACT BOARD';
      }
    } else {
      SB.fx.update(dt * .3); SB.audio.setEngine(8, 0, false); SB.audio.tick();
      SB.hud.prompt = '';
    }
    SB.hud.update(dt);
    camera(G.started && !G.menu, dt);
  }
  const cPrompt = (car) => 'F · EXIT   SHIFT · ' + (car.spec.boost ? 'BOOST' : 'SPRINT') + '   SPACE · HANDBRAKE';
  function render() {
    const dyn = new SB.Mesh(), pal = SB.lighting.palette, t = performance.now() / 1000;
    SB.city.submitProps(dyn); SB.missions.submit(dyn, t); SB.side.submit(dyn, t);
    SB.traffic.submit(dyn, pal); SB.police.submit(dyn, pal, t); SB.peds.submit(dyn);
    for (const c of G.cars) if (!c.traffic && !c.police) c.submit(dyn, pal);
    SB.player.submit(dyn, G.player, pal, t); SB.combat.submit(dyn, G, t); SB.fx.submit(dyn);
    SB.renderer.frame(dyn, pal, t);
    SB.hud.draw(G); SB.menus.draw(SB.hud.ctx, G);
  }
  let last = performance.now(), acc = 0, frames = 0;
  function loop(now) {
    const dt = M.clamp((now - last) / 1000, 0, .05); last = now;
    SB.renderer.resize(); update(dt); render();
    acc += dt; frames++;
    if (acc > .5) { G.fps = Math.round(frames / acc); acc = 0; frames = 0; }
    SB.input.endFrame(); requestAnimationFrame(loop);
  }
  window.addEventListener('wheel', (e) => { G.cam.dist = M.clamp(G.cam.dist + Math.sign(e.deltaY) * .6, 4.5, 16); }, { passive: true });
  window.addEventListener('resize', () => SB.renderer.resize());
  window.Solara = { ready: false, start: () => G.start(), setTime: (h) => SB.lighting.set(h), setWanted: (n) => SB.police.setLevel(G, n),
    stats: () => ({ fps: G.fps, cars: G.cars.length, peds: G.peds.length, wanted: SB.police.level, cash: SB.garage.cash,
      hour: SB.lighting.hour, source: 'solara-bay' }) };
  try { init(); window.Solara.ready = true; requestAnimationFrame(loop); }
  catch (err) {
    document.getElementById('boot').innerHTML = '<b>STARTUP FAILED</b><span>' + String(err.message || err) + '</span>';
    console.error(err);
  }
})(window.SB = window.SB || {});
