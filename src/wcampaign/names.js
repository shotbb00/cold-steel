// What a force raised in the campaign is called (engine.js raise, raiseFleet, raiseAir): a numbered formation in its own
// army's style and words — "352. Infanterie-Division", "Task Force 34", "Force K", "No. 13 Group", "3e Escadre" — not
// "New infantry group". The numbers count up per army and kind (c.named), from where the war's own formations leave off.

const ord = (n) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const LETTERS = 'HKLMNPQRSTVWXYZ';

// each style: land(n, kind, war), fleet(n, kind, war), air(n, war)
const STYLE = {
  us: {
    land: (n, k, w) => `${ord(n)} ${w === 'nap' ? 'Infantry' : { infantry: 'Infantry Division', armour: 'Armored Division', artillery: 'Field Artillery Brigade', cavalry: 'Cavalry Division', guard: 'Infantry Division' }[k] ?? 'Division'}`,
    fleet: (n) => `Task Force ${n + 30}`,
    air: (n) => `${ord(n)} Air Group`,
  },
  usmc: { land: (n) => `${ord(n)} Marine Division`, fleet: (n) => `Task Force ${n + 30}`, air: (n) => `Marine Air Group ${n}` },
  uk: {
    land: (n, k, w) => w === 'nap' ? `${ord(n)} ${{ armour: 'Heavy Dragoons', cavalry: 'Light Dragoons', guard: 'Guards Brigade', artillery: 'Royal Artillery brigade' }[k] ?? 'Brigade'}`
      : `${ord(n)} ${{ infantry: 'Infantry Division', armour: 'Armoured Division', artillery: 'AGRA', cavalry: 'Cavalry Brigade', guard: 'Guards Brigade' }[k] ?? 'Division'}`,
    fleet: (n, k, w) => w === 'nap' ? `${ord(n)} Squadron` : `Force ${LETTERS[(n - 1) % LETTERS.length]}`,
    air: (n) => `No. ${n} Group`,
  },
  de: {
    land: (n, k, w) => `${n}. ${{ infantry: 'Infanterie-Division', armour: w === 'nap' ? 'Kürassier-Brigade' : w === 'ww1' ? 'Sturmpanzer-Abteilung' : 'Panzer-Division', artillery: 'Artillerie-Brigade', cavalry: 'Kavallerie-Brigade', guard: 'Garde-Brigade' }[k] ?? 'Division'}`,
    fleet: (n, k) => (k === 'submarines' ? `${n}. U-Flottille` : `Kampfgruppe ${n}`),
    air: (n) => `Geschwader ${n}`,
  },
  fr: {
    land: (n, k, w) => `${n}e ${{ infantry: 'Division d’infanterie', armour: w === 'nap' ? 'Brigade de cuirassiers' : 'Division cuirassée', artillery: 'Brigade d’artillerie', cavalry: 'Brigade de cavalerie', guard: 'Brigade de la Garde' }[k] ?? 'Division'}`,
    fleet: (n) => `${n}e Escadre`,
    air: (n) => `${n}e Escadre aérienne`,
  },
  it: {
    land: (n, k) => `${n}ª ${{ infantry: 'Divisione di fanteria', armour: 'Divisione corazzata', artillery: 'Brigata d’artiglieria', cavalry: 'Brigata di cavalleria' }[k] ?? 'Divisione'}`,
    fleet: (n) => `${n}ª Squadra`,
    air: (n) => `${n}° Stormo`,
  },
  jp: {
    land: (n, k) => `${ord(n)} ${{ armour: 'Tank Division', artillery: 'Field Artillery Regiment' }[k] ?? 'Division'}`,
    fleet: (n, k) => (k === 'carrier' ? `${ord(n)} Carrier Division` : `${ord(n)} Fleet`),
    air: (n) => `${n} Kōkūtai`,
  },
  ru: {
    land: (n, k, w) => `${ord(n)} ${{ infantry: w === 'ww2' || w === 'ww3' ? (w === 'ww3' ? 'Motor Rifle Division' : 'Rifle Division') : 'Infantry Division', armour: w === 'nap' ? 'Cuirassier Brigade' : 'Tank Corps', artillery: 'Artillery Brigade', cavalry: 'Cossack Brigade', guard: 'Guards Division' }[k] ?? 'Division'}`,
    fleet: (n) => `${ord(n)} Squadron`,
    air: (n) => `${ord(n)} Air Regiment`,
  },
  en: { // every other army: plain English
    land: (n, k, w) => `${ord(n)} ${{ infantry: w === 'nap' ? 'Brigade' : 'Infantry Division', armour: w === 'nap' ? 'Heavy Cavalry Brigade' : 'Armoured Division', artillery: 'Artillery Brigade', cavalry: 'Cavalry Brigade', guard: 'Guards Brigade' }[k] ?? 'Division'}`,
    fleet: (n) => `${ord(n)} Squadron`,
    air: (n) => `${ord(n)} Air Wing`,
  },
};
const OF = {
  us: 'us', aef: 'us', usmc: 'usmc',
  uk: 'uk', brit: 'uk', brit21: 'uk', brit14: 'uk', gb: 'uk', anzac: 'uk',
  wh: 'de', de: 'de', fj: 'de', st: 'de', bw: 'de', nva: 'de', pr: 'de', sx: 'de', au: 'de', ah: 'de', by: 'de',
  fr: 'fr', it: 'it', jp: 'jp', ru: 'ru', sov: 'ru',
};
const START = { land: 20, fleet: 4, air: 10 }; // (well past the war's own opening formations)

/** The name for a new force: `cat` 'land' | 'fleet' | 'air', `kind` the battalion or fleet kind. */
export function formationName(c, war, army, cat, kind) {
  const key = `${army}:${cat}${cat === 'land' ? `:${kind}` : ''}`;
  const named = (c.named ??= {});
  const n = (named[key] = (named[key] ?? START[cat]) + 1);
  const st = STYLE[OF[army]] ?? STYLE.en;
  return st[cat](n, kind, war.id);
}
