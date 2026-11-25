// Vimy Ridge, 9–12 April 1917: the opening of the Battle of Arras. The four divisions of the Canadian Corps (here the
// British Army: the Canadians fought under Byng in Horne’s First Army) storm the long chalk escarpment the Germans had
// held since 1914 — up its gentle western slope out of the Zouave Valley and the shell-ploughed fields round
// Neuville-Saint-Vaast, to the crest where La Folie Farm and Thélus stood, and Hill 145 and the Pimple at its north end.
// Beyond the crest the ridge drops steeply to the Douai plain and the ruined villages below it: Givenchy-en-Gohelle,
// Vimy, Farbus. On the map: two trench systems in the chalk (white spoil on the parapets), the crater line along
// no man’s land where both sides’ miners blew their mines (the Durand, Grange and Momber groups), the entrances of the
// subways the tunnellers dug up to the front line on one side and of the deep dugouts on the other.
// Not mirrored but fair (maps/westernFront.ts underneath): the crest is no man’s land, in reach of both — nearer the
// German line at its north end (Hill 145, the Pimple), nearer the British at its south end (the Thélus heights); the
// Germans climb a short steep face to it, the British a long gentle slope; the Lorette spur and Mont-Saint-Éloi behind
// the British are answered by Hill 145 and the Pimple over the German line; the villages lie as near on each side.
import * as THREE from 'three';
import { westernFront } from './westernFront.ts';
import { PropBuilder } from '../world/Props.js';
import { mulberry32, smoothstep } from '../core/math.js';

const POINTS = [
  { id: 'A', name: 'Mont-Saint-Éloi', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Souchez', x: -390, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Neuville-Saint-Vaast', x: -70, z: 370, owner: null, sector: 'centre' },
  { id: 'D', name: 'Roclincourt', x: 300, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Hill 145', x: -250, z: 10, owner: null, sector: 'west', radius: 26, village: false },
  { id: 'F', name: 'La Folie Farm', x: 20, z: -25, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Thélus', x: 280, z: 20, owner: null, sector: 'east', radius: 28 },
  { id: 'H', name: 'Givenchy-en-Gohelle', x: -240, z: -330, owner: null, sector: 'west', radius: 28 },
  { id: 'I', name: 'Vimy', x: 80, z: -360, owner: null, sector: 'centre', radius: 30 },
  { id: 'J', name: 'Farbus', x: 420, z: -240, owner: null, sector: 'east' },
  { id: 'K', name: 'Willerval', x: 50, z: -470, owner: 'pact', sector: 'centre' },
] as any[];

/** Where the crest runs (z): toward the German side at the north end (x < 0), toward the British at the south end. */
const crestZ = (x: number) => -10 + x * 0.06 + 12 * Math.sin(x * 0.009 + 0.7);
const bump = (x: number, z: number, cx: number, cz: number, r: number) => smoothstep(r, 0, Math.hypot(x - cx, z - cz)) ** 1.5;
/** The escarpment: a long gentle slope down to the west (nato, z > crest), a short steep face down to the Douai plain. */
const scarp = (x: number, z: number) => {
  const H = 14 - 4 * smoothstep(100, 480, x)              // (lower toward the Scarpe in the south)
    + 8 * bump(x, z, -250, -15, 150)                       // Hill 145
    + 6 * bump(x, z, -440, -50, 110);                      // the Pimple
  const dz = z - crestZ(x);
  return dz >= 0 ? H * (1 - smoothstep(0, 400, dz)) : H * (1 - smoothstep(0, 130, -dz));
};
/** The ridge as it is on the map: flattened round each point like the builder’s own ground. */
const ridge = (x: number, z: number) => {
  let h = scarp(x, z);
  for (const p of POINTS) h += (scarp(p.x, p.z) - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return h;
};

// the crater line along no man’s land (the mines both sides blew under it), [x, z, splash radius, depth]
const MINES = [[-420, 12, 30, 5], [-380, 18, 26, 4.5], [-330, 40, 32, 5.5], [-170, 46, 28, 5], [-130, 38, 34, 6], [-85, 52, 26, 4.5],
  [70, 30, 30, 5], [115, 18, 26, 4.5], [160, 38, 32, 5.5], [330, 52, 28, 5], [380, 62, 30, 5], [440, 70, 24, 4]];
// the subways (Grange, Goodman, Tottenham, Lichfield …) behind the British line; the deep dugouts behind the German
const ADITS = { nato: [[-330, 205], [-150, 230], [40, 220], [200, 240], [400, 230]], pact: [[-400, -170], [-200, -200], [-60, -180], [130, -220], [300, -200]] };
const CHALK = new THREE.Color(0xb6b0a0);

const base = westernFront({
  id: 'vimy',
  armies: { nato: ['uk'], pact: ['de'] }, // (the Canadian Corps, fighting here as the British Army, against the German Sixth Army)
  name: 'Vimy Ridge',
  description: 'April 1917: the Canadian Corps storms Vimy Ridge in sleet and snow — the long gentle slope up through the crater line to La Folie and Hill 145, the steep face beyond down to the Douai plain and the ruined villages of Givenchy, Vimy and Farbus.',
  seed: 1917,
  points: POINTS,
  // the Lorette spur over Souchez and the rise at Mont-Saint-Éloi behind the British, the Zouave Valley under the ridge;
  // the Bois de la Ville spur over Vimy behind the Germans
  hills: [[-430, 400, 170, 9], [180, 470, 150, 5], [-260, 230, 110, -3], [160, -440, 170, 5], [420, -420, 130, 4]],
  woodsAt: [[-330, -230, 60], [200, -320, 55], [-440, 330, 55], [150, 330, 50]], // (Bois de Givenchy, Bois de la Ville; the Lorette and Écoivres woods)
  lines: [{ z: 120, wireAt: 24, belts: 2, gapEvery: 70, seed: 17 }, { z: 225, wireAt: 18, belts: 1, gapEvery: 60, seed: 29 }],
  front: 120, craters: 3.4, ridge: 0, woods: 0.35,
  ruins: [0.9, 0.5],
  fields: [0.25, 0.1, 0.35, 0.3],
  theme: { // Easter Monday 1917: a raw grey dawn, sleet driving from the west
    fogColor: 0xa8acae, fogDensity: 0.0022, skyTop: 0x6a7078, skyHorizon: 0xb4b6b4, sunIntensity: 1.25, sunDisk: 0.04, clouds: 0.95, hemiIntensity: 1.3,
  },
  terrain: { grass: '#5a6040', grassAlt: '#50583a', dryGrass: '#868068', ploughed: '#8a8474', stubble: '#8c846a', dirt: '#6a6050' }, // (the chalk shows everywhere)
});

export default {
  ...base,
  height: (x: number, z: number) => base.height(x, z) + ridge(x, z),

  battlefield(game: any) {
    const f = base.battlefield(game);
    const paint0 = f.paint;
    return {
      ...f,
      blasts: [...f.blasts.filter(([x, z]) => !MINES.some(([mx, mz, r]) => Math.hypot(x - mx, z - mz) < r * 0.6)), ...MINES],
      paint(terrain: any) {
        paint0(terrain);
        const r = mulberry32(19170409);
        for (const w of f.works) { // the chalk thrown up on the parapets
          if (w.kind !== 'trench' || r() < 0.3) continue;
          terrain.dig(w.x, w.z, 7, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - w.x, pz - w.z) / 7), 0.55 + r() * 0.3, CHALK);
        }
        for (const [x, z, s] of MINES) terrain.dig(x, z, s * 0.75, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / (s * 0.75)), 0.8, CHALK);
      },
    };
  },

  decorate(ctx: any) {
    const out = base.decorate.call(this, ctx);
    const props = new PropBuilder({ scene: ctx.scene, terrain: ctx.terrain, cover: ctx.cover, seed: 1917 }), n0 = ctx.cover.spots.length;
    for (const [side, toward] of [['nato', -1], ['pact', 1]] as const) {
      for (const [x, z] of ADITS[side]) { // a timber-framed mouth in a bank of sandbags, facing the rear
        const y = ctx.terrain.heightAt(x, z), back = -toward;
        props.box('plain', x, y + 0.5, z, 6, 1.2, 4.5, 0, 0x8a8068);                      // the sandbagged bank over it
        props.box('plain', x, y + 0.7, z + back * 2.3, 1.6, 1.6, 0.3, 0, 0x0c0b0a);         // the dark mouth
        props.box('plain', x, y + 1.6, z + back * 2.4, 2.4, 0.3, 0.5, 0, 0x4a3c2c);         // the lintel
        for (const s of [-1, 1]) props.box('plain', x + s * 1.0, y + 0.8, z + back * 2.4, 0.25, 1.6, 0.25, 0, 0x4a3c2c);
        props.crates({ x: x + 4, z: z + back * 3, yaw: 0.3 });
      }
    }
    props.finish();
    ctx.cover.finalizeFrom(n0); // (the crates’ cover spots, after the builder already indexed its own)
    return out;
  },
};
