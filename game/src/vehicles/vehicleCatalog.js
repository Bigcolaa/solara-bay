// Vehicle specifications. All performance numbers are authored here, never mutated by upgrades.
(function (SB) {
  const V = SB.vehicles = {};
  V.catalog = {
    comet: { name: 'SOLSTICE COMET', kind: 'sport', accel: 25, top: 52, grip: 7.6, mass: 1, boost: 1, price: 0, color: '#ff8b3d' },
    marlin: { name: 'MARLIN GT', kind: 'sport', accel: 23, top: 49, grip: 7.2, mass: 1.05, boost: 1, price: 24000, color: '#e9d8b4' },
    vector: { name: 'VECTOR R', kind: 'sport', accel: 28, top: 56, grip: 6.6, mass: .92, boost: 2, price: 62000, color: '#ffd43b' },
    albatross: { name: 'ALBATROSS COUPE', kind: 'sedan', accel: 19, top: 43, grip: 7.8, mass: 1.15, boost: 0, price: 9000, color: '#66b2c8' },
    cormorant: { name: 'CORMORANT SEDAN', kind: 'sedan', accel: 18, top: 42, grip: 7.4, mass: 1.2, boost: 0, price: 0, color: '#a9b4bd' },
    tidevan: { name: 'TIDELINE VAN', kind: 'van', accel: 15, top: 34, grip: 6.2, mass: 1.7, boost: 0, price: 14000, color: '#e7e3d6' },
    docktruck: { name: 'DOCKHAND HAULER', kind: 'truck', accel: 13, top: 32, grip: 5.6, mass: 2.1, boost: 0, price: 28000, color: '#7f9c94' },
    enforcer: { name: 'BAY ENFORCER', kind: 'police', accel: 24, top: 50, grip: 8, mass: 1.15, boost: 1, price: 45000, color: '#e8eef2' },
  };
  V.dims = { sport: [1.95, 4.5, 1.25], sedan: [1.95, 4.6, 1.35], van: [2.05, 5.1, 2.1], truck: [2.25, 6.4, 2.6], police: [1.95, 4.7, 1.4] };
  V.list = Object.keys(V.catalog);
  V.randomId = (rng) => { const pool = ['albatross', 'cormorant', 'tidevan', 'docktruck', 'marlin']; return pool[Math.floor(rng() * pool.length)]; };
})(window.SB = window.SB || {});
