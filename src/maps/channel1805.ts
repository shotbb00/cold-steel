// The Strait of Dover, 1804–05 (the 1806 sea battles, the campaign's `channel` zone): the Boulogne invasion flotilla
// — prames, gun-brigs, gunboats and péniches, two thousand of them — works its divisions up the French shore from
// Boulogne, Wimereux and Ambleteuse past Cap Gris-Nez toward Calais and the Flemish ports, hugging the coast under
// the batteries of the Camp de Boulogne; the Downs squadron (Lord Keith's frigates, sloops and bomb vessels) comes
// out from the anchorage behind the Goodwin Sands to catch them in the narrows. Laid out from the real waters (north
// at z < 0): the Strait running from the south-west to the north-east across the map, the white cliffs of England
// in the north-west — Folkestone, Dover under its castle, the South Foreland pushing out, the low shore of Deal and
// the Goodwin Sands off it — and the French shore in the south-east — the dunes at Wimereux, Cap Gris-Nez pushing
// out at the narrowest, the high chalk of Cap Blanc-Nez beyond, the Bassure de Baas off Boulogne; the Varne and the
// Ridge (le Colbart), two long banks in mid-strait south-west of the narrows. The batteries and forts are only
// scenery (sea maps are pure sea battles). Laid out at full size (`widened`). Fair by the sailing routes (seapath):
// the homes at the two ends of the Strait, the zones strung across it from off Gris-Nez to the Varne, each as far by
// sail from both. The wind south-south-east, across the Strait: neither fleet has it in his teeth. The flotilla
// sails its prames, bateaux canonniers, chaloupes and péniches, the Downs squadron its bomb vessels, cutters and
// brig-sloops (data/units1806/smallCraft.js; `fleetOrder`: what each AI buys).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1804_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5a5c });
// the ships' names (entities/UnitStack.js shipName): the flotilla's numbered boats, Keith's Downs squadron
Object.assign(sea, {
  names: {
    nato: {
      ptBoat: ['Chaloupe canonnière 1', 'Chaloupe canonnière 2', 'Chaloupe canonnière 3', 'Chaloupe canonnière 4', 'Chaloupe canonnière 5', 'Chaloupe canonnière 6', 'Chaloupe canonnière 7', 'Chaloupe canonnière 8'],
      destroyer: ['Brick canonnier 1', 'Brick canonnier 2', 'Brick canonnier 3', 'Brick canonnier 4', 'Brick canonnier 5', 'Brick canonnier 6'],
      frigate: ['Hortense', 'Volontaire', 'Infatigable'],
      fireship: ['Brûlot 1', 'Brûlot 2', 'Brûlot 3'],
    },
    pact: {
      frigate: ['Immortalité', 'Leda', 'Amazon', 'Castor', 'Hydra', 'Minerva'],
      destroyer: ['Harpy', 'Bloodhound', 'Archer', 'Conflict', 'Cruizer', 'Rattler', 'Starling', 'Autumn'],
      fireship: ['Catamaran 1', 'Catamaran 2', 'Catamaran 3', 'Catamaran 4'],
      ptBoat: ['Gun-boat 1', 'Gun-boat 2', 'Gun-boat 3', 'Gun-boat 4'],
      cruiser: ['Monarch', 'Leopard', 'Antelope', 'Utrecht'],
    },
  },
});

// the Strait's own frame: u along it (north-east +), v across it (toward France +)
const R = Math.SQRT1_2;
const UV = (x: number, z: number) => ({ u: (x - z) * R, v: (x + z) * R });
const XZ = (u: number, v: number) => ({ x: (u + v) * R, z: (v - u) * R });
const bump = (t: number, w: number) => Math.max(0, 1 - (t / w) ** 2) ** 1.5;
/** England's shore (v) at u: Folkestone, Dover's bay, the South Foreland pushing out, Deal's low shore falling back. */
const englandV = (u: number) => -1750 + 260 * bump(u - 850, 520) - 90 * bump(u + 50, 220) - Math.max(0, u - 1700) * 0.12 - Math.max(0, -1600 - u) * 0.1 + fbm(noise, u * 0.0012, 2.9, 3) * 80;
/** France's shore (v) at u: the dunes at Wimereux, Cap Gris-Nez pushing out, Cap Blanc-Nez, Calais's sands falling back. */
const franceV = (u: number) => 1750 - 470 * bump(u + 250, 640) - 170 * bump(u - 1450, 450) + Math.max(0, u - 2100) * 0.12 + fbm(noise, u * 0.0012, 5.3, 3) * 80;
/** A long bank in the Strait: centre (u, v), half length and width, its top (m). */
const BANKS = [
  { u: -1150, v: -480, l: 760, w: 110, top: -1.5 },        // the Varne
  { u: -800, v: 300, l: 820, w: 110, top: -2 },            // the Ridge (le Colbart)
  { u: 2950, v: -800, l: 900, w: 190, top: 0.6 },          // the Goodwin Sands, dry at low water
  { u: -2950, v: 900, l: 700, w: 140, top: -1.8 },         // the Bassure de Baas off Boulogne
];
const bank = (u: number, v: number) => {
  let m = -1, top = 0;
  for (const b of BANKS) { const k = 1 - Math.hypot((u - b.u) / b.l, (v - b.v) / b.w); if (k > m) { m = k; top = b.top; } }
  return { m, top };
};

function height(x: number, z: number) {
  const { u, v } = UV(x, z);
  // the Strait: forty to fifty metres in mid-channel, shoaling toward both shores
  let h = -46 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 6 + Math.max(0, Math.abs(v) - 600) * 0.012;
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, wob = fbm(noise, x * 0.002, z * 0.002, 3);
  // the white cliffs: high chalk from Folkestone round to the Foreland, low by Deal
  const eTop = ((u > 1900 ? 12 : 105) + wob * 40) * (1 - 0.75 * bump(u + 50, 280));   // (Dover in the Dour's gap)
  h = Math.max(h, shore(englandV(u) - v + wob * 60, eTop, n, u > 1900 ? 50 : 12));
  // the French shore: dunes at Wimereux and toward Calais, the capes high
  const fTop = 25 + 60 * bump(u + 250, 700) + 120 * bump(u - 1450, 650) + wob * 20;
  h = Math.max(h, shore(v - franceV(u) + wob * 60, fTop, n, fTop > 60 ? 14 : 55));
  // the banks
  const b = bank(u, v);
  if (b.m > -0.35) {
    h += (b.top - 2.5 + wob - h) * Math.min(1, (b.m + 0.35) / 0.35);
    if (b.m > 0) h = Math.max(h, b.top + Math.min(1, b.m * 3));
  }
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'The flotilla', ...XZ(-2550, 1150), owner: 'nato', sector: 'west', radius: 170 },
  { id: 'B', name: 'Off Cap Gris-Nez', x: 677, z: 420, owner: null, sector: 'centre', radius: 190 },
  { id: 'C', name: 'The narrows', x: 214, z: 151, owner: null, sector: 'centre', radius: 190 },
  { id: 'D', name: 'The Varne', x: -866, z: -161, owner: null, sector: 'centre', radius: 190 },
  { id: 'K', name: 'The Downs squadron', ...XZ(2550, -1250), owner: 'pact', sector: 'east', radius: 170 },
];

// a division in line abreast across its line of advance, 150 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 150;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});
const NE = Math.PI * 0.75, SW = -Math.PI / 4; // (up and down the Strait)

export default {
  id: 'channel-1805',
  name: 'The Boulogne Flotilla',
  description: 'The Strait of Dover, 1804–05: the Boulogne flotilla’s gunboats and brigs work up the French shore past Cap Gris-Nez; the Downs squadron’s frigates and sloops come out from behind the Goodwins to catch them in the narrows. Dover’s white cliffs to the north-west, the Varne and the Ridge in mid-strait.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'europe',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 155, speed: 7, veer: 0.3 },     // south-south-east, across the Strait (world/Wind.js)
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] },
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180410,
  height,
  river: sea,

  theme: {
    // a bright Channel day, the chalk white in the sun, the water green-grey over the sand
    fogColor: 0xb4c4cc, fogDensity: 0.00018,
    skyTop: 0x4f7ca8, skyHorizon: 0xc8d6e0, skyBottom: 0x8aa4b6,
    sunColor: 0xfff2de, sunIntensity: 1.9, sunDisk: 0.55,
    clouds: 0.45, cloudLight: 0xf4f6f8, cloudDark: 0xa0acb6,
    sunDir: [-0.4, 0.55, 0.4],
    hemiSky: 0xcad6e2, hemiGround: 0x5a6450, hemiIntensity: 1.25,
    rimColor: 0xeef2f6, rimIntensity: 0.25,
    terrain: {
      grass: '#647444', grassAlt: '#6e7c4a', dryGrass: '#9a9466', dirt: '#7a6c52', rock: '#c8c2b0',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 25) return [0x667446, 1];                        // the downs behind the cliffs, the camp's ground
        if (y > 4) return UV(x, z).v < 0 ? [0xd8d6cc, 1] : [0xc4b88e, 1]; // England's white chalk faces, the French dunes and cliffs
        return y > 0.5 ? [0xc8b890, 1] : [0xa89a76, 1];          // the beach, the sand at the water
      },
    },
  },

  bases: { nato: { ...XZ(-2800, 1150), entries: [-300, 0, 300] }, pact: { ...XZ(2800, -1250), entries: [-300, 0, 300] } },
  maxStacks: 10,
  cameraStart: { nato: XZ(-2100, 1000), pact: XZ(2100, -1100) },
  points,

  spawns: {
    nato: line(['peniche', 'gunVessel', 'prame', 'ptBoat', 'peniche'], XZ(-2400, 400).x, XZ(-2400, 400).z, NE),
    pact: line(['cutter', 'bombVessel', 'destroyer', 'cutter'], XZ(2400, -350).x, XZ(2400, -350).z, SW),
  },
  // the AI's buying (ai/SeaDirector.js): the flotilla's craft and its few frigates; Keith's sloops, cutters and bombs, a 74 now and then
  fleetOrder: {
    fr: ['gunVessel', 'ptBoat', 'prame', 'peniche', 'destroyer', 'gunVessel', 'frigate', 'ptBoat', 'peniche', 'prame', 'fireship', 'gunVessel'],
    gb: ['cutter', 'destroyer', 'frigate', 'bombVessel', 'lugger', 'destroyer', 'frigate', 'cutter', 'fireship', 'cruiser', 'destroyer', 'bombVessel'],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const E = (u: number, k: number) => XZ(u, englandV(u) - k), F = (u: number, k: number) => XZ(u, franceV(u) + k);
    const yaw = Math.PI / 4;
    const houses = (at: (u: number, k: number) => { x: number; z: number }, u0: number, u1: number, k0: number, k1: number, n: number, town: boolean) => {
      for (let i = 0; i < n; i++) {
        const p = at(u0 + rand() * (u1 - u0), k0 + rand() * (k1 - k0)), y = height(p.x, p.z);
        if (y < 3 || y > 70) continue;
        if (town) props.townHouse({ ...p, yaw: yaw + (rand() - 0.5) * 0.3, width: 8 + rand() * 3, depth: 9, storeys: 2 + Math.floor(rand() * 2), damaged: 0 });
        else props.house({ ...p, yaw: yaw + (rand() - 0.5) * 0.5, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
      }
    };
    // Dover in the gap of its valley, the castle on the cliff east of it, the South Foreland's lights; Folkestone; Deal and its castle
    houses(E, -260, 140, 40, 380, 60, true);
    props.church(E(-60, 300));
    props.tower(E(220, 260));
    props.tower(E(850, 90));
    houses(E, -2500, -1900, 40, 300, 22, false);
    houses(E, 1950, 2500, 50, 260, 26, false);
    { const c = E(2250, 60); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; props.lowWall({ x: c.x + Math.cos(a) * 24, z: c.z + Math.sin(a) * 24, yaw: a + Math.PI / 2, length: 24, height: 3, color: 0x8a8478 }); } }
    // Wimereux and Ambleteuse, the flotilla's lesser harbours, the Camp de Boulogne's huts on the heights above them
    houses(F, -2650, -2250, 40, 300, 24, false);
    houses(F, -1850, -1550, 40, 260, 16, false);
    for (let r = 0; r < 5; r++) for (let i = 0; i < 16; i++) {
      const p = F(-2350 + i * 50, 480 + r * 45);
      if (height(p.x, p.z) > 6) props.flatHouse({ ...p, yaw, width: 12, depth: 5 });
    }
    // the Vauban tower of Ambleteuse on the beach, the signal post on Gris-Nez, a church at Audinghen, Wissant and Sangatte
    props.tower(F(-1700, 5));
    props.tower(F(-250, 70));
    props.church(F(-300, 600));
    houses(F, 500, 800, 40, 240, 14, false);
    houses(F, 2200, 2600, 40, 240, 14, false);
    // the coast batteries (scenery): earthwork rings on the cliff tops at Wimereux, Ambleteuse and Gris-Nez
    for (const u of [-2150, -1300, -250]) for (let k = 0; k < 6; k++) {
      const c = F(u, 80), a = k * Math.PI / 3; props.lowWall({ x: c.x + Math.cos(a) * 22, z: c.z + Math.sin(a) * 22, yaw: a + Math.PI / 2, length: 22, height: 1.8, color: 0x7a6a4a });
    }
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 500, broadleaf: 0.7, autumn: 0.2, maxY: 200, size: 1,
      avoid: [{ test: (x: number, z: number) => { const { u, v } = UV(x, z); return terrain.heightAt(x, z) < 10 || (v < 0 ? v > englandV(u) - 420 : v < franceV(u) + 750); } }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
