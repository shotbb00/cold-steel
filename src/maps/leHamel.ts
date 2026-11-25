// Le Hamel, 4 July 1918: the Australian Corps' set-piece attack, the battle planned to last ninety
// minutes and taking ninety-three — infantry, tanks, aircraft and guns as one plan, the model for
// Amiens a month later. A quiet sector before it: the lines closer together, the fields still standing
// in midsummer wheat, few shell holes, Vaire Wood and Hamel Wood whole on the plateau above the village.
// (maps/westernFront.ts for the trenches, woods and villages; the ground is this map's own.)
// The real lie of it: the Australians attacked east (on the map from +z), the Somme on their left (−x) in its wide
// marshy flats, the river bending in under the German rear toward Cerisy. Le Hamel lies on the slope down to the
// flats at the head of its own dry valley; Vaire Wood and Hamel Wood stand on the plateau south of it (+x), Pear
// Trench on the plateau's western edge, the Wolfsberg a spur pushing out over the flats east of the village,
// Accroche Wood further east on the plateau. Fair by distance: each side as near to its points (the Germans get the
// Wolfsberg spur over the flats, the Australians the Corbie road ridge and the woods on the plateau).
import { westernFront } from './westernFront.ts';
import { createNoise2D, fbm } from '../world/Noise.js';
import { smoothstep } from '../core/math.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';

const noise = createNoise2D(1907_04);
/** How far into the Somme flats (m, > 0 inside): the river's loop toward Cerisy fills the German rear corner (−x, −z); only a fringe of them runs on up the −x edge. */
const flats = (x: number, z: number) => Math.max(450 + 30 * Math.sin(Math.atan2(z + 640, x + 600) * 7) - Math.hypot(x + 600, (z + 640) * 0.9), -470 - x + 25 * Math.sin(z * 0.01));
/** The dry valleys: Le Hamel's, from the flats up past the village onto the plateau toward the Australian line, and a shallow one behind the Germans. */
const HAMEL_V = [[-330, -170], [-150, -60], [0, 0], [120, 110], [190, 260]];
const VAIRE_V = [[90, -200], [260, -290], [420, -320]];
const RISES = [[-230, -300, 130, 12], [-60, 330, 170, 8], [310, 230, 150, 6], [80, -370, 150, 5], [330, -60, 170, 9]]; // Wolfsberg spur, Corbie road ridge, Pear Trench edge, Accroche rise, the plateau's crown by the woods
const POINTS = [
  { id: 'A', name: 'Aubigny', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Vaire-sous-Corbie', x: -330, z: 320, owner: null, sector: 'west' },
  { id: 'C', name: 'Corbie Road', x: -40, z: 330, owner: null, sector: 'centre' },
  { id: 'D', name: 'Pear Trench', x: 300, z: 250, owner: null, sector: 'east' },
  { id: 'E', name: 'Sailly-Laurette', x: -380, z: 0, owner: null, sector: 'west' },
  { id: 'F', name: 'Le Hamel', x: 0, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Vaire Wood', x: 250, z: 0, owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Wolfsberg', x: -230, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Accroche Wood', x: 60, z: -350, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Hamel Wood', x: 330, z: -250, owner: null, sector: 'east', radius: 26 },
  { id: 'K', name: 'Cerisy', x: 0, z: -470, owner: 'pact', sector: 'centre' },
] as any[];

function raw(x: number, z: number) {
  const f = flats(x, z);
  let h = 1.4 + 20 * smoothstep(0, -240, f);                                                   // up from the flats to the plateau
  h += fbm(noise, x * 0.004, z * 0.004, 3) * 5 * smoothstep(0, -120, f) + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4;
  const v = Math.min(segDist(HAMEL_V, x, z), segDist(VAIRE_V, x, z) + 25);
  h -= 13 * smoothstep(90, 0, v) * smoothstep(20, -80, f);                                    // the dry valleys
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += 0.6 * fbm(noise, x * 0.05 + 3, z * 0.05, 2) * smoothstep(-40, 20, f);                  // the marsh's hummocks
  return Math.max(1, h);
}
const AT = POINTS.map((p) => raw(p.x, p.z));
/** The ground (cached), each point on its own level patch. */
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = raw(x, z);
  POINTS.forEach((p, i) => { h += (AT[i] - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.7; });
  return h;
}, { x: 560, z: 620 }, 4);

const map = westernFront({
  id: 'le-hamel',
  armies: { nato: ['uk'], pact: ['de'] }, // (Monash's Australians, with the Americans, against the German line)
  name: 'Le Hamel',
  description: 'July 1918, a quiet sector in midsummer: the lines close together across standing wheat, the Somme flats on one flank, Le Hamel on the slope above them and Vaire and Hamel Woods whole on the plateau. Little cover in the open, few shell holes — the battle for tanks and infantry working together.',
  seed: 1907,
  points: POINTS,
  hills: [],
  woodsAt: [[250, 0, 72], [330, -250, 66], [60, -350, 66], [-120, 420, 60]], // (Vaire, Hamel, Accroche; the copses on the Corbie road for the Australians)
  lines: [{ z: 110, wireAt: 22, belts: 1, gapEvery: 70, seed: 7 }, { z: 215, wireAt: 16, belts: 1, gapEvery: 60, seed: 41 }],
  front: 110, craters: 1.1, ridge: 0, woods: 0.62,
  town: { quarters: [[40, 14], [-30, -34]], church: { x: -8, z: 18 } },
  ruins: [0.45, 0.12],
  fields: [0.5, 0.15, 0.05, 0.3],   // (midsummer: the wheat standing tall)
  theme: { fogDensity: 0.0009, skyTop: 0x5a7a9a, skyHorizon: 0xc6ccc8, sunColor: 0xfff0d0, sunIntensity: 2.1, sunDisk: 0.16, clouds: 0.35, hemiSky: 0xc8d4dc },
  terrain: { grass: '#5e6a38', grassAlt: '#566034', dryGrass: '#a08e52', stubble: '#b09a58', meadow: '#6e7440', pasture: '#5c6838' },
});

// the Somme flats: wet meadow and reed, darker where the old peat cuttings hold water
map.theme.terrain.surface = (x: number, z: number) => {
  const f = flats(x, z);
  if (f < -30) return null;
  const k = smoothstep(-30, 20, f);
  return fbm(noise, x * 0.012 + 50, z * 0.012, 2) > 0.25 && f > 30 ? [0x2e3c36, 0.95] : [0x7c7a4a, 0.85 * k];
};

export default { ...map, height: (x: number, z: number) => ground(x, z) };
