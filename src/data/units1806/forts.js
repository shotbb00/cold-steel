// Every 1806 army's own forts (called once from ./index.js with TYPES_1806): the Lanes mode's bunker line, strongpoint
// and headquarters (data/units/fortifications.ts, shared with 1985: copied here, as units1918/roles.js does, so the 1985
// turret bunkers stay 1985's) and the coast's shore battery, each army in its period's works (models/forts1806.js).
// Art and names only: the forts' numbers stay the shared ones — save that their small arms sound and look like muskets.
import { forts1806 } from '../models/forts1806.js';

/** [bunker, strongpoint, hq, shoreBattery] names and texts per army key (nato: France, pact: Prussia) — every 1806 army. */
const WORDS = {
  nato: [['Flèche et batterie', 'A flèche of the French sappers, its inside lined with fascines, voltigeurs firing over it; beside it a field battery behind an embrasure faced with gabions.'],
    ['Redoute', 'A closed redoubt in the school of Vauban: fascine-revetted parapets, gabions along the crest, a 12-pounder in the embrasure and a ditch before it all.'],
    ['Ferme fortifiée', 'A farm loopholed and barricaded by the sappers, a cart across the gate and gabions before it, the tricolour over the roof: the marshal\'s headquarters, its batteries round it.'],
    ['Batterie de côte', '2 × 24-pounders, heated shot', 'Two heavy guns behind a parapet faced with gabions, laid on the sea, the furnace beside them and the tricolour over it: red-hot shot into the boats as they come in, and into any frigate that stands in to cover them.']],
  by: [['Flesche und Batterie', 'A flèche on the French pattern dug by the Bavarian sappers, fascines inside, the line firing over it; a field battery behind gabions beside it.'],
    ['Feldschanze', 'A closed field redoubt of the reformed Bavarian army, French-taught: fascines, gabions, a 12-pounder in its embrasure.'],
    ['Befestigter Gutshof', 'A farm made ready for defence, its shutters in the blue and white, the walls loopholed, the lozenge flag over the roof: the division\'s headquarters.'],
    ['Küstenbatterie', '2 × 24-pounders, heated shot', 'Heavy guns behind a gabioned parapet laid on the water, the shot heated red in the furnace.']],
  pact: [['Palisadierte Flesche', 'An arrow-shaped work behind a palisade of sharpened stakes in the ditch, planked inside, the musketeers firing over it; a field battery beside it.'],
    ['Sternschanze', 'A Prussian star redoubt: six salients of earth, the palisade all round in the ditch, the gun up on its barbette to fire over the parapet every way.'],
    ['Sternschanze mit Blockhaus', 'A great star redoubt round a timber blockhouse, the black eagle over it: the general\'s headquarters, its batteries round it.'],
    ['Strandbatterie', '2 × 24-pounders, heated shot', 'Heavy guns behind a planked and palisaded parapet over the beach, as at Kolberg in 1807, the furnace beside them, the black eagle over it.']],
  sx: [['Palisadierte Flesche', 'A palisaded flèche in the Prussian manner, held by Saxon musketeers in white coats; a field battery beside it.'],
    ['Sternschanze', 'A star redoubt of earth and palisade, the Saxon gun on its barbette in the middle.'],
    ['Hauptquartier', 'A star redoubt round a timber blockhouse, the Saxon white and green over it.'],
    ['Strandbatterie', '2 × 24-pounders, heated shot', 'Heavy guns behind a palisaded parapet laid on the water, the furnace beside them.']],
  gb: [['Sandbag battery', 'A breastwork of sandbags with the light company behind it, and a field battery in a sandbagged embrasure: what the Royal Military Artificers throw up on a beach or a ridge in an afternoon.'],
    ['Martello tower', 'A Martello tower: a squat round tower of stone walls eight feet thick, the door a floor up, a 24-pounder on a traversing slide on its roof that fires every way.'],
    ['Fortified quinta', 'A whitewashed Portuguese quinta, its yard wall loopholed and sandbags before the gate, the Union Flag over the roof: the general\'s headquarters.'],
    ['Martello tower', '24-pounder on a traversing slide', 'A Martello tower on the shore: round, stone, bombproof, its 24-pounder turning on the roof to rake the boats and any ship that stands in.']],
  ru: [['Flèche', 'A flèche of earth revetted with logs, the jägers firing over it; beside it a battery of the Russian field guns behind a log-faced embrasure — the works of Heilsberg, and later Borodino.'],
    ['Redoubt', 'A closed earth redoubt revetted with logs, a position gun in its embrasure, the ditch in front: the Russian army dug them wherever it meant to stand.'],
    ['Fortified church', 'The village church with its onion dome, a log-revetted bank thrown round it, St Andrew\'s cross on the staff: the army\'s headquarters.'],
    ['Shore battery', '2 × 24-pounders, heated shot', 'Heavy guns behind a parapet revetted with logs, laid on the sea, the shot heated in the furnace.']],
  au: [['Flesche mit Palisaden', 'An Austrian flèche of earth, a palisade in its ditch, the white-coated line firing over it; a field battery beside it, its carriages in the ochre yellow.'],
    ['Feldschanze', 'A closed Austrian earthwork with a palisade all round, a 12-pounder in the embrasure.'],
    ['Blockhaus', 'A two-storey timber blockhouse, the upper one turned and overhanging, in a palisade, the black and yellow over it: the corps\' headquarters.'],
    ['Strandbatterie', '2 × 24-pounders, heated shot', 'Heavy guns behind a palisaded parapet on the shore, the furnace beside them, the black and yellow over it.']],
  dk: [['Batteri', 'A breastwork of dressed granite, Danish musketeers behind it, and a gun in a stone-faced embrasure beside it.'],
    ['Skanse', 'A closed stone-faced redoubt of the Danish engineers, a gun in its embrasure.'],
    ['Fæstning', 'A round stone fort, embrasures in its parapet, a guardhouse on top and the Dannebrog over it: the commandant\'s headquarters.'],
    null], // (the shore battery: its own words in ./index.js)
  es: [['Batería', 'A breastwork of dressed sandstone, Spanish infantry in white behind it, and a gun in a stone-faced embrasure beside it.'],
    ['Reducto', 'A closed stone-faced redoubt of the Spanish engineers, a gun in its embrasure.'],
    ['Castillo', 'A round stone castillo on the shore, embrasures in its parapet, a guardhouse on top and the red and gold over it: the governor\'s headquarters.'],
    ['Batería de costa', '2 × 24-pounders, heated shot', 'Heavy guns behind a parapet of dressed stone, laid on the bay, the furnace beside them and the red and gold over it: the guns that kept Nelson out of Cádiz.']],
  nl: [['Duinbatterij', 'A planked breastwork dug into the dunes, a palisade in front, Dutch infantry behind it and a gun beside it.'],
    ['Schans', 'A closed earthwork in the sand, planked inside and palisaded, a gun in its embrasure.'],
    ['Fort', 'A round brick fort on the dyke, embrasures in its parapet, the Batavian red, white and blue over it.'],
    ['Kustbatterij', '2 × 24-pounders, heated shot', 'Heavy guns behind a planked dune battery over the beach, the furnace beside them, the red, white and blue over it: the Helder\'s guns.']],
};

const give = (t, army, { model, special, variant }) => {
  if (model) t.models = { ...t.models, [army]: model };
  if (special) t.specialistModels = { ...t.specialistModels, [army]: special };
  if (variant) t.variants = { ...t.variants, [army]: variant };
};

export default function forts(T) {
  const copy = (t) => ({ ...t, models: { ...t.models }, specialistModels: { ...t.specialistModels }, variants: { ...t.variants } });
  const musketry = (t) => ({ ...copy(t), weaponSound: 'musket', stats: { ...t.stats, weaponSound: 'musket', tracer: 0 } }); // (the work's men: muskets, not a machine gun)
  const b = musketry(T.bunker), s = musketry(T.strongpoint), h = copy(T.hq), sb = T.shoreBattery;
  for (const [a, words] of Object.entries(WORDS)) { // (every army key that has words: its own art; nl, Holland, is not `own` — the French types ashore, its own forts)
    const m = forts1806(a);
    const [vb, vs, vh, vsb] = words.map((w) => w && (w.length === 3 ? { name: w[0], weapon: w[1], text: w[2] } : { name: w[0], text: w[1] }));
    give(b, a, { model: m.post, special: m.battery, variant: vb });
    give(s, a, { model: m.post, special: m.work, variant: vs });
    give(h, a, { model: m.bigBattery, special: m.command, variant: vh });
    give(sb, a, { model: m.shore, variant: vsb });
  }
  T.bunker = b; T.strongpoint = s; T.hq = h;
}
