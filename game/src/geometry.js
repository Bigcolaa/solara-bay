// Lightweight procedural mesh builder. Every vertex is packed as position, normal, RGBA, glow.
(function (SB) {
  const M = SB.M;
  const rot = (x, z, a) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  class Mesh {
    constructor() { this.v = []; }
    clear() { this.v.length = 0; }
    get count() { return this.v.length / 11; }
    put(p, n, c, glow) {
      const a = c.length > 3 ? c[3] : 1;
      this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], a, glow || 0);
    }
    tri(a, b, c, col, glow, ns) {
      const n = ns || unit(cross(sub(b, a), sub(c, a)));
      const list = ns ? [a, b, c] : [a, b, c];
      for (let i = 0; i < 3; i++) this.put(list[i], ns ? ns[i] : n, col, glow);
    }
    quad(a, b, c, d, col, glow, ns) {
      const n = unit(cross(sub(b, a), sub(c, a)));
      this.tri(a, b, c, col, glow, ns ? [ns[0], ns[1], ns[2]] : [n, n, n]);
      this.tri(a, c, d, col, glow, ns ? [ns[0], ns[2], ns[3]] : [n, n, n]);
    }
    box(x, y, z, sx, sy, sz, col, glow, ry) {
      const a = ry || 0, hx = sx / 2, hy = sy / 2, hz = sz / 2;
      const raw = [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], [-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz]];
      const p = raw.map((q) => { const r = rot(q[0], q[2], a); return [x + r[0], y + q[1], z + r[1]]; });
      const faces = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
      for (const f of faces) this.quad(p[f[0]], p[f[1]], p[f[2]], p[f[3]], col, glow || 0);
      return this;
    }
    cyl(x, y, z, r, h, col, glow, seg, ry) {
      seg = seg || 8; const off = ry || 0, bot = [], top = [], nbot = [], ntop = [];
      for (let i = 0; i < seg; i++) {
        const a = off + i / seg * M.PI * 2, s = Math.sin(a), c = Math.cos(a);
        bot.push([x + c * r, y - h / 2, z + s * r]); top.push([x + c * r, y + h / 2, z + s * r]);
        nbot.push([-c, 0, -s]); ntop.push([c, 0, s]);
      }
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg, n = unit([(nbot[i][0] + nbot[j][0]) / 2, 0, (nbot[i][2] + nbot[j][2]) / 2]);
        this.quad(bot[i], top[i], top[j], bot[j], col, glow || 0, [n, n, n, n]);
        this.tri([x, y - h / 2, z], bot[i], bot[j], col, glow || 0, [[0, -1, 0], [0, -1, 0], [0, -1, 0]]);
        this.tri([x, y + h / 2, z], top[j], top[i], col, glow || 0, [[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
      }
      return this;
    }
    cone(x, y, z, r, h, col, glow, seg) {
      seg = seg || 7; const base = [], tip = [x, y + h / 2, z], n = [];
      for (let i = 0; i < seg; i++) {
        const a = i / seg * M.PI * 2, c = Math.cos(a), s = Math.sin(a);
        base.push([x + c * r, y - h / 2, z + s * r]); n.push(unit([c, r / h, s]));
      }
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        this.tri(base[i], base[j], tip, col, glow || 0, [n[i], n[j], unit([n[i][0] + n[j][0], n[i][1], n[i][2] + n[j][2]])]);
      }
      return this;
    }
    sphere(x, y, z, r, col, glow, seg, rings) {
      seg = seg || 8; rings = rings || 5;
      for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
        const a = i / seg * M.PI * 2, b = j / rings * M.PI, a2 = (i + 1) / seg * M.PI * 2, b2 = (j + 1) / rings * M.PI;
        const pt = (u, v) => [x + r * Math.sin(v) * Math.cos(u), y + r * Math.cos(v), z + r * Math.sin(v) * Math.sin(u)];
        const p0 = pt(a, b), p1 = pt(a2, b), p2 = pt(a2, b2), p3 = pt(a, b2);
        const nn = [unit([p0[0] - x, p0[1] - y, p0[2] - z]), unit([p1[0] - x, p1[1] - y, p1[2] - z]),
          unit([p2[0] - x, p2[1] - y, p2[2] - z]), unit([p3[0] - x, p3[1] - y, p3[2] - z])];
        this.quad(p0, p1, p2, p3, col, glow || 0, nn);
      }
      return this;
    }
    flat(x1, z1, x2, z2, y, col, glow) {
      return this.quad([x1, y, z1], [x1, y, z2], [x2, y, z2], [x2, y, z1], col, glow || 0, [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]]);
    }
    billboard(p, s, right, up, col, glow) {
      const r = [right[0] * s, right[1] * s, right[2] * s], u = [up[0] * s, up[1] * s, up[2] * s];
      const a = [p[0] - r[0] - u[0], p[1] - r[1] - u[1], p[2] - r[2] - u[2]];
      const b = [p[0] + r[0] - u[0], p[1] + r[1] - u[1], p[2] + r[2] - u[2]];
      const c = [p[0] + r[0] + u[0], p[1] + r[1] + u[1], p[2] + r[2] + u[2]];
      const d = [p[0] - r[0] + u[0], p[1] - r[1] + u[1], p[2] - r[2] + u[2]];
      const n = [0, 1, 0];
      return this.quad(a, b, c, d, col, glow || 0, [n, n, n, n]);
    }
    data() { return new Float32Array(this.v); }
  }
  SB.Mesh = Mesh;
})(window.SB = window.SB || {});
