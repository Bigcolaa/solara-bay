// Arcade driving model with throttle, steering slip, handbrake drift, boost, impacts and ramps.
(function (SB) {
  const M = SB.M, C = (h, a) => M.col(h, a), V = SB.vehicles;
  const rand = M.rng(0x2a17);
  class Vehicle {
    constructor(x, z, yaw, id, opts) {
      const base = V.catalog[id] || V.catalog.cormorant;
      this.spec = Object.assign({}, base); this.id = id; this.x = x; this.z = z; this.yaw = yaw;
      this.speed = 0; this.lateral = 0; this.steer = 0; this.y = 0; this.vy = 0; this.air = 0;
      this.health = 100; this.boostFuel = 3.2; this.boosting = false; this.skid = 0; this.damage = 0;
      this.wasStolen = !!(opts && opts.stolen); this.traffic = !!(opts && opts.traffic);
      this.police = !!(opts && opts.police); this.tint = (opts && opts.color) || base.color;
      this.seed = rand() * 10; this.horn = 0; this.lamp = false;
    }
    get fwd() { return [Math.sin(this.yaw), Math.cos(this.yaw)]; }
    update(dt, ctrl, game) {
      const s = this.spec, f = this.fwd, throttle = ctrl.throttle || 0, brake = ctrl.brake || 0;
      const boosting = !!ctrl.boost && throttle > .1 && s.boost > 0 && this.boostFuel > 2.1 && this.y < .2;
      this.boosting = boosting;
      this.boostFuel = M.clamp(this.boostFuel + (boosting ? -1.6 : 1.8) * dt, 0, 3.2);
      const top = s.top * (boosting ? 1.35 : 1), acc = s.accel * (boosting ? 1.8 : 1) * (this.health < 30 ? .82 : 1);
      if (throttle > 0) this.speed += acc * throttle * dt;
      else if (brake > 0) this.speed -= (this.speed > 0 ? acc * 1.9 : acc * .55) * brake * dt;
      else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), (1.05 + .012 * s.mass + Math.abs(this.speed) * .006) * dt * 12);
      this.speed = M.clamp(this.speed, -top * .28, top);
      const sf = M.clamp(Math.abs(this.speed) / 9, 0, 1);
      this.steer = M.lerp(this.steer, M.clamp(ctrl.steer || 0, -1, 1), Math.min(1, dt * 9));
      const turn = (1.55 + 1.25 * (1 - sf)) * this.steer * Math.sign(this.speed || 1) * sf;
      this.yaw += turn * dt;
      const right = [f[1], -f[0]], grip = s.grip * (ctrl.handbrake ? .16 : 1) * (boosting ? .82 : 1);
      const slip = ctrl.handbrake ? -this.steer * Math.min(Math.abs(this.speed) * .62, 13) : 0;
      this.lateral = M.lerp(this.lateral, slip, Math.min(1, grip * dt));
      this.skid = M.lerp(this.skid, ctrl.handbrake || Math.abs(this.lateral) > 3 ? 1 : 0, Math.min(1, dt * 5));
      const nx = this.x + (f[0] * this.speed + right[0] * this.lateral) * dt;
      const nz = this.z + (f[1] * this.speed + right[1] * this.lateral) * dt;
      this.move(nx, nz, game);
      if (this.speed > 8 && this.skid > .2) {
        SB.fx.mark(this.x - f[0] * 1.4, this.z - f[1] * 1.4, this.yaw, .3);
        SB.fx.mark(this.x - f[0] * 1.4 + right[0] * 1.0, this.z - f[1] * 1.4 + right[1] * 1.0, this.yaw, .3);
        if (rand() > .7) SB.fx.smoke(this.x - f[0] * 1.8, .35, this.z - f[1] * 1.8);
      }
      for (const p of SB.city.props) {
        if (!p.alive || M.d2(this, p) > 2.8) continue;
        if (Math.abs(this.speed) > 7) { this.speed *= .9; p.hp -= Math.abs(this.speed); if (p.hp <= 0) SB.city.breakProp(p); }
      }
      const ramp = SB.city.ramps[0];
      if (ramp && M.d2(this, ramp) < ramp.r && this.y < .3 && this.vy <= 0 && this.speed > 15 && Math.sin(this.yaw) > .35) {
        this.vy = Math.min(15, 5 + Math.abs(this.speed) * .2); this.air = .01;
        SB.audio.blip(880);
      }
      if (this.y > .01 || this.vy > 0) {
        this.air += dt; this.vy -= 26 * dt; this.y += this.vy * dt;
        if (this.y <= 0) {
          if (this.vy < -8 && this.isPlayer) { SB.fx.burst(this.x, .2, this.z, C('#c9d2d6'), 8, 4); SB.audio.crash(); }
          if (this.air > .75 && game) game.stunt(this.air, 0, this);
          this.y = 0; this.vy = 0; this.air = 0;
        }
      }
    }
    move(nx, nz, game) {
      const bridge = nz > -130 && nz < -110 && nx > 96, pier = nz > 33 && nz < 47 && nx < 186, island = nx > 240 && nz > -134 && nz < -74;
      if (nx > 98 && !bridge && !pier && !island) { nx = 97.5; this.speed *= .35; if (this.isPlayer) SB.audio.crash(); }
      const b = M.collides(nx, this.z, 1.8);
      if (b) { nx = this.x + (nx > b[1] ? -.4 : .4); this.impact(Math.abs(this.speed)); this.speed *= .42; }
      const c = M.collides(nx, nz, 1.8);
      if (c) { nz = this.z + (nz > c[3] ? -.4 : .4); this.impact(Math.abs(this.speed)); this.speed *= .42; }
      this.x = M.clamp(nx, -215, 290); this.z = M.clamp(nz, -215, 155);
    }
    impact(power) {
      if (power < 6) return;
      this.health = Math.max(0, this.health - power * .2); this.damage = 1;
      SB.fx.spark(this.x, 1, this.z);
      if (this.isPlayer || this.police) SB.audio.crash();
    }
    submit(m, pal) {
      const d = V.dims[this.spec.kind], w = d[0], l = d[1], h = d[2], ya = -this.yaw;
      const cs = Math.cos(this.yaw), sn = Math.sin(this.yaw);
      const tf = (lx, lz) => [this.x + lx * cs + lz * sn, this.z - lx * sn + lz * cs];
      const body = C(this.tint), dark = C('#141a22');
      if (this.y < .3) { const q = C('#08101c', .38); m.flat(this.x - 2.3, this.z - 4.4, this.x + 2.3, this.z + 4.4, .075, q); }
      const roll = M.clamp(this.lateral * .012, -.1, .1);
      m.box(this.x, this.y + .72 + roll, this.z, w, .78, l, body, 0, ya);
      m.box(this.x, this.y + 1.36 + roll, this.z - .25, w * .86, .62, l * .52, body, 0, ya);
      const gl = C('#193246');
      m.box(this.x, this.y + 1.42 + roll, this.z + l * .17, w * .8, .48, .1, gl, .18, ya);
      m.box(this.x, this.y + 1.42 + roll, this.z - l * .43, w * .8, .46, .1, gl, .18, ya);
      for (const side of [-1, 1]) for (const zz of [-l * .32, l * .32]) {
        const p = tf(side * (w / 2 + .04), zz);
        m.cyl(p[0], this.y + .39, p[1], .4, .26, dark, 0, 8, Math.PI / 8);
      }
      const front = tf(0, l / 2 + .05), rear = tf(0, -l / 2 - .05);
      const bright = pal.neon > .35 ? 1 : .45;
      m.box(front[0], this.y + .85, front[1], 1.2, .22, .15, C('#fff2c4'), bright, ya);
      m.box(rear[0], this.y + .85, rear[1], 1.3, .2, .14, C('#ff4e4e'), .7, ya);
      if (this.spec.kind === 'sport') {
        m.box(this.x, this.y + 1.72, this.z - l * .46, w * .95, .14, .45, body, 0, ya);
        m.box(this.x, this.y + .42, this.z + l * .5, w, .16, .3, dark, 0, ya);
      }
      if (this.police) {
        const on = Math.floor((SB.game ? SB.game.time : 0) * 4 + this.seed) % 2 === 0;
        m.box(this.x, this.y + 1.82, this.z - .2, 1.5, .18, .45, on ? C('#ff3a4a') : C('#263344'), on ? 1 : .1, ya);
        m.box(this.x, this.y + 1.82, this.z + .2, 1.5, .18, .45, on ? C('#263344') : C('#3ba9ff'), on ? .1 : 1, ya);
        m.box(this.x, this.y + .9, this.z + l * .18, w * .9, .5, 1.1, C('#f2f4f6'), 0, ya);
      }
      if (this.boosting) {
        for (const side of [-1, 1]) { const p = tf(side * .55, -l / 2 - .3); m.cone(p[0], this.y + .55, p[1], .22, .8, C('#4de5ff'), 1, 6); }
      }
    }
  }
  V.Vehicle = Vehicle;
})(window.SB = window.SB || {});
