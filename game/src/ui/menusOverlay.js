// Start, pause, garage, contracts, map and help screens drawn over the HUD canvas.
(function (SB) {
  const M = SB.M, C = (h) => M.col(h), O = SB.menus = { sel: 0 };
  const gold = '#ffd66b', cyan = '#67e5ff', pink = '#ff68b8';
  const panel = (ctx, x, y, w, h) => { ctx.fillStyle = 'rgba(8,15,30,.92)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(103,229,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke(); };
  const title = (ctx, text, x, y, size, col) => { ctx.fillStyle = col || gold; ctx.font = 'bold ' + size + 'px Trebuchet MS, sans-serif'; ctx.fillText(text, x, y); };
  const line = (ctx, text, x, y, col, size) => { ctx.fillStyle = col || '#e8f2ff'; ctx.font = (size || 14) + 'px Trebuchet MS, sans-serif'; ctx.fillText(text, x, y); };
  O.handle = (code, game) => {
    const menu = game.menu;
    if (!menu) return false;
    if (menu === 'start') { if (code === 'Enter' || code === 'Space') { game.start(); return true; } return false; }
    if (menu === 'dead') { if (code === 'Enter' || code === 'Space') { game.respawn(); return true; } return false; }
    if (code === 'Escape' || code === 'Tab') { game.menu = menu === 'pause' ? null : 'pause'; SB.audio.blip(420); return true; }
    if (menu === 'pause') {
      if (code === 'Enter' || code === 'Space' || code === 'Digit1') { game.menu = null; return true; }
      if (code === 'Digit2') game.menu = 'garage';
      if (code === 'Digit3') game.menu = 'contracts';
      if (code === 'Digit4') game.menu = 'help';
      if (code === 'Digit5') game.notify(SB.audio.nextStation().name + ' · ' + SB.audio.stations[SB.audio.station].song, 'info');
      if (code === 'Digit6') { SB.garage.save(); game.notify('PROGRESS SAVED', 'good'); }
      return true;
    }
    if (menu === 'garage') {
      if (code === 'Enter' || code === 'Backspace') { game.menu = 'pause'; return true; }
      if (code === 'Digit6') game.menu = 'contracts';
      if (/^Digit[1-8]$/.test(code)) SB.garage.buyVehicle(SB.vehicles.list[Number(code.slice(5)) - 1], game);
      if (code === 'KeyU') SB.garage.upgrade('engine', game);
      if (code === 'KeyB') SB.garage.upgrade('brakes', game);
      if (code === 'KeyA') SB.garage.upgrade('armor', game);
      if (code === 'KeyH') SB.garage.heal(game);
      if (code === 'KeyC') SB.garage.clearWanted(game);
      if (code === 'KeyP') { SB.garage.buyWeapon('pistol', game); }
      if (code === 'KeyW') { SB.garage.buyWeapon('smg', game); }
      if (code === 'KeyR') { SB.garage.buyWeapon('rifle', game); }
      return true;
    }
    if (menu === 'contracts') {
      if (code === 'Enter' || code === 'Backspace') { game.menu = 'pause'; return true; }
      if (/^Digit[1-5]$/.test(code)) { const i = Number(code.slice(5)) - 1; if (SB.missions.start(game, i)) game.menu = null; }
      if (/^Digit[6-8]$/.test(code)) { const i = Number(code.slice(5)) - 6; SB.side.start(game, i); game.menu = null; }
      return true;
    }
    return true;
  };
  O.draw = (ctx, game) => {
    if (!game.menu) return;
    ctx.fillStyle = 'rgba(4,9,22,.55)'; ctx.fillRect(0, 0, 1280, 720);
    if (game.menu === 'start') {
      ctx.textAlign = 'center';
      title(ctx, 'SOLARA BAY', 640, 222, 68, gold);
      line(ctx, 'AN ORIGINAL COASTAL OPEN WORLD', 640, 272, cyan, 17);
      line(ctx, 'Chase the sun. Take the keys. Own the night.', 640, 316, '#dce8f5', 17);
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(360, 352, 560, 1);
      const keys = [['WASD', 'MOVE / DRIVE'], ['MOUSE', 'CAMERA'], ['E / F', 'ENTER / EXIT VEHICLE'], ['SHIFT / SPACE', 'BOOST / HANDBRAKE'],
        ['LEFT CLICK', 'FIRE'], ['M / G / TAB', 'CONTRACTS / GARAGE / MAP'], ['Q / T', 'RADIO / TIME OF DAY']];
      keys.forEach((k, i) => { ctx.textAlign = 'right'; line(ctx, k[0], 615, 392 + i * 29, gold, 13); ctx.textAlign = 'left'; line(ctx, k[1], 635, 392 + i * 29, '#dce8f5', 13); });
      ctx.textAlign = 'center'; title(ctx, 'CLICK OR PRESS ENTER TO BEGIN', 640, 654, 17, pink);
      ctx.textAlign = 'left'; return;
    }
    if (game.menu === 'dead') {
      ctx.textAlign = 'center'; title(ctx, 'BUSTED', 640, 320, 70, '#ff5f6d');
      line(ctx, 'The city always gives you another chance.', 640, 374, '#dce8f5', 17);
      title(ctx, 'PRESS ENTER TO RESPAWN', 640, 440, 15, gold); ctx.textAlign = 'left'; return;
    }
    if (game.menu === 'pause') {
      panel(ctx, 450, 170, 380, 400);
      title(ctx, 'PAUSED', 486, 218, 34, gold);
      const items = [['1', 'RESUME'], ['2', 'GARAGE & UPGRADES'], ['3', 'CONTRACTS & RACES'], ['4', 'CONTROLS'],
        ['5', 'CYCLE RADIO STATION'], ['6', 'SAVE PROGRESS']];
      items.forEach((it, i) => { line(ctx, '[' + it[0] + ']', 490, 284 + i * 44, cyan, 16); line(ctx, it[1], 540, 284 + i * 44, '#eef5ff', 16); });
      return;
    }
    if (game.menu === 'help') {
      panel(ctx, 370, 130, 540, 470); title(ctx, 'CONTROLS', 410, 180, 30, gold);
      const rows = [['WASD', 'Move / steer / accelerate / brake'], ['MOUSE', 'Look around (click to lock pointer)'], ['SHIFT', 'Sprint / turbo boost'],
        ['SPACE', 'Jump / handbrake drift'], ['E', 'Enter or steal the nearest vehicle'], ['F', 'Exit the current vehicle'],
        ['LEFT CLICK', 'Fire current weapon'], ['1 / 2 / 3', 'Fists / sidearm / SMG or rifle'], ['R / V', 'Reload / radio'],
        ['M', 'Contract board'], ['G', 'Garage'], ['TAB', 'Pause menu'], ['T', 'Cycle time of day'], ['ESC', 'Back / pause']];
      rows.forEach((r, i) => { line(ctx, r[0], 412, 228 + i * 27, cyan, 13); line(ctx, r[1], 570, 228 + i * 27, '#e8f2ff', 13); });
      line(ctx, 'Press ESC to return', 412, 578, gold, 13); return;
    }
    if (game.menu === 'garage') {
      panel(ctx, 270, 92, 740, 560); title(ctx, 'SOLARA GARAGE', 310, 142, 30, gold);
      line(ctx, 'CASH  $' + Math.floor(SB.garage.cash).toLocaleString(), 860, 142, cyan, 20);
      const lists = SB.vehicles.list;
      lists.forEach((id, i) => {
        const v = SB.vehicles.catalog[id], own = SB.garage.ownedVehicle(id);
        line(ctx, '[' + (i + 1) + ']', 310, 190 + i * 31, cyan, 13);
        line(ctx, v.name, 350, 190 + i * 31, own ? '#8ef0b4' : '#e8f2ff', 13);
        line(ctx, own ? 'OWNED' : '$' + v.price.toLocaleString(), 770, 190 + i * 31, own ? '#8ef0b4' : gold, 13);
      });
      const u = SB.garage.upgrades;
      line(ctx, 'ENGINE [U] Lv' + u.engine + '   BRAKES [B] Lv' + u.brakes + '   ARMOR [A] Lv' + u.armor, 310, 468, gold, 13);
      line(ctx, '[H] HEAL $1,200   [C] CLEAR WANTED   [P/W/R] BUY WEAPONS', 310, 500, cyan, 13);
      line(ctx, '[ENTER] BACK   [6] CONTRACTS   STUNT BEST $' + SB.side.stuntBest, 310, 620, '#e8f2ff', 13);
      return;
    }
    if (game.menu === 'contracts') {
      panel(ctx, 240, 84, 800, 576); title(ctx, 'CONTRACT BOARD', 280, 132, 30, gold);
      SB.story.forEach((m, i) => {
        const avail = SB.missions.available(i), done = !!SB.garage.completed[m.id], y = 178 + i * 68;
        line(ctx, '[' + (i + 1) + ']', 280, y, cyan, 15);
        line(ctx, m.title, 325, y - 12, done ? '#8ef0b4' : '#eef5ff', 16);
        line(ctx, (done ? 'COMPLETED  ·  ' : avail ? 'AVAILABLE  ·  ' : 'LOCKED  ·  ') + '$' + m.payout.toLocaleString(), 325, y + 12, done ? '#8ef0b4' : gold, 12);
        line(ctx, m.brief.slice(0, 78), 640, y, 'rgba(220,235,250,.65)', 11);
      });
      line(ctx, 'STREET RACES', 280, 534, pink, 16);
      line(ctx, '[6] COASTAL SPRINT $3,200   [7] NEON MILE LOOP $4,800   [8] CAUSEWAY GAMBIT $6,200', 280, 564, '#e8f2ff', 12);
      line(ctx, '[ENTER] BACK   ·   CONTRACTS PAY TIME BONUSES', 280, 628, cyan, 12);
      return;
    }
    if (game.menu === 'map') {
      panel(ctx, 400, 100, 480, 520); title(ctx, 'CITY MAP', 440, 148, 28, gold);
      const mapX = 440, mapY = 180, mw = 400, mh = 360, wx = (x) => mapX + (x + 220) / 520 * mw, wz = (z) => mapY + (z + 220) / 380 * mh;
      ctx.fillStyle = '#173f52'; ctx.fillRect(wx(100), mapY, mw, mh); ctx.fillStyle = '#3d5f48'; ctx.fillRect(mapX, mapY, wx(100) - mapX, mh);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
      for (const x of SB.city.roadsX) { ctx.beginPath(); ctx.moveTo(wx(x), mapY); ctx.lineTo(wx(x), mapY + mh); ctx.stroke(); }
      for (const z of SB.city.roadsZ) { ctx.beginPath(); ctx.moveTo(mapX, wz(z)); ctx.lineTo(mapX + mw, wz(z)); ctx.stroke(); }
      for (const k of ['plaza', 'garage', 'club', 'pier', 'island', 'ramp']) {
        const l = SB.city.landmarks[k], p = [wx(l.x), wz(l.z)];
        ctx.fillStyle = pink; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, M.PI * 2); ctx.fill();
        line(ctx, k.toUpperCase(), p[0] + 7, p[1] + 3, '#fff', 9);
      }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(wx(game.player.x), wz(game.player.z), 5, 0, M.PI * 2); ctx.fill();
      line(ctx, '[TAB] CLOSE  ·  [T] CHANGE TIME', 440, 582, cyan, 12);
    }
  };
})(window.SB = window.SB || {});
