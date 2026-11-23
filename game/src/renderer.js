// Minimal WebGL renderer: gradient sky, one lit batch for the city, a waving water batch and
// one dynamic batch rebuilt each frame for characters, vehicles, props and particles.
(function (SB) {
  const M = SB.M, R = SB.renderer = {};
  const VS = [
    'precision mediump float;',
    'attribute vec3 aPos; attribute vec3 aNrm; attribute vec4 aCol; attribute float aGlow;',
    'uniform mat4 uVP; uniform float uTime; uniform float uWave;',
    'varying vec4 vCol; varying vec3 vN; varying float vG; varying float vF; varying float vW; varying float vDist;',
    'uniform vec3 uEye; uniform float uFogD;',
    'void main(){ vec3 p=aPos; float w=0.0;',
    ' if(uWave>0.5){ w=sin(p.x*0.075+uTime*1.15)*cos(p.z*0.062-uTime*0.86)*0.34 + sin(p.z*0.14+uTime*0.6)*0.11; p.y+=w; }',
    ' vec4 world=vec4(p,1.0); gl_Position=uVP*world;',
    ' vN=aNrm; vCol=aCol; vG=aGlow; vW=w; vDist=distance(p.xz,uEye.xz);',
    ' vF=clamp(vDist*uFogD,0.0,0.94); }'
  ].join('\n');
  const FS = [
    'precision mediump float;',
    'varying vec4 vCol; varying vec3 vN; varying float vG; varying float vF; varying float vW; varying float vDist;',
    'uniform vec3 uSun,uSunCol,uFog; uniform float uAmb,uNeon,uWave;',
    'void main(){ vec3 n=normalize(vN);',
    ' float d=max(dot(n,normalize(uSun)),0.0);',
    ' float sky=0.5+0.5*n.y;',
    ' vec3 lit=vCol.rgb*(uAmb + d*uSunCol*0.72 + sky*vec3(0.16,0.21,0.30));',
    ' vec3 glow=vCol.rgb*(1.18+uNeon*0.85);',
    ' vec3 col=mix(lit,glow,clamp(vG,0.0,1.0));',
    ' if(uWave>0.5){ col+=vec3(0.06,0.12,0.16)*(vW+0.45); float sh=pow(max(dot(n,normalize(uSun)),0.0),7.0); col+=uSunCol*sh*0.35; }',
    ' col=mix(col,uFog,vF*vF);',
    ' gl_FragColor=vec4(col,vCol.a); }'
  ].join('\n');
  const SKY_VS = 'attribute vec2 aCorner; varying vec2 vUv; void main(){ vUv=aCorner*0.5+0.5; gl_Position=vec4(aCorner,0.999,1.0); }';
  const SKY_FS = [
    'precision mediump float; varying vec2 vUv;',
    'uniform vec3 uTop,uBottom,uSunCol; uniform vec2 uSunPos; uniform float uNight,uTime;',
    'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
    'void main(){ float y=pow(clamp(vUv.y,0.0,1.0),0.72);',
    ' vec3 col=mix(uBottom,uTop,y);',
    ' float sd=distance(vUv*vec2(1.7,1.0),uSunPos*vec2(1.7,1.0));',
    ' col+=uSunCol*exp(-sd*sd*60.0)*0.55;',
    ' col+=uSunCol*exp(-sd*7.0)*0.16;',
    ' vec2 g=floor(vUv*vec2(240.0,135.0)); float star=step(0.9975,hash(g));',
    ' col+=vec3(0.9,0.95,1.0)*star*uNight*(0.55+0.45*sin(uTime*2.0+hash(g+1.0)*30.0))*y;',
    ' gl_FragColor=vec4(col,1.0); }'
  ].join('\n');
  const shader = (gl, type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const program = (gl, vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };

  R.init = (canvas) => {
    R.canvas = canvas;
    const gl = R.gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL is unavailable');
    // Bind fixed locations before linking so the three mesh batches share one attribute setup.
    R.prog = gl.createProgram();
    gl.attachShader(R.prog, shader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(R.prog, shader(gl, gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(R.prog, 0, 'aPos'); gl.bindAttribLocation(R.prog, 1, 'aNrm');
    gl.bindAttribLocation(R.prog, 2, 'aCol'); gl.bindAttribLocation(R.prog, 3, 'aGlow'); gl.linkProgram(R.prog);
    if (!gl.getProgramParameter(R.prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(R.prog));
    R.sky = program(gl, SKY_VS, SKY_FS);
    R.u = {}; ['uVP', 'uTime', 'uWave', 'uEye', 'uFogD', 'uSun', 'uSunCol', 'uFog', 'uAmb', 'uNeon'].forEach((k) => R.u[k] = gl.getUniformLocation(R.prog, k));
    R.su = {}; ['uTop', 'uBottom', 'uSunCol', 'uSunPos', 'uNight', 'uTime'].forEach((k) => R.su[k] = gl.getUniformLocation(R.sky, k));
    R.buf = gl.createBuffer(); R.waterBuf = gl.createBuffer(); R.dynBuf = gl.createBuffer();
    R.corner = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, R.corner);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    R.dynCap = 0;
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    R.right = [1, 0, 0]; R.up = [0, 1, 0];
    R.resize();
  };
  R.uploadStatic = (city, water) => {
    const gl = R.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, R.buf); gl.bufferData(gl.ARRAY_BUFFER, city.data(), gl.STATIC_DRAW); R.cityVerts = city.count;
    gl.bindBuffer(gl.ARRAY_BUFFER, R.waterBuf); gl.bufferData(gl.ARRAY_BUFFER, water.data(), gl.STATIC_DRAW); R.waterVerts = water.count;
  };
  R.resize = () => {
    if (!R.gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(window.innerWidth * dpr)), h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (R.canvas.width === w && R.canvas.height === h) return;
    R.canvas.width = w; R.canvas.height = h; R.w = w; R.h = h; R.aspect = w / h;
    const hud = document.getElementById('hud'); hud.width = w; hud.height = h;
    R.gl.viewport(0, 0, w, h);
  };
  R.setCamera = (cam) => {
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
    const dist = cam.dist;
    R.eye = [cam.x - fx * cp * dist, cam.y + sp * dist + 2.2, cam.z - fz * cp * dist];
    R.cam = cam;
    R.forward = [fx, -sp, fz];
    const view = M.lookAt(R.eye, [cam.x, cam.y, cam.z]);
    R.vp = M.mul(M.perspective(cam.fov || 1.12, R.aspect || 1.7, .12, 1400), view);
    const right = [view[0], view[4], view[8]], up = [view[1], view[5], view[9]];
    R.right = right; R.up = up;
  };
  R.project = (p) => { const q = M.project(R.vp, p); return [(q[0] * .5 + .5) * (R.w || 1280), (-q[1] * .5 + .5) * (R.h || 720), q[2]]; };
  const attribs = (gl, mode) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, mode === 'sky' ? R.corner : R.current);
    gl.enableVertexAttribArray(0);
    if (mode === 'sky') { gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); gl.disableVertexAttribArray(3);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); return; }
    gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2); gl.enableVertexAttribArray(3);
    const s = 44;
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, s, 0); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, s, 12);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, s, 24); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, s, 40);
  };
  R.frame = (dyn, pal, time) => {
    const gl = R.gl;
    if (!R.vp) return;
    gl.clearColor(pal.bottom[0], pal.bottom[1], pal.bottom[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const sun = pal.sun, p = M.project(R.vp, [R.eye[0] + sun[0] * 900, R.eye[1] + sun[1] * 900, R.eye[2] + sun[2] * 900]);
    const sunPos = p[2] > 0 ? [p[0] * .5 + .5, p[1] * .5 + .5] : [sun[0] > 0 ? 2 : -2, .5];
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.useProgram(R.sky);
    gl.uniform3fv(R.su.uTop, pal.top); gl.uniform3fv(R.su.uBottom, pal.bottom); gl.uniform3fv(R.su.uSunCol, pal.sunColor);
    gl.uniform2fv(R.su.uSunPos, sunPos); gl.uniform1f(R.su.uNight, pal.neon * .8); gl.uniform1f(R.su.uTime, time);
    attribs(gl, 'sky'); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.useProgram(R.prog);
    gl.uniformMatrix4fv(R.u.uVP, false, R.vp); gl.uniform1f(R.u.uTime, time);
    gl.uniform3fv(R.u.uEye, R.eye); gl.uniform1f(R.u.uFogD, pal.fogD); gl.uniform3fv(R.u.uSun, sun);
    gl.uniform3fv(R.u.uSunCol, pal.sunColor); gl.uniform3fv(R.u.uFog, pal.fog); gl.uniform1f(R.u.uAmb, pal.amb);
    gl.uniform1f(R.u.uNeon, pal.neon);
    R.current = R.buf; attribs(gl, 'city'); gl.uniform1f(R.u.uWave, 0); gl.drawArrays(gl.TRIANGLES, 0, R.cityVerts || 0);
    R.current = R.waterBuf; attribs(gl, 'city'); gl.uniform1f(R.u.uWave, 1); gl.drawArrays(gl.TRIANGLES, 0, R.waterVerts || 0);
    const data = dyn.data();
    gl.bindBuffer(gl.ARRAY_BUFFER, R.dynBuf);
    if (data.byteLength > R.dynCap) { gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW); R.dynCap = data.byteLength; }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    R.current = R.dynBuf; attribs(gl, 'city'); gl.uniform1f(R.u.uWave, 0); gl.drawArrays(gl.TRIANGLES, 0, dyn.count);
  };
})(window.SB = window.SB || {});
