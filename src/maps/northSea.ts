// The 1918 sea maps (the North Sea and the Channel: maps/heligolandBight.ts, doggerBank.ts, doverStrait.ts):
// the Royal Navy on the `nato` side coming from the south, the Kaiserliche Marine from the north. Grey water,
// a grey sky, the land low and green where there is any. Each map gives its ground (`land`: metres above
// the sea's floor, or below 0 out at sea), its points, its bases and its own touches (`decorate`).
// Ships only (data/units1918/ships.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

export const SIZE = 6000;
export const HALF = 2500;

type Sea = {
  id: string; name: string; description: string; seed: number;
  /** the ground above the sea floor: (x, z, noise) → a height, or -Infinity for open sea */
  land?: (x: number, z: number, n: (x: number, z: number, o?: number) => number) => number;
  /** the land's colour at a height (what's not sand or rock): chalk, dune, red cliff… */
  surface?: (x: number, z: number, y: number) => [number, number] | null;
  points: ControlPointDef[];
  bases?: MapDef['bases'];
  spawns?: MapDef['spawns'];
  conditions: { time: string; weather: string };
  sky?: Record<string, unknown>;
  floor?: number;   // the sea floor's depth (Dogger Bank: shallow)
  /** the fields laid before the battle (systems/Minefields.js): each side's own, its ships know the gaps */
  minefields?: { owner: 'nato' | 'pact'; x: number; z: number; w: number; d: number; count: number; yaw?: number; gaps?: number[]; gap?: number }[];
  decorate?: (props: PropBuilder, height: (x: number, z: number) => number, rand: () => number) => void;
};

const SKY = {
  fogColor: 0x9aa4ac, fogDensity: 0.0003, skyTop: 0x5c6a78, skyHorizon: 0xb4bcc2, skyBottom: 0x76848e,
  sunColor: 0xf0e8d8, sunIntensity: 1.6, sunDisk: 0.3, clouds: 0.75, cloudLight: 0xdfe3e6, cloudDark: 0x7e8a94,
  sunDir: [0.5, 0.45, -0.6], hemiSky: 0xbcc6ce, hemiGround: 0x4c5650, hemiIntensity: 1.2, rimColor: 0xd4dce4, rimIntensity: 0.25,
};

export function northSea(o: Sea) {
  const noise = createNoise2D(o.seed);
  const n = (x: number, z: number, f = 0.004) => fbm(noise, x * f, z * f, 3) * 0.5 + 0.5;
  const sea = createSea({ level: 0, size: SIZE, color: 0x2a4048 });
  const height = (x: number, z: number) => {
    const h = -(o.floor ?? 40) + fbm(noise, x * 0.0007, z * 0.0007, 4) * 8;
    return o.land ? Math.max(h, o.land(x, z, n)) : h;
  };
  return {
    id: o.id,
    name: o.name,
    description: o.description,
    epochs: ['1918'],
    theatre: 'sea',
    modes: ['frontline', 'pitched', 'hill', 'skirmish'],
    conditions: o.conditions,
    fow: 0.5,
    sides: { nato: 'Britain', pact: 'Germany' },
    size: SIZE,
    segments: 400,
    bounds: { x: HALF, z: HALF },
    navCell: 8,
    camera: { maxHeight: 2400, near: 2, far: 9000 },
    seed: o.seed,
    height,
    river: sea,
    theme: {
      ...SKY, ...o.sky,
      terrain: {
        grass: '#5e6c48', grassAlt: '#667250', dryGrass: '#8a8462', dirt: '#6e6450', rock: '#7c7870',
        farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
        surface(x: number, z: number) {
          const y = height(x, z);
          const own = o.surface?.(x, z, y);
          if (own) return own;
          if (y < -0.6) return [0x6e6a58, 1];                          // the wet sand and shingle below the tide line
          if (y < 2.5) return [0xcabe98, Math.min(1, (2.5 - y) / 2)];  // the beach
          return [0x5e6c48, 1];                                        // grazing
        },
      },
    },
    bases: o.bases ?? { nato: { x: 0, z: -2300, entries: [-700, 0, 700] }, pact: { x: 0, z: 2300, entries: [-700, 0, 700] } },
    maxStacks: 12,
    cameraStart: { nato: { x: o.points[0].x, z: o.points[0].z }, pact: { x: o.points[o.points.length - 1].x, z: o.points[o.points.length - 1].z } },
    points: o.points,
    minefields: o.minefields ?? [],
    spawns: o.spawns ?? {
      nato: [{ unit: 'lightCruiser', x: 0, z: -2200, facing: 0 }, { unit: 'destroyer', x: -350, z: -2050, facing: 0 }, { unit: 'destroyer', x: 350, z: -2050, facing: 0 }],
      pact: [{ unit: 'lightCruiser', x: 0, z: 2200, facing: Math.PI }, { unit: 'destroyer', x: -350, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: 350, z: 2050, facing: Math.PI }],
    },
    decorate({ scene, terrain, cover, rand }) {
      const props = new PropBuilder({ scene, terrain, cover });
      sea.build(scene, terrain);
      o.decorate?.(props, height, rand);
      props.finish();
      cover.finalize({ x: HALF, z: HALF });
      return { buildings: props.buildings, update() {} };
    },
  } satisfies MapDef;
}
