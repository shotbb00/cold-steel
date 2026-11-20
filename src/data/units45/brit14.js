// The roster of the 14th Army, Burma 1944 (Kohima): called once with TYPES_1945 (./index.js) to give
// each type it fields its `variants.brit14` (and models / factionStats / armyCost for brit14 where they differ).
// ARMIES.brit14 is `own` (data/epoch.js): only the types given a variant here are on its list.
// "The Forgotten Army": British, Indian and Gurkha battalions in jungle green, a few American-built tanks the
// desert had finished with, mountain guns that went up the hills on mules — and everything else dropped by Dakota.
// Its vehicles not in models/brit45.js are in models/brit14.js.
import { buildWw2Soldier } from '../models/ww2Soldier.js';
import { buildBrGrant, buildBrCarrier } from '../models/brit45.js';
import { buildBrStuart, buildBrJeepCP, buildBrJeepAmb, buildBrPack37, buildBr25pdrJG, buildBrRecoveryJG, buildBrRadarJG, buildBr37AAJG, buildBrBaileyJG } from '../models/brit14.js';

const man = (o = {}) => () => buildWw2Soldier({ army: 'brit14', ...o });

export default function brit14(T) {
  /** Give type `t` its 14th Army model, stats (over the Allied side's), price and name. */
  const set = (t, { model, specialist, stats, cost, variant }) => {
    if (model) t.models = { ...t.models, brit14: model };
    if (specialist) t.specialistModels = { ...t.specialistModels, brit14: specialist };
    if (stats) t.factionStats = { ...t.factionStats, brit14: { ...t.factionStats?.nato, ...stats } };
    if (cost) t.armyCost = { ...t.armyCost, brit14: Math.round(t.cost * cost) };
    t.variants = { ...t.variants, brit14: variant };
  };
  const ENFIELD = { fireCooldown: 1.9, magSize: 10, reloadTime: 3, playerFireInterval: 0.9 }; // (the SMLE: the fastest bolt action)

  // ---- the infantry: British and Indian battalions, the Gurkhas
  T.rifles.kitModels = { ...T.rifles.kitModels, at: { ...T.rifles.kitModels?.at, brit14: man({ weapon: 'pzf' }) } }; // (the PIAT)
  set(T.rifles, { stats: ENFIELD,
    variant: { name: 'Rifle Section', weapon: 'Lee-Enfield No. 1, Bren gun', text: 'A British or Indian infantry section in jungle green: ten rifles round the Bren. At Kohima the Royal West Kents and the Assam Regiment held the ridge for a fortnight.' } });
  set(T.atTeam, { model: man({ weapon: 'pzf' }), stats: { range: 90 },
    variant: { name: 'PIAT Team', weapon: 'PIAT', text: 'The spring-loaded projector with its hollow-charge bomb: short-ranged, a brute to cock — and it knocks out a Japanese tank or a bunker’s loophole.' } });
  set(T.mgTeam, { stats: { burst: 12, burstInterval: 0.1, fireCooldown: 2.0 },
    variant: { name: 'Vickers MG Team', weapon: 'Vickers .303 machine gun', text: 'The water-cooled Vickers on its tripod: from Garrison Hill it fired belt after belt across the tennis court.' } });
  set(T.mortar, { variant: { name: '3-inch Mortar Team', weapon: 'Ordnance ML 3-inch mortar', text: 'The battalion’s mortars, dug in on the reverse slopes: high explosive and smoke onto the next spur.' } });
  set(T.scouts, { stats: ENFIELD,
    variant: { name: 'Gurkha Scouts', weapon: 'Lee-Enfield, kukri, binoculars', text: 'Riflemen of the Gurkha battalions out in front: silent in the jungle, they find the enemy’s bunkers — and come back with what they learned.' } });
  set(T.sniper, { variant: { name: 'Sniper', weapon: 'Lee-Enfield No. 4 (T)', text: 'A marksman with the scoped Enfield in the treetops and the terraces, hunting the Japanese snipers who hunt him.' } });
  set(T.engineers, { variant: { name: 'Sappers and Miners', weapon: 'Lee-Enfield, pole charges, flamethrower', text: 'The Indian Army’s sappers and the Royal Engineers: they built the road to Imphal, and on the hills they burn and blow out the bunkers one by one.' } });
  set(T.observers, { variant: { name: 'Forward Observation Officer', weapon: 'Lee-Enfield, wireless set', text: 'The gunners’ officer up on the ridge with the infantry: where he looks, the 25-pounders and the mountain guns land.' } });
  set(T.crew, { variant: { name: 'Tank Crew', weapon: 'Thompson', text: T.crew.variants?.nato?.text ?? 'The crew of a knocked-out vehicle.' } });
  set(T.airAssault, { model: man(), specialist: man({ weapon: 'mg' }), stats: ENFIELD,
    variant: { name: 'Chindits', weapon: 'Lee-Enfield, Bren, Thompson', text: 'Wingate’s Long Range Penetration brigades: flown in by glider and Dakota far behind the Japanese, supplied from the air, they hold their strongholds to the last.' } });

  // ---- the armour: American-built tanks the desert had finished with, the carrier
  set(T.tank, { model: buildBrStuart, stats: { armor: 0.35, hp: 800, damage: 220, range: 160, speed: 6.4, fireCooldown: 3.2 }, cost: 0.65,
    variant: { name: 'M3 Stuart', weapon: '37 mm M6', text: 'The "Honey": small, fast and reliable in the mud, its 37 mm firing canister into the jungle — enough against the Ha-Go.' } });
  set(T.heavyTank, { model: buildBrGrant, stats: { armor: 0.6, hp: 1350, damage: 360, range: 190, fireCooldown: 6, speed: 4.8, traverse: 0.26 }, cost: 0.85,
    variant: { name: 'M3 Lee', weapon: '75 mm M2 in the sponson, 37 mm in the turret', text: 'The tall tank with the 75 low in its side. On 13 May 1944 one of 149th RAC climbed a track the sappers had bulldozed onto the tennis court at Kohima and fired point-blank into the bunkers.' } });
  set(T.ifv, { model: buildBrCarrier, stats: { armor: 0.15, hp: 420, speed: 6.4, weapon: 'rifle', damage: 32, range: 120, gunRange: 120, vsArmor: 0.05 }, cost: 0.8,
    variant: { name: 'Universal Carrier', weapon: 'Bren gun', text: 'The little open tracked carrier: it brings a section and its Bren up the road. U puts them down.' } });

  // ---- the guns
  set(T.artillery, { model: buildBr25pdrJG, stats: { towed: { deploy: 14 }, traverse: 6.3 }, cost: 0.9,
    variant: { name: '25-pounder', weapon: 'Ordnance QF 25-pdr', text: 'The field gun of every British army, on its round platform that swings all the way round: at the Admin Box the gunners fired over open sights.' } });
  set(T.spMortar, { model: buildBrPack37, stats: { towed: { deploy: 10 }, damage: 200, splash: 6, range: 260, armor: 0.05, hp: 380 }, cost: 0.85,
    variant: { name: '3.7-inch Mountain Howitzer', weapon: 'QF 3.7-inch howitzer', text: 'The Indian Mountain Artillery’s pack gun: taken apart onto mules, carried up where no lorry goes, and put together to fire down onto the next ridge.' } });
  set(T.towedAA, { variant: { name: 'Bofors 40 mm', weapon: '40 mm Bofors', text: 'The light AA gun: against the Oscars over the Imphal plain — and lowered, against bunkers across the valley.' } });

  // ---- support
  set(T.ambulance, { model: buildBrJeepAmb, variant: { name: 'Jeep Ambulance', weapon: 'unarmed', text: 'A jeep with stretchers across its back: the only thing that got the wounded down the jungle tracks. Patches up the wounded nearby.' } });
  set(T.commandPost, { model: buildBrJeepCP, variant: { name: 'Brigade Command Jeep', weapon: 'No. 22 wireless set', text: 'Brigade headquarters in a jeep and a dugout: nearby squads hold longer and react faster.' } });
  set(T.recovery, { model: buildBrRecoveryJG, variant: { name: 'Recovery Lorry', weapon: 'crane, winch', text: 'The REME’s breakdown lorry with its jib: it gets knocked-out tanks moving again behind the line.' } });
  set(T.bridgeLayer, { model: buildBrBaileyJG, variant: { name: 'Bailey Bridge Lorry', weapon: 'Bailey bridge', text: 'The sappers’ lorry stacked with Bailey panels: bolted together across the chaung, it takes a Lee — the bridges that carried the army back across the Chindwin.' } });

  // ---- air defence: guns round the airfields the army lived from
  set(T.sam, { model: buildBr37AAJG, variant: { name: '3.7-inch AA Gun', weapon: 'QF 3.7-inch AA', text: 'The heavy AA gun round the Imphal airfields, where the Dakotas landed everything the besieged army ate and fired: it reaches the bombers — and its shells go through a tank too.' } });
  set(T.manpads, { variant: { name: 'AA Bren Team', weapon: 'Bren gun on its AA tripod', text: 'The Bren on its tall anti-aircraft tripod: a stream of .303 across the Oscars’ strafing run.' } });
  set(T.airRadar, { model: buildBrRadarJG, variant: { name: 'Light Warning Set', weapon: 'unarmed', text: 'The RAF’s portable early-warning radar, its beam turning on a mast in the hills: no Japanese raid reaches the airfields unannounced.' } });

  // (nothing in the other slots: in the hills of 1944 the reconnaissance regiments fought on foot and the armoured cars stayed on the
  //  plain; no tank destroyers, flail or assault tanks went to Burma — the Lees did the bunker-busting and the sappers lifted mines by
  //  hand; no rocket launchers, no self-propelled AA, no smoke companies; and no sound ranging in the jungle: guns there were found
  //  by patrols and the air observation posts)
}
