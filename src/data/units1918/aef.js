// The American Expeditionary Forces of 1918 (army `aef`, the nato side; data/epoch.js) and the US Navy with them:
// called once from ./index.js with TYPES_1918 to give each type the AEF fields its `variants.aef`, and models /
// factionStats / armyCost / names / mounts / armyType where they differ. The army is `own`: only these are on its list.
//   land  the doughboy (models/ww1Soldier.js aef: olive drab, the American Brodie, the M1917 Enfield), the Hotchkiss
//         companies, the 37 mm infantry gun, French 75s and 155s, the Tank Corps' Renault FTs and the 301st's Mark Vs,
//         the 2nd Cavalry, the 4th Marine Brigade (the assault slot: Belleau Wood), Ford ambulances, Liberty trucks,
//         a Dodge staff car (models/aef1918.js). No armoured cars: the AEF fielded none (its scouts stand in).
//   sea   New York (Battleship Division Nine with the Grand Fleet), the Wickes flush-deckers out of Queenstown and
//         Brest, the 110-foot subchasers (the small-boat slot: hydrophones and depth charges, no torpedo), the AL-boats
//         at Bantry Bay, the Navy transports, San Francisco laying the North Sea Mine Barrage (models/ships1918us.js).
//         Names written in full (entities/UnitStack.js shipName: an army's own list keeps its USS).
import { buildWw1Soldier } from '../models/ww1Soldier.js';
import { buildWw1Gun } from '../models/ww1Guns.js';
import { buildCavalry, buildCavalryFoot } from '../models/napCavalry.js';
import { buildRenaultFTUS, buildMarkVUS, buildFordAmbulance, buildLibertyTruck, buildDodgeStaffCar, buildAALorryUS, buildBalloonUS } from '../models/aef1918.js';
import { buildNewYork, buildWickes, buildSubchaser, buildLClass, buildTransportUS, buildSanFrancisco } from '../models/ships1918us.js';

const A = 'aef';
const man = (o = {}, army = A) => () => buildWw1Soldier({ army, ...o });
const gunOf = (size) => () => buildWw1Gun({ army: A, size });

/** Give type `t` to the AEF: its variant, and where it differs its model, specialist model, stats (over the British ones), price (× the type's). */
const give = (t, { variant, model, special, stats, cost }) => {
  if (model) t.models = { ...t.models, [A]: model };
  if (special) t.specialistModels = { ...t.specialistModels, [A]: special };
  if (stats) t.factionStats = { ...t.factionStats, [A]: { ...t.factionStats?.nato, ...stats } };
  if (cost) t.armyCost = { ...t.armyCost, [A]: Math.round(t.cost * cost) };
  t.variants = { ...t.variants, [A]: variant };
};

// ---------------------------------------------------------------- at sea (as ./ships.js: the mounts, the sea scale)
const FWD = 0;
const AFT = Math.PI;
const BEAM = Math.PI / 2;
const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.013, splash: 4, pierce: 0.3, shell: 760, size: 1.8, ...o });
const torps = (at, o) => ({ at, torpedo: true, arc: 2.2, count: 2, range: 1300, speed: 18, damage: 2400, reload: 110, ...o });
const DC = (o) => ({ count: 4, reload: 22, radius: 35, damage: 1000, ...o });
const RANGE = 0.55;
const SCALED = ['range', 'aggroRange', 'preferredRange', 'sight', 'sonar', 'hearing'];
const near = (o) => { const r = { ...o }; for (const k of SCALED) if (r[k]) r[k] = Math.round(r[k] * RANGE / 5) * 5; return r; };

/** The US Navy's ship on type `t`: names, model, variant, stats over the side's, mounts, price, her own hull and camera. */
const navy = (t, { names, model, variant, stats, mounts, cost, hull, camera }) => {
  t.names = { ...t.names, [A]: names };
  t.models = { ...t.models, [A]: model };
  t.variants = { ...t.variants, [A]: variant };
  if (stats) t.factionStats = { ...t.factionStats, [A]: near(stats) };
  if (mounts) t.mounts = { ...t.mounts, [A]: mounts.map(near) };
  if (cost) t.armyCost = { ...t.armyCost, [A]: cost };
  if (hull) t.armyType = { ...t.armyType, [A]: { ...t.armyType?.[A], hull, ...(camera && { camera }) } };
};

const FOURTEEN = { range: 3500, reload: 30, damage: 1800, splash: 11, pierce: 0.7, shell: 800, size: 3.5, spread: 0.012 };
const FIVE_INCH = { range: 2000, reload: 5, damage: 210, splash: 4, pierce: 0.28, shell: 770, size: 1.7 };
const FOUR_INCH = { range: 1900, reload: 4, damage: 160, splash: 3.5, pierce: 0.25, shell: 750, size: 1.5 };
const CASEMATE = (at, facing) => gun(at, facing, { ...FIVE_INCH, arc: 2.2 });

export default function aef(T) {
  const { rifles, mgTeam, stormTroops, tank, heavyTank, crew, artillery, spMortar, rockets, mortar, observers, cbRadar, airRadar, ifv, looseHorse, dismounted,
    atTeam, sniper, scouts, engineers, mineClear, aa, manpads, ambulance, recovery, commandPost,
    battleship, destroyer, ptBoat, submarine, transport, minelayer } = T;

  // ---------------------------------------------------------------- the infantry
  give(rifles, { model: man(), stats: { fireCooldown: 2.1, magSize: 6, reloadTime: 3.5, playerFireInterval: 1.1 },
    variant: { name: 'Rifle Squad', weapon: 'M1917 Enfield, Chauchat, VB grenades', text: 'The doughboys: big, fresh, trained to shoot at five hundred yards — and thrown in by Pershing in great waves with the bayonet, as in 1914. Brave to recklessness, they learned the trench war fast and at a terrible price.' } });
  give(mgTeam, { model: man(), special: man({ weapon: 'mg' }),
    variant: { name: 'Machine Gun Company', weapon: 'Hotchkiss M1914, 8 mm', text: 'French Hotchkiss guns, heavy and air-cooled, fed from 24-round strips: the brass rings round the barrel shed the heat, and it fires all day. The Browning M1917 came only for the last weeks.' } });
  mgTeam.specialist = { ...mgTeam.specialist, armyStats: { ...mgTeam.specialist.armyStats, [A]: { burst: 8, burstInterval: 0.13, fireCooldown: 2.0, magSize: 24, reloadTime: 2.5 } } }; // (the strips: short bursts, quick to feed)
  stormTroops.armies = [...stormTroops.armies, A];
  give(stormTroops, { model: man({}, 'aefM'), stats: { fireCooldown: 1.8, magSize: 5, reloadTime: 3, playerFireInterval: 1.0, range: 125, grenades: 3, breakMorale: 0.1 },
    variant: { name: 'US Marines', weapon: 'Springfield M1903, Chauchat, bayonets', text: 'The 4th Marine Brigade, still in forest green: at Belleau Wood in June 1918 they shot the German assault down at four hundred yards with aimed rifle fire, then took the wood in three weeks of hand-to-hand fighting. "Retreat? Hell, we just got here."' } });
  give(mortar, { model: man(), special: man({ weapon: 'mortar' }),
    variant: { name: 'Stokes Mortar Platoon', weapon: '3-inch Stokes mortar', text: 'British Stokes mortars in the regiment\'s own trench mortar platoon: a bomb every few seconds into the next trench.' } });
  give(atTeam, { model: man({ weapon: 'at' }), special: man(), cost: 1.15,
    stats: { weapon: 'rifle', weaponSound: 'cannon', damage: 210, range: 150, splash: 1.5, vsArmor: 0.9, pierce: 0.35, boltSpeed: 350, boltSize: 0.8, trail: false, magSize: 1, reloadTime: 3, fireCooldown: 3 },
    variant: { name: '37 mm Gun Squad', weapon: '37 mm M1916 infantry gun', text: 'The regiment\'s one-pounder: a little French Puteaux gun on a tripod, carried forward by its crew to knock out machine-gun nests point-blank — and, if the Germans brought one, a tank.' } });
  atTeam.specialist = { ...atTeam.specialist, armyStats: { ...atTeam.specialist.armyStats, [A]: { ...rifles.factionStats[A], lightAT: 0, grenades: 0 } } }; // (the gun's riflemen: the doughboy's numbers)
  give(sniper, { model: man({ scout: true }), special: man({ weapon: 'sniper', scout: true }),
    variant: { name: 'Sharpshooters', weapon: 'Springfield M1903 with the Warner & Swasey scope', text: 'The regiment\'s scout-snipers: country boys who had hunted all their lives, behind a telescope on a Springfield.' } });
  give(scouts, { model: man({ scout: true }), variant: { name: 'Intelligence Scouts', weapon: 'M1917, pistols, binoculars', text: 'The battalion scouts: out over no man\'s land at night to find the German posts and the gaps in the wire.' } });
  give(observers, { model: man({ scout: true, radio: true }), variant: { name: 'Artillery Liaison Officer', weapon: 'Colt M1911, field telephone, binoculars', text: 'An officer of the field artillery up with the infantry, a wire back to the 75s: what he sees, they hit.' } });
  give(cbRadar, { model: man({ radio: true }), variant: { name: 'Sound Ranging Section', weapon: 'microphones, plotting board', text: 'The 29th Engineers\' sound rangers, trained by the French and the British: every enemy gun that fires within reach is plotted for your artillery. Needs 25 s to lay out.' } });
  give(engineers, { model: man(), special: man(), variant: { name: 'Combat Engineers', weapon: 'M1917, picks, wire', text: 'The divisional engineer regiment: trenches, wire and bridges — and at need they fought as infantry, as the 2nd Engineers did at Belleau Wood.' } });
  engineers.specialist = { ...engineers.specialist, armyStats: { ...engineers.specialist.armyStats, [A]: { ...rifles.stats, ...rifles.factionStats[A], ignite: undefined, weaponSound: undefined } } }; // (no flamethrower: rifles)
  give(mineClear, { model: man(), variant: { name: 'Bangalore Team', weapon: 'Bangalore torpedoes, wire cutters', text: 'Engineers with Bangalore torpedoes, pushed under the German wire and fired: a lane for the assault (X). Three charges.' } });
  give(manpads, { model: man(), special: man({ weapon: 'mg' }), variant: { name: 'AA Machine-Gun Team', weapon: 'Hotchkiss on an AA tripod', text: 'The Hotchkiss on its high tripod, pointed at the sky: keeps the German contact patrols off the trench.' } });
  give(crew, { model: man({ crew: true }), variant: { name: 'Tank Crew', weapon: 'Colt M1911 pistols', text: 'The crew of a knocked-out tank: a few men with pistols.' } });

  // ---------------------------------------------------------------- the guns: French-built, by the thousand
  give(artillery, { model: gunOf('field'), variant: { name: '75 mm Gun M1897', weapon: 'French 75 mm mle 1897', text: 'The AEF\'s field gun was the French 75 — America\'s own guns came too late. Harry Truman\'s Battery D fired them in the Meuse-Argonne.' } });
  give(spMortar, { model: gunOf('heavy'), variant: { name: '155 mm Howitzer M1917', weapon: 'Schneider 155 mm howitzer', text: 'The French Schneider howitzer in American hands, the heavy shell of the division; the long GPF guns of the corps behind it reached further still.' } });
  give(rockets, { model: gunOf('mortar'), stats: rockets.factionStats.st, variant: { name: '6-inch Newton Mortar', weapon: '6-inch Newton trench mortar', text: 'An American-built trench mortar of the corps\' trench mortar batteries: a heavy bomb at short reach onto the wire and the dugouts.' } });

  // ---------------------------------------------------------------- the Tank Corps
  give(tank, { model: buildRenaultFTUS, stats: tank.factionStats.fr, cost: tank.armyCost.fr / tank.cost,
    variant: { name: 'Renault FT (US Tank Corps)', weapon: 'Puteaux 37 mm', text: 'Patton\'s 1st Tank Brigade at St Mihiel and in the Argonne: French FTs with an American crew, each company\'s playing-card suit on the turret. Small, a turret that turns all the way round — and Patton walking beside them.' } });
  give(heavyTank, { model: buildMarkVUS, cost: tank.cost / heavyTank.cost,
    stats: { ...tank.stats, weapon: 'cannon', weaponSound: undefined, antiArmor: true, vsArmor: 1, magSize: 40, boltSize: 1.4, playerFireInterval: 5 },
    variant: { name: 'Mark V (301st Battalion)', weapon: 'two 6-pounders, four Hotchkiss MGs', text: 'The 301st Heavy Tank Battalion, the only American heavy tanks in action: British Mark Vs, at the Hindenburg Line with the British in September 1918. Slow, proof against bullets — and it breaks down.' } });

  // ---------------------------------------------------------------- the horses, the motors
  give(ifv, { model: () => buildCavalry({ army: 'aef18', kind: 'medium', mounted: true }),
    variant: { name: 'US Cavalry', weapon: 'M1913 Patton sabre, Springfield', text: 'Troops of the 2nd Cavalry, the AEF\'s only mounted regiment: they rode out ahead of the infantry at St Mihiel. The straight Patton sabre for the charge, the rifle on foot.' } });
  looseHorse.models = { ...looseHorse.models, [A]: () => buildCavalry({ army: 'aef18', kind: 'medium', mounted: false }) };
  looseHorse.variants[A] ??= looseHorse.variants.nato;
  dismounted.models = { ...dismounted.models, [A]: () => buildCavalryFoot({ army: 'aef18', kind: 'medium' }) };
  dismounted.variants[A] ??= dismounted.variants.nato;
  give(airRadar, { model: buildBalloonUS, variant: { name: 'Balloon Company', weapon: 'telephone, binoculars', text: 'A balloon company of the Air Service with its French Caquot: two observers in the basket, the sector laid out for the guns.' } });
  give(aa, { model: buildAALorryUS, variant: { name: 'Anti-Aircraft Battery', weapon: 'French 75 mm on an auto-canon mount', text: 'The Coast Artillery\'s anti-aircraft gunners with French 75s on their lorries: shrapnel bursts round the enemy aircraft.' } });
  give(ambulance, { model: buildFordAmbulance, variant: { name: 'Ford Ambulance', weapon: 'unarmed', text: 'The Model T ambulance, light enough for four men to lift out of a shell hole: wounded men near it are patched up and go back to the line.' } });
  give(recovery, { model: buildLibertyTruck, stats: { armor: 0.05, hp: 360, speed: 5.5, breakdown: undefined, ditch: undefined },
    variant: { name: 'Liberty Truck', weapon: 'unarmed', text: 'The Standard B "Liberty", the first truck the Army designed itself: stores and a workshop on its bed — tanks near it are mended and got going again.' } });
  give(commandPost, { model: buildDodgeStaffCar, variant: { name: 'Regimental Headquarters', weapon: 'Dodge staff car, field telephones', text: 'The colonel\'s Dodge and his runners: where it stops, the telephone lines run out and the reinforcements report there.' } });
  // left empty: reconVehicle — the AEF had no armoured cars (its scouts stand in); marines/sailors — Zeebrugge's, the Marines fight ashore here as the assault troops

  // ---------------------------------------------------------------- the US Navy
  navy(battleship, { names: ['USS New York', 'USS Texas'], model: buildNewYork, cost: 1250, hull: { length: 175, beam: 29 }, camera: { distance: 180, height: 56, shoulder: 0 },
    stats: { flareRounds: 4, hp: 22000, armor: 0.64, speed: 11.5, range: 3500, aggroRange: 3500, preferredRange: 2900, damage: 1800, fireCooldown: 30, boltSize: 3.5, splash: 11, pierce: 0.7 },
    mounts: [gun([0, 12, 64], FWD, FOURTEEN), gun([0, 15, 51], FWD, FOURTEEN), gun([0, 12, -14], AFT, { ...FOURTEEN, arc: 3.6 }), gun([0, 15, -46], AFT, FOURTEEN), gun([0, 12, -59], AFT, FOURTEEN),
      CASEMATE([13, 6, 20], BEAM), CASEMATE([-13, 6, 20], -BEAM), CASEMATE([13, 6, -24], BEAM), CASEMATE([-13, 6, -24], -BEAM)],
    variant: { name: 'New York-class battleship', weapon: '10 × 14-inch, 21 × 5-inch', text: 'Battleship Division Nine: New York and her sisters joined the Grand Fleet at Scapa Flow as its Sixth Battle Squadron. Ten 14-inch guns, the lattice cage masts — slower than a Queen Elizabeth, and her gunnery came up to British standard only after months of drill.' } });
  navy(destroyer, { names: ['USS Wickes', 'USS Little', 'USS Kimberly', 'USS Sigourney', 'USS Gregory', 'USS Stringham', 'USS Dyer', 'USS Colhoun', 'USS Stevens', 'USS Fairfax', 'USS Taylor', 'USS Manley'], model: buildWickes,
    stats: { hp: 2800, speed: 17, sonar: 550, depthCharges: DC({ count: 6, reload: 18 }) },
    mounts: [gun([0, 7, 33], FWD, FOUR_INCH), gun([3, 6, -4], BEAM, { ...FOUR_INCH, arc: 3 }), gun([-3, 6, -4], -BEAM, { ...FOUR_INCH, arc: 3 }), gun([0, 6, -38], AFT, FOUR_INCH),
      ...[[3.3, -14], [-3.3, -14], [3.3, -22], [-3.3, -22]].map(([x, z]) => torps([x, 5, z], { count: 3, facing: Math.sign(x) * BEAM, arc: 1.6 }))],
    variant: { name: 'Wickes-class destroyer', weapon: '4 × 4-inch, 12 torpedo tubes, depth charges', text: 'The "four-piper": flush-decked, fast, twelve tubes in four triple mounts at the deck edge. The flotillas at Queenstown escorted the convoys in — "We are ready now", said their commander on arrival — and hunted the U-boats with the depth charges over the stern.' } });
  navy(ptBoat, { names: ['SC 21', 'SC 28', 'SC 93', 'SC 129', 'SC 131', 'SC 143', 'SC 178', 'SC 206'], model: buildSubchaser, cost: 130, hull: { length: 33.5, beam: 4.5 }, camera: { distance: 46, height: 14, shoulder: 0 },
    stats: { hp: 420, speed: 9, sight: 1400, sonar: 650, stealth: 0.4, depthCharges: DC({ count: 3, reload: 20 }), range: 900, aggroRange: 1000, preferredRange: 600, damage: 70, fireCooldown: 3, boltSize: 0.8, splash: 1.5, pierce: 0.1 },
    mounts: [gun([0, 3, 11.5], FWD, { range: 900, reload: 3, damage: 70, splash: 1.5, pierce: 0.1, shell: 700, size: 0.8, arc: 4.4 })],
    variant: { name: '110-foot submarine chaser', weapon: '3-inch/23, Y-gun, depth charges, hydrophones', text: 'A wooden boat built by the hundred in yacht yards, with a reserve crew of college boys: she hunts in threes, her hydrophones listening for the U-boat, the Y-gun throwing charges either side. No torpedo — she is the hunter. At Durazzo in October 1918 a dozen of them screened the bombardment.' } });
  navy(submarine, { names: ['USS AL-1', 'USS AL-2', 'USS AL-4', 'USS AL-9', 'USS AL-10', 'USS AL-11'], model: buildLClass, cost: 400, hull: { length: 51, beam: 5.3 },
    stats: { hp: 1400, speed: 7.5, damage: 110, range: 1100, aggroRange: 1100, preferredRange: 850 },
    mounts: [torps([0, -1, 24], { facing: 0, arc: 0.9, count: 4, range: 1200, damage: 2200, reload: 60 }), gun([0, 3, 9], 0, { range: 1000, reload: 5, damage: 110, splash: 2.5, surfaced: true, arc: 5.2 })],
    variant: { name: 'L-class submarine', weapon: '4 torpedo tubes, 3-inch', text: 'The AL-boats at Bantry Bay — the "A" so as not to be taken for the British L class: they lay in wait off the Irish coast for the U-boats coming home. AL-2 was nearly sunk by one; they hit nothing — but the U-boats learned to dive.' } });
  navy(transport, { names: ['USS Henderson', 'USS Hancock', 'USS Pocahontas', 'USS Susquehanna', 'USS Antigone', 'USS Covington', 'USS President Lincoln', 'USS Mount Vernon'], model: buildTransportUS, hull: { length: 135, beam: 17 },
    stats: { hp: 7000, speed: 8.5 },
    mounts: [gun([0, 9, -58], AFT, { range: 1500, reload: 5, damage: 150, splash: 3, arc: 4 })],
    variant: { name: 'Navy transport', weapon: 'a 5-inch fore and aft', text: 'Many were German liners seized in American ports and sent back across with two million men aboard: dazzle-painted, gunned, convoyed. The troops she carries hold a zone and bring in command points.' } });
  navy(minelayer, { names: ['USS San Francisco', 'USS Baltimore', 'USS Roanoke', 'USS Housatonic', 'USS Canonicus', 'USS Quinnebaug', 'USS Shawmut', 'USS Aroostook'], model: buildSanFrancisco, cost: 400, hull: { length: 98, beam: 15 }, camera: { distance: 105, height: 32, shoulder: 0 },
    stats: { minelayer: { count: 40, spacing: 30 }, hp: 5000, armor: 0.2, speed: 11, radius: 8, height: 12, smokeGen: undefined, range: 2000, aggroRange: 2000, preferredRange: 1500, damage: 210, fireCooldown: 5 },
    mounts: [gun([0, 7, 38], FWD, FIVE_INCH), gun([6, 6, 10], BEAM, { ...FIVE_INCH, arc: 3 }), gun([-6, 6, 10], -BEAM, { ...FIVE_INCH, arc: 3 }), gun([0, 7, -24], AFT, FIVE_INCH)],
    variant: { name: 'Mine Squadron One', weapon: '4 × 5-inch, 40 mines', text: 'The North Sea Mine Barrage: from Orkney to Norway, 56,000 American mines in 1918 — the old cruiser San Francisco and Baltimore and the converted coastal liners laid them in great rows at night. Your ships know where the mines are; theirs find out the hard way.' } });
}
