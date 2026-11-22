// The small navies of the Northern Flank and Korea, 1985: the Royal Norwegian Navy (`no`) and the ROK Navy (`rok`) on
// the shared 1985 ship types (./ships85.js, ./baltic85.js), called once from ./index.js after armies85. Each army gets
// its own entry in the type's tables — variants, names, models, mounts, factionStats (its stats over the side's), and
// armyType (entities/UnitStack.js: its own hull, camera and landing-craft hold where her size differs). Models:
// models/navies85.js. Both armies are `own` (data/factions.js armyHas): these variants put the ships on their lists.
//   no   Oslo-class frigate (frigate; no destroyers: destroyer → frigate by ROLE, ./index.js), Hauk-class FAC (ptBoat),
//        Sauda-class minesweeper (natya: the sweeper slot), Reinøysund-class landing craft (lcu520), a landing boat (lcvp85)
//   rok  Ulsan-class frigate, Gearing-class FRAM destroyer, PKM patrol boat (ptBoat), Kum San-class (MSC-268) minesweeper,
//        Un Bong-class LST (lcu520), LCM-8 (lcvp85)
import { buildOslo, buildHauk, buildSauda, buildReinoysund, buildNoLandingBoat, buildUlsan, buildGearingRok, buildPKM, buildKumSan, buildUnBong, buildLCM8 } from '../models/navies85.js';

const FWD = 0;
const AFT = Math.PI;
const AA = (range, hitNear, hitFar) => ({ antiAir: { range, optical: 1, rate: 2.4, burst: 6, pause: 0.4, hitNear: hitNear * 0.3, hitFar: hitFar * 0.3 } });
const RADAR = (range, height) => ({ range, height });
const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.012, splash: 2.5, pierce: 0.25, shell: 900, size: 1.2, ...o });
const MSL = (o) => ({ at: [0, 6, 0], missile: true, arc: 6.3, count: 2, reload: 8, pierce: 0.6, ...o });
const DC = { count: 4, reload: 16, radius: 45, damage: 1300 };
const ASW = { range: 1000, speed: 24, damage: 2000, reload: 30 }; // (Terne rockets, Mk 32 torpedoes: shorter than ASROC)
const CHAFF = { count: 6, cooldown: 10 };
const SEASPARROW = { range: 900, channels: 1, load: 8, reload: 2.5, speed: 260, pk: 0.45 };

// the guns (sea scale, as ./ships85.js)
const G76 = { range: 1200, reload: 1, damage: 80, splash: 2, size: 1.1 };               // (OTO Melara 76/62)
const G3IN = { range: 1100, reload: 1.2, damage: 75, splash: 2, size: 1.1 };           // (twin 3-inch/50 Mk 33)
const G538 = { range: 1400, reload: 2.2, damage: 160, splash: 3 };                     // (twin 5-inch/38 Mk 38)
const G40 = { range: 1000, reload: 0.6, damage: 50, splash: 1.4, size: 0.9 };          // (Bofors 40/70)
const G30 = { range: 900, reload: 0.5, damage: 40, splash: 1.2, size: 0.8 };           // (twin 30 mm Emerlec)
const G20 = { range: 700, reload: 0.35, damage: 26, splash: 0.8, size: 0.6 };          // (20 mm: twin Oerlikons, the Sea Vulcan)

// the missiles: Penguin (Norway's own, passive infrared: no radar seeker to warn the target, a small warhead) and Harpoon
const PENGUIN = { count: 2, name: 'Penguins', speed: 150, range: 2800, seeker: 900, skim: true, damage: 1400, stealth: 0.7 };
const HARPOON = { count: 4, name: 'Harpoons', speed: 160, range: 4600, seeker: 1200, skim: true, damage: 2300 };

/** Put `army`'s own ship on type `t`. */
function give(t, army, { variant, names, model, mounts, stats, type, cost }) {
  t.variants = { ...t.variants, [army]: variant };
  t.models = { ...t.models, [army]: model };
  if (names) t.names = { ...t.names, [army]: names };
  if (mounts) t.mounts = { ...t.mounts, [army]: mounts };
  if (stats) t.factionStats = { ...t.factionStats, [army]: stats };
  if (type) t.armyType = { ...t.armyType, [army]: type };
  if (cost) t.armyCost = { ...t.armyCost, [army]: cost };
}

export default function navies85(T) {
  // ---------------------------------------------------------------- the Royal Norwegian Navy
  give(T.frigate, 'no', {
    model: buildOslo, cost: 240,
    names: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Narvik'],
    type: { shortName: 'Oslo', hull: { length: 96, beam: 11.2 }, camera: { distance: 75, height: 24, shoulder: 0 } },
    stats: { helo: false, hp: 2000, speed: 12.5, accel: 0.15, turnRate: 0.13, radius: 5, height: 10, radar: RADAR(2600, 20), sonar: 500, depthCharges: DC, asTorp: ASW, ...AA(450, 0.18, 0.05),
      defence: { point: SEASPARROW, chaff: CHAFF, ecm: 0.2 }, range: 2800, aggroRange: 2800, preferredRange: 1800, damage: 75 },
    mounts: [MSL({ ...PENGUIN, at: [0, 6, -33], load: 6 }), gun([0, 7, 32], FWD, G3IN), gun([0, 6, -42], AFT, G40)],
    variant: { name: 'Oslo-class frigate', weapon: '6 Penguin, Sea Sparrow, twin 3-inch, 40 mm Bofors, Terne', text: 'Norway’s own escorts, built at home on an American design for the coast and the fjords: six Penguins that home on a ship’s heat and give no radar warning, Sea Sparrow against the jets. Small, wet in the Barents Sea, no helicopter.' },
  });
  give(T.ptBoat, 'no', {
    model: buildHauk, cost: 170,
    names: ['Hauk', 'Ørn', 'Terne', 'Tjeld', 'Skarv', 'Teist', 'Jo', 'Lom', 'Stegg', 'Falk', 'Ravn', 'Gribb', 'Geir', 'Erle'],
    type: { shortName: 'Hauk', hull: { length: 36.5, beam: 6.2 }, camera: { distance: 40, height: 12, shoulder: 0 } },
    stats: { hp: 350, speed: 18, accel: 0.45, turnRate: 0.3, radius: 3, height: 5, eyeHeight: 6, stealth: 0.6, radar: RADAR(1800, 7), ...AA(400, 0.14, 0.03),
      defence: { chaff: { count: 4, cooldown: 10 } }, range: 2800, aggroRange: 2800, preferredRange: 1900, damage: 50 },
    mounts: [MSL({ ...PENGUIN, at: [0, 3, -11], load: 6 }), gun([0, 3.5, 11], FWD, G40),
      { at: [0, 1.5, -6], torpedo: true, facing: FWD, arc: 2.6, homing: true, count: 1, load: 2, range: 1500, speed: 24, damage: 3000, reload: 40 }],
    variant: { name: 'Hauk-class fast attack craft', weapon: '6 Penguin, 2 Tp 61 torpedoes, 40 mm Bofors', text: 'Fourteen of them hide in the skerries and the fjord mouths: out from behind an island, six Penguins and two wire-guided torpedoes, and back among the rocks before the escorts find them.' },
  });
  give(T.natya, 'no', {
    model: buildSauda,
    names: ['Sauda', 'Sira', 'Tana', 'Alta', 'Ogna', 'Vosso', 'Kvina', 'Utla'],
    type: { shortName: 'Sauda', hull: { length: 44, beam: 8.4 }, camera: { distance: 46, height: 14, shoulder: 0 } },
    stats: { hp: 800, speed: 6.5, radius: 3.4, height: 7, sight: 1400, radar: RADAR(1400, 10), ...AA(450, 0.12, 0.03) },
    mounts: [gun([0, 4, 14], FWD, G40), gun([0, 5, -4], AFT, G20)],
    variant: { name: 'Sauda-class minesweeper', weapon: '40 mm Bofors, 20 mm, the sweep', text: 'A wooden sweeper of the American MSC type, built in Norwegian yards: where she steams the moored mines are cut, a lane for the landing craft. Slow, and her Bofors is all she has against the jets.' },
  });
  give(T.lcu520, 'no', {
    model: buildReinoysund,
    names: ['Reinøysund', 'Sørøysund', 'Maursund', 'Rotsund', 'Borgsund'],
    type: { shortName: 'Reinøysund', hull: { length: 50, beam: 10.2 }, hold: { y: 1.1, z: [-10, 19], w: 0, cols: 1 }, camera: { distance: 66, height: 20, shoulder: 0 } },
    stats: { hp: 1400, radius: 5.4 },
    variant: { name: 'Reinøysund-class landing craft', weapon: '2 × 20 mm Rh 202', text: 'The Navy’s tank landing craft, built to put Brigade Nord’s Leopards and M113s ashore in the fjords where no road goes: the ramp down on a gravel beach, the vehicles off, away.' },
  });
  give(T.lcvp85, 'no', {
    model: buildNoLandingBoat,
    names: ['L-boat 1', 'L-boat 2', 'L-boat 3', 'L-boat 4', 'L-boat 5', 'L-boat 6', 'L-boat 7', 'L-boat 8'],
    type: { shortName: 'Landing boat', hull: { length: 12.4, beam: 3.7 }, hold: { y: 0.5, z: [-2.2, 4], w: 2.3, cols: 3 }, camera: { distance: 28, height: 10, shoulder: 0 } },
    stats: { hp: 340 },
    variant: { name: 'Landing boat (Royal Norwegian Navy)', weapon: '—', text: 'A small steel landing boat with a closed wheelhouse against the Arctic spray: a section of infantry from the landing craft to the shore, the ramp down, out.' },
  });

  // ---------------------------------------------------------------- the ROK Navy
  give(T.frigate, 'rok', {
    model: buildUlsan, cost: 260,
    names: ['Ulsan', 'Seoul', 'Chungnam', 'Masan', 'Kyongbuk'],
    type: { shortName: 'Ulsan', hull: { length: 102, beam: 11.5 }, camera: { distance: 78, height: 24, shoulder: 0 } },
    stats: { helo: false, hp: 2400, speed: 16, accel: 0.16, turnRate: 0.12, radius: 5.4, height: 10, radar: RADAR(2600, 20), sonar: 500, depthCharges: DC, asTorp: ASW, ...AA(550, 0.2, 0.05),
      defence: { chaff: CHAFF, ecm: 0.2 }, range: 4600, aggroRange: 4600, preferredRange: 2400, damage: 80 },
    mounts: [MSL({ ...HARPOON, at: [0, 7, -9], load: 8 }), gun([0, 7, 36], FWD, G76), gun([0, 7, -38], AFT, G76), gun([0, 9, 10], FWD, G30)],
    variant: { name: 'Ulsan-class frigate', weapon: '8 Harpoon, 2 × 76 mm, 4 × twin 30 mm', text: 'Korea’s first home-built frigate: fast, eight Harpoons and two quick 76s — but no missile against aircraft, only her guns.' },
  });
  give(T.destroyer, 'rok', {
    model: buildGearingRok, cost: 420,
    names: ['Chung Buk', 'Jeon Buk', 'Taejon', 'Kwang Ju', 'Kang Won', 'Kyong Ki', 'Jeon Ju'],
    type: { shortName: 'Gearing', hull: { length: 119, beam: 12.5 }, camera: { distance: 90, height: 28, shoulder: 0 } },
    stats: { helo: false, hp: 3400, speed: 14.5, accel: 0.13, turnRate: 0.1, radius: 6, height: 12, radar: RADAR(2800, 24), sonar: 700, ...AA(550, 0.2, 0.05),
      defence: { chaff: CHAFF, ecm: 0.2 }, range: 4600, aggroRange: 4600, preferredRange: 2200, damage: 160 },
    mounts: [MSL({ ...HARPOON, at: [0, 7, -32], load: 8 }), gun([0, 8, 42], FWD, G538), gun([0, 8, -44], AFT, G538)],
    variant: { name: 'Gearing-class destroyer (FRAM I)', weapon: '8 Harpoon, ASROC, 2 × twin 5-inch/38', text: 'The Second World War’s last destroyers, handed over by the US Navy and rearmed with Harpoons: the old twin 5-inch guns still hit harder than any frigate’s, and ASROC for submarines. No missile against aircraft.' },
  });
  give(T.ptBoat, 'rok', {
    model: buildPKM, cost: 120,
    names: ['PKM 211', 'PKM 213', 'PKM 215', 'PKM 217', 'PKM 219', 'PKM 221', 'PKM 223', 'PKM 225'],
    type: { shortName: 'PKM', hull: { length: 37, beam: 6.9 }, camera: { distance: 40, height: 12, shoulder: 0 } },
    stats: { hp: 320, speed: 19, accel: 0.45, turnRate: 0.3, radius: 3, height: 5.5, eyeHeight: 6.5, stealth: 0.65, radar: RADAR(1600, 7), ...AA(500, 0.16, 0.04),
      defence: { chaff: { count: 2, cooldown: 12 } }, range: 1000, aggroRange: 1200, preferredRange: 700, damage: 50 },
    mounts: [gun([0, 3.5, 11], FWD, G40), gun([0, 3.5, -12], AFT, G20)],
    variant: { name: 'PKM patrol boat (Chamsuri)', weapon: '40 mm Bofors, 20 mm Sea Vulcan', text: 'The coast guard of the islands off the Northern Limit Line, by the dozen: fast and well gunned against the North’s boats and the landing craft — no missiles.' },
  });
  give(T.natya, 'rok', {
    model: buildKumSan,
    names: ['Kum San', 'Ko Hung', 'Kum Kok', 'Nam Yang', 'Ha Dong', 'Sam Kok', 'Yong Dong', 'Ok Cheon'],
    type: { shortName: 'Kum San', hull: { length: 44, beam: 8.4 }, camera: { distance: 46, height: 14, shoulder: 0 } },
    stats: { hp: 780, speed: 6.5, radius: 3.4, height: 7, sight: 1400, radar: RADAR(1400, 10), ...AA(450, 0.12, 0.03) },
    mounts: [gun([0, 4, 14], FWD, G20), gun([0, 5, -4], AFT, G20)],
    variant: { name: 'Kum San-class minesweeper (MSC-268)', weapon: '2 × twin 20 mm, the sweep', text: 'American-built wooden sweepers of the MSC-268 type: slow and lightly armed, but where they steam the moored mines are cut and the lane opens for the landing ships.' },
  });
  give(T.lcu520, 'rok', {
    model: buildUnBong,
    names: ['Un Bong', 'Duk Bong', 'Bi Bong', 'Kae Bong', 'Wee Bong', 'Su Yong', 'Buk Han', 'Hwa San'],
    type: { shortName: 'LST', hull: { length: 100, beam: 15.2 }, hold: { y: 4.7, z: [-18, 30], w: 0, cols: 1 }, camera: { distance: 100, height: 30, shoulder: 0 } },
    stats: { draft: 2.2, hp: 3000, armor: 0.06, speed: 6, accel: 0.12, turnRate: 0.09, radius: 7, height: 12, eyeHeight: 14, sight: 1400, smallCraft: false, ...AA(600, 0.16, 0.04), range: 1000, aggroRange: 1000, damage: 50 },
    mounts: [gun([0, 8, 40], FWD, G40), gun([0, 9, -42], AFT, G40)],
    variant: { name: 'Un Bong-class tank landing ship (LST)', weapon: '2 × twin 40 mm, 20 mm', text: 'A wartime American LST, still the ROK Navy’s heavy lift: the bow doors open on the beach and the tanks drive out of her hold. Big, slow and the first thing every gun on the shore aims at.' },
  });
  give(T.lcvp85, 'rok', {
    model: buildLCM8,
    names: ['LCM 1', 'LCM 2', 'LCM 3', 'LCM 4', 'LCM 5', 'LCM 6', 'LCM 7', 'LCM 8'],
    type: { shortName: 'LCM-8', hull: { length: 22.4, beam: 6.4 }, hold: { y: 0.65, z: [-4, 7.5], w: 3.8, cols: 3 }, camera: { distance: 36, height: 12, shoulder: 0 } },
    stats: { hp: 520, speed: 6.5, accel: 0.6, turnRate: 0.35, radius: 3.4, height: 3 },
    variant: { name: 'LCM-8 landing craft', weapon: '2 × .50 machine guns', text: 'The ROK Navy’s mechanised landing craft: a platoon or a jeep from the LSTs to the mud flats, the ramp down, out.' },
  });
}
