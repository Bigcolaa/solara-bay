// District standing, cash, garage upgrades and Continue via localStorage save()/load().
const KEY = 'solara-bay-save-v1';
const blank = () => ({ respect: 0, standing: 'OUTSIDER', cash: 2500, completed: [], perks: { engine: 0, armor: 0, handling: 0 }, station: 0, lastContract: -1 });
export class Progress {
  constructor() { this.data = blank(); this.load(); }
  rank() {
    const r = this.data.respect;
    this.data.standing = r >= 900 ? 'SOLARA LEGEND' : r >= 600 ? 'CITY ICON' : r >= 350 ? 'DISTRICT STAR' : r >= 150 ? 'LOCAL NAME' : 'OUTSIDER';
    return this.data.standing;
  }
  reward(amount, respect) { this.data.cash += amount; this.data.respect += respect; this.rank(); save(this.data); }
  complete(i) {
    if (this.data.completed.includes(i)) return;
    this.data.completed.push(i); this.data.lastContract = i;
  }
  upgrade(kind) {
    const p = this.data.perks, cost = 1200 + p[kind] * 900;
    if (p[kind] >= 3 || this.data.cash < cost) return false;
    this.data.cash -= cost; p[kind]++; save(this.data); return true;
  }
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const d = JSON.parse(raw), b = blank();
      this.data = { ...b, ...d, perks: { ...b.perks, ...(d.perks || {}) }, completed: Array.isArray(d.completed) ? d.completed : [] };
      this.rank(); return true;
    } catch { return false; }
  }
  reset() { this.data = blank(); try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } }
}
export function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; } }
export function load() { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
