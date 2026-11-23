// Tiny WebGL2 immediate renderer: one lit shader, procedural texture atlas, no libraries.
import { TAU } from './math.js';

export class Batch {
  constructor(cap = 60000) { this.a = new Float32Array(cap * 12); this.n = 0; this.cap = cap; }
  reset() { this.n = 0; }
  vert(x, y, z, nx, ny, nz, r, g, b, a, u = 0, v = 0) {
    if (this.n >= this.cap) return;
    const o = this.n++ * 12, d = this.a;
    d[o] = x; d[o + 1] = y; d[o + 2] = z;
    d[o + 3] = nx; d[o + 4] = ny; d[o + 5] = nz;
    d[o + 6] = r; d[o + 7] = g; d[o + 8] = b; d[o + 9] = a;
    d[o + 10] = u; d[o + 11] = v;
  }
}
const C = (hex) => typeof hex === 'string' ? [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255] : hex;
const col = (c) => Array.isArray(c) ? c : C(c);

export function quad(b, x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, color, uv) {
  const c = col(color), U = uv || [0, 0, 1, 1];
  const ux = x1 - x0, uy = y1 - y0, uz = z1 - z0, vx = x3 - x0, vy = y3 - y0, vz = z3 - z0;
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  const vs = [[x0, y0, z0, U[0], U[1]], [x1, y1, z1, U[2], U[1]], [x2, y2, z2, U[2], U[3]], [x0, y0, z0, U[0], U[1]], [x2, y2, z2, U[2], U[3]], [x3, y3, z3, U[0], U[3]]];
  for (const p of vs) b.vert(p[0], p[1], p[2], nx, ny, nz, c[0], c[1], c[2], c.length > 3 ? c[3] : 1, p[3], p[4]);
}
export function groundQuad(b, x, z, w, d, y, color, uv) { quad(b, x - w / 2, y, z - d / 2, x + w / 2, y, z - d / 2, x + w / 2, y, z + d / 2, x - w / 2, y, z + d / 2, color, uv); }

export function box(b, x, y, z, w, h, d, color, uv, rot = 0) {
  const c = col(color), a = c.length > 3 ? c[3] : 1;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (px, py, pz) => [x + px * cs + pz * sn, y + py, z - px * sn + pz * cs];
  const X = w / 2, Y = h / 2, Z = d / 2;
  const face = (v, n, u) => { for (const q of v) { const w3 = p(q[0], q[1], q[2]); b.vert(w3[0], w3[1], w3[2], n[0] * cs + n[2] * sn, n[1], -n[0] * sn + n[2] * cs, c[0], c[1], c[2], a, u ? (q[3] || 0) : 0, u ? (q[4] || 0) : 0); } };
  face([[-X, -Y, Z, 0, 0], [X, -Y, Z, 1, 0], [X, Y, Z, 1, 1], [-X, -Y, Z, 0, 0], [X, Y, Z, 1, 1], [-X, Y, Z, 0, 1]], [0, 0, 1], uv);
  face([[X, -Y, -Z, 0, 0], [-X, -Y, -Z, 1, 0], [-X, Y, -Z, 1, 1], [X, -Y, -Z, 0, 0], [-X, Y, -Z, 1, 1], [X, Y, -Z, 0, 1]], [0, 0, -1], uv);
  face([[X, -Y, Z, 0, 0], [X, -Y, -Z, 1, 0], [X, Y, -Z, 1, 1], [X, -Y, Z, 0, 0], [X, Y, -Z, 1, 1], [X, Y, Z, 0, 1]], [1, 0, 0], uv);
  face([[-X, -Y, -Z, 0, 0], [-X, -Y, Z, 1, 0], [-X, Y, Z, 1, 1], [-X, -Y, -Z, 0, 0], [-X, Y, Z, 1, 1], [-X, Y, -Z, 0, 1]], [-1, 0, 0], uv);
  face([[-X, Y, Z, 0, 0], [X, Y, Z, 1, 0], [X, Y, -Z, 1, 1], [-X, Y, Z, 0, 0], [X, Y, -Z, 1, 1], [-X, Y, -Z, 0, 1]], [0, 1, 0], uv);
  face([[-X, -Y, -Z, 0, 0], [X, -Y, -Z, 1, 0], [X, -Y, Z, 1, 1], [-X, -Y, -Z, 0, 0], [X, -Y, Z, 1, 1], [-X, -Y, Z, 0, 1]], [0, -1, 0], uv);
}

export function cyl(b, x, y, z, r, h, color, sides = 10) {
  const c = col(color), a = c.length > 3 ? c[3] : 1;
  for (let i = 0; i < sides; i++) {
    const t0 = i / sides * TAU, t1 = (i + 1) / sides * TAU;
    const x0 = x + Math.cos(t0) * r, z0 = z + Math.sin(t0) * r, x1 = x + Math.cos(t1) * r, z1 = z + Math.sin(t1) * r;
    quad(b, x0, y - h / 2, z0, x1, y - h / 2, z1, x1, y + h / 2, z1, x0, y + h / 2, z0, c);
    b.vert(x, y + h / 2, z, 0, 1, 0, c[0], c[1], c[2], a);
    b.vert(x0, y + h / 2, z0, 0, 1, 0, c[0], c[1], c[2], a);
    b.vert(x1, y + h / 2, z1, 0, 1, 0, c[0], c[1], c[2], a);
  }
}
export function cone(b, x, y, z, r, h, color, sides = 12, up = true) {
  const c = col(color), a = c.length > 3 ? c[3] : 1, by = up ? y - h / 2 : y + h / 2, ty = up ? y + h / 2 : y - h / 2;
  for (let i = 0; i < sides; i++) {
    const t0 = i / sides * TAU, t1 = (i + 1) / sides * TAU;
    b.vert(x + Math.cos(t0) * r, by, z + Math.sin(t0) * r, 0, 1, 0, c[0], c[1], c[2], a);
    b.vert(x + Math.cos(t1) * r, by, z + Math.sin(t1) * r, 0, 1, 0, c[0], c[1], c[2], a);
    b.vert(x, ty, z, 0, 1, 0, c[0], c[1], c[2], a);
  }
}
export function segment(b, ax, ay, az, bx, by, bz, w, color) {
  let dx = bx - ax, dy = by - ay, dz = bz - az; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
  let rx = dz, ry = 0, rz = -dx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const ux = ry * dz - rz * dy, uy = rz * dx - rx * dz, uz = rx * dy - ry * dx, h = w / 2;
  quad(b, ax + rx * h, ay + ry * h, az + rz * h, bx + rx * h, by + ry * h, bz + rz * h,
    bx - rx * h + ux * h, by - ry * h + uy * h, bz - rz * h + uz * h, ax - rx * h + ux * h, ay - ry * h + uy * h, az - rz * h + uz * h, color);
  quad(b, ax - rx * h - ux * h, ay - ry * h - uy * h, az - rz * h - uz * h, bx - rx * h - ux * h, by - ry * h - uy * h, bz - rz * h - uz * h,
    bx + rx * h, by + ry * h, bz + rz * h, ax + rx * h, ay + ry * h, az + rz * h, color);
}

const MAIN_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNormal; layout(location=2) in vec4 aColor; layout(location=3) in vec2 aUv;
uniform mat4 uVP; out vec3 vWorld; out vec3 vNormal; out vec4 vColor; out vec2 vUv;
void main(){ vWorld=aPos; vNormal=aNormal; vColor=aColor; vUv=aUv; gl_Position=uVP*vec4(aPos,1.0); }`;
const MAIN_FS = `#version 300 es
precision highp float;
in vec3 vWorld; in vec3 vNormal; in vec4 vColor; in vec2 vUv;
uniform vec3 uEye,uSun,uFog,uSky; uniform float uNight,uDusk,uTime,uMode; uniform sampler2D uDay,uNightTex;
out vec4 outColor;
void main(){
  if(uMode>2.5 && uMode<3.5){
    if(vWorld.z > -116.0) discard;
    if(abs(vWorld.x)<123.0 && vWorld.z>-132.0) discard;
    float wave=sin(vWorld.x*0.12+uTime*1.8)*0.5+sin(vWorld.z*0.21-uTime*1.3)*0.5;
    vec3 deep=mix(vec3(0.035,0.16,0.24),vec3(0.015,0.05,0.11),uNight);
    vec3 c=deep+vec3(0.03,0.07,0.08)*(wave*0.5+0.5)+uSky*0.08;
    outColor=vec4(c,1.0); return;
  }
  vec3 n=normalize(vNormal);
  float d=max(dot(n,normalize(uSun)),0.0);
  vec3 lit=vColor.rgb*(0.46+0.54*(1.0-uNight*0.55))+vColor.rgb*d*(0.52-0.34*uNight);
  if(uMode>0.5 && uMode<1.5){
    vec4 day=texture(uDay,vUv), night=texture(uNightTex,vUv);
    vec4 t=mix(day,night,uNight);
    lit=mix(lit*t.rgb,t.rgb*(0.62+0.5*d),uNight*0.72);
  }
  if(uMode>1.5 && uMode<2.5) lit=vColor.rgb;
  float fog=1.0-exp(-length(vWorld-uEye)*(0.0016+0.0009*uNight));
  lit=mix(lit,uFog,clamp(fog,0.0,0.82));
  outColor=vec4(lit,vColor.a);
}`;
const SKY_VS = `#version 300 es
precision highp float; layout(location=0) in vec2 aPos; out vec2 vUv;
void main(){ vUv=aPos*0.5+0.5; gl_Position=vec4(aPos,0.9999,1.0); }`;
const SKY_FS = `#version 300 es
precision highp float; in vec2 vUv; uniform float uNight,uDusk; out vec4 outColor;
void main(){
  vec3 dayTop=vec3(0.24,0.51,0.79), dayLow=vec3(0.68,0.79,0.85);
  vec3 duskTop=vec3(0.20,0.18,0.42), duskLow=vec3(0.94,0.48,0.28);
  vec3 nightTop=vec3(0.015,0.025,0.075), nightLow=vec3(0.09,0.08,0.17);
  vec3 top=mix(mix(dayTop,duskTop,uDusk),nightTop,uNight);
  vec3 low=mix(mix(dayLow,duskLow,uDusk),nightLow,uNight);
  float t=pow(clamp(vUv.y,0.0,1.0),0.7);
  vec3 c=mix(low,top,t);
  float sx=0.76,sy=0.28+0.18*uDusk;
  float sun=exp(-pow((vUv.x-sx)*5.5,2.0)-pow((vUv.y-sy)*9.0,2.0))*(1.0-uNight)*0.55;
  c+=vec3(1.0,0.68,0.35)*sun;
  outColor=vec4(c,1.0);
}`;

function program(gl, vs, fs) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

export class Renderer {
  constructor(canvas, texDay, texNight) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl; this.canvas = canvas;
    this.main = program(gl, MAIN_VS, MAIN_FS); this.sky = program(gl, SKY_VS, SKY_FS);
    this.u = {}; for (const k of ['uVP', 'uEye', 'uSun', 'uFog', 'uSky', 'uNight', 'uDusk', 'uTime', 'uMode', 'uDay', 'uNightTex']) this.u[k] = gl.getUniformLocation(this.main, k);
    this.su = { night: gl.getUniformLocation(this.sky, 'uNight'), dusk: gl.getUniformLocation(this.sky, 'uDusk') };
    this.buf = gl.createBuffer(); this.static = new Map();
    this.skyBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
    this.texDay = this.texture(texDay); this.texNight = this.texture(texNight);
    this.solid = new Batch(90000); this.tex = new Batch(40000); this.trans = new Batch(14000); this.water = new Batch(600);
  }
  texture(canvas) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D); return t;
  }
  uploadStatic(name, batch) {
    const gl = this.gl, b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, batch.a.subarray(0, batch.n * 12), gl.STATIC_DRAW);
    this.static.set(name, { b, n: batch.n }); return name;
  }
  drawRaw(buffer, n) {
    if (!n) return; const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const S = 48;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, S, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, S, 40);
    gl.drawArrays(gl.TRIANGLES, 0, n);
  }
  drawDynamic(batch, mode) {
    const gl = this.gl; gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, batch.a.subarray(0, batch.n * 12), gl.DYNAMIC_DRAW);
    gl.uniform1f(this.u.uMode, mode); this.drawRaw(this.buf, batch.n);
  }
  drawStatic(name, mode) {
    const s = this.static.get(name); if (!s || !s.n) return;
    const gl = this.gl; gl.uniform1f(this.u.uMode, mode); this.drawRaw(s.b, s.n);
  }
  begin(vp, eye, env) {
    const gl = this.gl, c = this.canvas;
    gl.viewport(0, 0, c.width, c.height); gl.clearColor(env.fog[0], env.fog[1], env.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.useProgram(this.sky);
    gl.uniform1f(this.su.night, env.night); gl.uniform1f(this.su.dusk, env.dusk);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.useProgram(this.main);
    gl.uniformMatrix4fv(this.u.uVP, false, vp);
    gl.uniform3fv(this.u.uEye, eye); gl.uniform3fv(this.u.uSun, env.sun);
    gl.uniform3fv(this.u.uFog, env.fog); gl.uniform3fv(this.u.uSky, env.sky);
    gl.uniform1f(this.u.uNight, env.night); gl.uniform1f(this.u.uDusk, env.dusk); gl.uniform1f(this.u.uTime, env.time);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texDay); gl.uniform1i(this.u.uDay, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texNight); gl.uniform1i(this.u.uNightTex, 1);
  }
  flush() {
    const gl = this.gl;
    this.drawStatic('solid', 0); this.drawStatic('tex', 1); this.drawStatic('water', 3);
    this.drawDynamic(this.solid, 0); this.drawDynamic(this.tex, 1);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.uniform1f(this.u.uMode, 2); this.drawStatic('trans', 2); this.drawDynamic(this.trans, 2);
    gl.depthMask(true); gl.disable(gl.BLEND);
  }
}
