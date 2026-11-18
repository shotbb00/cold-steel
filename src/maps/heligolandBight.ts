// The Heligoland Bight, 28 August 1914 (and again in November 1917): the Harwich Force's destroyers and
// cruisers come in from the west at dawn after the German patrols, Beatty's battlecruisers behind them; the
// German light cruisers come out of the Jade and the Elbe one by one into the mist. Heligoland in the middle
// of the German half — red sandstone cliffs, the Oberland's houses and the lighthouse on top, the harbour mole
// and the sandy Düne off it — and the Amrum Bank's shoals on the British side. Fair: the Amrum Bank as near
// the British as Heligoland Roads the Germans, the open Bight between as near either.
import { island, shore } from '../world/Sea.js';
import { northSea } from './northSea.ts';

const RED = 0x9a4a36;

export default northSea({
  id: 'heligolandBight',
  name: 'Heligoland Bight',
  description: 'August 1914, the German front door: Heligoland\'s red cliffs in the middle of the bight, the Jade behind it. The British come in out of the mist after the patrols; the German cruisers come out one by one.',
  seed: 1914_08,
  conditions: { time: 'day', weather: 'overcast' },
  sky: { fogDensity: 0.00042, fogColor: 0xa6aeb2 },
  land(x, z, n) {
    // Heligoland: a long, narrow block of red sandstone, cliffs all round, flat on top (the Oberland)
    const d = 170 - Math.hypot((x - 900) * 0.45, (z - 750) * 1.1) + (n(x, z, 0.02) - 0.5) * 30;
    let h = d > 0 ? Math.min(55, 6 + d * 0.9) + (n(x, z, 0.01) - 0.5) * 4 : shore(d, 50);
    // the Unterland: the low town and harbour on its south-east end
    const u = 70 - Math.hypot(x - 1010, z - 680) + (n(x, z, 0.03) - 0.5) * 12;
    if (u > 0 && h < 6) h = Math.max(h, Math.min(4, 1.6 + u * 0.05));
    // the Düne: low sand off to the east
    h = Math.max(h, island(70 - Math.hypot((x - 1480) * 0.9, (z - 690) * 1.4) + (n(x, z, 0.02) - 0.5) * 14, 70, 4, 0.2, 40));
    // the Amrum Bank's shoals on the British side: awash sand, no cover
    h = Math.max(h, -2.5 - Math.hypot((x + 1100) * 0.6, z + 600) * 0.03 + (n(x, z, 0.01) - 0.5) * 3);
    return h;
  },
  surface(x, z, y) {
    if (y > 8 && Math.hypot((x - 900) * 0.45, (z - 750) * 1.1) > 120) return [RED, 1];   // the cliff faces
    if (y > 8) return [0x6a7448, 1];                                                    // the Oberland's turf
    if (x > 1380 && y > -0.6) return [0xd8cca4, 1];                                     // the Düne: all sand
    return null;
  },
  // the German fields guarding the Bight (a swept channel through the western one), the British laid off the Amrum Bank in 1917
  minefields: [
    { owner: 'pact', x: -700, z: 950, w: 900, d: 120, count: 40, gaps: [200], gap: 120 },
    { owner: 'pact', x: 1500, z: 1200, w: 700, d: 100, count: 30 },
    { owner: 'nato', x: -900, z: -1000, w: 900, d: 120, count: 40, gaps: [-100], gap: 120 },
    { owner: 'nato', x: 900, z: -1100, w: 700, d: 100, count: 30 },
  ],
  points: [
    { id: 'A', name: 'Harwich Force', x: 0, z: -2050, owner: 'nato', sector: 'centre', radius: 150 },
    { id: 'B', name: 'Amrum Bank', x: -1100, z: -350, owner: null, sector: 'west', radius: 170 },
    { id: 'C', name: 'The Bight', x: -150, z: -50, owner: null, sector: 'centre', radius: 180 },
    { id: 'D', name: 'Heligoland Roads', x: 1150, z: 400, owner: null, sector: 'east', radius: 160 },
    { id: 'K', name: 'The Jade', x: 0, z: 2100, owner: 'pact', sector: 'centre', radius: 150 },
  ],
  decorate(props, height, rand) {
    props.tower({ x: 880, z: 760, concrete: false });                       // the lighthouse on the Oberland
    for (let i = 0; i < 40; i++) {                                          // the Oberland's houses, the Unterland's
      const x = 820 + rand() * 260, z = 650 + rand() * 180;
      const y = height(x, z);
      if (y > 1.5) props.house({ x, z, yaw: rand() * 0.4, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.box('stone', 1080, 1.2, 600, 12, 2.4, 220, 0.6, 0x6c6a64);       // the harbour mole
    props.mast({ x: 960, z: 820, height: 26 });                            // the wireless mast
  },
});
