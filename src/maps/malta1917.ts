// Malta, 1917: the U-boat war in the central Mediterranean. Out of Cattaro and Pola the German flotilla and the
// k.u.k. boats came down past the Otranto barrage and lay across the routes from Malta to Salonika and Egypt; in
// 1917 they sank more ships in the Mediterranean than anywhere but the Western Approaches, the troopships Arcadian
// and Transylvania among them. The UC boats laid their mines off Valletta itself, and from the spring the steamers
// sailed in convoy from the Grand Harbour and Marsaxlokk, the escorts British, French and Italian destroyers and
// sloops — and the eight destroyers of the Imperial Japanese Navy's 2nd Special Squadron, based on Malta from
// April 1917 (on 11 June U 27 of the k.u.k. Kriegsmarine torpedoed Sakaki off Crete and blew her bow away).
// The islands as they lie, turned so Malta's north-east shore faces the open water: Valletta on Mount Sciberras
// between Marsamxett and the Grand Harbour (St Elmo's point, the breakwaters of 1903–10, Ricasoli across the
// mouth, the Three Cities up the creeks), St Paul's Bay up the coast, Marsaxlokk at the south-east end; Comino
// and Gozo's Mgarr across the Comino channel at the north-western end. The island tilts up from the harbours to
// the Dingli cliffs on the far side, Mdina on its hill.
// The convoy (the Royal Navy, its transports bring in command points while they lie in a zone the convoy holds —
// the SeaDirector's wolf pack steers for them) forms up off Marsaxlokk; the U-boats wait off the Comino channel.
// Fair by the sailing routes (cold-steel-map-briefs seapath): the two homes either end of the coast, every zone on
// the line straight out from Valletta between them — off Marsamxett, off the Grand Harbour, the swept channel
// and the convoy route out to sea — as near one fleet as the other. Ships only. Laid out at full size by widenSea
// (maps/index.js): the places below are the widened ones.
// (The French, Italian and Japanese escorts: at sea a side fields the first navy it names — the Royal Navy here,
// the Kaiserliche Marine against it; the others are named for the world campaign's armies. No Japanese navy yet.)
import { island } from '../world/Sea.js';
import { northSea } from './northSea.ts';

const LIMESTONE = 0xd8c49a;   // Malta's globigerina, the honey-coloured stone Valletta is built of
const TERRACE = 0x8a8458;     // the terraced fields and the garigue on top

/** The islands' frame: s along the coast (+ south-east, toward Marsaxlokk), a across it (+ inland, toward Dingli). */
const R2 = Math.SQRT1_2;
const xz = (s: number, a: number): [number, number] => [(a + s) * R2, (a - s) * R2];
const COAST = 2600;          // the north-east shore's line (a)
const GH = 270, MX = -290;   // the Grand Harbour's and Marsamxett's mouths (s), Valletta between them
const HEAD = Math.atan2(-1, 1); // (along the coast toward the Comino channel: a ship's facing, 0 is +z)
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** The homes as widenSea leaves them (it doubles a base and moves that side's home zone and ships by half of it). */
const BASES = { nato: { x: 3500, z: -1379 }, pact: { x: -1379, z: 3500 } };
const HOME = { nato: [3394, -1273], pact: [-1273, 3394] } as const;
/** A ship `ahead` m toward the enemy's home and `right` m across, round the side's home. */
const ship = (f: 'nato' | 'pact', unit: string, ahead: number, right: number) => {
  const k = f === 'nato' ? 1 : -1, [hx, hz] = HOME[f];
  const fx = -R2 * k, fz = R2 * k;   // toward the other home
  const x = hx + fx * ahead + fz * right, z = hz + fz * ahead - fx * right;
  return { unit, x: x - BASES[f].x / 2, z: z - BASES[f].z / 2, facing: f === 'nato' ? HEAD : HEAD + Math.PI };
};

/** Malta: metres inside its coast at (s, a) — the bays and the two harbours cut in, Manoel Island in Marsamxett. */
function malta(s: number, a: number, r: number) {
  let ne = COAST - 60 * (1 - smooth(120, 260, Math.abs(s + 15)));                 // Sciberras standing out between the harbours
  ne += 450 * Math.max(0, 1 - Math.abs(s + 1700) / 230);                          // St Paul's Bay
  ne += 420 * Math.max(0, 1 - Math.abs(s - 1250) / 280);                          // Marsaxlokk
  const sw = COAST + 3000 - 2100 * (1 - smooth(-2850, -1300, s));                 // the Marfa ridge narrows to the north-west
  let d = Math.min(a - ne, sw - a, s + 2850, 1650 - s) + r;
  if (Math.abs(s - GH) < 120 + (a - COAST) * -0.02 && a < COAST + 900) d = Math.min(d, Math.abs(s - GH) - 120);   // the Grand Harbour
  if (s > GH && s < GH + 260 && Math.abs(a - COAST - 470) < 35) d = Math.min(d, Math.abs(a - COAST - 470) - 35);   // Dockyard Creek
  if (s > GH && s < GH + 200 && Math.abs(a - COAST - 220) < 30) d = Math.min(d, Math.abs(a - COAST - 220) - 30);   // Kalkara Creek
  if (Math.abs(s - MX) < 100 && a < COAST + 620) {
    d = Math.min(d, Math.abs(s - MX) - 100);                                                                         // Marsamxett
    d = Math.max(d, 45 - Math.hypot(s - MX, a - COAST - 330));                                                       // Manoel Island
  }
  return d;
}

const sea = northSea({
  id: 'malta-1917',
  name: 'Malta Channel 1917',
  description: '1917, off Valletta: a troop convoy bound for Salonika and Egypt forms up off Marsaxlokk under British, French, Italian and Japanese destroyers. The German and Austro-Hungarian U-boats from Cattaro wait off the Comino channel, their mines off the Grand Harbour.',
  seed: 1917_0611,
  floor: 90,   // (deep water close in: a hundred fathoms a few miles off the islands)
  conditions: { time: 'day', weather: 'clear' },
  sky: { fogColor: 0xb4c4d0, fogDensity: 0.00018, skyTop: 0x4a76ae, skyHorizon: 0xcad6de, sunColor: 0xfff4e0, sunIntensity: 2.0, clouds: 0.2, sunDir: [0.4, 0.6, -0.5] },
  land(x, z, n) {
    const s = (x - z) * R2, a = (x + z) * R2;
    if (a < 2350) return -Infinity;   // (the open sea: everything below lies across the coast's line)
    let h = -Infinity;
    const r = (n(x, z, 0.012) - 0.5) * 70;
    const d = malta(s, a, r);
    if (d > -300) {
      const tilt = 70 * smooth(COAST, COAST + 3000, a);   // low to the harbours, up to the Dingli cliffs
      h = d > 0 ? island(d, 300, 28, n(x + 40, z, 0.01)) + Math.min(1, d / 120) * tilt : -1.5 + d * 0.3;
    }
    // Comino, and Gozo across the North Comino channel (Mgarr at its south-east end)
    const dc = 120 - Math.hypot((s + 3250) * 0.7, a - 2790) + r * 0.4;
    if (dc > -300) h = Math.max(h, dc > 0 ? island(dc, 120, 18, n(x, z, 0.01)) : -1.5 + dc * 0.3);
    const dg = 640 - Math.hypot((s + 4900) * 0.52, a - 3500) + r;
    if (dg > -300) h = Math.max(h, dg > 0 ? island(dg, 640, 70, n(x + 90, z, 0.01)) : -1.5 + dg * 0.3);
    return h;
  },
  surface(x, z, y) {
    if (y > 3) return [y > 26 ? TERRACE : LIMESTONE, 1];   // the pale stone shore and cliffs, the terraces above
    return null;
  },
  bases: {
    nato: { x: BASES.nato.x / 2, z: BASES.nato.z / 2, entries: [-400, 0, 400] },
    pact: { x: BASES.pact.x / 2, z: BASES.pact.z / 2, entries: [-400, 0, 400] },
  },
  points: [
    { id: 'A', name: 'The convoy off Marsaxlokk', x: HOME.nato[0] - BASES.nato.x / 2, z: HOME.nato[1] - BASES.nato.z / 2, owner: 'nato', sector: 'east', radius: 160 },
    { id: 'B', name: 'Off Marsamxett', x: 1457, z: 1655, owner: null, sector: 'west', radius: 130 },
    { id: 'C', name: 'Off the Grand Harbour', x: 1655, z: 1457, owner: null, sector: 'east', radius: 130 },
    { id: 'D', name: 'The swept channel', x: 849, z: 849, owner: null, sector: 'centre', radius: 180 },
    { id: 'E', name: 'The convoy route', x: -2121, z: -2121, owner: null, sector: 'centre', radius: 190 },
    { id: 'K', name: 'Off the Comino channel', x: HOME.pact[0] - BASES.pact.x / 2, z: HOME.pact[1] - BASES.pact.z / 2, owner: 'pact', sector: 'west', radius: 160 },
  ],
  spawns: {
    // the steamers in three columns, the destroyer ahead, the sloop astern (the drifters and the rest are bought:
    // westernApproaches' AI soaks — started with them the convoy outweighed the pack)
    nato: [ship('nato', 'destroyer', 100, 0), ship('nato', 'merchant', -200, -300), ship('nato', 'merchant', -100, 0), ship('nato', 'merchant', -200, 300), ship('nato', 'frigate', -350, 0)],
    // (each fleet's first ship the same distance out: the routing tools measure from her)
    pact: [ship('pact', 'destroyer', 100, 0), ship('pact', 'destroyer', -200, 0),
      ship('pact', 'submarine', 200, -700), ship('pact', 'submarine', 200, 700), ship('pact', 'minelayerSub', 300, 0), // (a UC boat from Cattaro: her mines off Valletta; with two boats the convoy lost nothing)
      ship('pact', 'frigate', -250, -400), ship('pact', 'frigate', -250, 400)],
  },
  decorate(props, height, rand) {
    const yaw = Math.PI / 4;   // (square to the coast)
    const town = (n: number, s0: number, s1: number, a0: number, a1: number, storeys = 2) => {
      for (let i = 0; i < n; i++) {
        const [x, z] = xz(s0 + rand() * (s1 - s0), a0 + rand() * (a1 - a0));
        const y = height(x, z);
        if (y > 3 && y < 60) props.flatHouse({ x, z, yaw: yaw + (rand() < 0.5 ? 0 : Math.PI / 2) + (rand() - 0.5) * 0.1, width: 8 + rand() * 3, depth: 8, storeys: storeys + (rand() < 0.4 ? 1 : 0) });
      }
    };
    town(70, -150, 125, COAST + 20, COAST + 560, 2);   // Valletta on Sciberras: the grid of tall stone houses
    town(30, GH + 140, GH + 400, COAST + 260, COAST + 700, 2);   // the Three Cities up the creeks: Vittoriosa, Senglea
    town(30, MX - 420, MX - 120, COAST + 40, COAST + 330, 1);    // Sliema across Marsamxett
    town(18, 1100, 1400, COAST + 470, COAST + 600, 1);           // Marsaxlokk's fishermen
    town(18, -760, -640, COAST + 1650, COAST + 1780, 2);         // Mdina on its hill
    const [jx, jz] = xz(-20, COAST + 260);
    props.church({ x: jx, z: jz, yaw });                          // St John's
    const [ex, ez] = xz(-15, COAST - 20);
    props.tower({ x: ex, z: ez, concrete: false });               // Fort St Elmo's light at the point
    const [rx, rz] = xz(GH + 170, COAST + 40);
    props.tower({ x: rx, z: rz, concrete: false });               // Fort Ricasoli across the mouth
    // the breakwaters of 1903–10 across the Grand Harbour's mouth, a gap between them
    for (const [s, a, len] of [[90, COAST - 70, 150], [GH + 150, COAST - 40, 110]]) {
      const [bx, bz] = xz(s, a);
      props.box('stone', bx, 1.4, bz, 10, 2.8, len, Math.atan2(R2, -R2), 0xc8b890);
    }
    const [mx, mz] = xz(GH + 300, COAST + 150);
    props.mast({ x: mx, z: mz, height: 26 });                     // the naval wireless station at Rinella
    const [cx, cz] = xz(-3250, 2800);
    props.tower({ x: cx, z: cz, concrete: false });               // St Mary's Tower on Comino
    town(10, -3780, -3660, 3000, 3150, 1);                        // Mgarr on Gozo
  },
});

export default {
  ...sea,
  region: 'med',
  // (the convoy's escorts — the Royal Navy, the Marine nationale, the Regia Marina — against the German flotilla and
  // the k.u.k. boats out of Cattaro: at sea each side fields the first navy it names, maps/index.js armiesOn)
  armies: { nato: ['uk', 'fr', 'it'], pact: ['de', 'ah'] },
  sides: { nato: 'Allies', pact: 'Central Powers' },
};
