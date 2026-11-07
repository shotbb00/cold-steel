// Epochs: the war the game is set in, picked in the main menu (settings 'epoch') — 1985, the Cold
// War gone hot, or 1945, spring on the Western Front. An epoch is its own set of sides' names,
// armies, unit types, aircraft and army doctrines; setEpoch swaps them into the registries
// everything already imports (data/factions.js FACTIONS / ARMIES / DEFAULT_ARMY, data/units
// UNIT_TYPES, data/doctrine.js DOCTRINE, systems/AirStrike.js KINDS), in place, before a battle
// or the menu is built. Unit ids stay the same across epochs ('rifles', 'tank' …) so the modes,
// maps and the AI keep working; a type an epoch doesn't have falls back to `alias` (units/index.js
// typeOf), else it isn't there. Props read epoch() for their era (world/Props.js).
import { FACTIONS, ARMIES, DEFAULT_ARMY } from './factions.js';
import { DOCTRINE } from './doctrine.js';
import { UNIT_TYPES, TYPES_1985, ALIAS } from './units/index.js';
import { TYPES_1945, ALIAS_1945 } from './units45/index.js';
import { TYPES_1806, ALIAS_1806 } from './units1806/index.js';
import { KINDS, AIR_1985 } from '../systems/AirStrike.js';
import { AIR_1945 } from './air45.ts';

const DOCTRINE_1985 = { ...DOCTRINE };

export const EPOCHS = {
  1806: {
    id: '1806', name: '1806', title: 'Jena and Auerstedt, 1806 (beta)', beta: true, // (still being balanced: shown as beta in the year picker and the titles)
    blurb: 'October 1806. Napoleon\'s Grande Armée marches through the Thuringian Forest against Prussia and her Saxon allies: muskets, bayonets, horses and guns.',
    sides: { nato: 'France', pact: 'Prussia' },
    armies: {
      fr: { id: 'fr', faction: 'nato', name: 'Grande Armée' },
      by: { id: 'by', faction: 'nato', name: 'Bavaria' },
      pr: { id: 'pr', faction: 'pact', name: 'Prussia' },
      sx: { id: 'sx', faction: 'pact', name: 'Saxony' },
    },
    defaults: { nato: 'fr', pact: 'pr' },
    types: TYPES_1806, alias: ALIAS_1806, air: {},
    // each army's two signatures (they take effect as the units they need arrive: formations, cavalry, guns)
    doctrine: {
      fr: [
        { id: 'pasDeCharge', name: 'Pas de charge', text: 'Columns march 20 % faster, and their bayonet charge hits the enemy\'s nerve 50 % harder.', speed: 1.2, shock: 1.5 },
        { id: 'tirailleurs', name: 'Tirailleur swarm', text: 'Light infantry is harder to spot, and its skirmishing fire pins 30 % more.', stealth: 1.3, suppress: 1.3 },
      ],
      by: [
        { id: 'quickGuns', name: 'Quick guns', text: 'Artillery limbers and unlimbers 40 % faster (the reformed artillery of 1804).', deploy: 0.6 },
        { id: 'lightHorse', name: 'Light horse', text: 'Light cavalry costs 20 % less and sees farther.', cost: 0.8, sight: 1.25 },
      ],
      pr: [
        { id: 'peloton', name: 'Peloton fire', text: 'Line infantry reloads 15 % faster and hits better in line (the drill of Frederick the Great).', reload: 0.85, spread: 0.85 },
        { id: 'cuirassiers', name: 'Heavy cuirassiers', text: 'Heavy cavalry charges 25 % harder — but formations change 25 % slower (the old rigid drill).', shock: 1.25, form: 1.25 },
      ],
      sx: [
        { id: 'squares', name: 'Steady squares', text: 'Squares never break against cavalry and lose less nerve under artillery (the Saxon grenadiers left Jena in square).' },
        { id: 'gardeDuCorps', name: 'Garde du Corps', text: 'Heavy cavalry starts as Veterans.' },
      ],
    },
  },
  1985: {
    id: '1985', name: '1985', title: 'World War III, 1985',
    sides: { nato: 'NATO', pact: 'Warsaw Pact' },
    armies: {
      us: { id: 'us', faction: 'nato', name: 'US Army' },
      bw: { id: 'bw', faction: 'nato', name: 'Bundeswehr' },
      sov: { id: 'sov', faction: 'pact', name: 'Soviet Army' },
      nva: { id: 'nva', faction: 'pact', name: 'NVA' },
    },
    defaults: { nato: 'us', pact: 'sov' },
    types: TYPES_1985, alias: {}, air: AIR_1985, doctrine: DOCTRINE_1985,
  },
  1945: {
    id: '1945', name: '1945', title: 'Western Front, spring 1945',
    blurb: 'Spring 1945. The Allies are across the Rhine and driving into the heart of Germany; the Wehrmacht fights on in the hills of Hesse and Thuringia.', // (the menu's line; 1985's is data/game.js)
    sides: { nato: 'Allies', pact: 'Germany' },
    armies: {
      us: { id: 'us', faction: 'nato', name: 'US Army' },
      sov: { id: 'sov', faction: 'nato', name: 'Red Army' },
      wh: { id: 'wh', faction: 'pact', name: 'Wehrmacht' },
      fj: { id: 'fj', faction: 'pact', name: 'Fallschirmjäger' },
    },
    defaults: { nato: 'us', pact: 'wh' },
    types: TYPES_1945, alias: ALIAS_1945, air: AIR_1945,
    // each army's two signatures (1945's own ids: tot, airsup, riders, counter, cats, hold, paradrop;
    // the Soviets' mass barrage is 1985's)
    doctrine: {
      us: [
        { id: 'tot', name: 'Time on Target', text: 'A support power (Z): every gun and mortar of yours in range fires one salvo on the spot — timed so that all the shells land at the same moment (120 CP).',
          cost: 120, cooldown: 120, flight: 9 },
        { id: 'airsup', name: 'Air superiority', text: 'Fighter patrols cost 40 % less and are ready again 30 % sooner.', cost: 0.6, cooldown: 0.7 },
      ],
      sov: [
        DOCTRINE_1985.sov[0],
        { id: 'riders', name: 'Tank riders', text: 'Every T-34 platoon brings a rifle squad riding on its hulls: drive them up, U puts them down.' },
      ],
      wh: [
        { id: 'counter', name: 'Counter-attack', text: 'For two minutes after a point is lost, your units within 60 m of it fire 25 % faster, aim 20 % better and get their nerve back.',
          window: 120, radius: 60, fire: 1.25, aim: 1.2, morale: 0.04 },
        { id: 'cats', name: 'Big cats', text: 'Heavy tanks cost 15 % more and come with Veteran crews. (The Panther and the Tiger arrive with the next units.)', cost: 1.15 },
      ],
      fj: [
        { id: 'hold', name: 'Hold to the last', text: 'Squads in cover break only at less than half the losses other squads do.', morale: 0.4 },
        { id: 'paradrop', name: 'Paradrop', text: 'Their paradrop costs 30 % less and is ready again 30 % sooner. (The paradrop arrives with the next units.)', cost: 0.7, cooldown: 0.7 },
      ],
    },
  },
};

let current = '1985';
/** The epoch now in force: '1985', '1945' or '1806'. */
export const epoch = () => current;
/** The epoch's year as a number, for 'before …' tests (props, sounds). */
export const year = () => Number(current);
export const epochInfo = () => EPOCHS[current];

const swap = (target, source) => {
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, source);
};

/** Put epoch `id` in force (unknown: 1985). */
export function setEpoch(id) {
  const e = EPOCHS[id] ?? EPOCHS[1985];
  current = e.id;
  FACTIONS.nato.name = e.sides.nato;
  FACTIONS.pact.name = e.sides.pact;
  swap(ARMIES, e.armies);
  Object.assign(DEFAULT_ARMY, e.defaults);
  swap(UNIT_TYPES, e.types);
  swap(ALIAS, e.alias);
  swap(DOCTRINE, e.doctrine);
  for (const [kind, k] of Object.entries(KINDS)) {
    const aircraft = e.air[kind];
    k.off = !aircraft;           // no helicopters in 1945 (nor a recon flight yet)
    k.label0 ??= k.label;
    k.label = (e.id === '1945' && { lift: 'Paradrop', jet: 'Strike run' }[kind]) || k.label0;
    if (aircraft) k.aircraft = aircraft;
  }
  return e;
}
