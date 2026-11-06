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
import { KINDS, AIR_1985 } from '../systems/AirStrike.js';
import { AIR_1945 } from './air45.ts';

const DOCTRINE_1985 = { ...DOCTRINE };

export const EPOCHS = {
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
    sides: { nato: 'Allies', pact: 'Germany' },
    armies: {
      us: { id: 'us', faction: 'nato', name: 'US Army' },
      sov: { id: 'sov', faction: 'nato', name: 'Red Army' },
      wh: { id: 'wh', faction: 'pact', name: 'Wehrmacht' },
      fj: { id: 'fj', faction: 'pact', name: 'Fallschirmjäger' },
    },
    defaults: { nato: 'us', pact: 'wh' },
    types: TYPES_1945, alias: ALIAS_1945, air: AIR_1945,
    // ponytail: the other three armies' signatures come with phase 3 (the Soviets bring theirs from 1985)
    doctrine: { sov: DOCTRINE_1985.sov },
  },
};

let current = '1985';
/** The epoch now in force: '1985' or '1945'. */
export const epoch = () => current;
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
    k.off = !aircraft;           // no helicopters in 1945 (yet: no paradrop or recon flight either)
    if (aircraft) k.aircraft = aircraft;
  }
  return e;
}
