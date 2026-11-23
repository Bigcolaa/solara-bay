// DOM HUD: one dispatch ticker, four-slot weapon strip, race panel and live minimap icons.
import { WEAPONS } from '../player/weapons.js';
import { CONTRACTS } from '../missions/contracts.js';
import { gridLine, GRID, GARAGE, SEAWALL } from '../world/city.js';
import { STATIONS } from '../audio/radio.js';
import { clamp } from '../core/math.js';

export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = { wanted: $('wanted'), ticker: $('ticker'), district: $('district'), cash: $('cash'), clock: $('clock'), station: $('station'),
      contract: $('contract'), speed: $('speed'), health: $('health'), healthNum: $('healthNum'), ammo: $('ammo'),
      weapons: $('weapons'), race: $('race'), toast: $('toast'), map: $('minimap'), garage: $('garage'), intro: $('intro'), hud: $('hud') };
    this.slots = [...this.el.weapons.children];
    this.mapCtx = this.el.map.getContext('2d');
    this.toastTimer = 0; this.lastTicker = ''; this.garageOpen = false;
  }
  toast(msg) { this.el.toast.textContent = msg; this.el.toast.style.opacity = '1'; this.toastTimer = 2.2; }
  setGarage(game, open) {
    this.garageOpen = open; this.el.garage.style.display = open ? 'flex' : 'none';
    if (open) {
      document.getElementById('garageCash').textContent = '$' + game.progress.data.cash.toLocaleString();
      for (const kind of ['engine', 'armor', 'handling']) {
        const lvl = game.progress.data.perks[kind];
        document.getElementById('lvl-' + kind).textContent = 'LEVEL ' + lvl + '/3  ·  $' + (1200 + lvl * 900);
      }
    }
  }
  update(game, dt) {
    const p = game.player, e = this.el;
    e.wanted.textContent = '★'.repeat(game.police.wanted) + '☆'.repeat(5 - game.police.wanted);
    e.wanted.style.color = game.police.wanted >= 4 ? '#ff8a5c' : '#ffd85c';
    if (game.police.ticker !== this.lastTicker) { e.ticker.textContent = game.police.ticker; this.lastTicker = game.police.ticker; }
    e.district.textContent = game.progress.rank() + '  ·  ' + game.progress.data.completed.length + '/9 CONTRACTS';
    e.cash.textContent = '$' + game.progress.data.cash.toLocaleString();
    const mins = Math.floor(game.env.time * 24 * 60) % 1440;
    e.clock.textContent = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0') + '  ' + game.env.label;
    e.station.textContent = '♪ ' + game.audio.name();
    const m = game.missions.hud();
    e.contract.innerHTML = m ? `<b>${m.name}</b><br><span>${m.desc}</span><br><em>${m.progress} · $${m.reward}</em>` : '<b>NO ACTIVE CONTRACT</b><br><span>Visit the contracts board or start a district job</span>';
    const kmh = p.mode === 'car' ? Math.round(Math.abs(p.car.spd) * 3.6) : 0;
    e.speed.innerHTML = kmh + '<small> km/h</small>';
    const hp = clamp(p.health, 0, 100); e.health.style.width = hp + '%';
    e.health.style.background = hp < 30 ? '#e85050' : hp < 60 ? '#e8b44f' : '#54d993';
    e.healthNum.textContent = Math.round(hp) + ' HP' + (p.car.hp < 70 ? ' · VEHICLE ' + Math.round(p.car.hp) + '%' : '');
    e.ammo.textContent = p.ammo[p.weapon] + ' / ' + WEAPONS[p.weapon].ammo;
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i]; s.className = 'slot' + (i === p.weapon ? ' active' : '');
      s.innerHTML = `<span class="key">${i + 1}</span><span class="name">${WEAPONS[i].short}</span><span class="count">${p.ammo[i]}</span>`;
    }
    if (m && m.race && game.qa && game.qa.raceHud) Object.assign(m.race, game.qa.raceHud);
    if (m && m.race) {
      const r = m.race;
      e.race.style.display = 'block';
      e.race.innerHTML = `<div class="pos">POS ${r.pos}/${r.total}</div><div>LAP ${r.lap}/${r.laps} · CP ${r.checkpoint}/${r.checkpoints}</div><div class="time">${r.timer.toFixed(2)}s</div>`;
    } else e.race.style.display = 'none';
    if (this.toastTimer > 0) { this.toastTimer -= dt; if (this.toastTimer <= 0) e.toast.style.opacity = '0'; }
    this.drawMap(game);
  }
  drawMap(game) {
    const g = this.mapCtx, S = 170, sc = S / 240, m = (x, z) => [S / 2 + x * sc, S / 2 + z * sc];
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#10161b'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#123347'; g.fillRect(0, 0, S, S / 2 + SEAWALL * sc);
    g.strokeStyle = 'rgba(220,225,225,0.16)'; g.lineWidth = 3;
    for (let i = 0; i < GRID; i++) {
      const a = gridLine(i) * sc + S / 2;
      g.beginPath(); g.moveTo(a, 0); g.lineTo(a, S); g.stroke();
      g.beginPath(); g.moveTo(0, a); g.lineTo(S, a); g.stroke();
    }
    const dot = (x, z, color, size = 3, label = '') => {
      const [px, py] = m(x, z); g.fillStyle = color; g.fillRect(px - size / 2, py - size / 2, size, size);
      if (label) { g.fillStyle = color; g.font = 'bold 9px monospace'; g.fillText(label, px + 4, py + 3); }
    };
    dot(GARAGE.x, GARAGE.z, '#4fe0a0', 5, 'G');
    for (const v of game.allVehicles()) if (v.tag && v.tag.startsWith('RIVAL')) dot(v.x, v.z, '#ff59ad', 4);
    for (const c of game.police.cruisers) dot(c.x, c.z, '#5b9cff', 4);
    if (game.police.swat) dot(game.police.swat.x, game.police.swat.z, '#a3ff8c', 5, 'S');
    for (const icon of game.police.mapIcons()) {
      dot(icon.x, icon.z, icon.type === 'roadblock' ? '#ffcc44' : '#ffffff', icon.type === 'roadblock' ? 7 : 5, icon.type === 'roadblock' ? 'X' : 'H');
      if (icon.type === 'airone') { const [px, py] = m(icon.x, icon.z); g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.arc(px, py, 7, 0, 6.28); g.stroke(); }
    }
    const p = game.playerPos(), [px, py] = m(p.x, p.z);
    g.save(); g.translate(px, py); g.rotate(p.h); g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -4); g.lineTo(-5, 4); g.closePath(); g.fill(); g.restore();
  }
}
