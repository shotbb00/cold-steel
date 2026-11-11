// The command panel's buttons (src/ui/Icons.js draws them):
//   actions         what the selection can do, as icon tiles with the key in the corner —
//                   stop (anything that moves), sandbags / trench / wire / mines (one infantry stack), clear or blow a bridge
//                   (engineers), lay a bridge, smoke, flare (night), unload, cancel a job, leave a building
//   support powers  always there in their own row: helicopter, jet, air assault, fighters, recon — each with
//                   its price, or while it recharges a ring running round and the seconds left
// Rebuilt when the selection changes, and twice a second (rounds run out, squads climb in).
import { POWERS_1806, powerHere } from '../systems/Powers1806.js';
import { epoch, year } from '../data/epoch.js';
import { refillCost } from '../core/Orders.js';
import { promoteCost } from '../modes/pitched.js';
import { HOUSE_UPGRADES } from '../systems/Buildings.js';
import { RANKS, SHIP_SPEEDS } from '../entities/UnitStack.js';
import { doctrine, armyDoctrine } from '../data/doctrine.js';
import { STRUCTURES, structureCost } from '../systems/Construction.js';
import { KINDS } from '../systems/AirStrike.js';
import { keyOf } from '../core/Keys.js';
import { icon, silhouette } from './Icons.js';

const ACTIONS = [
  { cmd: 'hold', label: 'Stop', icon: 'stop', key: 'hold', tip: 'Stop where they are and hold the spot', when: (sel) => sel.some((s) => s.stats.speed > 0 && !s.stats.structure) },
  { cmd: 'sub:surface', label: 'Surface', icon: 'unload', key: 'none', tip: 'Come up: fast, the deck gun can fire — and everyone can see you', when: (sel) => sel.some((s) => s.stats.submarine), on: (sel) => sel.some((s) => s.units[0]?.depthMode === 'surface') },
  { cmd: 'sub:periscope', label: 'Periscope', icon: 'recon', key: 'none', tip: 'Periscope depth: slow, hidden from eyes but a sonar finds you; torpedoes can be fired', when: (sel) => sel.some((s) => s.stats.submarine), on: (sel) => sel.some((s) => (s.units[0]?.depthMode ?? 'periscope') === 'periscope') },
  { cmd: 'sub:deep', label: 'Dive deep', icon: 'smoke', key: 'none', tip: 'Deep: blind and can\'t shoot, harder for depth charges — you hear ships under way', when: (sel) => sel.some((s) => s.stats.submarine), on: (sel) => sel.some((s) => s.units[0]?.depthMode === 'deep') },
  { cmd: 'sub:silent', label: 'Silent running', icon: 'stop', key: 'none', tip: 'Half the speed — and a sonar has to come twice as close to find you', when: (sel) => sel.some((s) => s.stats.submarine), on: (sel) => sel.some((s) => s.silent) },
  // ships (entities/UnitStack.js: engine orders, zig-zag, formations, smoke; Orders.js)
  { cmd: 'ship:speed', label: (g) => `${SHIP_SPEEDS[[...g.commands.selected].find((s) => s.alive && s.stats.naval)?.shipSpeed ?? 'full'].name} ahead`, icon: 'charge', key: 'none', tip: 'Engine orders, a step a click: Slow (quiet: a listening submarine hears you half as far) · Half · Full · Flank (the fastest — and loudest)', when: (sel) => sel.some((s) => s.stats.naval) },
  { cmd: 'ship:radar', label: (g) => ([...g.commands.selected].some((s) => s.stats.radar && s.radarOn !== false) ? 'Radar on' : 'Radar off'), icon: 'recon', key: 'none', tip: 'Radar on: she sees every ship no island hides — and every enemy hears her and gets a bearing. Off: silent, she sees only by eye. ^ switches the whole fleet', when: (sel) => sel.some((s) => s.stats.radar), on: (sel) => sel.some((s) => s.stats.radar && s.radarOn !== false) },
  { cmd: 'ship:board', label: 'Board', icon: 'charge', key: 'none', tip: 'Run alongside the enemy ship you pick and send the boarders over: crew against crew on her decks — a ship that has struck is simply taken', when: (sel) => sel.some((s) => s.alive && s.stats.sail && !s.units[0]?.struck) },
  { cmd: 'ship:missile', count: (sel) => sel.reduce((a, s) => a + (s.alive && s.stats.naval && s.units[0]?.mounts ? s.units[0].mounts.filter((m) => m.missile).reduce((b, m) => b + Math.max(0, m.left), 0) : 0), 0), label: 'Missile strike', icon: 'charge', key: 'none', tip: 'Two missiles from each selected ship at a spot you pick — a bearing fix, a ship out of sight: the seekers find what is there (or the wrong ship, or chaff)', when: (sel) => sel.some((s) => s.alive && s.stats.naval && Object.values(s.type.mounts ?? {}).flat().some((m) => m.missile)) },
  { cmd: 'ship:helo', label: 'Helicopter', icon: 'recon', key: 'none', tip: 'Her helicopter out to a spot you pick: it hovers there with its sonar down — submarines near it show on your map and it drops a torpedo on one; the ships round it show too', when: (sel) => sel.some((s) => s.alive && s.stats.helo) },
  { cmd: 'ship:zigzag', label: 'Zig-zag', icon: 'turnRight', key: 'none', tip: 'Weave either side of the course: a torpedo aimed at where you would be finds water — you get there a little later', when: (sel) => sel.some((s) => s.stats.naval && !s.stats.submarine), on: (sel) => sel.some((s) => s.zigzag) },
  { cmd: 'ship:form:ahead', label: 'Line ahead', icon: 'formColumn', key: 'none', tip: 'The biggest selected ship leads, the others follow in her wake — move her and they come along', when: (sel) => sel.filter((s) => s.stats.naval && !s.stats.submarine).length >= 2 },
  { cmd: 'ship:form:abreast', label: 'Abreast', icon: 'formLine', key: 'none', tip: 'Side by side with the biggest ship: every bow gun bears ahead', when: (sel) => sel.filter((s) => s.stats.naval && !s.stats.submarine).length >= 2 },
  { cmd: 'ship:form:screen', label: 'Screen', icon: 'formSquare', key: 'none', tip: 'The smaller ships ring the biggest — escorts round a carrier or a battleship, between her and the submarines', when: (sel) => sel.filter((s) => s.stats.naval && !s.stats.submarine).length >= 2 },
  { cmd: 'ship:form:free', label: 'Break formation', icon: 'cancel', key: 'none', tip: 'Every ship on her own again', when: (sel) => sel.some((s) => s.station) },
  { cmd: 'ship:searchlight', label: 'Searchlight', icon: 'recon', key: 'none', tip: 'At night: the beam on her target — everyone sees it as by day. And everyone sees where the beam comes from', when: (sel, g) => g.conditions?.night && sel.some((s) => s.stats.naval && !s.stats.submarine), on: (sel) => sel.some((s) => s.searchlight) },
  { cmd: 'ship:smoke', label: 'Lay smoke', icon: 'smoke', key: 'none', tip: 'A minute of smoke off the stern while under way: nobody sees through it — go in behind it, or get out. Two minutes to make more', when: (sel) => sel.some((s) => s.stats.smokeGen), on: (sel) => sel.some((s) => s.smokeUntil > s.world.time) },
  { cmd: 'holdFire', label: (g) => ([...g.commands.selected].some((s) => s.holdFire) ? 'Holding fire' : 'Hold fire'), icon: 'stop', key: 'holdFire', tip: 'Hold fire: they shoot only at what you order them to attack (or at an enemy right on top of them). Again: fire at will', when: (sel) => sel.some((s) => s.stats.damage > 0 && !s.stats.structure), on: (sel) => sel.some((s) => s.holdFire) },
  { cmd: 'sprint', label: 'Sprint', icon: 'charge', key: 'sprintOrder', tip: 'Infantry on the move runs for 10 s, then is winded (slower) for 20 s. With a mouse: give the move order twice', when: (sel) => sel.some((s) => s.usesCover && s.moveTarget && !s.stats.structure), on: (sel) => sel.some((s) => s.sprinting) },
  { cmd: 'waypoints', label: (g) => (g.commands.queueing ? 'Waypoints on' : 'Waypoints'), icon: 'place', key: 'waypoints', tip: 'Each order adds a waypoint to the route instead of replacing it (with a mouse: Shift+right-click)', when: (sel) => document.body.classList.contains('touch') && sel.some((s) => s.stats.speed > 0 && !s.stats.structure) },
  { cmd: 'build:sandbags', label: 'Sandbags', icon: 'sandbags', key: 'sandbags', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.sandbags), tip: 'A chest-high bag wall: cover from the front', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:trench', label: 'Trench', icon: 'trench', key: 'trench', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.trench), tip: 'Dig a trench: shelter from every direction', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:wire', label: 'Wire', icon: 'wire', key: 'wire', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.wire), tip: 'Concertina wire: enemy infantry crawls through it', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:revetment', label: 'Dig in', icon: 'trench', key: 'trench', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.revetment), tip: 'The blade digs a vehicle position: any vehicle in it is hull down behind the berm', when: (sel) => one(sel, (s) => s.stats.dozer) },
  { cmd: 'build:mines', label: 'Mines', icon: 'mines', key: 'mines', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.mines), tip: 'A minefield the enemy can\'t see until the first blast', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:mgNest', label: 'MG nest', icon: 'sandbags', key: 'none', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.mgNest), tip: 'A horseshoe of sandbags: two men fire from it, covered front and sides', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:tankTraps', label: 'Tank traps', icon: 'wire', key: 'none', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.tankTraps), tip: 'Steel hedgehogs: no vehicle gets through — they have to go round. Infantry climbs over', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:camoNet', label: 'Camo net', icon: 'place', key: 'none', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.camoNet), tip: 'A camouflage net: whoever stands still under it is spotted from half as far', when: (sel) => one(sel, (s) => s.usesCover) },
  {
    cmd: 'engineer', icon: 'engineer', key: 'engineer',
    label: (g) => (g.map.bridgeAt ? 'Clear / blow' : 'Clear'),
    tip: (g) => `Engineers: click a minefield or wire to lift it${g.map.bridgeAt ? ', or a bridge to blow it (8 s fuse)' : ''}`,
    when: (sel) => sel.some((s) => s.stats.engineer),
  },
  { cmd: 'engineer', label: 'Line charge', icon: 'mines', key: 'engineer', tip: 'Fire the rocket-towed hose: it blows a lane through minefields and wire', when: (sel) => sel.some((s) => s.stats.lineCharge && (s.units[0].lineCharges ?? s.stats.lineCharge.count) > 0), count: (sel) => sel.reduce((a, s) => a + (s.stats.lineCharge ? s.units[0].lineCharges ?? s.stats.lineCharge.count : 0), 0) },
  { cmd: 'bridge', label: 'Lay bridge', icon: 'bridge', key: 'engineer', tip: 'Bridge layer: click the river — it drives to the bank and lays a crossing', when: (sel) => sel.some((s) => s.stats.bridgeLayer && !s.units[0].dropped) },
  { cmd: 'smoke', label: 'Smoke', icon: 'smoke', key: 'smoke', tip: 'Infantry throws a smoke grenade ahead, vehicles pop their launchers; mortars: click where to lay the screen', when: (sel) => sel.some((s) => s.smokeLeft > 0 || s.smokeRounds > 0), count: (sel) => sel.reduce((a, s) => a + (s.smokeLeft || 0) + (s.smokeRounds || 0), 0) },
  { cmd: 'flare', label: (g) => ([...g.commands.selected].some((s) => s.stats.naval) ? 'Star shell' : 'Flare'), icon: 'flare', key: 'flare', tip: (g) => ([...g.commands.selected].some((s) => s.stats.naval) ? 'A star shell over the spot: it lights the sea some 450 m round for half a minute — whatever is there is seen as by day' : 'Illumination: light the ground for half a minute'), when: (sel, g) => g.conditions?.night && sel.some((s) => s.flareRounds > 0), count: (sel) => sel.reduce((a, s) => a + (s.flareRounds || 0), 0) },
  { cmd: 'salvo', label: 'Salvo', icon: 'flare', key: 'salvo', tip: 'Click a spot: four rounds from every tube on it', when: (sel) => sel.some((s) => s.stats.indirect) },
  { cmd: 'sustain', label: 'Sustained fire', icon: 'flare', key: 'sustain', tip: 'Click an area: a minute of shells scattered across it (Stop ends it)', when: (sel) => sel.some((s) => s.stats.indirect), on: (sel) => sel.some((s) => s.smokeOrder?.area) },
  { cmd: 'barrage', label: 'Feuerwalze', icon: 'flare', key: 'barrage', tip: 'Creeping barrage: click where it starts — the shells walk forward ahead of your advance', when: (sel) => sel.some((s) => s.stats.indirect && armyDoctrine(s.army, 'walze')) },
  { cmd: 'unload', label: 'Unload', icon: 'unload', key: 'unload', tip: 'The squad climbs out behind the vehicles', when: (sel) => sel.some((s) => s.passengers > 0) },
  { cmd: 'cancelJob', label: 'Cancel job', icon: 'cancel', key: 'cancelJob', tip: 'Call off the build order: the blueprint goes and the command points come back', when: (sel, g) => sel.some((s) => g.construction.sites.some((site) => site.stackId === s.id)) },
  { cmd: 'refill', label: 'Refill', icon: 'reinforce', key: 'refill', cost: (g) => [...g.commands.selected].reduce((a, s) => a + (s.missing && s.supplied ? refillCost(s) : 0), 0), tip: (g) => ([...g.commands.selected].some((s) => s.missing && !s.supplied) ? 'New men for the missing: only near the base or a set-up command post' : 'New men fill the squad\'s empty places'), when: (sel, g) => !!g.modeState?.cp && sel.some((s) => s.missing > 0) },
  { cmd: 'promote', label: 'Promote', icon: 'reinforce', key: 'promote', tip: 'A pitched battle\'s setup: one rank up for its price (30 % of the stack\'s cost)', when: (sel, g) => !!g.modeState?.setup && g.mode?.budget && sel.some((s) => s.rank + 1 < RANKS.length), cost: (g) => [...g.commands.selected].reduce((a, s) => a + (promoteCost(g, s) ?? 0), 0) },
  { cmd: 'withdraw', label: 'Withdraw', icon: 'withdraw', key: 'withdraw', tip: 'Back to base and off the field: its slot is free at once, half its price comes back (less for damage)', when: (sel, g) => !!g.modeState?.cp && sel.some((s) => !s.stats.structure && s.type.id !== 'crew') },
  ...['line', 'column', 'square', 'skirmish'].map((f) => ({
    cmd: `form:${f}`, label: f[0].toUpperCase() + f.slice(1), icon: `form${f[0].toUpperCase()}${f.slice(1)}`, key: 'formation',
    tip: { line: 'Two ranks: every musket fires — the most firepower', column: 'Six files deep: faster on the march and for the charge; only the front rank fires', square: 'Facing out on all sides: cavalry can\'t break in — but guns tear it apart', skirmish: 'A loose screen in cover, each man firing when ready' }[f],
    when: (sel) => sel.some((s) => s.stats.formations),
    on: (sel) => sel.some((s) => s.form === f),
  })),
  { cmd: 'charge', label: 'Charge!', icon: 'charge', key: 'charge', tip: 'Foot: bayonets, at the run. Horse: at the gallop, sabres out. At the nearest enemy in sight — horses will not go into a square', when: (sel) => sel.some((s) => s.stats.formations || (s.stats.cavalry && !s.stats.loose)) },
  { cmd: 'house:sandbag', label: 'Sandbag house', icon: 'sandbags', key: 'none', cost: () => HOUSE_UPGRADES.sandbag.cost, tip: 'Sandbags along the walls of the house this squad holds: the men at its windows take much less (building budget)', when: (sel) => year() >= 1900 && sel.some((s) => s.entered && !s.entered.fortified) },
  { cmd: 'house:aid', label: 'Aid station', icon: 'reinforce', key: 'none', cost: () => HOUSE_UPGRADES.aid.cost, tip: 'Make the house this squad holds an aid station: a medic jeep stays posted there and drives out to wounded squads (building budget)', when: (sel) => year() >= 1900 && sel.some((s) => s.entered && !s.entered.aid) },
  { cmd: 'leave', label: 'Leave', icon: 'leave', key: 'leave', tip: 'Come out of the building and hold next to it', when: (sel) => sel.some((s) => s.garrison) },
];

// the support powers: [command, icon, key action, label, tooltip]
const SUPPORT = [
  ['air', 'heli', 'heli', 'Helicopter', 'Attack helicopter: rockets and the chin gun along a line'],
  ['air:jet', 'jet', 'jet', 'Jet', 'Ground-attack jet: one fast, devastating gun run'],
  ['air:lift', 'assault', 'lift', 'Air assault', 'A helicopter lands a squad where you click'],
  ['air:cap', 'fighter', 'cap', 'Fighters', 'Fighter patrol: circles over the spot and shoots down enemy aircraft that come near'],
  ['air:recon', 'recon', 'recon', 'Recon', 'Recon flight: a photo run along the line — every enemy near it shows on your map for 30 s'],
  ['barrage', 'flare', 'barrage', 'Barrage', 'Preparatory barrage: a whole sector shelled for a minute (Soviet Army)'],
  ['air:diveBomb', 'diveBomb', 'jet', 'Dive bombers', 'From the carrier: a bomb onto the enemy ship nearest the spot'],
  ['air:torpBomb', 'torpBomb', 'heli', 'Torpedo bombers', 'From the carrier: low over the water, a torpedo into the ship nearest the spot'],
  ['air:navCap', 'fighter', 'cap', 'Fighter cover', 'From the carrier: fighters circle the spot and go for enemy aircraft'],
  ['air:navScout', 'recon', 'recon', 'Scout flight', 'From the carrier: a long search leg — every ship it sees shows on your map'],
  ['air:seaStrike', 'jet', 'jet', 'Missile strike', 'Bombers fire their anti-ship missiles at the spot from beyond the defences (off a carrier, or from the shore)'],
  ['air:seaCap', 'fighter', 'cap', 'Fighter cover', 'Fighters circle the spot and shoot down enemy aircraft before they fire'],
  ['air:asw', 'torpBomb', 'heli', 'Sub hunt', 'A patrol aircraft searches along a line: submarines it finds show on your map, and it drops a torpedo on one'],
  ['air:aew', 'recon', 'recon', 'Radar picture', 'A radar aircraft circles the spot: every enemy ship within 3 km shows on your map — and can be fired at'],
  ...Object.entries(POWERS_1806).map(([k, p]) => [`power:${k}`, p.icon, p.key, p.label, p.tip]), // 1806 (systems/Powers1806.js)
];

function one(sel, test) {
  return sel.length === 1 && test(sel[0]);
}

const value = (v, g) => (typeof v === 'function' ? v(g) : v);

export class ActionBar {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('cmd-actions');
    this.key = '';
    this.timer = 0;
    this.buildSupport();
    game.bus.on('selection', () => this.render(true));
    game.bus.on('order', () => setTimeout(() => this.render(true), 0));
    this.formTick = setInterval(() => { if (game.commands?.selected?.size) this.render(); }, 500); // (a formation finishing: its button lights) // a job placed: its Cancel button at once
  }

  buildSupport() {
    const row = document.querySelector('.cmd-buttons.support');
    this.support = SUPPORT.map(([cmd, ic, key, label, tip]) => {
      if (cmd === 'air:jet' && epoch() === '1945') [label, tip] = ['Strike', 'Fighter-bomber: rockets or a bomb, then the guns along a line']; // (data/epoch.js)
      if (cmd === 'air:lift' && epoch() === '1945') [label, tip] = ['Paradrop', 'A transport flies over the spot and drops a stick of paratroopers']
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.className = 'sup';
      b.dataset.cmd = cmd;
      b.title = `${label} — ${tip}`;
      // an air power shows the army's own aircraft (tools/render_silhouettes.py air-…), the rest their icon
      const kind = cmd === 'air' ? 'heli' : cmd.startsWith('air:') ? cmd.slice(4) : null;
      const me = this.game.playerFaction;
      const own = kind && KINDS[kind]?.aircraft?.[this.game.armyOf(me)] ? this.game.armyOf(me) : me;
      const art = kind === 'lift' && epoch() === '1945' ? icon('parachute') : kind && KINDS[kind]?.sea ? icon(ic) : kind ? silhouette(`air-${kind}`, own, 'ico sup-sil') : icon(ic); // (the paradrop: a parachute)
      b.innerHTML = `<i class="cd"></i>${art}<span class="sup-name">${label}</span><small></small><kbd data-key="${key}">${keyOf(key)}</kbd>`;
      return { b, cmd, small: b.querySelector('small') };
    });
    row.replaceChildren(...this.support.map((s) => s.b));
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    this.render();
    this.supportPowers();
  }

  /** Price or recharge on the support powers: a ring runs round while one is cooling down. */
  supportPowers() {
    const g = this.game;
    const me = g.playerFaction;
    const off = g.air.limit[me] === 0; // no support in this battle
    for (const { b, cmd, small } of this.support) {
      if (cmd.startsWith('power:') || year() < 1900) { // 1806: its own three powers, nothing else
        const k = cmd.startsWith('power:') ? cmd.slice(6) : null;
        b.hidden = off || !k || year() >= 1900 || !powerHere(k, g); // (at sea the sea's three, ashore the land's)
        if (b.hidden) continue;
        const P = POWERS_1806[k], left = g.powers.cooldownLeft(me, k);
        const text = left === Infinity ? 'used' : left > 0 ? `${Math.ceil(left)} s` : String(P.cost);
        if (small.textContent !== text) small.textContent = text;
        b.classList.toggle('cooling', left > 0);
        b.style.setProperty('--cd', left === Infinity ? '0' : left > 0 ? String(1 - left / P.cooldown) : '1');
        continue;
      }
      const mass = cmd === 'barrage' ? doctrine(g, me, 'mass') ?? doctrine(g, me, 'tot') ?? false : null; // the Soviet Army's barrage, the 1945 US Army's Time on Target
      const kind = mass !== null ? null : cmd.slice(4) || 'heli';
      const left = Math.ceil(mass !== null ? g.barrage.cooldownLeft(me) : g.air.cooldownLeft(me, kind));
      const total = mass ? mass.cooldown : mass === false ? 1 : g.air.span[g.air.key(me, kind)] ?? KINDS[kind].cooldown;
      const terms = kind ? g.air.terms(me, kind) : null;
      const aboard = kind && KINDS[kind]?.sea && KINDS[kind].deck !== 'optional' ? g.air.aboard(me, kind) : null; // (at sea: flights aboard the carriers; 1985's come from the shore too)
      const text = left > 0 ? `${left} s` : aboard === 0 ? 'none aboard' : `${mass !== null ? mass.cost ?? '' : terms.cost}${aboard != null ? ` · ${aboard}` : ''}`;
      b.classList.toggle('airland', !!terms?.airland); // the US Army's AirLand Battle: cheaper right now
      if (small.textContent !== text) small.textContent = text;
      b.classList.toggle('cooling', left > 0);
      b.style.setProperty('--cd', left > 0 ? String(1 - left / total) : '1');
      b.hidden = off || mass === false || !!(kind && KINDS[kind]?.off) // (not in this war: data/epoch.js)
        || (mass !== null ? !!g.world.openSea : !!KINDS[kind]?.sea !== !!g.world.openSea); // (at sea: the carrier missions only)
      if (mass?.id === 'tot' && b.querySelector('.sup-name').textContent !== 'Time on Target') { b.querySelector('.sup-name').textContent = 'Time on Target'; b.title = 'Time on Target — every gun in range fires one salvo; all the shells land at the same moment'; }
    }
  }

  render(force = false) {
    const g = this.game;
    const sel = [...g.commands.selected].filter((s) => s.alive);
    const foot = sel.length && sel.every((s) => s.stats.formations); // 1806 companies: they don't dig, wire or mine (the pioneers do)
    const shown = ACTIONS.filter((a) => a.when(sel, g) && !(foot && a.cmd.startsWith('build:')) && !(year() < 1900 && ['build:wire', 'build:mines', 'build:mgNest', 'build:tankTraps', 'build:camoNet'].includes(a.cmd))); // (1806: none of the modern works)
    // only touch the DOM when what's shown changed
    const key = shown.map((a) => `${a.cmd}:${a.count?.(sel) ?? ''}:${a.on?.(sel) ? 1 : 0}:${typeof a.label === 'function' ? a.label(g) : ''}`).join('|'); // (a label that changes: the engine order, hold fire)
    if (!force && key === this.key) return;
    this.key = key;
    this.el.replaceChildren(...shown.map((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.className = a.on?.(sel) ? 'act on' : 'act';
      b.dataset.cmd = a.cmd;
      const label = value(a.label, g);
      const cost = value(a.cost, g);
      b.title = `${label}${cost ? ` (${cost} CP)` : ''} — ${value(a.tip, g)}`;
      const n = a.count?.(sel);
      b.innerHTML = `${icon(a.icon)}<span>${label}</span>${cost ? `<small>${cost}</small>` : ''}${n ? `<small class="n">×${n}</small>` : ''}${keyOf(a.key) === "—" ? "" : `<kbd data-key="${a.key}">${keyOf(a.key)}</kbd>`}`;
      return b;
    }));
    this.el.hidden = !shown.length;
  }
}
