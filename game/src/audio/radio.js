// Three procedural Web Audio radio stations; audio starts only after a real user gesture.
export const STATIONS = ['SOLARA FM 98.4', 'WAVE 106.1', 'NEON PULSE 24/7'];
const SCALES = [[220, 277, 330, 415], [196, 247, 294, 370], [165, 208, 247, 311]];
export class Radio {
  constructor() { this.i = 0; this.ctx = null; this.timer = null; this.stepN = 0; this.on = false; }
  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.055;
      this.master.connect(this.ctx.destination); this.on = true;
      this.timer = setInterval(() => this.step(), 260);
      return true;
    } catch { return false; }
  }
  cycle() { this.i = (this.i + 1) % STATIONS.length; this.stepN = 0; return STATIONS[this.i]; }
  name() { return STATIONS[this.i]; }
  tone(freq, dur, type, vol) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.03);
  }
  shot(w) { if (this.ensure()) this.tone(90 - w * 8, 0.09, 'square', 0.16); }
  step() {
    if (!this.ctx || this.ctx.state === 'closed') return;
    const s = SCALES[this.i], n = this.stepN++;
    if (this.i === 2) { this.tone(s[n % 4] * (n % 8 < 4 ? 1 : 1.5), 0.18, 'sawtooth', 0.11); if (n % 2 === 0) this.tone(55, 0.14, 'sine', 0.2); }
    else if (this.i === 1) { this.tone(s[(n * 3) % 4] / 2, 0.42, 'triangle', 0.14); if (n % 4 === 0) this.tone(s[0] * 2, 0.3, 'sine', 0.07); }
    else { this.tone(s[n % 4], 0.3, 'triangle', 0.12); if (n % 4 === 2) this.tone(s[(n + 1) % 4] * 2, 0.18, 'sine', 0.06); }
  }
}
