// Named neighbourhoods, their bounds and the palette used when they are described in the HUD.
(function (SB) {
  const M = SB.M;
  const D = SB.districts = [
    { name: 'PALM ESPLANADE', bounds: [58, 102, -190, 130], tint: '#ffd89a', tag: 'oceanfront' },
    { name: 'SOLARA HEIGHTS', bounds: [-70, 58, -150, 30], tint: '#7fd8ff', tag: 'downtown' },
    { name: 'OLD QUARTER', bounds: [-190, -70, -130, 60], tint: '#ff9bd0', tag: 'markets' },
    { name: 'HARBOR POINT', bounds: [90, 300, -120, 30], tint: '#9affd8', tag: 'bridge & island' },
    { name: 'SUNSET FLATS', bounds: [-190, 60, 30, 150], tint: '#ffb26b', tag: 'beaches' },
    { name: 'CIVIC PLAZA', bounds: [-70, -10, -50, 20], tint: '#fff1a8', tag: 'landmark' },
  ];
  D.at = (x, z) => D.find((d) => M.inside(x, z, d.bounds)) || D[1];
  D.spawn = { x: 68, z: 34 };
  D.bounds = { minX: -210, maxX: 300, minZ: -200, maxZ: 160 };
})(window.SB = window.SB || {});
