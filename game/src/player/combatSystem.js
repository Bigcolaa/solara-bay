// Hitscan weapons, recoil, ammunition and non-lethal street combat.
(function (SB) {
  const M = SB.M, C = (h, a) => M.col(h, a), K = SB.combat = {};
  K.weapons = {
    fists: { name: 'FISTS', damage: 16, range: 2.8, rate: .55, ammo: Infinity },
    pistol: { name: 'SIDEARM', damage: 34, range: 62, rate: .24, ammo: 42 },
    smg: { name: 'BURST SMG', damage: 20, range: 48, rate: .095, ammo: 120 },
    rifle: { name: 'COAST RIFLE', damage: 48, range: 95, rate: .34, ammo: 30 },
  };
  K.current = 'fists'; K.ammo = { pistol: 42, smg: 0, rifle: 0 }; K.cooldown = 0; K.recoil = 0; K.flash = 0;
  K.select = (id, game) => {
    if (!K.weapons[id] || (id !== 'fists' && !K.ammo[id] && !SB.garage.ownedWeapon(id))) return;
    K.current = id; K.cooldown = .12; SB.audio.blip(700);
    if (game) game.notify(id === 'fists' ? 'FISTS READY' : K.weapons[id].name + ' READY', 'info');
  };
  K.update = (dt) => { K.cooldown = Math.max(0, K.cooldown - dt); K.recoil = Math.max(0, K.recoil - dt * 4); K.flash = Math.max(0, K.flash - dt * 8); };
  K.fire = (game) => {
    if (K.cooldown > 0 || !game || game.paused || !game.started) return;
    const p = game.player, w = K.weapons[K.current];
    if (p.vehicle) { SB.audio.horn && SB.audio.horn(); return; }
    if (K.current !== 'fists' && K.ammo[K.current] <= 0) { SB.audio.blip(220); game.notify('OUT OF AMMO', 'warn'); return; }
    K.cooldown = w.rate; K.recoil = 1; K.flash = 1;
    const f = [Math.sin(p.yaw), Math.cos(p.yaw)], ox = p.x + f[0] * .7, oz = p.z + f[1] * .7;
    if (K.current === 'fists') {
      SB.audio.tone(160, .1, 'sine', .07, 90);
      const ped = nearest(game.peds, ox, oz, w.range, f, .6);
      if (ped) { ped.hp -= w.damage; ped.panic = 4; game.notify('STRIKE LANDED', 'good'); SB.police.crime(game, 'assault', p.x, p.z); }
      return;
    }
    K.ammo[K.current]--; SB.audio.shot(); SB.fx.flash(ox + f[0] * .6, 1.6, oz + f[1] * .6);
    SB.police.crime(game, 'gunshot', p.x, p.z);
    const target = nearest(game.peds, ox, oz, w.range, f, .25);
    if (target) {
      target.hp -= w.damage; target.panic = 6;
      SB.fx.burst(target.x, 1.4, target.z, C('#ffd0a0'), 5, 3);
      if (target.hp <= 0 && target.down) target.down(target);
    }
    for (const prop of SB.city.destructibles) {
      if (!prop.alive || M.d2(prop, ox) > w.range) continue;
      const tx = prop.x - ox, tz = prop.z - oz, dot = (tx * f[0] + tz * f[1]) / (Math.hypot(tx, tz) || 1);
      if (dot > .92) { prop.hp -= w.damage; if (prop.hp <= 0) { SB.city.breakProp(prop); game.notify('PROP SHATTERED', 'good'); } break; }
    }
    for (const car of game.cars) {
      if (!car.police || car.health <= 0) continue;
      const tx = car.x - ox, tz = car.z - oz, dot = (tx * f[0] + tz * f[1]) / (Math.hypot(tx, tz) || 1);
      if (dot > .93 && Math.hypot(tx, tz) < w.range) { car.health -= w.damage * .5; SB.fx.spark(car.x, 1.2, car.z); break; }
    }
  };
  const nearest = (list, x, z, range, f, dotMin) => {
    let best = null, bd = range;
    for (const o of list || []) {
      if (!o.alive || o.hp <= 0) continue;
      const dx = o.x - x, dz = o.z - z, d = Math.hypot(dx, dz);
      if (d < bd && (dx * f[0] + dz * f[1]) / (d || 1) > dotMin) { best = o; bd = d; }
    }
    return best;
  };
  K.submit = (m, game, time) => {
    const p = game.player;
    if (p.vehicle || K.current === 'fists') return;
    const f = [Math.sin(p.yaw), Math.cos(p.yaw)], r = [f[1], -f[0]];
    const x = p.x + f[0] * .55 + r[0] * .38, z = p.z + f[1] * .55 + r[1] * .38;
    const y = 1.35 + (p.aiming ? .08 : 0) - K.recoil * .1;
    m.box(x + f[0] * .3, y, z + f[1] * .3, .16, .18, .75, C('#202733'), 0, -p.yaw);
    if (K.flash > 0) m.billboard([x + f[0] * .8, y + .05, z + f[1] * .8], .5 + K.flash * .4,
      SB.renderer.right, SB.renderer.up, C('#fff3b0', .9), 1);
  };
})(window.SB = window.SB || {});
