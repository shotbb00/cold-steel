// The rosters of the Northern Flank and Korea, 1985 (data/epoch.js): called once with TYPES_1985 (./index.js) to give
// each type an army fields its `variants[army]`, its model, and its stats (factionStats: the side's, then the
// army's) and price (armyCost) where they differ. All four armies are `own`: only the types given a variant here
// are on their lists (data/factions.js armyHas).
//   no    Norwegian Army — Brigade Nord in Troms: Leopard 1, NM116, NM135 and M113s, M109s; ski troops
//   usmc  US Marine Corps — the 4th Marine Amphibious Brigade, earmarked for Norway: M60A1, AAV7A1, LAV-25, M198
//   rok   ROK Army — on the DMZ: M48A5K, KIFV and M113s, M109A2, Vulcans, the K136 rocket launcher
//   kpa   Korean People's Army — T-55 and Chonma-ho, VTT-323, the Koksan gun, Grads, AA guns and masses of infantry
import { buildSoldier85 } from '../models/soldier85.js';
import { buildNoLeopard1, buildNoNM116, buildNoNM135, buildUsM60A1, buildUsAAV7, buildUsLAV25, buildUsM198, buildUsJeepTOW,
  buildRokJeep106, buildRokM48, buildRokKIFV, buildKpaT55, buildKpaChonma, buildKpaVTT323, buildKpaKoksan } from '../models/armour85.js';

const SIDE = { no: 'nato', usmc: 'nato', rok: 'nato', kpa: 'pact' };
// each infantry type's men: [their models' options, the specialists' (the gunner, the launcher)]
const MEN = {
  rifles: [{}], atTeam: [{ weapon: 'at' }, {}], mgTeam: [{}, { weapon: 'mg' }], mortar: [{}, { weapon: 'mortar' }],
  scouts: [{ scout: true }], sniper: [{ scout: true }, { weapon: 'sniper', scout: true }], engineers: [{}],
  observers: [{ scout: true, radio: true }], manpads: [{}, { weapon: 'manpads' }], crew: [{ weapon: 'smg', crew: true }],
  kampfgruppe: [{ militia: true }], airAssault: [{ airAssault: true }],
};
const CREW = 'The crew of a knocked-out vehicle, making for the rear. Walk them to one of your knocked-out vehicles that didn’t burn out and they man it again.';

export default function armies85(T) {
  /** Give `army` type `id`: its variant, model (vehicles; the men come from MEN), stats over its side's, price factor. */
  const give = (army, id, variant, { model, stats, cost } = {}) => {
    const t = T[id];
    const men = MEN[id];
    if (men) {
      t.models = { ...t.models, [army]: () => buildSoldier85({ army, ...men[0] }) };
      if (men[1]) t.specialistModels = { ...t.specialistModels, [army]: () => buildSoldier85({ army, ...men[1] }) };
    }
    if (id === 'rifles') for (const k of ['at', 'smg']) t.kitModels[k] = { ...t.kitModels[k], [army]: () => buildSoldier85({ army, weapon: k }) };
    if (model) t.models = { ...t.models, [army]: model };
    else if (!men) t.models = { ...t.models, [army]: t.models[SIDE[army]] }; // (the side's model in the army's own paint)
    if (stats) t.factionStats = { ...t.factionStats, [army]: stats };
    if (cost) t.armyCost = { ...t.armyCost, [army]: Math.round(t.cost * cost) };
    t.variants = { ...t.variants, [army]: variant };
  };
  const noATGM = { atgm: null };
  const fifty = { weapon: 'autocannon', damage: 70, splash: 0.4, pierce: 0.15, vsArmor: 0.12, fireCooldown: 0.18, magSize: 12, boltSize: 0.6, range: 170, gunRange: 170 }; // a .50 cal in a cupola

  // ---------------------------------------------------------------- Norway
  const no = (id, v, o) => give('no', id, v, o);
  no('rifles', { name: 'Infantry Squad', weapon: 'AG3 rifles, MG3, M72 LAW', text: 'Norwegian conscripts of Brigade Nord in their snow suits: at home in the cold, the birch woods and the deep snow where the enemy’s columns stick to the one road.' });
  no('atTeam', { name: 'Carl Gustaf Team', weapon: 'Carl Gustaf M2, 84 mm', text: 'The recoilless rifle every Norwegian platoon carries: from a snow hole beside the road, the side of a T-72 is close enough.' });
  no('mgTeam', { name: 'MG3 Team', weapon: 'MG3, 7.62 mm', text: 'The licence-built MG3 on its tripod: one gun closes a frozen valley floor.' });
  no('mortar', { name: 'Mortar Team', weapon: '81 mm mortar', text: 'The company’s mortars, dragged up the slopes on pulks: high explosive and smoke on anything the squads can see.' });
  no('scouts', { name: 'Ski Patrol', weapon: 'AG3, binoculars, skis', text: 'Jegers on skis: out ahead of the line in white, they see the column long before it sees them, and they are gone before it can turn.' });
  no('sniper', { name: 'Sniper Team', weapon: 'scoped Mauser rifle, AG3', text: 'A marksman in white on a snow-covered ridge: officers, drivers and radio men first.' });
  no('engineers', { name: 'Engineer Squad', weapon: 'AG3, mines, demolition charges', text: 'The engineers of the North: they blow the bridges and the road ledges along the fjords, mine the passes and dig the positions in frozen ground.' });
  no('observers', { name: 'Artillery Observers', weapon: 'AG3, radio, binoculars', text: 'Forward observers on the heights over the valleys: where they look, the M109s land.' });
  no('manpads', { name: 'RBS 70 Team', weapon: 'RBS 70, laser beam-riding missile', text: 'The Swedish missile that rides a laser beam to its target: no flares fool it. The crew guides it all the way to the helicopter.' });
  no('crew', { name: 'Tank Crew', weapon: 'MP2 (Uzi)', text: CREW });
  no('tank', { name: 'Leopard 1A1NO', weapon: '105 mm L7A3', text: 'Norway’s Leopard 1: fast on the frozen roads and accurate with the L7, but no thermal sight yet and armour that stops little more than autocannon. Shoot from the treeline, then move.' },
    { model: buildNoLeopard1, stats: { armor: 0.5, hp: 1200, damage: 370, speed: 6.2, nightSight: 0.6 } });
  no('reconVehicle', { name: 'NM116', weapon: '90 mm D/925', text: 'The M24 Chaffee of 1944, rebuilt in Norway: a diesel, a laser rangefinder and a 90 mm that fires HEAT. Light enough for the bridges and the snow — not to be caught by a tank.' },
    { model: buildNoNM116, stats: { ...noATGM, weapon: 'cannon', weaponSound: 'cannon', damage: 300, splash: 2.5, pierce: 0.45, vsArmor: 0.9, fireCooldown: 4.5, burst: 1, magSize: 40, reloadTime: 8,
      boltSize: 1.4, tracer: 1, range: 180, gunRange: 180, armor: 0.3, hp: 800, speed: 6.5, nightSight: 0.6, antiArmor: true } });
  no('ifv', { name: 'NM135', weapon: '20 mm Rh 202, MG3', text: 'Norway’s M113 with a Hägglunds turret on its roof: the 20 mm keeps the infantry company and its squad. No missile — the Carl Gustafs inside do that. U unloads the squad.' },
    { model: buildNoNM135, stats: { ...noATGM, range: 170, damage: 95, armor: 0.3, hp: 700, nightSight: 0.6 }, cost: 0.8 });
  no('tankDestroyer', { name: 'M113 with TOW', weapon: 'TOW, 10 missiles', text: 'The TOW on an M113: the brigade’s long arm against tanks. It waits hull-down at the end of a straight valley road.' },
    { stats: { nightSight: 0.7 } });
  no('artillery', { name: 'M109A3GN', weapon: '155 mm howitzer', text: 'Norway’s M109 with the long barrel: the guns behind the ridge that make every valley road a killing ground.' },
    { model: T.artillery.models.bw });
  no('recovery', { name: 'Leopard 1 ARV', weapon: 'crane, winch, dozer blade', text: 'The Leopard’s recovery vehicle: it hauls knocked-out tanks out of the snow and gets them running again.' },
    { model: T.recovery.models.bw });
  no('ambulance', { name: 'M113 Ambulance', weapon: 'Unarmed · red cross', text: 'Wounded men near it are patched up and kept warm: in the Arctic winter that saves as many as the dressings.' });
  no('airAssault', { name: 'Heliborne Infantry Section', weapon: 'AG3, MG3 · by UH-1B (P)', text: 'Brigade Nord’s infantry flown up the valley by the Air Force’s Hueys: onto the ridge before the enemy column reaches it, or behind it to close the road.' });
  no('commandPost', { name: 'M577 command post', weapon: 'unarmed', text: 'The battalion’s headquarters in a tall M113: nearby squads hold longer and react faster.' });

  // ---------------------------------------------------------------- US Marine Corps
  const mc = (id, v, o) => give('usmc', id, v, o);
  mc('rifles', { name: 'Marine Rifle Squad', weapon: 'M16A2, M203, M72 LAW', text: 'Thirteen Marines in three fire teams, trained for the Norwegian winter: the woodland blouse, white over-trousers, and a lot of rifle fire.' });
  mc('atTeam', { name: 'SMAW Team', weapon: 'Mk 153 SMAW, 83 mm', text: 'The Marines’ new assault weapon: a rocket that opens bunkers and houses — and, from the side, armour.' });
  mc('mgTeam', { name: 'M60 Machine-Gun Team', weapon: 'M60, 7.62 mm', text: 'The gun team that holds what the riflemen take.' });
  mc('mortar', { name: '81 mm Mortar Team', weapon: 'M29A1, 81 mm', text: 'The battalion’s own artillery: bombs and smoke on anything the squads can see.' });
  mc('scouts', { name: 'Force Recon Team', weapon: 'M16A2, binoculars', text: 'Force Reconnaissance: a few men far forward who see the enemy coming and call down everything the brigade owns.' });
  mc('sniper', { name: 'Scout-Sniper Team', weapon: 'M40A1, M16A2', text: 'The Marine Scout-Sniper with his M40A1 and a spotter: one round at a time, each one counted.' });
  mc('engineers', { name: 'Combat Engineers', weapon: 'M16A2, demolition charges, mines', text: 'They breach the wire and the minefields for the assault, and blow whatever stands in its way.' });
  mc('observers', { name: 'ANGLICO Team', weapon: 'M16A2, radios', text: 'Air and naval gunfire liaison: they bring the guns, the rocket artillery and the strike aircraft down where they look.' });
  mc('manpads', { name: 'Stinger Team', weapon: 'FIM-92 Stinger', text: 'The Low Altitude Air Defense gunners: fire-and-forget missiles at any helicopter that shows over the ridge.' });
  mc('crew', { name: 'Vehicle Crew', weapon: 'M3 grease gun', text: CREW });
  mc('tank', { name: 'M60A1', weapon: '105 mm M68', text: 'The Marines’ main battle tank: tall and old, but its 105 mm hits as hard as any NATO gun and its passive night sights see a little in the dark.' },
    { model: buildUsM60A1, stats: { armor: 0.6, hp: 1350, damage: 380, speed: 4.8, nightSight: 0.7 }, cost: 0.9 });
  mc('ifv', { name: 'AAV7A1', weapon: '.50 cal M85', text: 'The amphibious tractor: it swims in from the ships, climbs the beach and carries a whole squad inland. Tall, thin-skinned and armed only with a heavy machine gun. U unloads the squad.' },
    { model: buildUsAAV7, stats: { ...noATGM, ...fifty, armor: 0.3, hp: 950, speed: 5.4, nightSight: 0.6 }, cost: 0.75 });
  mc('reconVehicle', { name: 'LAV-25', weapon: '25 mm M242 Bushmaster', text: 'New in 1984: the eight-wheeled light armoured vehicle of the Marines’ reconnaissance battalions. Fast on roads, sharp-eyed, its Bushmaster shreds infantry and light vehicles — no missile.' },
    { model: buildUsLAV25, stats: { ...noATGM, range: 170, speed: 8.2, armor: 0.25, hp: 600 } });
  mc('tankDestroyer', { name: 'M151A2 with TOW', weapon: 'M220 TOW, 10 missiles', text: 'A TOW on a quarter-ton jeep: it scoots from cover to cover, fires and is gone. Anything that fires back kills it.' },
    { model: buildUsJeepTOW, stats: { armor: 0.03, hp: 260, speed: 8.5, radius: 1.4, height: 2.0, nightSight: 0.8 }, cost: 0.75 });
  mc('artillery', { name: 'M198 Howitzer', weapon: '155 mm towed howitzer', text: 'The Marines’ towed 155 mm behind its 5-ton truck: further and heavier than the Army’s M109 — but unhitching and laying it takes time, and it turns only through a narrow arc.' },
    { model: buildUsM198, stats: { towed: { deploy: 20 }, traverse: 0.4, range: 330, armor: 0.1, hp: 420 } });
  mc('recovery', { name: 'M88A1 Recovery Vehicle', weapon: '.50 cal M2, A-frame boom, winch', text: 'Brings the M60s back from wherever they were knocked out.' });
  mc('bridgeLayer', { name: 'M60 AVLB', weapon: 'Unarmed · 18 m scissors bridge', text: 'An M60 hull carrying a folding bridge: it lays it across the gap and backs away.' });
  mc('airAssault', { name: 'Heliborne Rifle Squad', weapon: 'M16A2, M203 · by CH-46E (P)', text: 'Vertical envelopment: a Sea Knight puts a Marine squad down wherever you point (P) — on the objective, behind the enemy, on the pass. Lose the helicopter before it lands and you lose them too.' });
  mc('commandPost', { name: 'AAVC7A1 command vehicle', weapon: 'radios', text: 'The amphibious tractor fitted out as a command post: the battalion’s staff and its radios. Nearby squads hold longer and react faster.' },
    { model: buildUsAAV7 });

  // ---------------------------------------------------------------- ROK Army
  const rok = (id, v, o) => give('rok', id, v, o);
  rok('rifles', { name: 'Rifle Squad', weapon: 'M16A1 rifles, M72 LAW', text: 'South Korean conscripts who have stared across the DMZ every day of their service: steady, drilled hard, and fighting for their own country. (The new Korean K2 rifle is only just reaching the line.)' });
  rok('atTeam', { name: 'Recoilless Rifle Team', weapon: 'M67 90 mm recoilless rifle', text: 'The 90 mm recoilless rifle carried by two men: from a bunker’s embrasure it stops the T-55s on the valley roads.' });
  rok('mgTeam', { name: 'M60 Machine-Gun Team', weapon: 'M60, 7.62 mm', text: 'The gun in the bunker line: its fields of fire were cleared and measured long ago.' });
  rok('mortar', { name: 'Mortar Team', weapon: 'M29A1, 81 mm', text: 'The company’s mortars, registered on every gap in the wire in front of the line.' });
  rok('scouts', { name: 'Reconnaissance Team', weapon: 'M16A1, binoculars', text: 'The patrols of the DMZ: they know every hill and every infiltration route by heart.' });
  rok('sniper', { name: 'Sniper Team', weapon: 'scoped rifle, M16A1', text: 'A marksman and his spotter in an outpost over the valley.' });
  rok('engineers', { name: 'Engineer Squad', weapon: 'M16A1, mines, demolition charges', text: 'They dig in, mine, wire, and drop the bridges and the tank traps over the roads south.' });
  rok('observers', { name: 'Forward Observers', weapon: 'M16A1, PRC-77, binoculars', text: 'On the observation posts over the DMZ: every gun in the corps is registered on what they can see.' });
  rok('crew', { name: 'Tank Crew', weapon: 'M3 grease gun', text: CREW });
  rok('tank', { name: 'M48A5K', weapon: '105 mm M68', text: 'The old Patton rebuilt in Korea with the 105 mm, a diesel and a laser rangefinder: no match for a modern tank, more than enough for the North’s T-55s and Chonma-hos.' },
    { model: buildRokM48, stats: { armor: 0.55, hp: 1300, damage: 380, speed: 4.6, nightSight: 0.6 }, cost: 0.85 });
  rok('ifv', { name: 'KIFV', weapon: '.50 cal M2, M60', text: 'The Korean Infantry Fighting Vehicle, new in 1985: the M113 idea built in Korea with better armour and a shielded .50 cal. U unloads the squad.' },
    { model: buildRokKIFV, stats: { ...noATGM, ...fifty, armor: 0.36, hp: 760, nightSight: 0.6 }, cost: 0.75 });
  rok('tankDestroyer', { name: 'Jeep with 106 mm RR', weapon: 'M40 106 mm recoilless rifle', text: 'The big recoilless rifle on a jeep, its .50 cal spotting rifle on top: one shot from a ridge, then off before the answer comes.' },
    { model: buildRokJeep106, stats: { ...noATGM, weapon: 'cannon', weaponSound: 'cannon', damage: 520, pierce: 0.7, splash: 2, vsArmor: 1, range: 200, gunRange: 200, preferredRange: 160,
      fireCooldown: 6, magSize: 18, reloadTime: 6, boltSpeed: 300, boltSize: 1.2, tracer: 1, spread: 0.006, armor: 0.03, hp: 260, speed: 8.5, radius: 1.4, height: 2.0, nightSight: 0.5 }, cost: 0.6 });
  rok('artillery', { name: 'M109A2', weapon: '155 mm howitzer', text: 'The self-propelled 155 mm — built in Korea from this year as the K55. Every hill on the invasion routes is registered.' });
  rok('spMortar', { name: 'M106 Mortar Carrier', weapon: 'M30 4.2 in (107 mm) mortar', text: 'The battalion’s heavy mortar on an M113: quick to set up, quick to move.' });
  rok('rockets', { name: 'K136 Kooryong', weapon: '36 × 130 mm rockets', text: 'Korea’s own multiple rocket launcher on a truck: 36 rockets in one ripple on the valley the North’s column is crowding into.' },
    { model: T.rockets.models.bw });
  rok('aa', { name: 'M163 Vulcan', weapon: '20 mm M61 Vulcan', text: 'The gatling on an M113, against the North’s helicopters and its An-2s coming in low over the hills.' });
  rok('towedAA', { name: 'M167 Vulcan', weapon: '20 mm M61 Vulcan', text: 'The towed Vulcan, dug in on the hills behind the line.' });
  rok('recovery', { name: 'M88A1 Recovery Vehicle', weapon: '.50 cal M2, A-frame boom, winch', text: 'Brings damaged tanks back into the fight.' });
  rok('ambulance', { name: 'M113 Ambulance', weapon: 'Unarmed · red cross', text: 'Wounded men near it are patched up.' });
  rok('airAssault', { name: 'Airmobile Rifle Squad', weapon: 'M16A1, M60 · by UH-1H (P)', text: 'ROK infantry landed by Huey on the hill the North’s infiltrators are making for, or behind the column on the valley road.' });
  rok('commandPost', { name: 'M577 command post', weapon: 'unarmed', text: 'The battalion’s command post: nearby squads hold longer and react faster.' });

  // ---------------------------------------------------------------- Korean People's Army
  const kpa = (id, v, o) => give('kpa', id, v, o);
  kpa('rifles', { name: 'Rifle Squad', weapon: 'Type 58 rifles, RPG-7', text: 'The KPA’s infantry: ten men with the North’s copy of the AK-47, hardened and indoctrinated, and many more behind them. Cheap — spend them in waves.' },
    { stats: { spread: 0.014, aimTime: 1.0 }, cost: 0.85 });
  T.kampfgruppe.armies = [...T.kampfgruppe.armies, 'kpa'];
  kpa('kampfgruppe', { name: 'Red Guards', weapon: 'old rifles', text: 'The Worker-Peasant Red Guards: factory and farm militia. Poor shots and quick to break, but cheap, and they don’t count against your unit cap — hold villages and hills with them.' });
  kpa('atTeam', { name: 'RPG Team', weapon: 'RPG-7, 85 mm', text: 'The RPG-7 from a ditch or a doorway: in the narrow valleys every tank has to come past it.' });
  kpa('mgTeam', { name: 'Machine-Gun Team', weapon: 'Type 73, 7.62 mm', text: 'The North’s own light machine gun, fed from a box or a belt: it covers the waves going in.' });
  kpa('mortar', { name: 'Mortar Team', weapon: '82 mm mortar', text: 'The battalion’s mortar: it follows the infantry over the hills where no gun can go.' });
  kpa('scouts', { name: 'Reconnaissance Team', weapon: 'Type 68 rifle, binoculars', text: 'Light infantry scouts trained to slip through the DMZ by night: they find the gaps for the waves behind them.' });
  kpa('sniper', { name: 'Sniper Team', weapon: 'SVD Dragunov, Type 58', text: 'A marksman with the Dragunov in the rocks above the road.' });
  kpa('engineers', { name: 'Sapper Section', weapon: 'Type 58, explosives, mine probes', text: 'The sappers who dug the tunnels under the DMZ: they clear the mines, cut the wire and blow the bunkers.' });
  kpa('observers', { name: 'Artillery Observers', weapon: 'Type 58, radio, binoculars', text: 'Where they look, the North’s enormous artillery lands.' });
  kpa('manpads', { name: 'Strela Team', weapon: '9K32 Strela-2', text: 'The heat-seeker on a soldier’s shoulder: helicopters over the hills pay for flying low.' });
  kpa('crew', { name: 'Tank Crew', weapon: 'Type 68 carbine', text: CREW });
  kpa('tank', { name: 'T-55', weapon: '100 mm D-10T', text: 'The old workhorse, in its hundreds: no add-on armour, no laser, no night sight to speak of. It wins by coming in numbers.' },
    { model: buildKpaT55, stats: { armor: 0.5, hp: 1150, damage: 320, nightSight: 0.5 }, cost: 0.75 });
  kpa('heavyTank', { name: 'Chonma-ho', weapon: '115 mm smoothbore', text: 'The North’s own T-62, built in its own factories and improved bit by bit: a laser rangefinder over the 115 mm, a little more armour. The best tank the KPA has.' },
    { model: buildKpaChonma, stats: { armor: 0.62, hp: 1300, damage: 400, pierce: 0.58, speed: 5.0, nightSight: 0.55 }, cost: 0.8 });
  kpa('ifv', { name: 'VTT-323', weapon: '14.5 mm KPVT', text: 'The North’s tracked carrier, on Chinese lines: a high slab-sided box with a heavy machine-gun turret and a squad inside. No missile, thin armour. U unloads the squad.' },
    { model: buildKpaVTT323, stats: { ...noATGM, damage: 85, pierce: 0.2, vsArmor: 0.25, armor: 0.3, hp: 700, nightSight: 0.5 }, cost: 0.75 });
  kpa('reconVehicle', { name: 'BRDM-2', weapon: '14.5 mm KPVT', text: 'The four-wheeled scout car: sees far, runs fast, and shreds infantry and trucks. Never let it meet a tank.' });
  kpa('tankDestroyer', { name: '9P133 Malyutka', weapon: '9M14 Malyutka, 6 missiles on the launcher', text: 'A BRDM-2 with the wire-guided Malyutka on a raised launcher: slower missiles than NATO’s, but they kill a tank all the same.' },
    { stats: { atgm: { ...T.tankDestroyer.stats.atgm, range: 300, damage: 620, speed: 120, reload: 14 } }, cost: 0.85 });
  kpa('artillery', { name: 'Koksan M1978', weapon: '170 mm gun', text: 'The great gun of the North on a T-54 hull, open to the sky: the longest reach of any gun on the peninsula and shells that flatten a bunker. Slow to reload, and nothing protects its crew.' },
    { model: buildKpaKoksan, stats: { range: 360, damage: 230, splash: 9, fireCooldown: 11, reloadTime: 16, magSize: 3, armor: 0.12, hp: 520, speed: 4.2 } });
  kpa('rockets', { name: 'BM-21 Grad', weapon: '40 × 122 mm rockets (20 per salvo)', text: 'The North builds its own: whole battalions of them, hidden in the hills, ripple-firing onto the line.' });
  kpa('aa', { name: 'ZSU-23-4 Shilka', weapon: '4 × 23 mm, radar', text: 'Four radar-directed cannons over the columns: every helicopter that comes looking takes a gamble.' });
  kpa('towedAA', { name: 'ZU-23-2', weapon: '2 × 23 mm 2A14', text: 'The North is the most AA-gunned country in the world: twin 23 mm guns on every hill, cheap and everywhere.' },
    { cost: 0.8 });
  kpa('airAssault', { name: 'Light Infantry Squad', weapon: 'Type 58, RPG-7 · by Mi-8 (P)', text: 'The KPA’s light infantry, the special forces trained to fight behind the line: a Hip drops them on a bridge, a pass or a gun line in the South’s rear.' });
  kpa('commandPost', { name: 'BTR-60PU', weapon: 'unarmed', text: 'The regiment’s command post on wheels: nearby squads hold longer and react faster.' });
}
