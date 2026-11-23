// Crisp 2D HUD: rotating minimap, wanted stars, vitals, speed, radio, objective and toasts.
(function (SB) {
  const M = SB.M, H = SB.hud = { ctx: null, toasts: [], prompt: '', hint: '' };
  const C = { gold: '#ffd66b', cyan: '#67e5ff', red: '#ff5f6d', green: '#70e59a', ink: 'rgba(9,17,32,.78)', white: '#f3f7ff' };
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  H.init = () => { H.ctx = document.getElementById('hud').getContext('2d'); };
  H.toast = (text, kind) => { H.toasts.push({ text, kind: kind || 'info', life: 4.2 }); if (H.toasts.length > 5) H.toasts.shift(); };
  H.update = (dt) => { for (let i = H.toasts.length - 1; i >= 0; i--) { H.toasts[i].life -= dt; if (H.toasts[i].life <= 0) H.toasts.splice(i, 1); } };
  H.draw = (game) => {
    const ctx = H.ctx, R = SB.renderer; if (!ctx) return;
    const scale = Math.min(R.w / 1280, R.h / 720), ox = (R.w - 1280 * scale) / 2, oy = (R.h - 720 * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, R.w, R.h);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.textBaseline = 'middle';
    const pal = SB.lighting.palette, pl = game.player, car = pl.vehicle;
    const d = SB.districts.at(pl.x, pl.z), hh = String(Math.floor(SB.lighting.hour)).padStart(2, '0'), mm = String(Math.floor((SB.lighting.hour % 1) * 60)).padStart(2, '0');
    // Header panel.
    ctx.fillStyle = C.ink; rr(ctx, 22, 20, 300, 78, 12); ctx.fill();
    ctx.fillStyle = C.gold; ctx.font = 'bold 17px Trebuchet MS, sans-serif'; ctx.fillText('SOLARA BAY', 38, 43);
    ctx.fillStyle = C.white; ctx.font = '11px Trebuchet MS, sans-serif'; ctx.fillText(d.name + '  ·  ' + d.tag.toUpperCase(), 38, 66);
    ctx.fillStyle = C.cyan; ctx.fillText(pal.name + '  ' + hh + ':' + mm, 38, 84);
    ctx.fillStyle = 'rgba(255,214,107,.16)'; rr(ctx, 1000, 20, 258, 52, 12); ctx.fill();
    ctx.fillStyle = C.gold; ctx.font = 'bold 24px Trebuchet MS, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('$' + Math.floor(SB.garage.cash).toLocaleString(), 1240, 47); ctx.textAlign = 'left';
    // Wanted stars.
    if (SB.police.level > 0) {
      ctx.fillStyle = C.ink; rr(ctx, 1010, 84, 248, 48, 12); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const x = 1032 + i * 45, on = i < SB.police.level, flash = i % 2 === Math.floor(game.time * 4) % 2;
        ctx.save(); ctx.translate(x, 108); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = on ? (flash ? C.gold : '#ff9e4f') : 'rgba(255,255,255,.16)'; ctx.fillRect(-9, -9, 18, 18);
        ctx.restore();
      }
      const escape = SB.police.safeTime > 0 ? Math.min(100, Math.round(SB.police.safeTime / 7 * 100)) : 0;
      ctx.fillStyle = C.white; ctx.font = '10px Trebuchet MS, sans-serif';
      ctx.fillText(escape ? 'ESCAPING ' + escape + '%' : 'LOSE THE COPS', 1024, 137);
    }
    // Objective.
    const w = SB.missions.waypoint() || SB.side.waypoint();
    if (w) {
      const text = w.label.toUpperCase(), tw = Math.min(620, ctx.measureText(text).width + 150);
      ctx.fillStyle = C.ink; rr(ctx, 640 - tw / 2, 20, tw, 44, 12); ctx.fill();
      ctx.fillStyle = C.gold; ctx.font = 'bold 13px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(text + '   ·   ' + Math.round(M.d2(pl, w)) + 'm', 640, 43); ctx.textAlign = 'left';
    }
    H.minimap(ctx, game);
    // Vitals.
    ctx.fillStyle = C.ink; rr(ctx, 22, 592, 250, 88, 12); ctx.fill();
    const bar = (y, v, max, col, label) => {
      ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(ctx, 38, y, 210, 11, 5); ctx.fill();
      ctx.fillStyle = col; rr(ctx, 38, y, 210 * M.clamp(v / max, 0, 1), 11, 5); ctx.fill();
      ctx.fillStyle = C.white; ctx.font = '10px Trebuchet MS, sans-serif'; ctx.fillText(label, 38, y - 9);
    };
    bar(624, pl.health, pl.maxHealth || 100, pl.health < 30 ? C.red : C.green, 'HEALTH  ' + Math.ceil(pl.health));
    bar(654, pl.armor, 100, '#6db8ff', 'ARMOR  ' + Math.ceil(pl.armor));
    // Speedometer.
    const sx = 1145, sy = 606, ratio = car ? M.clamp(Math.abs(car.speed) / car.spec.top, 0, 1) : M.clamp(Math.hypot(pl.vx, pl.vz) / 8, 0, 1);
    ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.beginPath(); ctx.arc(sx, sy, 62, Math.PI * .78, Math.PI * 2.22); ctx.stroke();
    ctx.strokeStyle = ratio > .85 ? C.red : C.cyan; ctx.beginPath(); ctx.arc(sx, sy, 62, Math.PI * .78, Math.PI * (.78 + 1.44 * ratio)); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = C.white; ctx.font = 'bold 35px Trebuchet MS, sans-serif';
    ctx.fillText(String(Math.round(car ? Math.abs(car.speed) * 4.2 : Math.hypot(pl.vx, pl.vz) * 3.1)), sx, sy - 3);
    ctx.font = '10px Trebuchet MS, sans-serif'; ctx.fillStyle = C.cyan;
    ctx.fillText(car ? car.spec.name : SB.combat.weapons[SB.combat.current].name, sx, sy + 24);
    if (car && car.boostFuel < 3.2) { ctx.fillStyle = C.cyan; ctx.fillRect(sx - 40, sy + 38, 80 * car.boostFuel / 3.2, 3); }
    ctx.textAlign = 'left';
    // Radio.
    const st = SB.audio.stations[SB.audio.station];
    ctx.fillStyle = C.ink; rr(ctx, 500, 676, 280, 36, 10); ctx.fill();
    ctx.fillStyle = C.gold; ctx.font = '11px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText((SB.audio.radioOn ? '▸ ' : '× ') + st.name + '  ·  ' + st.song + '   [Q]', 640, 695); ctx.textAlign = 'left';
    if (SB.side.race) {
      ctx.fillStyle = C.ink; rr(ctx, 480, 74, 320, 38, 10); ctx.fill();
      ctx.fillStyle = C.cyan; ctx.font = 'bold 14px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(SB.side.race.def.name + '  ' + SB.side.race.time.toFixed(1) + 's', 640, 94); ctx.textAlign = 'left';
    }
    // Prompts and notifications.
    if (H.prompt) {
      ctx.font = 'bold 14px Trebuchet MS, sans-serif'; const pw = ctx.measureText(H.prompt).width + 46;
      ctx.fillStyle = C.ink; rr(ctx, 640 - pw / 2, 500, pw, 38, 10); ctx.fill();
      ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.fillText(H.prompt, 640, 520); ctx.textAlign = 'left';
    }
    let ty = 170;
    for (const t of H.toasts) {
      const a = M.clamp(t.life, 0, 1), col = t.kind === 'warn' ? C.red : t.kind === 'good' ? C.green : t.kind === 'mission' ? C.gold : C.cyan;
      ctx.fillStyle = 'rgba(9,17,32,' + (.78 * a) + ')'; rr(ctx, 24, ty, Math.min(430, ctx.measureText(t.text).width + 60), 34, 8); ctx.fill();
      ctx.fillStyle = col; ctx.font = 'bold 12px Trebuchet MS, sans-serif'; ctx.fillText(t.text, 40, ty + 17); ty += 40;
    }
    if (SB.combat && !car && SB.combat.current !== 'fists') {
      const r = 8 + SB.combat.recoil * 9;
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(640 - r - 7, 360); ctx.lineTo(640 - r, 360); ctx.moveTo(640 + r, 360); ctx.lineTo(640 + r + 7, 360);
      ctx.moveTo(640, 360 - r - 7); ctx.lineTo(640, 360 - r); ctx.moveTo(640, 360 + r); ctx.lineTo(640, 360 + r + 7); ctx.stroke();
    }
    if (pl.hit > 0) { ctx.fillStyle = 'rgba(220,40,60,' + (pl.hit * .22) + ')'; ctx.fillRect(0, 0, 1280, 720); }
  };
  H.minimap = (ctx, game) => {
    const cx = 108, cy = 598, rad = 80, s = .32, pl = game.player;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, M.PI * 2); ctx.clip();
    ctx.fillStyle = '#8eae84'; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    const a = -game.cam.yaw, co = Math.cos(a), si = Math.sin(a);
    const tr = (x, z) => { const dx = (x - pl.x) * s, dz = (z - pl.z) * s; return [cx + dx * co - dz * si, cy - dx * si - dz * co]; };
    const water = tr(100, pl.z - 400), w2 = tr(500, pl.z + 400);
    ctx.fillStyle = '#176f93'; ctx.fillRect(water[0], cy - rad * 2, w2[0] - water[0], rad * 4);
    ctx.strokeStyle = 'rgba(235,235,215,.85)'; ctx.lineWidth = 3.4;
    for (const x of SB.city.roadsX) { const p = tr(x, pl.z - 400), q = tr(x, pl.z + 400); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
    for (const z of SB.city.roadsZ) { const p = tr(pl.x - 400, z), q = tr(pl.x + 400, z); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
    const blip = (x, z, col, size) => { const p = tr(x, z); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], size, 0, M.PI * 2); ctx.fill(); };
    for (const c of SB.police.cruisers) blip(c.x, c.z, Math.floor(game.time * 6) % 2 ? '#ff4d5e' : '#4aa8ff', 3.5);
    for (const r of SB.police.roadblocks) blip(r.x, r.z, '#ffb14d', 4);
    for (const c of SB.traffic.cars) if (M.d2(c, pl) < 110) blip(c.x, c.z, 'rgba(255,255,255,.5)', 1.7);
    const wp = SB.missions.waypoint() || SB.side.waypoint();
    if (wp) { const p = tr(wp.x, wp.z); ctx.fillStyle = C.gold; ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -5, 10, 10); ctx.restore(); }
    ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a);
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,214,107,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, M.PI * 2); ctx.stroke();
    ctx.fillStyle = C.white; ctx.font = '10px Trebuchet MS, sans-serif'; ctx.fillText('N', cx - 3, cy - rad - 10);
  };
})(window.SB = window.SB || {});
