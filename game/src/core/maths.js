// Shared deterministic math and tiny matrix helpers. No external dependencies.
(function (SB) {
  const M = SB.M = {};
  M.PI = Math.PI;
  M.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.smooth = (t) => { t = M.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  M.d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  M.wrapAngle = (a) => { while (a > M.PI) a -= M.PI * 2; while (a < -M.PI) a += M.PI * 2; return a; };
  M.turn = (a, b, max) => a + M.clamp(M.wrapAngle(b - a), -max, max);
  M.approach = (a, b, step) => a + M.clamp(b - a, -step, step);
  M.mixColor = (a, b, t) => [M.lerp(a[0], b[0], t), M.lerp(a[1], b[1], t), M.lerp(a[2], b[2], t), 1];
  M.col = (hex, alpha) => {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha === undefined ? 1 : alpha];
  };
  M.rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  M.perspective = (fov, aspect, near, far) => {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  };
  M.lookAt = (eye, at) => {
    const z = norm(sub(eye, at)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
      -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
      -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]), 1]);
  };
  M.mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  };
  M.project = (m, p) => {
    const x = p[0], y = p[1], z = p[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, w];
  };
  M.collides = (x, z, r) => {
    const list = SB.world ? SB.world.colliders : [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (x + r > b[0] && x - r < b[1] && z + r > b[2] && z - r < b[3]) return b;
    }
    return null;
  };
  M.inside = (x, z, b, pad) => { const p = pad || 0; return x > b[0] - p && x < b[1] + p && z > b[2] - p && z < b[3] + p; };
})(window.SB = window.SB || {});
