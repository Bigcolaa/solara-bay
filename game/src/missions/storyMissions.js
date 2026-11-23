// Five sequential original contracts with waypoints, conditions and escalating payouts.
(function (SB) {
  const L = SB.city.landmarks;
  SB.story = [
    { id: 'sunset', title: 'SUNSET DELIVERY', brief: 'Pick up the package at the plaza, run it down to the pier, then park it at the garage.',
      payout: 2600, wanted: 0, stages: [
        { type: 'goto', x: L.plaza.x, z: L.plaza.z, r: 10, label: 'MEET CONTACT AT CIVIC PLAZA' },
        { type: 'goto', x: L.pier.x + 40, z: L.pier.z, r: 13, label: 'DELIVER TO THE FISHING PIER' },
        { type: 'goto', x: L.garage.x, z: L.garage.z, r: 14, label: 'PARK AT THE GARAGE' }] },
    { id: 'harbor', title: 'HARBOR HANDSHAKE', brief: 'Take a work van out to the island, then break the heat before returning to the plaza.',
      payout: 4800, wanted: 1, stages: [
        { type: 'vehicle', id: 'tidevan', label: 'FIND A TIDELINE VAN' },
        { type: 'goto', x: L.island.x, z: L.island.z, r: 26, label: 'REACH HARBOR POINT ISLAND' },
        { type: 'escape', label: 'LOSE THE PURSUIT' },
        { type: 'goto', x: L.plaza.x, z: L.plaza.z, r: 12, label: 'RETURN TO CIVIC PLAZA' }] },
    { id: 'neon', title: 'NEON MILE RUSH', brief: 'Visit the club, launch the stunt ramp and get airborne before hitting the night strip.',
      payout: 7200, wanted: 2, stages: [
        { type: 'goto', x: L.club.x, z: L.club.z, r: 14, label: 'CHECK IN AT THE NEON CLUB' },
        { type: 'jump', label: 'LAUNCH THE STUNT RAMP' },
        { type: 'goto', x: L.race.x, z: L.race.z - 90, r: 14, label: 'REACH THE COASTAL STRIP' }] },
    { id: 'shakedown', title: 'SKYLINE SHAKEDOWN', brief: 'Clear the worksite crates, then vanish into the downtown crowds.',
      payout: 9500, wanted: 3, stages: [
        { type: 'goto', x: -20, z: -100, r: 16, label: 'ARRIVE AT THE WORKSITE' },
        { type: 'shoot', count: 2, label: 'BREAK THE MARKED CRATES' },
        { type: 'escape', label: 'LOSE THE HEAT' }] },
    { id: 'finale', title: 'BAY FINALE', brief: 'One last run: the plaza, the island, a clean escape and back to the garage.',
      payout: 18000, wanted: 4, stages: [
        { type: 'goto', x: L.plaza.x, z: L.plaza.z, r: 12, label: 'START AT CIVIC PLAZA' },
        { type: 'goto', x: L.island.x, z: L.island.z, r: 26, label: 'CROSS THE CAUSEWAY' },
        { type: 'escape', label: 'SURVIVE THE PURSUIT' },
        { type: 'goto', x: L.garage.x, z: L.garage.z, r: 14, label: 'FINISH AT THE GARAGE' }] },
  ];
})(window.SB = window.SB || {});
