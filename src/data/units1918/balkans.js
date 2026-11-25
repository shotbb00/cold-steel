// The Salonika front of 1916–18 (data/epoch.js region 'balkans'): called once with TYPES_1918 (./index.js) to give the
// two Balkan armies their `variants[army]`, models, and stats / prices where they differ. Both are `own`: only these.
//   serb  the Serbian Army (nato): back from Corfu after the retreat through Albania, re-armed and re-clothed by France —
//         the Adrian helmet, French machine guns and 75s beside their own Mauser-Vasić and Schneider guns
//   bg    the Bulgarian Army (pact): the Mannlicher, the Maxim M1907, Krupp and Schneider guns, German helmets, K-Flak
//         and Minenwerfer — three years on the crests of Macedonia
// Neither had tanks or armoured cars (epoch.js standIn: the cavalry).
import { buildWw1Soldier } from '../models/ww1Soldier.js';
import { buildWw1Gun } from '../models/ww1Guns.js';
import { buildCavalry, buildCavalryFoot } from '../models/napCavalry.js';
import { buildAmbulanceSB, buildAmbulanceBG, buildSupplyLorrySB, buildSupplyLorryBG, buildAALorrySB, buildAALorryBG, buildStaffCarSB, buildStaffCarBG } from '../models/ww1Armour.js';

const SIDE = { serb: 'nato', bg: 'pact' };
const man = (army, o = {}) => () => buildWw1Soldier({ army, ...o });
const gun = (army, size) => () => buildWw1Gun({ army, size });

/** Give type `t` to `army` (as ./fronts.js): its variant, its models, its stats over its side's, its price. */
const give = (t, army, { variant, model, special, stats, cost }) => {
  if (t.armies && !t.armies.includes(army)) t.armies = [...t.armies, army];
  if (model) t.models = { ...t.models, [army]: model };
  if (special) t.specialistModels = { ...t.specialistModels, [army]: special };
  if (stats) t.factionStats = { ...t.factionStats, [army]: { ...t.factionStats?.[SIDE[army]], ...stats } };
  if (cost) t.armyCost = { ...t.armyCost, [army]: Math.round(t.cost * cost) };
  t.variants = { ...t.variants, [army]: variant };
};

export default function balkans(T) {
  const { rifles, stormTroops, mgTeam, artillery, mountainGun, spMortar, rockets, mortar, observers, ifv, looseHorse, dismounted, crew, sniper, scouts, engineers, mineClear, aa, manpads, ambulance, recovery, commandPost } = T;
  const MEDIUM_MW = rockets.factionStats.st;   // (the medium trench mortar: the Sturmtruppen's 17 cm numbers)
  const LORRY = { armor: 0.05, hp: 360, speed: 5.5, breakdown: undefined, ditch: undefined };
  const rifleOf = (army) => ({ ...rifles.stats, ...rifles.factionStats[army], ignite: undefined, weaponSound: undefined });

  // ---------------------------------------------------------------- the Serbian Army
  const S = 'serb';
  give(rifles, S, { model: man(S), stats: { fireCooldown: 2.2, magSize: 5, reloadTime: 3.2, playerFireInterval: 1.1 },
    variant: { name: 'Pešadijsko odeljenje', weapon: 'Mauzer-Vasić M1899/07, Berthier, bombs', text: 'The Serbian infantry of 1918 in French cloth and the Adrian helmet: peasant soldiers of three wars since 1912, the survivors of the winter march over the Albanian mountains. They know the mountains, and they want to go home.' } });
  give(stormTroops, S, { model: man(S, { hat: 'sajkaca' }), stats: { fireCooldown: 2.0, magSize: 5, reloadTime: 3, playerFireInterval: 1.0, grenades: 5 },
    variant: { name: 'Jurišni odred', weapon: 'carbines, bombs, knives', text: 'The volunteer assault detachments, the old komite in the šajkača: they go up the rock first at night, bombs in hand, and the regiment follows them onto the crest.' } });
  give(mgTeam, S, { model: man(S), special: man(S, { weapon: 'mg' }), stats: { burst: 8, burstInterval: 0.13, fireCooldown: 2.2, magSize: 24, reloadTime: 3 },
    variant: { name: 'Mitraljesko odeljenje', weapon: 'Hotchkiss M1914, 8 mm', text: 'The French Hotchkiss on its tripod, fed by brass strips of twenty-four: air-cooled, heavy, and it does not jam in the dust of Macedonia.' } });
  give(artillery, S, { model: gun(S, 'field'),
    variant: { name: 'Šnajder 75 mm M1907', weapon: 'Schneider-Canet 75 mm QF field gun', text: 'The quick-firer Serbia bought from Schneider in 1907, the gun of Cer and Kolubara — and beside it now the French 75. Its shrapnel swept the slopes of Dobro Pole before the assault.' } });
  give(mountainGun, S, { model: gun(S, 'mountain'),
    variant: { name: 'Brdski top Šnajder-Danglis', weapon: 'Schneider-Danglis 70 mm M1907 mountain gun', text: 'The mountain gun the Greek colonel Danglis designed for Schneider: it comes apart into mule loads and goes up the goat tracks to the Kajmakčalan with the infantry.' } });
  give(spMortar, S, { model: gun(S, 'heavy'), stats: { range: 400, damage: 230, splash: 8 },
    variant: { name: 'Haubica Šnajder 120 mm', weapon: 'Schneider 120 mm howitzer M1910', text: 'The heavy howitzer of the Serbian divisions: a lighter shell than the French 155s behind it, but its own, and it breaks the rock-cut Bulgarian trenches.' } });
  give(rockets, S, { model: gun(S, 'mortar'), stats: MEDIUM_MW,
    variant: { name: 'Teški bacač mina', weapon: '150 mm trench mortar (French-supplied)', text: 'A French heavy trench mortar: a big bomb short into the Bulgarian line, to break the wire on the crests the guns can\'t see.' } });
  give(mortar, S, { model: man(S), special: man(S, { weapon: 'mortar' }),
    variant: { name: 'Laki bacač mina', weapon: '58 mm crapouillot (French-supplied)', text: 'The French "little toad", carried up by hand: winged bombs over into the trench on the next crest.' } });
  give(observers, S, { model: man(S, { scout: true, radio: true }),
    variant: { name: 'Artiljerijski osmatrači', weapon: 'revolver, field telephone, binoculars', text: 'The battery\'s observers on the rock: from up here half of Macedonia lies open, and what they see the guns hit.' } });
  give(ifv, S, { model: () => buildCavalry({ army: 'serb18', kind: 'medium', mounted: true }),
    variant: { name: 'Konjica', weapon: 'sword, Mauser carbine', text: 'The Serbian Cavalry Division: after the breakthrough of September 1918 it rode down the Vardar ahead of everyone, cut the Bulgarian retreat and went on to Skopje and home.' } });
  looseHorse.models = { ...looseHorse.models, [S]: () => buildCavalry({ army: 'serb18', kind: 'medium', mounted: false }) };
  dismounted.models = { ...dismounted.models, [S]: () => buildCavalryFoot({ army: 'serb18', kind: 'medium' }) };
  give(crew, S, { model: man(S, { crew: true }), variant: { name: 'Posada', weapon: 'revolvers', text: 'The crew of a lost lorry: a few men with revolvers.' } });
  give(sniper, S, { model: man(S, { scout: true }), special: man(S, { weapon: 'sniper', scout: true }),
    variant: { name: 'Dobri strelci', weapon: 'Mauzer-Vasić with a scope', text: 'The marksmen: highlanders who grew up with a rifle, hidden in the scrub, deadly to anyone who shows himself on the crest.' } });
  give(scouts, S, { model: man(S, { scout: true, hat: 'sajkaca' }), stats: { speed: 2.3 },
    variant: { name: 'Izviđači', weapon: 'carbines, bombs, binoculars', text: 'The scouts in the šajkača: they know every path of these mountains — some were born just across the line — and see the enemy first.' } });
  give(engineers, S, { model: man(S), special: man(S),
    variant: { name: 'Pioniri', weapon: 'Mauzer-Vasić, picks, wire', text: 'The Serbian sappers: trenches cut into the rock, wire, and the mule tracks up the mountain the whole army climbs.' } });
  give(mineClear, S, { model: man(S),
    variant: { name: 'Rušioci', weapon: 'explosive charges, wire cutters', text: 'Sappers with long charges and wire cutters: a lane through the Bulgarian wire on the crest for the assault (X). Three charges.' } });
  give(aa, S, { model: buildAALorrySB,
    variant: { name: 'Protivavionski top', weapon: '75 mm on an AA mount, on a lorry', text: 'Serbian gunners shot down the first aeroplane ever brought down by artillery, over Kragujevac in 1915. Now a French 75 on a high mount on a lorry, laid at the German aircraft.' } });
  give(manpads, S, { model: man(S), special: man(S, { weapon: 'mg' }),
    variant: { name: 'Protivavionski mitraljez', weapon: 'Hotchkiss on an AA mount', text: 'The Hotchkiss on its high tripod, pointed at the sky: keeps the German reconnaissance aircraft high.' } });
  give(ambulance, S, { model: buildAmbulanceSB,
    variant: { name: 'Sanitetski automobil', weapon: 'unarmed', text: 'A motor ambulance like those of the Scottish Women\'s Hospitals that served the Serbian army from 1915 to the end: wounded men near it are patched up and go back to the line.' } });
  give(recovery, S, { model: buildSupplyLorrySB, stats: LORRY,
    variant: { name: 'Komora', weapon: 'unarmed', text: 'The divisional train: lorries as far as the road goes, then mules. Vehicles near it are mended and got going again.' } });
  give(commandPost, S, { model: buildStaffCarSB,
    variant: { name: 'Štab divizije', weapon: 'staff car, field telephones', text: 'The division\'s headquarters, under Vojvoda Mišić\'s plan for Dobro Pole: the reinforcements come forward to it.' } });

  // ---------------------------------------------------------------- the Bulgarian Army
  const B = 'bg';
  give(rifles, B, { model: man(B), stats: { fireCooldown: 2.0, magSize: 5, reloadTime: 3, playerFireInterval: 1.0 },
    variant: { name: 'Pehotno otdelenie', weapon: 'Mannlicher M1895, bayonets, grenades', text: 'The Bulgarian infantry in khaki-brown under the German helmet: smallholders called up one man in four, with the straight-pull Mannlicher. On the crests of Macedonia they held for three years.' } });
  give(stormTroops, B, { model: man(B), stats: { fireCooldown: 1.8, magSize: 5, reloadTime: 2.8, playerFireInterval: 0.9 },
    variant: { name: 'Shturmova rota', weapon: 'Mannlicher carbines, stick grenades', text: 'The storm companies trained by German instructors in 1917–18: picked men, carbines and sacks of grenades, to take back a lost crest at night.' } });
  give(mgTeam, B, { model: man(B), special: man(B, { weapon: 'mg' }), stats: { burst: 14, burstInterval: 0.11, fireCooldown: 2.0, magSize: 250, reloadTime: 7 },
    variant: { name: 'Kartechnichno otdelenie', weapon: 'Maxim M1907, 8 mm', text: 'The Maxim bought from Germany before the Balkan Wars: water-cooled, fed from the belt, set in a nest cut into the rock — the guns that cut down the British at Doiran.' } });
  give(artillery, B, { model: gun(B, 'field'),
    variant: { name: 'Shnayder 75 mm M1904', weapon: 'Schneider-Canet 75 mm QF field gun', text: 'Bulgaria\'s quick-firing field gun, bought from Schneider in France before the Balkan Wars — now firing at the French. Shrapnel and high explosive down the ravines.' } });
  give(mountainGun, B, { model: gun(B, 'mountain'),
    variant: { name: 'Planinsko orudie 75 mm', weapon: 'Krupp 75 mm mountain gun', text: 'The Krupp mountain gun: taken apart for the pack horses, carried up to the batteries on the crests of the Belasitsa and the Moglena.' } });
  give(spMortar, B, { model: gun(B, 'heavy'),
    variant: { name: 'Tezhka gaubitsa 15 cm', weapon: 'Krupp 15 cm heavy field howitzer', text: 'The heavy howitzers of the Bulgarian and the German batteries: the big shells that broke every British attack at Doiran in 1917 and 1918.' } });
  give(rockets, B, { model: gun(B, 'mortar'),
    variant: { name: 'Tezhuk minomet', weapon: 'German schwerer Minenwerfer, 25 cm', text: 'A German heavy trench mortar with its Bulgarian crew: its bombs come down almost straight on the trench, and nothing in it survives.' } });
  give(mortar, B, { model: man(B), special: man(B, { weapon: 'mortar' }),
    variant: { name: 'Lek minomet', weapon: '7.58 cm leichter Minenwerfer', text: 'The German light trench mortar: bombs over into the next trench, carried forward with the infantry.' } });
  give(observers, B, { model: man(B, { scout: true, radio: true }),
    variant: { name: 'Artileriyski nablyudateli', weapon: 'pistol, field telephone, scissors telescope', text: 'The artillery\'s observers on the Grand Couronné and Pip Ridge: they look down on every ravine, and within their sight the guns are accurate.' } });
  give(ifv, B, { model: () => buildCavalry({ army: 'bg18', kind: 'medium', mounted: true }),
    variant: { name: 'Konnitsa', weapon: 'lance, sword, Mannlicher carbine', text: 'The Bulgarian 1st Cavalry Division: in the Dobruja in 1916 it rode down the Romanians. In the mountains of Macedonia it waited for a gap.' } });
  looseHorse.models = { ...looseHorse.models, [B]: () => buildCavalry({ army: 'bg18', kind: 'medium', mounted: false }) };
  dismounted.models = { ...dismounted.models, [B]: () => buildCavalryFoot({ army: 'bg18', kind: 'medium' }) };
  give(crew, B, { model: man(B, { crew: true }), variant: { name: 'Ekipazh', weapon: 'pistols', text: 'The crew of a lost lorry: a few men with pistols.' } });
  give(sniper, B, { model: man(B, { scout: true }), special: man(B, { weapon: 'sniper', scout: true }),
    variant: { name: 'Snayperisti', weapon: 'Mannlicher with a scope', text: 'The marksmen on the crests: the whole Allied line lies below them, and anyone who shows himself is shot.' } });
  give(scouts, B, { model: man(B, { scout: true, hat: 'peaked' }),
    variant: { name: 'Razuznavachi', weapon: 'carbines, grenades, binoculars', text: 'The scouts in the soft cap: two men out by night down the ravine, back before dawn with what they saw.' } });
  give(engineers, B, { model: man(B), special: man(B),
    variant: { name: 'Pionerna rota', weapon: 'Mannlicher, picks, wire, concrete', text: 'The Bulgarian sappers: trenches and machine-gun nests cut into the rock, the concrete posts of Pip Ridge, wire on every crest.' } });
  give(mineClear, B, { model: man(B),
    variant: { name: 'Telorezachi', weapon: 'explosive charges, wire cutters', text: 'Sappers with long charges and wire cutters: a lane through the enemy wire for the counter-attack (X). Three charges.' } });
  give(aa, B, { model: buildAALorryBG,
    variant: { name: 'Protivoaeroplanno orudie', weapon: '7.7 cm K-Flak on a lorry (German-supplied)', text: 'A German anti-aircraft gun on a lorry, sent with the German Eleventh Army: shrapnel bursts round the British and French aircraft.' } });
  give(manpads, B, { model: man(B), special: man(B, { weapon: 'mg' }),
    variant: { name: 'Protivoaeroplanna kartechnitsa', weapon: 'Maxim on an AA mount', text: 'The Maxim on a high mount, pointed at the sky: keeps the enemy aircraft off the trench.' } });
  give(ambulance, B, { model: buildAmbulanceBG,
    variant: { name: 'Sanitaren avtomobil', weapon: 'unarmed', text: 'The Bulgarian Red Cross\'s motor ambulance: wounded men near it are patched up and go back to the line.' } });
  give(recovery, B, { model: buildSupplyLorryBG, stats: LORRY,
    variant: { name: 'Oboz', weapon: 'unarmed', text: 'The supply train: German lorries on the roads, ox carts and pack horses up the mountain. Vehicles near it are mended and got going again.' } });
  give(commandPost, B, { model: buildStaffCarBG,
    variant: { name: 'Shtab na diviziyata', weapon: 'staff car, field telephones', text: 'The division\'s headquarters: the reinforcements come forward to it.' } });

  // left empty for both: tank, heavyTank, reconVehicle (none on the Salonika front's Serbian or Bulgarian side), atTeam (no tanks to stop),
  // cbRadar and airRadar (the sound ranging and the balloons there were French, British and German), the marines and the sailors
  for (const a of [S, B]) {
    looseHorse.variants[a] ??= looseHorse.variants.nato;
    dismounted.variants[a] ??= dismounted.variants.nato;
  }
  engineers.specialist = { ...engineers.specialist, armyStats: { ...engineers.specialist.armyStats, [S]: rifleOf(S), [B]: rifleOf(B) } };
  mgTeam.specialist = { ...mgTeam.specialist, armyStats: { ...mgTeam.specialist.armyStats,
    [S]: { burst: 8, burstInterval: 0.13, fireCooldown: 2.2, magSize: 24, reloadTime: 3 },        // Hotchkiss: the 24-round strip
    [B]: { burst: 14, burstInterval: 0.11, fireCooldown: 2.0, magSize: 250, reloadTime: 7 } } };  // Maxim M1907: the belt
}
