// The Sea of Japan, 1985: the Soviet Pacific Fleet comes south out of Vladivostok — the Kiev-class carrier
// group, the cruisers, the submarines — to break out through the Tsushima Strait; the US Seventh Fleet's
// carrier group comes north up the strait from Sasebo to stop it. The Korean east coast along the west edge:
// the Taebaek mountains falling steep and wooded to the sea, Donghae's port in the north, Pohang's steel works
// on Yeongil Bay in the south. The San’in coast of Honshu along the east, low and green, the Oki islands off
// it — round, high Dōgo and the three Dōzen islands round their bay. Out in the middle Ulleungdo, a steep
// volcanic cone with its harbour village, and Dokdo (the Liancourt Rocks), two bare stacks east of it; the
// northern tip of Tsushima in the south-west corner. Deep water everywhere between.
// Fair (by sailing distance, scratchpad seapath.py): Ulleungdo nearer the Pacific Fleet and the water off
// Yeongdeok (north of Pohang) nearer the Seventh Fleet, by about the same, the Liancourt Rocks and the Oki islands each about halfway — in sum as
// near one fleet as the other, no zone under the other side's home shore.
// The Liancourt stacks stand high on purpose: in open water the two fleets met head-on in the middle and the
// Soviet line won 5 ships to 1 (seasoak); with rock to work round it is 2–3 to 0–1, NATO holding more zones.
// Laid out at full size (`widened`). Ships only (data/units/ships85.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 12000;
const HALF = 5000;
const noise = createNoise2D(1985_31);
const sea = createSea({ level: 0, size: SIZE, color: 0x1e4658 });

/** The Korean east coast (x) at z: Yeongil Bay cut in at Pohang (z ≈ POHANG), the Homigot cape north of it. */
const POHANG = 2300, DONGHAE = -2600;
const xK = (z: number) => -4150 + fbm(noise, z * 0.0011, 2.2, 3) * 200 - (Math.abs(z - POHANG) < 420 ? (420 - Math.abs(z - POHANG)) * 0.9 : 0) + Math.max(0, 260 - Math.abs(z - POHANG + 650)) * 0.8;
/** The San’in coast of Honshu (x) at z: along the east edge, bending in toward the south. */
const xJ = (z: number) => 4350 + fbm(noise, z * 0.0012, 5.6, 3) * 180 - Math.max(0, z - 1500) * 0.12;
const ULL = [-1500, -800, 480, 300];   // Ulleungdo: [x, z, radius, height]
const DOGO = [2700, -700, 400, 190];   // Dōgo, the big Oki island
const DOZEN = [[2300, 450, 210, 130], [2650, 700, 170, 110], [2150, 850, 150, 90]]; // the three Dōzen islands
const DOKDO = [[470, -440, 110, 170], [650, -370, 90, 100]]; // the Liancourt Rocks: two steep stacks, high enough to hide a ship behind
const TSUSHIMA = [-3600, 4700, 650, 160]; // the north tip of Tsushima, off the map's south-west corner

function height(x: number, z: number) {
  let h = -75 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 14;
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  const wob = fbm(noise, x * 0.004, z * 0.004, 3);
  h = Math.max(h, shore(xK(z) - x + wob * 60, 280, n, 22));     // Korea: a narrow beach, then the Taebaek
  h = Math.max(h, shore(x - xJ(z) + wob * 60, 120, n, 30));     // Honshu: low green hills
  for (const [ix, iz, r, top] of [ULL, DOGO, ...DOZEN, TSUSHIMA]) h = Math.max(h, island(r - Math.hypot(x - ix, z - iz) + wob * r * 0.22, r, top, n, 10));
  for (const [ix, iz, r, top] of DOKDO) h = Math.max(h, island(r - Math.hypot(x - ix, z - iz) + wob * 15, r, top, 0.9, 3));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Seventh Fleet', x: 600, z: 4350, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'Off Yeongdeok', x: -3138, z: 538, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'Ulleungdo', x: -1800, z: -150, owner: null, sector: 'west', radius: 170 },
  { id: 'D', name: 'Liancourt Rocks', x: 535, z: -85, owner: null, sector: 'centre', radius: 180 },
  { id: 'E', name: 'Oki Islands', x: 3072, z: -455, owner: null, sector: 'east', radius: 170 },
  { id: 'K', name: 'Pacific Fleet', x: -400, z: -4350, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'seaOfJapan',
  name: 'Sea of Japan',
  description: 'The Soviet Pacific Fleet comes south from Vladivostok for the Tsushima Strait; the US Seventh Fleet comes north to stop it. The Korean mountains to the west, Honshu and the Oki islands to the east, Ulleungdo and the Liancourt Rocks out in the deep water between.',
  epochs: ['1985'],
  theatre: 'sea',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  size: SIZE,
  segments: 640,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 4200, near: 2, far: 16000 },
  seed: 198531,
  height,
  river: sea,

  theme: {
    fogColor: 0xa6b2ba, fogDensity: 0.00017,
    skyTop: 0x56708a, skyHorizon: 0xbcc6cc, skyBottom: 0x80929e,
    sunColor: 0xf6eee2, sunIntensity: 1.8, sunDisk: 0.4,
    clouds: 0.6, cloudLight: 0xecf0f2, cloudDark: 0x909ca4,
    sunDir: [0.35, 0.6, 0.55],
    hemiSky: 0xc6d0d8, hemiGround: 0x4e5e48, hemiIntensity: 1.25,
    rimColor: 0xe0e6ea, rimIntensity: 0.25,
    terrain: {
      grass: '#5c6e42', grassAlt: '#667848', dryGrass: '#8e8a62', dirt: '#7a6a52', rock: '#7c766c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 150) return [0x6e6a60, 1];                                                     // bare rock on the high tops
        if (y > 2.5) return [fbm(noise, x * 0.004, z * 0.004, 2) > 0.1 ? 0x4e6236 : 0x667846, 1]; // pine and oak, terraced fields
        return y > -0.8 ? [0xcabf9e, 1] : [0x9a8e72, 1];                                         // the beaches, sand under the water
      },
    },
  },

  bases: { nato: { x: 600, z: 4550, entries: [-800, 0, 800] }, pact: { x: -400, z: -4550, entries: [-800, 0, 800] } },
  maxStacks: 12,
  cameraStart: { nato: { x: 600, z: 4150 }, pact: { x: -400, z: -4150 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: 600, z: 4200, facing: Math.PI }, { unit: 'destroyer', x: 250, z: 4350, facing: Math.PI }, { unit: 'frigate', x: 950, z: 4350, facing: Math.PI }],
    pact: [{ unit: 'cruiser', x: -400, z: -4200, facing: 0 }, { unit: 'destroyer', x: -50, z: -4350, facing: 0 }, { unit: 'frigate', x: -750, z: -4350, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const town = (cx: number, cz: number, n: number, rx: number, rz: number, face: number, flat: boolean) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * rx, z = cz + (rand() - 0.5) * rz, y = height(x, z);
        if (y < 2.5 || y > 80) continue;
        const yaw = face + (rand() - 0.5) * 0.3;
        if (flat) props.flatHouse({ x, z, yaw, width: 8 + rand() * 4, depth: 7 + rand() * 3, storeys: 1 + Math.floor(rand() * 3) });
        else props.house({ x, z, yaw, width: 7 + rand() * 3, depth: 6 + rand() * 2 });
      }
    };
    // Korea: Pohang and its steel works on Yeongil Bay, Donghae's port, Yeongdeok between
    town(xK(POHANG) - 230, POHANG, 34, 300, 600, -Math.PI / 2, true);
    for (let i = 0; i < 4; i++) props.hall({ x: xK(POHANG + 500) - 140 - (i % 2) * 70, z: POHANG + 420 + i * 60, yaw: 0, width: 50, depth: 24, height: 14, color: 0x7a7468, roof: 0x55595c, name: 'steel works hall' });
    for (const dz of [380, 520, 640]) props.chimney({ x: xK(POHANG + dz) - 260, z: POHANG + dz, height: 45 });
    town(xK(DONGHAE) - 220, DONGHAE, 26, 280, 520, -Math.PI / 2, true);
    props.box('stone', xK(DONGHAE) + 50, 1.2, DONGHAE, 12, 2.4, 160, Math.PI / 2, 0x7a766c); // the port's mole
    town(xK(550) - 160, 550, 12, 180, 300, -Math.PI / 2, false);                                  // Yeongdeok
    props.tower({ x: xK(POHANG - 650) - 30, z: POHANG - 650, concrete: true });                 // the Homigot light
    // Ulleungdo: Dodong harbour on its south-east side, a light on the north
    for (let i = 0; i < 18; i++) { // the harbour village, strung along the shore
      const a = Math.PI * (0.1 + rand() * 0.4), r = ULL[2] - 40 - rand() * 90, x = ULL[0] + Math.cos(a) * r, z = ULL[1] + Math.sin(a) * r, y = height(x, z);
      if (y > 2.5 && y < 90) props.flatHouse({ x, z, yaw: a + Math.PI / 2, width: 8 + rand() * 3, depth: 7 + rand() * 2, storeys: 1 + Math.floor(rand() * 2) });
    }
    props.tower({ x: ULL[0] - 60, z: ULL[1] - 420, concrete: true });
    props.mast({ x: DOKDO[0][0], z: DOKDO[0][1], height: 16 });                                    // the post on Dokdo
    // Honshu and Oki: villages under the hills, Saigō harbour on Dōgo
    town(xJ(-1200) + 200, -1200, 16, 240, 400, Math.PI / 2, false);
    town(xJ(1800) + 180, 1800, 18, 240, 400, Math.PI / 2, false);
    town(DOGO[0] - 120, DOGO[1] + 330, 14, 200, 120, 0, false);
    props.tower({ x: DOGO[0] + 340, z: DOGO[1] - 120, concrete: true });
    props.tower({ x: TSUSHIMA[0] + 380, z: TSUSHIMA[1] - 480, concrete: true });                  // the light on Tsushima’s north tip
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 3200, broadleaf: 0.45, autumn: 0.15, maxY: 220, size: 1.2,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 4 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
