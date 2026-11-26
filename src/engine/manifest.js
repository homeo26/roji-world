// Every place and every 3D minigame in Roji World, and where each place sits on the map.
//
// slot: centre of the place's footprint in world metres [x, z]. size: [width, depth].
// Every place faces +Z (south, toward the camera and its street). Its pad, where the card
// opens, sits just in front: [x, z + depth / 2 + 1.2], on the 2 m verge between the front and the curb.
// A module that does not exist yet is skipped, so the game runs while places are being built.

export const PLACES = [
  // Roji's home is in the middle of the island, with the weekend journey round it (PADS in src/world.js).
  // The city round it: the north row on the first street (z -38.2) with the ski hill at the north end,
  // Odeh's hill by the west shore and the pool on the west street (z 2), football and Tech Hub on the east
  // street (z 2), the school on the east lane (z 32), and the south row on the seaside promenade (z 66.75),
  // where the harbour's pier reaches into the sea.
  { id: 'home', module: '../places/home.js', slot: [0, -4.2], size: [16, 10], replaces: 'home' },
  { id: 'zoo', module: '../places/zoo.js', slot: [18.1, 51.65], size: [24, 20] },
  { id: 'hospital', module: '../places/hospital.js', slot: [-81.85, -51.3], size: [22, 16] },
  { id: 'pool', module: '../places/pool.js', slot: [-50.5, -14.1], size: [24, 22] },
  { id: 'tech', module: '../places/tech.js', slot: [95.5, -11.1], size: [20, 16] },
  { id: 'football', module: '../places/football.js', slot: [63.5, -12.1], size: [28, 18] },
  { id: 'karting', module: '../places/karting.js', slot: [-46.85, -56.3], size: [32, 26] },
  { id: 'driving', module: '../places/driving.js', slot: [56.15, -55.3], size: [30, 24] },
  { id: 'school', module: '../places/school.js', slot: [87, 17.9], size: [22, 18] },
  { id: 'ski', module: '../places/ski.js', slot: [5.15, -58.3], size: [56, 30] },
  { id: 'cycling', module: '../places/cycling.js', slot: [50.4, 53.65], size: [24, 16] },
  { id: 'picnic', module: '../places/picnic.js', slot: [-38.4, 52.65], size: [22, 18] },
  { id: 'odeh', module: '../places/odeh.js', slot: [-85, -18.1], size: [24, 30] },
  { id: 'harbour', module: '../places/harbour.js', slot: [88, 56.55], size: [30, 12] },
  { id: 'park', module: '../places/park.js', slot: [-77, 34.65], size: [34, 54] },
  { id: 'example', module: '../places/example.js', slot: [0, 0], size: [14, 10], dev: true },
];

// Interiors for buildings that already stand on the map (built in stations.js / places.js).
// door: world [x, z] of the front door. The module default-exports { title, build(ctx) }.
export const INTERIORS = [
  { id: 'cinema', module: '../interiors/cinema.js', door: [-12, 15.5] },
  { id: 'yumyum', module: '../interiors/yumyum.js', door: [-21, -2.4] },
  { id: 'clay', module: '../interiors/clay.js', door: [38.95, -24.8] },
];

// Town life modules (src/engine/life.js): small moments layered on the whole game.
// Weekend stops rebuilt as their own modules. A missing module keeps the old diorama from src/stations.js.
// Default export: { build(st, scene) -> { badgeY?, update?(dt, t, near, onPad), dynamic? }, interior?, door? }
// build() gets the Station (st.group sits at st.origin; st.addCollider takes coordinates relative to the
// origin). interior is an interior definition like the default export of src/interiors/*.js, and door is
// its door in world metres [x, z]; the stop's card then offers "Go inside".
export const STOP_MODULES = [
  { id: 'horse', module: '../stops/horse.js' },
  { id: 'fencing', module: '../stops/fencing.js' },
  { id: 'boardgames', module: '../stops/boardgames.js' },
  { id: 'clay', module: '../stops/clay.js' },
  { id: 'drawing', module: '../stops/drawing.js' },
  { id: 'plaza', module: '../stops/plaza.js' },
];

export const LIFE = [
  { id: 'love', module: '../life/love.js' },
  { id: 'npcs', module: '../life/npcs.js' },
];

// 3D minigames. place: the stop or place whose card offers it.
export const ARENAS = [
  { id: 'horserace', module: '../arena/horserace.js', place: 'horse' },
  { id: 'fencing', module: '../arena/fencing.js', place: 'fencing' },
  { id: 'tictactoe', module: '../arena/tictactoe.js', place: 'boardgames' },
  { id: 'connect4', module: '../arena/connect4.js', place: 'boardgames' },
  { id: 'snakes', module: '../arena/snakes.js', place: 'boardgames' },
  { id: 'rps', module: '../arena/rps.js', place: 'boardgames' },
  { id: 'memory', module: '../arena/memory.js', place: 'plaza' },
  { id: 'cooking', module: '../arena/cooking.js', place: 'yumyum' },
  { id: 'popcorn', module: '../arena/popcorn.js', place: 'cinema' },
  { id: 'pottery', module: '../arena/pottery.js', place: 'clay' },
  { id: 'drawpad', module: '../arena/drawpad.js', place: 'drawing' },
  { id: 'skirace', module: '../arena/skirace.js', place: 'ski' },
  { id: 'kartrace', module: '../arena/kartrace.js', place: 'karting' },
  { id: 'football', module: '../arena/football.js', place: 'football' },
  { id: 'cyclerace', module: '../arena/cyclerace.js', place: 'cycling' },
  { id: 'drivinglesson', module: '../arena/drivinglesson.js', place: 'driving' },
  { id: 'patients', module: '../arena/patients.js', place: 'hospital' },
  { id: 'coding', module: '../arena/coding.js', place: 'tech' },
  { id: 'fishing', module: '../arena/fishing.js', place: 'harbour' },
  { id: 'giraffes', module: '../arena/giraffes.js', place: 'zoo' },
  { id: 'coaster', module: '../arena/coaster.js', place: 'park' },
  { id: 'parkgames', module: '../arena/parkgames.js', place: 'park' },
  { id: 'swimrace', module: '../arena/swimrace.js', place: 'pool' },
  { id: 'bumpercars', module: '../arena/bumpercars.js', place: 'park' },
  { id: 'logflume', module: '../arena/logflume.js', place: 'park' },
  { id: 'ghosttrain', module: '../arena/ghosttrain.js', place: 'park' },
  { id: 'parade', module: '../arena/parade.js', place: 'park' },
  { id: 'example', module: '../arena/example.js', place: 'example', dev: true },
];

export const padOf = (p) => [p.slot[0], p.slot[1] + p.size[1] / 2 + 1.2];
