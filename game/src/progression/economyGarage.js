// Cash, owned vehicles and weapons, upgrade levels and best-effort offline save data.
(function (SB) {
  const G = SB.garage = { key: 'solara-bay-save', cash: 12500, owned: ['comet', 'cormorant'], guns: ['pistol'],
    upgrades: { engine: 0, brakes: 0, armor: 0 }, completed: {}, stats: { distance: 0, missions: 0, races: 0 } };
  const save = () => {
    try { localStorage.setItem(G.key, JSON.stringify({ cash: G.cash, owned: G.owned, guns: G.guns, upgrades: G.upgrades, completed: G.completed, stats: G.stats })); } catch (e) { /* private mode */ }
  };
  G.save = save;
  G.load = () => {
    try {
      const raw = localStorage.getItem(G.key); if (!raw) return;
      const d = JSON.parse(raw);
      if (Number.isFinite(d.cash)) G.cash = Math.max(0, d.cash);
      if (Array.isArray(d.owned)) G.owned = d.owned.filter((id) => SB.vehicles.catalog[id]);
      if (Array.isArray(d.guns)) G.guns = d.guns.filter((id) => SB.combat.weapons[id]);
      Object.assign(G.upgrades, d.upgrades || {}); Object.assign(G.completed, d.completed || {}); Object.assign(G.stats, d.stats || {});
    } catch (e) { /* keep defaults */ }
  };
  G.addCash = (n) => { G.cash += n; save(); };
  G.ownedVehicle = (id) => G.owned.indexOf(id) >= 0;
  G.ownedWeapon = (id) => id === 'fists' || G.guns.indexOf(id) >= 0;
  G.buyVehicle = (id, game) => {
    const spec = SB.vehicles.catalog[id]; if (!spec) return;
    if (G.ownedVehicle(id)) { game.notify('ALREADY OWNED', 'info'); return; }
    if (G.cash < spec.price) { game.notify('NOT ENOUGH CASH', 'warn'); SB.audio.blip(220); return; }
    G.cash -= spec.price; G.owned.push(id); save(); SB.audio.purchase();
    game.notify(spec.name + ' UNLOCKED', 'good');
  };
  G.buyWeapon = (id, game) => {
    const w = SB.combat.weapons[id], price = { pistol: 1800, smg: 5400, rifle: 11500 }[id];
    if (!w || !price) return;
    if (G.ownedWeapon(id)) { game.notify('ALREADY OWNED', 'info'); return; }
    if (G.cash < price) { game.notify('NOT ENOUGH CASH', 'warn'); return; }
    G.cash -= price; G.guns.push(id); SB.combat.ammo[id] = id === 'smg' ? 120 : id === 'rifle' ? 30 : 42;
    save(); SB.audio.purchase(); game.notify(w.name + ' PURCHASED', 'good');
  };
  G.upgradeCost = (kind) => [6000, 14000, 28000][G.upgrades[kind]] || 0;
  G.upgrade = (kind, game) => {
    if (G.upgrades[kind] >= 3) { game.notify('MAX LEVEL REACHED', 'info'); return; }
    const cost = G.upgradeCost(kind);
    if (G.cash < cost) { game.notify('NOT ENOUGH CASH', 'warn'); return; }
    G.cash -= cost; G.upgrades[kind]++; save(); SB.audio.purchase();
    game.notify(kind.toUpperCase() + ' UPGRADE Lv' + G.upgrades[kind], 'good');
  };
  G.apply = (vehicle) => {
    if (vehicle.police) return vehicle.spec;
    const u = G.upgrades;
    vehicle.spec.accel *= 1 + u.engine * .12;
    vehicle.spec.top *= 1 + u.engine * .1;
    vehicle.spec.grip *= 1 + u.brakes * .1;
    vehicle.spec.accel *= 1;
    return vehicle.spec;
  };
  G.heal = (game) => {
    if (G.cash < 1200) { game.notify('NEED $1,200', 'warn'); return; }
    G.cash -= 1200; game.player.health = game.player.maxHealth = 100 + G.upgrades.armor * 25;
    game.player.armor = 50; game.notify('FULLY RESTORED', 'good'); SB.audio.purchase(); save();
  };
  G.clearWanted = (game) => {
    const cost = 1800 * SB.police.level;
    if (!cost) return;
    if (G.cash < cost) { game.notify('NEED $' + cost.toLocaleString(), 'warn'); return; }
    G.cash -= cost; SB.police.reset(game); game.notify('PURSUIT CLEARED', 'good'); SB.audio.purchase(); save();
  };
})(window.SB = window.SB || {});
