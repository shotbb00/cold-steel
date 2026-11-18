// The roster of the 21st Army Group, NW Europe 1944–45 (Gold Beach, the bocage, Arnhem): called once with TYPES_1945 (./index.js) to give
// each type it fields its `variants.brit21` (and models / factionStats / armyCost for brit21 where they differ).
// ARMIES.brit21 is `own` (data/epoch.js): only the types given a variant here are on its list.
// Montgomery's British and Canadian divisions: Shermans (one in four a Firefly), the Bren carriers, the 25-pounders —
// and where Britain had no hull of its own the American one stands in (the Sherman, the M10, the dozer).
import { buildWw2Soldier } from '../models/ww2Soldier.js';
import { buildBrDaimler, buildBr25pdr, buildBrCarrier, buildBrAustinAmb, buildBrDorchester, buildBrScammell } from '../models/brit45.js';

const man = (o = {}) => () => buildWw2Soldier({ army: 'brit21', ...o });

export default function brit21(T) {
  /** Give type `t` its 21st Army Group model, stats (over the Allied side's), price and name. */
  const set = (t, { model, specialist, stats, cost, variant }) => {
    if (model) t.models = { ...t.models, brit21: model };
    if (specialist) t.specialistModels = { ...t.specialistModels, brit21: specialist };
    if (stats) t.factionStats = { ...t.factionStats, brit21: { ...t.factionStats?.nato, ...stats } };
    if (cost) t.armyCost = { ...t.armyCost, brit21: Math.round(t.cost * cost) };
    t.variants = { ...t.variants, brit21: variant };
  };
  const ENFIELD = { fireCooldown: 1.9, magSize: 10, reloadTime: 3, playerFireInterval: 0.9 }; // (the No. 4 rifle: the fastest bolt action)

  // ---- the infantry
  T.rifles.kitModels = { ...T.rifles.kitModels, at: { ...T.rifles.kitModels?.at, brit21: man({ weapon: 'pzf' }) } }; // (the PIAT)
  set(T.rifles, { stats: ENFIELD,
    variant: { name: 'Rifle Section', weapon: 'Lee-Enfield No. 4, Bren gun', text: 'Ten rifles round the Bren: the British and Canadian infantry who came ashore on Gold, Juno and Sword and fought hedge by hedge to the Rhine.' } });
  set(T.atTeam, { model: man({ weapon: 'pzf' }), stats: { range: 90 },
    variant: { name: 'PIAT Team', weapon: 'PIAT', text: 'The spring-loaded projector with its hollow-charge bomb: short-ranged and a brute to cock — at Arnhem it stopped Panzers in the streets.' } });
  set(T.mgTeam, { stats: { burst: 12, burstInterval: 0.1, fireCooldown: 2.0 },
    variant: { name: 'Vickers MG Team', weapon: 'Vickers .303 machine gun', text: 'The water-cooled Vickers of the support battalions: belt after belt across the next field.' } });
  set(T.mortar, { variant: { name: '3-inch Mortar Team', weapon: 'Ordnance ML 3-inch mortar', text: 'The battalion’s mortars: high explosive and smoke over the hedgerow in front.' } });
  set(T.scouts, { stats: ENFIELD, variant: { name: 'Scouts', weapon: 'Lee-Enfield, binoculars', text: 'A patrol out in front: they find the Spandau in the next hedge before the section walks into it.' } });
  set(T.sniper, { variant: { name: 'Sniper', weapon: 'Lee-Enfield No. 4 (T)', text: 'A marksman with the scoped Enfield in a barn loft, hunting the German snipers of the bocage.' } });
  set(T.engineers, { variant: { name: 'Royal Engineers', weapon: 'Lee-Enfield, mine detectors, flamethrower', text: 'The sappers: they clear the beach obstacles and the minefields, bridge the canals — and burn out the strongpoints.' } });
  set(T.observers, { variant: { name: 'Forward Observation Officer', weapon: 'Lee-Enfield, wireless set', text: 'The gunners’ officer up with the infantry: where he looks, a whole regiment of 25-pounders lands at once.' } });
  set(T.crew, { variant: { name: 'Tank Crew', weapon: 'Sten', text: T.crew.variants?.nato?.text ?? 'The crew of a knocked-out vehicle.' } });
  set(T.airAssault, { model: man(), specialist: man({ weapon: 'mg' }), stats: ENFIELD,
    variant: { name: 'Airborne', weapon: 'Lee-Enfield, Sten, Bren', text: 'The red berets of the 1st and 6th Airborne: by glider onto Pegasus Bridge, by parachute onto the heath outside Arnhem — and they hold until relieved.' } });

  // ---- the armour: American hulls in British hands
  set(T.tank, { stats: { noStabilizer: true, damage: 420, fireCooldown: 7 }, cost: 1.05,
    variant: { name: 'Sherman Firefly', weapon: 'QF 17-pounder', text: 'A Sherman with the 17-pounder crammed into its turret: one in each troop, the only British tank that kills a Panther from the front. The Germans aimed for it first. Stops to fire.' } });
  set(T.tankDestroyer, { stats: { armor: 0.35, hp: 800, speed: 6.2, damage: 480, fireCooldown: 7 },
    variant: { name: 'M10 Achilles', weapon: 'QF 17-pounder', text: 'The American M10 re-gunned with the 17-pounder by the Royal Artillery: an open turret, and the best anti-tank gun the Allies had. Stops to fire.' } });
  set(T.cev, { variant: { name: 'Sherman Dozer', weapon: '75 mm M3, dozer blade', text: 'A Sherman with a bulldozer blade: it fills the craters, cuts through the hedgebanks and shells the house behind them.' } });
  set(T.mineClear, { variant: { name: 'Sherman Crab', weapon: 'flail, 75 mm M3', text: 'Hobart’s “Funnies”: chains on a spinning drum beat a lane through the minefield ahead of the infantry.' } });
  set(T.reconVehicle, { model: buildBrDaimler, stats: { weapon: 'cannon', damage: 140, vsArmor: 0.6, pierce: 0.4, splash: 1, fireCooldown: 2.4 }, cost: 0.9,
    variant: { name: 'Daimler Armoured Car', weapon: 'QF 2-pounder', text: 'The reconnaissance regiments’ armoured car: quick on the roads of France, the 2-pounder for anything lightly armoured.' } });
  set(T.ifv, { model: buildBrCarrier, stats: { armor: 0.15, hp: 420, speed: 6.4, weapon: 'rifle', damage: 32, range: 120, gunRange: 120, vsArmor: 0.05 }, cost: 0.8,
    variant: { name: 'Universal Carrier', weapon: 'Bren gun', text: 'The Bren carrier: it brings a section and its gun up the lane. U puts them down.' } });

  // ---- the guns
  set(T.artillery, { model: buildBr25pdr, stats: { towed: { deploy: 14 }, traverse: 6.3 }, cost: 0.9,
    variant: { name: '25-pounder', weapon: 'Ordnance QF 25-pdr', text: 'The field gun of every British army: in Normandy whole divisions of them fired together on one map reference.' } });
  set(T.towedAA, { variant: { name: 'Bofors 40 mm', weapon: '40 mm Bofors', text: 'The light AA gun: against the Focke-Wulfs over the beachhead — and lowered, against the hedges.' } });

  // ---- support
  set(T.ambulance, { model: buildBrAustinAmb, variant: { name: 'Austin K2 Ambulance', weapon: 'unarmed', text: 'The “Katy”: the field ambulance — patches up the wounded nearby.' } });
  set(T.commandPost, { model: buildBrDorchester, variant: { name: 'AEC Dorchester', weapon: 'wireless sets', text: 'The armoured command vehicle: brigade headquarters on wheels. Nearby squads hold longer and react faster.' } });
  set(T.recovery, { model: buildBrScammell, variant: { name: 'Scammell Pioneer', weapon: 'crane, winch', text: 'The heavy recovery lorry: it gets knocked-out tanks moving again behind the line.' } });
}
