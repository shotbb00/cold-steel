// The Austrian army of 1805–09 (data/epoch.js 'au'): called once with TYPES_1806 (./index.js) to give each type
// Austria's variant, model and, where they differ, stats (factionStats) and price (armyCost). `own`: only these.
//   Mack's army at Ulm, the Austrians beside Kutuzov at Austerlitz, Archduke Charles on the Adige at Caldiero,
//   Archduke Ferdinand in Galicia. The white coat (models/napSoldier.js 'au'); the Hungarian regiments in blue
//   pantaloons, the Grenzer in brown, the Jäger in pike grey; the hussars, chevaulegers and cuirassiers
//   (models/napCavalry.js); guns and wagons in the ochre and black of the k.k. artillery — and still, in 1805,
//   the little 3-pounders that marched with the battalions.
import { buildNapSoldier } from '../models/napSoldier.js';
import { buildCavalry, buildCavalryFoot } from '../models/napCavalry.js';
import { buildFieldGun } from '../models/napGuns.js';
import { buildWagon } from '../models/napWagons.js';

const A = 'au';
const man = (kind) => () => buildNapSoldier({ army: A, kind });
const horse = (kind, mounted = true) => () => buildCavalry({ army: A, kind, mounted });
const gun = (size) => () => buildFieldGun({ army: A, size });
const cart = (kind) => () => buildWagon({ army: A, kind });

export default function austria(T) {
  /** Give type `id` to Austria: its variant, its model, its stats over the type's, its price factor. */
  const give = (id, model, variant, { stats, cost } = {}) => {
    const t = T[id];
    t.models = { ...t.models, [A]: model };
    if (stats) t.factionStats = { ...t.factionStats, [A]: stats };
    if (cost) t.armyCost = { ...t.armyCost, [A]: Math.round(t.cost * cost) };
    t.variants = { ...t.variants, [A]: variant };
  };

  // ---------------------------------------------------------------- the foot
  give('rifles', man('line'), { name: 'Deutsche Infanterie', weapon: '1798 musket, bayonet',
    text: 'The German regiments of the Kaiser\'s infantry in white, the facings in the regiment\'s colour, under the crested helmet of 1798: three ranks deep, steady volleys, slow to manoeuvre. At Ulm they were let down by their generals, not their drill.' });
  give('atTeam', man('hungarian'), { name: 'Ungarische Infanterie', weapon: '1798 musket, bayonet',
    text: 'The Hungarian regiments in the new Kaskett, tight blue pantaloons and laced boots: big men, recruited for life, the fiercest foot of the monarchy — kept for the bayonet attack. At Caldiero they threw Masséna back off the Adige heights.' });
  give('guard', man('grenadier'), { name: 'Grenadier-Reserve', weapon: 'Musket, bayonet',
    text: 'The grenadier companies of every regiment, massed in battalions in their bearskins and brass plates: Austria\'s reserve of picked men, held back for the crisis. They do not break.' });
  give('mgTeam', man('light'), { name: 'Grenzer', weapon: 'Musket, bayonet',
    text: 'The Military Frontier\'s soldier-farmers from Croatia and Slavonia, in brown coats and Hungarian blue: born to the raid and the ambush against the Turk, they skirmish in the woods and vineyards in front of the white line.' });
  give('sniper', man('rifle'), { name: 'Jäger', weapon: 'Stutzen rifle',
    text: 'The Tyrolean and Bohemian huntsmen of the Jäger battalions in pike grey and the Corsican hat: the short rifled Stutzen, slow to load and deadly at range — officers and gunners first.' });
  give('engineers', man('pioneer'), { name: 'Pioniere', weapon: 'Musket, axe',
    text: 'The pioneers in pike grey: roads through the Alps, abatis across the passes, breastworks for the guns, the bridges held or burned behind the army.' });
  give('observers', man('officer'), { name: 'Artillerieoffiziere', weapon: 'Telescope, sword',
    text: 'Officers of the k.k. artillery in their brown coats, telescopes on a height: every gun and howitzer of yours lands tight on what they can see.' });

  // ---------------------------------------------------------------- the horse
  give('reconVehicle', horse('light'), { name: 'Husaren', weapon: 'Sabre, carbine, pistols',
    text: 'The huszárok of Hungary in dark blue and yellow braid: the best light horse in Europe, as even the French admit — they scout, raid and ride down anything that breaks.' });
  give('ifv', horse('medium'), { name: 'Chevaulegers', weapon: 'Sabre, carbine',
    text: 'The Austrian light dragoons in green under the crested helmet: line cavalry heavy enough to charge, quick enough to scout.' });
  give('tank', horse('heavy'), { name: 'Kürassiere', weapon: 'Pallasch, pistols, breastplate',
    text: 'The Kaiser\'s cuirassiers in white, the blackened breastplate in front only: the heavy fist of the army, kept for the charge that decides the day.' });
  give('looseHorse', horse('light', false), { name: 'Loose horse', text: 'Its rider is down: it bolts from the fire and wanders.' });
  give('dismounted', () => buildCavalryFoot({ army: A, kind: 'medium' }), { name: 'Dismounted troopers', text: 'His horse went down: he looks for another, or makes his way back.' });

  // ---------------------------------------------------------------- the guns
  // the regimental 3-pounders: two light guns with every infantry regiment in 1805 — quick and cheap, short in reach and weight of shot
  give('artillery', gun('regiment'), { name: 'Regimentsgeschütze', weapon: '3-pounder guns',
    text: 'The little 3-pounders that march with the battalions: unlimbered in moments, quick to load, cheap — but light shot that reaches less far than a proper battery\'s.' },
  { cost: 0.75, stats: { hp: 260, speed: 3.2, range: 230, preferredRange: 160, damage: 120, reloadTime: 13, towed: { deploy: 10 },
    gun: { canister: 85, pellets: 12, pelletDamage: 65, pelletSpread: 0.07, through: 3, bounce: 2 } } });
  give('spMortar', gun('heavy'), { name: 'Positionsbatterie', weapon: '12-pounder guns',
    text: 'The heavy position guns of the army reserve: far-reaching and slow, they hold a ridge — the Pratzen\'s last guns at Austerlitz, the great battery on the Marchfeld.' });
  give('rockets', gun('horse'), { name: 'Kavalleriebatterie', weapon: 'Light 6-pounders',
    text: 'Guns that keep up with the cavalry: the gunners ride astride the padded ammunition chest, the Wurst, instead of their own horses — in action in moments, gone again before the enemy answers.' });
  give('mortar', gun('howitzer'), { name: 'Haubitzen', weapon: '7-pounder howitzers',
    text: 'The 7-pounder howitzers: shells over walls and hedges onto troops in cover — and onto the villages they hold.' });

  // ---------------------------------------------------------------- the wagons
  give('jammer', cart('ammo'), { name: 'Munitionswagen', weapon: 'Cartridges, men', text: 'Companies within 60 m take in new men and refill their pouches.' });
  give('ambulance', cart('ambulance'), { name: 'Blessiertenwagen', weapon: 'Surgeons', text: 'The wagon for the wounded: men near it are patched up and go back to the line.' });
  give('commandPost', cart('hq'), { name: 'Hauptquartier', weapon: 'Aides, couriers', text: 'The Archduke\'s staff under the black-and-yellow flag: reinforcements come forward to it; troops near it hold their nerve.' });
  give('bridgeLayer', cart('pontoon'), { name: 'Pontoniere', weapon: 'Pontoon bridge', text: 'The Danube\'s pontoneers: a bridge of boats over the river where none stood.' });
}
