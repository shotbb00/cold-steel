// Kampfgruppe: the NVA's factory militia (data/doctrine.js 'kampf'), the Kampfgruppen der
// Arbeiterklasse. A big, cheap squad of workers in stone-grey with old MPi-K rifles: poor shots,
// quick to break, but they don't count against the unit cap (type.uncapped) — numbers to hold
// villages and soak up the enemy's attention. Only the NVA can raise them (type.armies).
import { buildNvaSoldier } from '../models/nvaSoldier.js';
import rifles from './vanguard.ts';
import type { UnitType } from '../../types.ts';

export default {
  id: 'kampfgruppe',
  name: 'Kampfgruppe',
  shortName: 'Kampfgr.',
  category: 'infantry',
  kind: 'infantry',
  role: 'frontline',
  cost: 70,
  armies: ['nva'],
  uncapped: true,
  formation: { count: 10, columns: 5, spacing: 2.6 },
  stats: {
    ...rifles.stats,
    grenades: 1,
    speed: 3.1,
    spread: 0.02,         // weekend shooting practice
    aimTime: 1.2,
    breakMorale: 0.3,     // workers, not soldiers: they go when it gets hot
    reloadTime: 3.6,
  },
  models: { pact: () => buildNvaSoldier({ militia: true }), nva: () => buildNvaSoldier({ militia: true }) },
  weaponSound: 'rifle',
  variants: {
    nva: { name: 'Kampfgruppe', weapon: 'MPi-K rifles', text: 'The factory militia: ten workers in stone-grey with old rifles. Poor shots and quick to break, but cheap, and they don\u2019t count against your unit cap — hold villages with them.' },
    pact: { name: 'Kampfgruppe', weapon: 'MPi-K rifles', text: 'The NVA\u2019s factory militia.' },
  },
} satisfies UnitType;
