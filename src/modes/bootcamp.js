// Boot camp: the tutorial (main menu → Boot camp), in chapters you can take in any order — each a
// short exercise near your base on the Fulda Gap, taught one thing at a time by a card on the
// left (ui/Tutorial.js):
//   basics   the camera, selecting, moving and facing, a first contact, taking a point
//   fire     mortar smoke, artillery and forward observers, helicopters, jets and recon
//   fortify  trenches, wire and mines, calling off a job, houses, engineers clearing a minefield
//   armour   reinforcements, vehicle smoke, mechanised infantry, repairs
//   tactics  direct control, officers, the ambush
// 1945 (data/epoch.js) runs the same lessons with its own aircraft and vehicles (the *_1945 steps:
// strike plane, recon plane, smoke discharger, half-track) and a chapter of its own: tanks that stop
// to fire, the paradrop, Time on Target. Its chapters are ticked off separately.
// 1806 runs on Jena with companies: the basics retold, then formations (column, line and volley,
// square against cavalry, the bayonet), horse and guns, and the support powers (grand battery,
// cavalry reserve, the Guard) with direct control. Also ticked off on its own.
// The chapter comes in as the battle rule `chapter`; finished chapters are remembered
// (localStorage) for the menu's ticks. Each step lists its tasks and ticks them off as you do
// them; the next step starts by itself (or Skip). The enemies it sets up are targets — they shoot
// back, but their rounds do no harm. Single player, always clear daylight, no weather change.
//
// A step is { title, text (HTML; <kbd data-key="action"> shows the bound key), touch? (the text
// for fingers, ui/TouchControls.js), tasks: [[label, done(game, ctx)]], start?(game, ctx),
// update?(game, ctx, dt), end?(game, ctx) }; ctx carries the step's state.
import { ControlPoints } from '../systems/ControlPoints.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { Tutorial } from '../ui/Tutorial.js';
import { enemyOf } from '../data/factions.js';
import { makeBuyer } from './shared.js';
import { AIState } from '../ai/StackAI.js';
import { rememberBattle, requestReplay } from '../core/replay.js';
import { epoch } from '../data/epoch.js';

const ww2 = () => epoch() === '1945';
const doneKey = () => (epoch() === '1985' ? 'coldsteel.bootcamp' : `coldsteel.bootcamp.${epoch()}`);
const near = (s, p, r) => s?.alive && Math.hypot(s.centroid.x - p.x, s.centroid.z - p.z) < r;
const mineOf = (g, test) => g.world.stacksOf(g.playerFaction).find(test);

/** Positions in front of your base: `ahead` metres toward the enemy, `side` to the right. */
function spot(game, ahead, side = 0) {
  const base = game.map.bases[game.playerFaction];
  const f = -Math.sign(base.z) || 1;
  return game.world.clampToBounds({ x: base.x - side * f, z: base.z + f * ahead });
}

const facing = (game) => (game.playerFaction === 'nato' ? Math.PI : 0); // toward the enemy

/** An enemy stack that fights back harmlessly and stays where it is put. */
function target(game, unit, at, name) {
  const s = game.spawnStack(unit, enemyOf(game.playerFaction), at, game.playerFaction === 'nato' ? 0 : Math.PI, name);
  for (const u of s.units) u.damageMult = 0;
  s.ai.moveTo(at, { hold: true, ordered: false });
  return s;
}

/** One of yours, or a fresh one if the step before was skipped. */
function ensure(game, typeId, ahead, side, name) {
  return mineOf(game, (s) => s.alive && s.type.id === typeId) ?? game.spawnStack(typeId, game.playerFaction, spot(game, ahead, side), facing(game), name);
}

const built = (g, kind) => g.construction.structures.some((s) => s.kind === kind && s.faction === g.playerFaction);
const placed = (g, kind) => g.construction.sites.some((s) => s.kind === kind && s.faction === g.playerFaction) || built(g, kind);

// ------------------------------------------------------------------ steps

const CAMERA = {
  title: 'The command view',
  touch: 'You fight from above, like a commander. <b>Drag</b> one finger to move over the battlefield, <b>pinch</b> to zoom, and with two fingers <b>twist</b> to turn the view or <b>slide up and down</b> to tilt it.',
  text: 'You fight from above, like a commander. Pan with <kbd data-key="up"></kbd><kbd data-key="left"></kbd><kbd data-key="down"></kbd><kbd data-key="right"></kbd> or by pushing the mouse against the screen edge, zoom with the mouse wheel, and hold the <b>middle mouse button</b> and drag to turn and tilt the view. <kbd data-key="resetView"></kbd> puts it back.',
  start(game, ctx) {
    const t = game.cameraManager.tactical;
    ctx.last = t.target.clone();
    ctx.travel = 0;
    ctx.h0 = t.height;
    ctx.o0 = t.orbit;
    ctx.t0 = t.tilt;
  },
  update(game, ctx) {
    const t = game.cameraManager.tactical;
    ctx.travel += t.target.distanceTo(ctx.last);
    ctx.last.copy(t.target);
  },
  tasks: [
    ['Pan the camera', (g, c) => c.travel > 40],
    ['Zoom in or out', (g, c) => Math.abs(g.cameraManager.tactical.height - c.h0) > 15],
    ['Turn or tilt the view', (g, c) => Math.abs(g.cameraManager.tactical.orbit - c.o0) > 0.3 || Math.abs(g.cameraManager.tactical.tilt - c.t0) > 0.15],
  ],
};

const SELECT = {
  title: 'Selecting',
  touch: 'Your units fight in <b>stacks</b> — a squad, a team, a platoon of vehicles. <b>Tap</b> your rifle squad to select it. To pick up several, hold a finger still for a moment, then drag a box around them.',
  text: 'Your units fight in <b>stacks</b> — a squad, a team, a platoon of vehicles. <b>Left-click</b> your rifle squad to select it (or drag a box around it). <kbd data-key="selectAll"></kbd> selects everything you have.',
  start(game, ctx) { game.tutorial.highlight(ctx.squad); },
  tasks: [['Select the rifle squad', (g, c) => g.commands.selected.has(c.squad)]],
};

const MOVE = {
  title: 'Moving',
  touch: 'With the squad selected, <b>tap</b> the ground to send it there. Infantry looks for cover where it stops.',
  text: 'With the squad selected, <b>right-click</b> on the ground to send it there. Infantry looks for cover where it stops.',
  start(game, ctx) {
    ctx.at = spot(game, 95, -25);
    ctx.ring = game.tutorial.marker(ctx.at, 9);
  },
  tasks: [['Move the squad into the marked ring', (g, c) => near(c.squad, c.at, 11)]],
  end(game, ctx) { ctx.ring.remove(); },
};

const FACE = {
  title: 'Facing and cover',
  touch: 'Where a squad looks matters as much as where it stands: it only sees what is in front of it. <b>Hold</b> a finger on the ground, then <b>drag</b>: the arrow shows the way they will face. Next to a wall, hedge or trench the preview marks the spots the men will take — on the side away from the arrow, so the cover is between them and the enemy.',
  text: 'Where a squad looks matters as much as where it stands: it only sees what is in front of it. <b>Right-click and drag</b> on the ground: the arrow shows the way they will face. Next to a wall, hedge or trench the preview marks the spots the men will take — on the side away from the arrow, so the cover is between them and the enemy. A right-drag right next to the squad just turns it.',
  start(game, ctx) { ctx.face0 = ctx.squad.holdFacing; },
  tasks: [['Move the squad with a right-drag, choosing its facing', (g, c) => c.squad.holdFacing != null && c.squad.holdFacing !== c.face0]],
};

const CONTACT = {
  title: 'Contact!',
  touch: 'Enemy infantry has come up ahead. Your men open fire on their own at anything they can see. To focus their fire, select the squad and <b>tap the enemy</b>. Watch the bars over a stack: health, and in amber how hard it is being shot at — a <b>pinned</b> squad hugs the ground and barely fires back.',
  text: 'Enemy infantry has come up ahead. Your men open fire on their own at anything they can see. To focus their fire, select the squad and <b>right-click the enemy</b>. Watch the bars over a stack: health, and in amber how hard it is being shot at — a <b>pinned</b> squad hugs the ground and barely fires back.',
  start(game, ctx) {
    ctx.enemy = target(game, 'rifles', spot(game, 175, -20), 'Recce section');
    game.tutorial.highlight(ctx.enemy);
    game.bus.emit('toast', 'Enemy infantry ahead!');
  },
  tasks: [
    ['Order an attack on the enemy squad', (g, c) => c.squad?.ai.targetGroup === c.enemy || c.ordered],
    ['Destroy or rout it', (g, c) => !c.enemy.alive || c.enemy.ai.state === AIState.RETREAT],
  ],
  update(game, ctx) { if (ctx.squad?.ai.targetGroup === ctx.enemy) ctx.ordered = true; },
};

const POINT = {
  title: 'Taking ground',
  text: 'Battles are fought over <b>control points</b>. Only infantry can take one: soldiers inside the ring swing it toward your side — the more of them, the faster — and nobody gains it while both sides are inside. Move the rifle squad into the ring and hold it until the flag is yours. Tanks are strong but blind and vulnerable up close; let the infantry lead.',
  start(game, ctx) {
    ctx.point = game.modeState.points.points[0];
    game.tutorial.show(ctx.point);
  },
  tasks: [['Capture the point', (g, c) => c.point.owner === g.playerFaction]],
};

const SMOKE = {
  title: 'Mortar smoke',
  touch: 'An enemy machine gun covers the open field — crossing it in the open would be costly. A mortar team has joined you. Tap it, open <b>Orders</b> at the bottom right and tap <b>Smoke</b>, then tap the ground between your squad and the gun. Smoke blocks sight both ways for about forty seconds, and drifts with the wind. Mortars also fire on their own at enemies your side can see, but not closer than their minimum range.',
  text: 'An enemy machine gun covers the open field — crossing it in the open would be costly. A mortar team has joined you. Select it, press <kbd data-key="smoke"></kbd> (or the Smoke button at the bottom), then <b>left-click</b> on the ground between your squad and the gun. Smoke blocks sight both ways for about forty seconds, and drifts with the wind. Mortars also fire on their own at enemies your side can see, but they cannot hit anything closer than their minimum range.',
  start(game, ctx) {
    ctx.mortar = game.spawnStack('mortar', game.playerFaction, spot(game, 60, -10), facing(game), 'Mortar section');
    ctx.mg = target(game, 'mgTeam', spot(game, 250, -15), 'MG nest');
    ctx.clouds = game.smoke.clouds.length;
    game.tutorial.highlight(ctx.mortar);
  },
  tasks: [
    ['Select the mortar team', (g, c) => g.commands.selected.has(c.mortar)],
    ['Lay smoke', (g, c) => g.smoke.clouds.length > c.clouds || !!c.mortar.smokeOrder],
  ],
};

const SPOTTING = {
  title: 'Artillery and spotting',
  text: 'Mortars and guns fire on their own at any enemy your side has <b>spotted</b> — no line of sight of their own needed — but from far away their bombs scatter widely. A <b>forward observer</b> team that can see the target makes them land tight. The mortar reaches 180 m: move it up to the near ring. Then send the observers, who have just arrived, to the far ring, where they can see the machine gun. Watch how tight the bombs fall once the observers see the gun — against men dug in they pin more than they kill. Smoke blinds observers too.',
  start(game, ctx) {
    const me = game.playerFaction;
    ctx.mortar = ensure(game, 'mortar', 60, -10, 'Mortar section');
    ctx.mg = game.world.stacksOf(enemyOf(me)).find((s) => s.type.id === 'mgTeam') ?? target(game, 'mgTeam', spot(game, 250, -15), 'MG nest');
    for (const s of game.world.stacksOf(enemyOf(me))) if (s !== ctx.mg) game.removeStack(s); // the gun is the only target
    ctx.fo = game.spawnStack('observers', me, spot(game, 50, -35), facing(game), 'Observer team');
    ctx.near = spot(game, 120, -15);
    ctx.far = spot(game, 172, -25);
    ctx.rings = [game.tutorial.marker(ctx.near, 8), game.tutorial.marker(ctx.far, 8)];
    game.tutorial.highlight(ctx.fo);
  },
  tasks: [
    ['Move the mortar into the near ring', (g, c) => near(c.mortar, c.near, 10)],
    ['Move the observers into the far ring', (g, c) => near(c.fo, c.far, 10)],
    ['Bring five bombs down on the gun while the observers watch it', (g, c) => c.observedHits >= 5],
  ],
  update(game, ctx) {
    // a bomb leaves the tube (its recoil jumps) at the gun, with an observer seeing the spot
    ctx.observedHits ??= 0;
    ctx.recoil ??= new Map();
    for (const u of ctx.mortar?.units ?? []) {
      if (!u.alive || !u.stats.indirect) continue;
      const last = ctx.recoil.get(u) ?? 0;
      if (u.recoil > last + 0.5 && u.target?.stack === ctx.mg && ctx.mortar.observed(ctx.mg.centroid) < 1) ctx.observedHits++;
      ctx.recoil.set(u, u.recoil);
    }
  },
  end(game, ctx) { for (const r of ctx.rings) r.remove(); },
};

const AIR = {
  title: 'Air support',
  touch: 'For a target too tough for the guns, call the air. Open <b>Orders</b> and tap <b>Helicopter</b>, then tap the machine gun: an attack helicopter comes in from your side of the map, rockets first, then the chin gun along a line through the target. Every support power costs command points and has a cooldown — the button shows the seconds. Enemy flak and missile teams shoot back.',
  text: 'For a target too tough for the guns, call the air. Press <kbd data-key="heli"></kbd> (or the Helicopter button), then click the machine gun: an attack helicopter comes in from your side of the map, rockets first, then the chin gun along a line through the target. <kbd data-key="turnLeft"></kbd> / <kbd data-key="turnRight"></kbd> turn the run before you click. <kbd data-key="jet"></kbd> sends a jet instead: faster, harder, gone in seconds. Every support power costs command points and has a cooldown — the button shows the seconds. Enemy flak and missile teams shoot back.',
  start(game, ctx) {
    const me = game.playerFaction;
    game.air.limit[me] = undefined; // the air is open for this chapter
    game.modeState.cp[me] += 400;
    ctx.mg = game.world.stacksOf(enemyOf(me)).find((s) => s.alive) ?? target(game, 'mgTeam', spot(game, 250, -15), 'MG nest');
    ctx.sorties = game.air.sorties.length;
    game.tutorial.show(ctx.mg);
  },
  tasks: [['Call a helicopter or a jet onto the machine gun', (g, c) => g.air.sorties.some((s) => s.faction === g.playerFaction) || g.air.sorties.length > c.sorties]],
};

const RECON = {
  title: 'Recon flight',
  touch: 'You cannot hit what you cannot see. Tap <b>Recon</b> in Orders, then the ground: a fast jet makes one low photo run along the line, and every enemy near its track shows on your map for thirty seconds — your guns fire on them first. <b>Fighters</b> beside it put a patrol over a spot that shoots down enemy aircraft coming near.',
  text: 'You cannot hit what you cannot see. Press <kbd data-key="recon"></kbd> (or the Recon button), then click the ground: a fast jet makes one low photo run along the line (<kbd data-key="turnLeft"></kbd> / <kbd data-key="turnRight"></kbd> turn it), and every enemy near its track shows on your map for thirty seconds — your guns fire on them first. <kbd data-key="cap"></kbd> (Fighters) puts a patrol over a spot instead: it shoots down enemy aircraft that come near.',
  start(game, ctx) {
    game.air.limit[game.playerFaction] = undefined;
    game.modeState.cp[game.playerFaction] += 200;
    ctx.at = spot(game, 255, -15);
    game.tutorial.show(ctx.at);
  },
  tasks: [
    ['Send a recon flight over the machine gun', (g) => (g.air.readyAt[g.air.key(g.playerFaction, 'recon')] ?? 0) > 0],
    ['See what it photographed', (g) => g.world.stacksOf(enemyOf(g.playerFaction)).some((s) => s.units.some((u) => u.locatedUntil > g.time))],
  ],
};

const TRENCH = {
  title: 'Digging in',
  touch: 'A squad left in the open dies; a squad in a trench holds. Select the rifle squad, open <b>Orders</b> and tap <b>Trench</b>, then tap where it should go (the two arrows turn it; the parapet faces the enemy). The men walk over and dig — the more of them, the faster. Engineers dig three times as fast.',
  text: 'A squad left in the open dies; a squad in a trench holds. Select the rifle squad and press <kbd data-key="trench"></kbd> (or the Trench button), then click where it should go — <kbd data-key="turnLeft"></kbd> / <kbd data-key="turnRight"></kbd> turn it; the parapet faces the enemy. The men walk over and dig — the more of them, the faster. <kbd data-key="sandbags"></kbd> builds a sandbag wall instead: quicker, cover from the front only. Engineers dig three times as fast.',
  start(game, ctx) {
    game.modeState.cp[game.playerFaction] += 120;
    game.tutorial.highlight(ctx.squad);
  },
  tasks: [['Dig a trench', (g) => built(g, 'trench')]],
};

const OBSTACLES = {
  title: 'Wire and mines',
  touch: 'Obstacles shape where the enemy can go. <b>Wire</b> slows infantry to a crawl (tanks flatten it); a <b>minefield</b> is invisible to the enemy until the first blast, and your own men know the lanes. Put both on the approach in front of your trench: <b>Wire</b> and <b>Mines</b> in Orders.',
  text: 'Obstacles shape where the enemy can go. <b>Wire</b> (<kbd data-key="wire"></kbd>) slows infantry to a crawl — tanks flatten it; a <b>minefield</b> (<kbd data-key="mines"></kbd>) is invisible to the enemy until the first blast, and your own men know the lanes. Put both on the approach in front of your trench.',
  start(game) { game.modeState.cp[game.playerFaction] += 100; },
  tasks: [
    ['Lay wire', (g) => built(g, 'wire')],
    ['Lay a minefield', (g) => built(g, 'mines')],
  ],
};

const CANCEL = {
  title: 'Changed your mind?',
  touch: 'A job placed by mistake can be called off while it isn\'t finished: select the squad and tap <b>Cancel job</b> in Orders. The blueprint goes and the command points come back. Try it: order some sandbags, then cancel them.',
  text: 'A job placed by mistake can be called off while it isn\'t finished: select the squad and press <kbd data-key="cancelJob"></kbd> (or the Cancel job button). The blueprint goes and the command points come back. Try it: order some sandbags (<kbd data-key="sandbags"></kbd>), then cancel them.',
  start(game, ctx) {
    game.modeState.cp[game.playerFaction] += 20;
    ctx.off = game.bus.on('order', ({ kind } = {}) => { if (kind === 'cancel') ctx.cancelled = true; });
  },
  update(game, ctx) { if (game.construction.sites.some((s) => s.kind === 'sandbags' && s.faction === game.playerFaction)) ctx.placed = true; },
  tasks: [
    ['Order sandbags', (g, c) => c.placed],
    ['Cancel the job', (g, c) => c.placed && c.cancelled && !g.construction.sites.some((s) => s.kind === 'sandbags')],
  ],
  end(game, ctx) { ctx.off(); },
};

const HOUSE = {
  title: 'Houses',
  touch: 'Stone walls stop bullets. With the squad selected, <b>tap a house</b>: the men go in and take the windows facing the enemy — hold, then drag to choose which side they watch. <b>Leave building</b> in Orders brings them out. A house can be shelled into rubble, so don\'t sit in one under artillery.',
  text: 'Stone walls stop bullets. With the squad selected, <b>right-click a house</b>: the men go in and take the windows facing the enemy — right-drag on it to choose which side they watch. <kbd data-key="leave"></kbd> brings them out. A house can be shelled into rubble, so don\'t sit in one under artillery.',
  start(game, ctx) {
    const sq = ctx.squad.centroid;
    ctx.house = game.buildings.list.filter((b) => !b.collapsed).sort((a, b) => Math.hypot(a.x - sq.x, a.z - sq.z) - Math.hypot(b.x - sq.x, b.z - sq.z))[0];
    if (ctx.house) ctx.ring = game.tutorial.marker(ctx.house, 10);
  },
  tasks: [['Occupy the marked house', (g, c) => !c.house || !!c.squad.garrison]],
  end(game, ctx) { ctx.ring?.remove(); },
};

const ENGINEERS = {
  title: 'Engineers',
  touch: 'The enemy has mined the track ahead — you can\'t see it. <b>Engineers</b> find enemy minefields from about 16 m and set them off far less often. Walk them toward the ring: when the field shows, open <b>Orders</b>, tap <b>Clear</b> and tap the minefield. They also cut wire, and on maps with a river they can blow a bridge.',
  text: 'The enemy has mined the track ahead — you can\'t see it. <b>Engineers</b> find enemy minefields from about 16 m and set them off far less often. Walk them toward the ring: when the field shows, select them, press <kbd data-key="engineer"></kbd> and click the minefield. They also cut wire, and on maps with a river they can blow a bridge.',
  start(game, ctx) {
    const me = game.playerFaction;
    ctx.eng = game.spawnStack('engineers', me, spot(game, 70, 20), facing(game), 'Engineer section');
    ctx.at = spot(game, 150, 25);
    const site = game.construction.place('mines', ctx.at.x, ctx.at.z, 0, enemyOf(me), null, { force: true });
    if (site) game.construction.finish(site);
    ctx.field = game.construction.obstacles.find((ob) => ob.site === site);
    ctx.ring = game.tutorial.marker(ctx.at, 12);
    game.tutorial.highlight(ctx.eng);
  },
  tasks: [
    ['Find the minefield with the engineers', (g, c) => !c.field || c.field.revealed],
    ['Clear it', (g, c) => !c.field || !g.construction.obstacles.includes(c.field)],
  ],
  end(game, ctx) { ctx.ring.remove(); },
};

const REINFORCE = {
  title: 'Reinforcements',
  touch: 'Battles are won with what you bring in. You earn <b>command points</b> over time (more for every point you hold) and spend them on reinforcements: tap <b>Reinforcements</b> at the bottom right, beside Orders, where your points and stacks are counted. New units drive in from your base. You have been given enough for a tank.',
  text: 'Battles are won with what you bring in. You earn <b>command points</b> over time (more for every point you hold) and spend them on reinforcements: press <kbd data-key="reinforce"></kbd> or click <b>Reinforcements</b> at the bottom right, beside Orders, where your points and stacks are counted. New units drive in from your base. You have been given enough for a tank.',
  start(game, ctx) {
    game.modeState.cp[game.playerFaction] += 450;
    ctx.had = new Set(game.world.stacksOf(game.playerFaction));
  },
  tasks: [['Call in a tank', (g, c) => g.world.stacksOf(g.playerFaction).some((s) => !c.had.has(s) && s.type.category === 'armour')]],
};

const VEHICLE_SMOKE = {
  title: 'Smoke launchers',
  touch: 'Tanks and IFVs carry smoke grenade launchers: a wall of smoke in front of them in a second, to break line of sight and back away. They pop it by themselves when an anti-tank round hits, but only a few salvos are carried. Select the tank and tap <b>Smoke</b> in Orders.',
  text: 'Tanks and IFVs carry smoke grenade launchers: a wall of smoke in front of them in a second, to break line of sight and back away. They pop it by themselves when an anti-tank round hits, but only a few salvos are carried. Select the tank and press <kbd data-key="smoke"></kbd>.',
  start(game, ctx) {
    ctx.tank = mineOf(game, (s) => s.alive && s.type.category === 'armour' && s.smokeLeft > 0) ?? game.spawnStack('tank', game.playerFaction, spot(game, 60, 15), facing(game), 'Tank platoon');
    ctx.left = ctx.tank.smokeLeft;
    game.tutorial.highlight(ctx.tank);
  },
  tasks: [['Pop the tank\'s smoke', (g, c) => c.tank.smokeLeft < c.left]],
};

const IFV = {
  title: 'Mechanised infantry',
  touch: 'An <b>IFV</b> carries a rifle squad fast and under armour, then supports it with its cannon. One has arrived with a squad inside. Select it and tap <b>Unload</b> in Orders: the men climb out behind it. Then select the new squad and <b>tap the IFV</b> to put them back in.',
  text: 'An <b>IFV</b> carries a rifle squad fast and under armour, then supports it with its cannon. One has arrived with a squad inside. Select it and press <kbd data-key="unload"></kbd>: the men climb out behind it. Then select the new squad and <b>right-click the IFV</b> to put them back in.',
  start(game, ctx) {
    ctx.ifv = game.spawnStack('ifv', game.playerFaction, spot(game, 55, 30), facing(game), 'Mech platoon');
    game.tutorial.highlight(ctx.ifv);
  },
  update(game, ctx) { if (ctx.ifv.passengers === 0) ctx.out = true; },
  tasks: [
    ['Unload the squad', (g, c) => c.out],
    ['Put it back in', (g, c) => c.out && c.ifv.passengers > 0],
  ],
};

const REPAIR = {
  title: 'Repairs',
  touch: 'Damaged vehicles don\'t have to be lost. A <b>recovery vehicle</b> mends any friendly vehicle parked beside it, and gets mine-blown tracks moving again. One of your tanks has taken hits (its health bar is short): move the recovery vehicle next to it — within 15 m — and wait. Left alone, recovery vehicles and ambulances go looking for work by themselves.',
  text: 'Damaged vehicles don\'t have to be lost. A <b>recovery vehicle</b> mends any friendly vehicle parked beside it, and gets mine-blown tracks moving again. One of your tanks has taken hits (its health bar is short): move the recovery vehicle next to it — within 15 m — and wait. Left alone, recovery vehicles and ambulances go looking for work by themselves.',
  start(game, ctx) {
    ctx.tank = mineOf(game, (s) => s.alive && s.type.category === 'armour') ?? game.spawnStack('tank', game.playerFaction, spot(game, 60, 15), facing(game), 'Tank platoon');
    ctx.hurt = ctx.tank.units.find((u) => u.alive);
    ctx.hurt.hp = ctx.hurt.maxHp * 0.45; // one of the platoon has taken hits
    ctx.tank.ai.halt();
    ctx.rec = game.spawnStack('recovery', game.playerFaction, spot(game, 20, 60), facing(game), 'Recovery');
    game.tutorial.highlight(ctx.rec);
  },
  tasks: [['Repair the damaged tank', (g, c) => !c.hurt.alive || c.hurt.hp >= c.hurt.maxHp * 0.95]],
};

const CONTROL = {
  title: 'Direct control',
  touch: 'Any of your stacks can be fought in person. Select the rifle squad and tap <b>Take control</b> (or tap the squad twice). The stick on the left moves you — push it to the rim to sprint — drag on the right half of the screen to aim, and hold <b>Fire</b>. Reload, Crouch, Prone and Next man are next to it; <b>Command</b> takes you back up.',
  text: 'Any of your stacks can be fought in person. Select the rifle squad and press <kbd data-key="toggleView"></kbd> (or double-click it). Then <kbd data-key="up"></kbd><kbd data-key="left"></kbd><kbd data-key="down"></kbd><kbd data-key="right"></kbd> move, the mouse aims, the <b>left button</b> fires, <kbd data-key="reload"></kbd> reloads, <kbd data-key="crouch"></kbd> crouches and <kbd data-key="prone"></kbd> goes prone. <kbd data-key="nextMember"></kbd> jumps to the next man. The rest of the squad keeps fighting around you.',
  start(game, ctx) { ctx.shots = 0; ctx.timer = 0; },
  update(game, ctx) {
    const p = game.player;
    if (p.active && p.fireTimer > ctx.timer + 0.01) ctx.shots++; // the fire timer only climbs on a shot
    ctx.timer = p.fireTimer;
    if (p.active) ctx.took = true;
  },
  tasks: [
    ['Take control of a soldier', (g, c) => c.took],
    ['Fire five shots', (g, c) => c.shots >= 5],
    ['Go back to the command view', (g, c) => c.took && c.shots >= 5 && !g.player.active],
  ],
};

const OFFICER = {
  title: 'Officers',
  text: 'Look at your squad\'s label: <b>LT</b> marks its platoon leader. While he lives, his men — and every friendly stack within about 45 m — hold their nerve longer, rally faster and react quicker. When he falls the label strikes him through, the squad is shaken and slower than one that never had him. Keep him out of the first rank, and go for theirs. Move the squad next to the mortar team so they both serve under him.',
  start(game, ctx) {
    ctx.mortar = ensure(game, 'mortar', 110, 60, 'Mortar section'); // far enough that the squad has to go to it
    game.tutorial.show(ctx.mortar);
  },
  tasks: [['Bring the squad within 45 m of the mortar team', (g, c) => c.mortar.led && c.squad.officerAlive]],
};

const AMBUSH = {
  title: 'The ambush',
  touch: 'A unit nobody has spotted yet fires its first volley with far more punch — more hits, and the enemy goes to ground. Men lying still in cover are hard to see. Move the squad into the ring at the hedge and stay put: an enemy patrol is coming up the field. Let them come close; your men open fire on their own when they see them.',
  text: 'A unit nobody has spotted yet fires its first volley with far more punch — more hits, and the enemy goes to ground. Men lying still in cover are hard to see. Move the squad into the ring at the hedge and stay put: an enemy patrol is coming up the field. Let them come close; your men open fire on their own when they see them.',
  start(game, ctx) {
    ctx.at = spot(game, 120, 10);
    ctx.ring = game.tutorial.marker(ctx.at, 9);
    ctx.ambushAt = ctx.squad.ambushAt;
  },
  update(game, ctx, dt) {
    if (ctx.patrol || !near(ctx.squad, ctx.at, 11) || ctx.squad.ai.state === AIState.MOVE) return;
    ctx.waitT = (ctx.waitT ?? 0) + dt;
    if (ctx.waitT < 1) return; // settled in first
    const from = spot(game, 260, 10);
    ctx.patrol = game.spawnStack('rifles', enemyOf(game.playerFaction), from, game.playerFaction === 'nato' ? 0 : Math.PI, 'Patrol');
    for (const u of ctx.patrol.units) u.damageMult = 0;
    ctx.patrol.ai.moveTo(spot(game, 150, 10), { ordered: false });
    game.bus.emit('toast', 'Enemy patrol coming up the field…');
  },
  tasks: [
    ['Get into the ring and wait', (g, c) => !!c.patrol],
    ['Spring the ambush', (g, c) => c.squad.ambushAt != null && c.squad.ambushAt !== c.ambushAt],
  ],
  end(game, ctx) { ctx.ring.remove(); },
};

// ------------------------------------------------------------------ 1945

/** A 1985 step told for 1945: the same tasks and set-up, its own words. */
const as1945 = (step, o) => Object.assign(Object.create(step), o);

const AIR_1945 = as1945(AIR, {
  touch: 'For a target too tough for the guns, call the air. Open <b>Orders</b> and tap <b>Strike</b>, then tap the machine gun: a fighter-bomber comes in from your side of the map — rockets or a bomb first, then its guns along a line through the target. Every support power costs command points and has a cooldown — the button shows the seconds. Enemy flak shoots back.',
  text: 'For a target too tough for the guns, call the air. Press <kbd data-key="jet"></kbd> (or the Strike button), then click the machine gun: a fighter-bomber comes in from your side of the map — rockets or a bomb first, then its guns along a line through the target. <kbd data-key="turnLeft"></kbd> / <kbd data-key="turnRight"></kbd> turn the run before you click. Every support power costs command points and has a cooldown — the button shows the seconds. Enemy flak shoots back.',
  tasks: [['Call a fighter-bomber onto the machine gun', AIR.tasks[0][1]]],
});
const RECON_1945 = as1945(RECON, {
  touch: RECON.touch.replace('a fast jet', 'a recon plane'),
  text: RECON.text.replace('a fast jet', 'a recon plane'),
});
const VEHICLE_SMOKE_1945 = as1945(VEHICLE_SMOKE, {
  title: 'Smoke dischargers',
  touch: 'Many tanks of 1945 carry a smoke discharger: one wall of smoke in front of them, to break line of sight and back away. They fire it by themselves when an anti-tank round hits — and there is only the one. Select the tank and tap <b>Smoke</b> in Orders.',
  text: 'Many tanks of 1945 carry a smoke discharger: one wall of smoke in front of them, to break line of sight and back away. They fire it by themselves when an anti-tank round hits — and there is only the one. Select the tank and press <kbd data-key="smoke"></kbd>.',
});
const IFV_1945 = as1945(IFV, {
  title: 'Half-tracks',
  touch: 'A <b>half-track</b> carries a squad fast and behind a little armour, then backs it up with its machine gun. One has arrived with a squad inside. Select it and tap <b>Unload</b> in Orders: the men climb out. Then select the new squad and <b>tap the half-track</b> to put them back in.',
  text: 'A <b>half-track</b> carries a squad fast and behind a little armour, then backs it up with its machine gun. One has arrived with a squad inside. Select it and press <kbd data-key="unload"></kbd>: the men climb out. Then select the new squad and <b>right-click the half-track</b> to put them back in.',
});

const STOP_TO_FIRE = {
  title: 'Stop to fire',
  touch: 'Most tanks of 1945 cannot aim on the move: the gun fires only while the tank stands still. (The Sherman, with its gyrostabiliser, is the exception.) A Pershing has joined you, and an enemy tank waits up the field. Send the Pershing into the ring: it holds its fire while it drives, and opens up the moment it stops. In battle: cover to cover, halt, fire, move on.',
  text: 'Most tanks of 1945 cannot aim on the move: the gun fires only while the tank stands still. (The Sherman, with its gyrostabiliser, is the exception.) A Pershing has joined you, and an enemy tank waits up the field. Send the Pershing into the ring: it holds its fire while it drives, and opens up the moment it stops. In battle: cover to cover, halt, fire, move on.',
  start(game, ctx) {
    ctx.tank = game.spawnStack('heavyTank', game.playerFaction, spot(game, 50, 45), facing(game), 'Pershing');
    ctx.enemy = target(game, 'tank', spot(game, 195, 45), 'Enemy tank'); // (70 m past the ring: buttoned up, a tank sees 80 m)
    ctx.at = spot(game, 125, 45);
    ctx.ring = game.tutorial.marker(ctx.at, 9);
    ctx.recoil = new Map();
    game.tutorial.highlight(ctx.tank);
  },
  update(game, ctx) {
    ctx.reached ||= near(ctx.tank, ctx.at, 11);
    for (const u of ctx.tank.units) { // a shot: the gun's recoil jumps
      if (ctx.reached && u.alive && u.recoil > (ctx.recoil.get(u) ?? 0) + 0.05) ctx.fired = true;
      ctx.recoil.set(u, u.recoil ?? 0);
    }
  },
  tasks: [
    ['Drive the Pershing into the ring', (g, c) => c.reached],
    ['Let it halt and fire on the enemy tank', (g, c) => c.fired || !c.enemy.alive],
  ],
  end(game, ctx) { ctx.ring.remove(); },
};

const PARADROP = {
  title: 'Paradrop',
  touch: 'In 1945 the air assault comes by parachute. Open <b>Orders</b>, tap <b>Paradrop</b>, then tap the ring: a transport flies over and the stick jumps. The men come down wherever the wind puts them, then gather on their leader. They land light — drop them where the enemy is not. Transports are slow, and flak and fighters love them.',
  text: 'In 1945 the air assault comes by parachute. Press <kbd data-key="lift"></kbd> (or the Paradrop button), then click the ring: a transport flies over and the stick jumps. The men come down wherever the wind puts them, then gather on their leader. They land light — drop them where the enemy is not. Transports are slow, and flak and fighters love them.',
  start(game, ctx) {
    const me = game.playerFaction;
    game.air.limit[me] = undefined;
    game.modeState.cp[me] += 320;
    ctx.had = new Set(game.world.stacksOf(me));
    ctx.at = spot(game, 190, 70);
    ctx.ring = game.tutorial.marker(ctx.at, 14);
  },
  update(game, ctx) { if (game.air.sorties.some((s) => s.faction === game.playerFaction && s.kind === 'lift')) ctx.called = true; },
  tasks: [
    ['Call a paradrop onto the ring', (g, c) => c.called],
    ['Get the paratroopers on the ground', (g, c) => g.world.stacksOf(g.playerFaction).some((s) => !c.had.has(s) && s.type.id === 'airAssault')],
  ],
  end(game, ctx) { ctx.ring.remove(); },
};

const TOT = {
  title: 'Time on Target',
  touch: 'The US Army\'s artillery trick: every gun and mortar in range fires one round, each timed so that all the shells land in the same second — no warning, no time to get down. A mortar section and a battery of M7 Priests are with you. Tap <b>Time on Target</b> in Orders, then tap the machine gun.',
  text: 'The US Army\'s artillery trick: every gun and mortar in range fires one round, each timed so that all the shells land in the same second — no warning, no time to get down. A mortar section and a battery of M7 Priests are with you. Press <kbd data-key="barrage"></kbd> (or the Time on Target button), then click the machine gun.',
  start(game, ctx) {
    const me = game.playerFaction;
    game.modeState.cp[me] += 150;
    ensure(game, 'mortar', 120, -15, 'Mortar section');
    game.spawnStack('artillery', me, spot(game, 20, 15), facing(game), 'Priest battery');
    ctx.mg = game.world.stacksOf(enemyOf(me)).find((s) => s.alive && s.type.id === 'mgTeam') ?? target(game, 'mgTeam', spot(game, 250, -15), 'MG nest');
    game.tutorial.show(ctx.mg);
  },
  tasks: [['Fire a Time on Target on the machine gun', (g) => (g.barrage.readyAt[g.playerFaction] ?? 0) > 0]],
};

// ------------------------------------------------------------------ 1806

/** Formed and finished forming: the men stand in their new places. */
const formed = (s, form) => s?.alive && s.form === form && s.world.time >= s.formedAt;
/** A battery that has fired since it was set up (a gun reloads after each round). */
const gunFired = (s) => s?.units.some((u) => u.alive && !u.towing && u.reloadT > 0);
const me = (g) => g.playerFaction;
/** How far `s` stands ahead of its base (spot's `ahead`) and to the side. */
function placeOf(game, s) {
  const base = game.map.bases[game.playerFaction], f = -Math.sign(base.z) || 1;
  return { ahead: (s.centroid.z - base.z) * f, side: (base.x - s.centroid.x) * f };
}

const SELECT_1806 = as1945(SELECT, {
  touch: 'Your troops fight in <b>companies</b> — some two dozen men, a squadron of horse, a battery of two guns. <b>Tap</b> your line company to select it. To pick up several, hold a finger still for a moment, then drag a box around them.',
  text: 'Your troops fight in <b>companies</b> — some two dozen men, a squadron of horse, a battery of two guns. <b>Left-click</b> your line company to select it (or drag a box around it). <kbd data-key="selectAll"></kbd> selects everything you have.',
  tasks: [['Select the line company', SELECT.tasks[0][1]]],
});
const MOVE_1806 = as1945(MOVE, {
  touch: 'With the company selected, <b>tap</b> the ground to send it there. It marches in its formation and halts in it.',
  text: 'With the company selected, <b>right-click</b> on the ground to send it there. It marches in its formation and halts in it.',
  tasks: [['Move the company into the marked ring', MOVE.tasks[0][1]]],
});
const FACE_1806 = as1945(FACE, {
  touch: 'A line fires to its front, so where it faces is everything. <b>Hold</b> a finger on the ground, then <b>drag</b>: the arrow shows the way the company will face when it gets there.',
  text: 'A line fires to its front, so where it faces is everything. <b>Right-click and drag</b> on the ground: the arrow shows the way the company will face when it gets there. A right-drag right next to the company just turns it.',
  tasks: [['Move the company with a right-drag, choosing its facing', FACE.tasks[0][1]]],
});
const CONTACT_1806 = as1945(CONTACT, {
  touch: 'An enemy company has come up ahead. Muskets reach little more than a hundred paces: your men wait until the enemy is in range, then the company fires <b>together</b>, a volley, and reloads behind its smoke. To pick the target, select the company and <b>tap the enemy</b>. The amber bar over a company is its nerve wavering — a company that breaks runs.',
  text: 'An enemy company has come up ahead. Muskets reach little more than a hundred paces: your men wait until the enemy is in range, then the company fires <b>together</b>, a volley, and reloads behind its smoke. To pick the target, select the company and <b>right-click the enemy</b>. The amber bar over a company is its nerve wavering — a company that breaks runs.',
  start(game, ctx) {
    ctx.enemy = target(game, 'rifles', spot(game, 150, -60), 'Prussian detachment');
    ctx.enemy.morale = 0.7; // (a detachment out front, not a formed company: it breaks sooner)
    ctx.alive0 = ctx.enemy.aliveCount;
    game.tutorial.highlight(ctx.enemy);
    game.bus.emit('toast', 'Enemy infantry ahead!');
  },
  tasks: [
    ['Order an attack on the enemy company', CONTACT.tasks[0][1]],
    ['Break it', (g, c) => CONTACT.tasks[1][1](g, c) || c.enemy.aliveCount <= c.alive0 / 2],
  ],
});
const POINT_1806 = as1945(POINT, {
  text: 'Battles are fought over <b>control points</b> — villages, heights, crossroads. Only foot can take one: men inside the ring swing it toward your side — the more of them, the faster — and nobody gains it while both sides are inside. Cavalry rides through but holds nothing. Move the company into the ring and hold it until the flag is yours.',
});

const COLUMN = {
  title: 'Column of march',
  touch: 'A company stands in one of four <b>formations</b>. The column — six files deep — marches faster and hits harder in a charge, but only its front rank can fire. Select the company and tap <b>Column</b> in Orders (the men take a few seconds to re-form, and can\'t fire meanwhile), then march it into the ring.',
  text: 'A company stands in one of four <b>formations</b>. The column — six files deep — marches faster and hits harder in a charge, but only its front rank can fire. Select the company and press <kbd data-key="formation"></kbd> until it shows Column (or the Column button in Orders) — the men take a few seconds to re-form, and can\'t fire meanwhile — then march it into the ring.',
  start(game, ctx) {
    ctx.at = spot(game, 160, 40);
    ctx.ring = game.tutorial.marker(ctx.at, 10);
    game.tutorial.highlight(ctx.squad);
  },
  tasks: [
    ['Form column', (g, c) => formed(c.squad, 'column')],
    ['March the column into the ring', (g, c) => c.squad.form === 'column' && near(c.squad, c.at, 12)],
  ],
  end(game, ctx) { ctx.ring.remove(); },
};

const LINE = {
  title: 'Line and volley',
  touch: 'To fight, deploy into <b>line</b>: two ranks, every musket firing — the most fire a company can give. An enemy company is coming on. Tap <b>Line</b> in Orders and let them come into range: your men fire by volleys on their own. (<b>Skirmish</b> order, the fourth, is for light troops: a loose screen in hedges and woods, each man firing when ready.)',
  text: 'To fight, deploy into <b>line</b>: two ranks, every musket firing — the most fire a company can give. An enemy company is coming on. Press <kbd data-key="formation"></kbd> until the company shows Line (or the Line button) and let them come into range: your men fire by volleys on their own. (<b>Skirmish</b> order, the fourth, is for light troops: a loose screen in hedges and woods, each man firing when ready.)',
  start(game, ctx) {
    ctx.enemy = target(game, 'rifles', spot(game, 270, 40), 'Prussian company');
    ctx.enemy.ai.moveTo(spot(game, 245, 40), { hold: true, ordered: false });
    ctx.alive0 = ctx.enemy.aliveCount;
    game.tutorial.highlight(ctx.enemy);
  },
  tasks: [
    ['Deploy into line', (g, c) => formed(c.squad, 'line')],
    ['Bring the enemy under your volleys', (g, c) => c.squad.form === 'line' && (c.enemy.aliveCount < c.alive0 || !c.enemy.alive)],
  ],
};

const SQUARE = {
  title: 'Form square!',
  touch: 'Enemy <b>cavalry</b>! Horse catches a line or a column in the open and rides it down. The answer is the <b>square</b>: the men face out on all sides behind their bayonets, and horses will not go into it. Tap <b>Square</b> in Orders — now, it takes a few seconds. (A square is a fat target for guns: break it up once the horse has gone.)',
  text: 'Enemy <b>cavalry</b>! Horse catches a line or a column in the open and rides it down. The answer is the <b>square</b>: the men face out on all sides behind their bayonets, and horses will not go into it. Press <kbd data-key="formation"></kbd> until it shows Square (or the Square button) — now, it takes a few seconds. (A square is a fat target for guns: break it up once the horse has gone.)',
  start(game, ctx) {
    ctx.cav = target(game, 'tank', spot(game, 330, -40), 'Prussian cuirassiers');
    game.tutorial.highlight(ctx.cav);
    game.bus.emit('toast', 'Cavalry!');
  },
  update(game, ctx) {
    if (!ctx.charged && formed(ctx.squad, 'square')) ctx.charged = ctx.cav.startCharge(ctx.squad); // (they wait for you: they charge the square)
  },
  tasks: [
    ['Form square', (g, c) => formed(c.squad, 'square') || c.charged],
    ['Let the charge break on the square', (g, c) => c.charged && !c.cav.charging],
  ],
};

const BAYONET = {
  title: 'The bayonet',
  touch: 'A shaken enemy is finished with the <b>bayonet</b>. Form column again — it hits hardest — then select the company and tap <b>Charge!</b>: the men go in at the run, without firing, and the shock as they close breaks the enemy\'s nerve.',
  text: 'A shaken enemy is finished with the <b>bayonet</b>. Form column again — it hits hardest — then select the company and press <kbd data-key="charge"></kbd> (or Charge! in Orders): the men go in at the run, without firing, and the shock as they close breaks the enemy\'s nerve.',
  start(game, ctx) {
    const p = placeOf(game, ctx.squad);
    ctx.enemy = target(game, 'rifles', spot(game, p.ahead + 70, p.side), 'Shaken company'); // (within a charge's reach)
    ctx.enemy.morale = 0.55;
    game.tutorial.highlight(ctx.enemy);
  },
  update(game, ctx) { if (ctx.squad.charging) ctx.went = true; if (ctx.squad.charging?.shocked) ctx.shocked = true; },
  tasks: [
    ['Charge with the bayonet', (g, c) => c.went],
    ['Close with the enemy', (g, c) => c.shocked || !c.enemy.alive || c.enemy.ai.state === AIState.RETREAT],
  ],
};

const CAVALRY = {
  title: 'The cavalry charge',
  touch: 'A squadron of <b>cuirassiers</b> has joined you. Cavalry is fast, sees far, and its charge wrecks infantry caught out of square — but horses are big targets and won\'t face a square or a battery\'s canister. An enemy line stands in the open: select the squadron and tap <b>Charge!</b> In battle, wait for the moment: a line busy with your foot, guns limbered, a square broken by your guns.',
  text: 'A squadron of <b>cuirassiers</b> has joined you. Cavalry is fast, sees far, and its charge wrecks infantry caught out of square — but horses are big targets and won\'t face a square or a battery\'s canister. An enemy line stands in the open: select the squadron and press <kbd data-key="charge"></kbd> (or Charge! in Orders). In battle, wait for the moment: a line busy with your foot, guns limbered, a square broken by your guns.',
  start(game, ctx) {
    ctx.cav = game.spawnStack('tank', me(game), spot(game, 60, -70), facing(game), 'Cuirassiers');
    ctx.enemy = target(game, 'rifles', spot(game, 200, -70), 'Prussian line');
    game.tutorial.highlight(ctx.cav);
  },
  update(game, ctx) { if (ctx.cav.charging) ctx.went = true; if (ctx.cav.charging?.shocked) ctx.shocked = true; },
  tasks: [
    ['Charge the enemy line', (g, c) => c.went],
    ['Ride into it', (g, c) => c.shocked || !c.enemy.alive || c.enemy.ai.state === AIState.RETREAT],
  ],
};

const HORSES = {
  title: 'Horse and rider',
  text: 'A trooper can fall and leave his horse running loose — it bolts from the firing, then wanders the field, and can be shot in the crossfire. If the horse falls, the rider fights on foot; a dismounted man near a loose horse of his side climbs back into the saddle. A squadron that has lost its horses is finished as cavalry: bring it back out of the fight. Select the squadron to go on.',
  start(game, ctx) { ctx.cav = mineOf(game, (s) => s.alive && s.stats.cavalry && !s.stats.loose); game.tutorial.highlight(ctx.cav); },
  tasks: [['Select the squadron', (g, c) => !c.cav || g.commands.selected.has(c.cav)]],
};

const GUNS = {
  title: 'The guns',
  touch: 'A <b>foot battery</b> has come up, its guns hitched behind the horses. Move it into the ring: when it halts the gunners unhitch and lay the guns, which takes a while — they can\'t fire until it\'s done, and must limber up again to move. At long range they fire roundshot that skips through the ranks; close in, <b>canister</b>, a spray of balls that sweeps the ground in front. An enemy company stands up the field.',
  text: 'A <b>foot battery</b> has come up, its guns hitched behind the horses. Move it into the ring: when it halts the gunners unhitch and lay the guns, which takes a while — they can\'t fire until it\'s done, and must limber up again to move. At long range they fire roundshot that skips through the ranks; close in, <b>canister</b>, a spray of balls that sweeps the ground in front. An enemy company stands up the field.',
  start(game, ctx) {
    ctx.guns = ensure(game, 'artillery', 30, 70, 'Foot battery');
    ctx.at = spot(game, 110, 70);
    ctx.ring = game.tutorial.marker(ctx.at, 10);
    ctx.enemy = target(game, 'rifles', spot(game, 380, 70), 'Prussian company');
    game.tutorial.highlight(ctx.guns);
  },
  tasks: [
    ['Bring the battery into the ring', (g, c) => near(c.guns, c.at, 12)],
    ['Unlimber and open fire', (g, c) => gunFired(c.guns)],
  ],
  end(game, ctx) { ctx.ring.remove(); },
};

const BATTERY = {
  title: 'Grand battery',
  touch: 'The support powers of 1806 are troops, not aircraft. The <b>grand battery</b>: every gun of yours that can reach the spot fires three rounds on it at once — the blow that opens a hole in a line. Open <b>Orders</b>, tap <b>Grand battery</b>, then tap the enemy company. Support powers cost command points and need time to come round again.',
  text: 'The support powers of 1806 are troops, not aircraft. The <b>grand battery</b>: every gun of yours that can reach the spot fires three rounds on it at once — the blow that opens a hole in a line. Press <kbd data-key="barrage"></kbd> (or the Grand battery button), then click the enemy company. Support powers cost command points and need time to come round again.',
  start(game, ctx) {
    game.modeState.cp[me(game)] += 130;
    ctx.guns = ensure(game, 'artillery', 110, 70, 'Foot battery');
    ctx.enemy = game.world.stacksOf(enemyOf(me(game))).find((s) => s.alive && s.type.id === 'rifles') ?? target(game, 'rifles', spot(game, 380, 70), 'Prussian company');
    game.tutorial.show(ctx.enemy);
  },
  tasks: [['Fire the grand battery on the enemy', (g) => g.powers.cooldownLeft(me(g), 'battery') > 0]],
};

const RESERVE = {
  title: 'The cavalry reserve',
  touch: 'The <b>cavalry charge</b>: a squadron of heavy horse from the reserve rides in from behind your lines, charges the enemy nearest the spot you pick, and rides off the field again. Tap <b>Cavalry charge</b> in Orders, then tap the enemy company. Don\'t send it at a square.',
  text: 'The <b>cavalry charge</b>: a squadron of heavy horse from the reserve rides in from behind your lines, charges the enemy nearest the spot you pick, and rides off the field again. Press <kbd data-key="jet"></kbd> (or the Cavalry charge button), then click the enemy company. Don\'t send it at a square.',
  start(game, ctx) {
    game.modeState.cp[me(game)] += 270;
    ctx.enemy = game.world.stacksOf(enemyOf(me(game))).find((s) => s.alive && s.type.id === 'rifles') ?? target(game, 'rifles', spot(game, 300, 0), 'Prussian company');
    game.tutorial.show(ctx.enemy);
  },
  tasks: [['Send in the cavalry reserve', (g) => g.powers.cooldownLeft(me(g), 'reserve') > 0]],
};

const GUARD = {
  title: 'The Guard',
  touch: 'Once a battle you can send in <b>the Guard</b>: two veteran companies of the reserve march up from your base to the spot. They are the best troops you have, and you get them once — keep them for the moment that decides the day. Tap <b>The Guard</b> in Orders, then tap the ring.',
  text: 'Once a battle you can send in <b>the Guard</b>: two veteran companies of the reserve march up from your base to the spot. They are the best troops you have, and you get them once — keep them for the moment that decides the day. Press <kbd data-key="lift"></kbd> (or The Guard button), then click the ring.',
  start(game, ctx) {
    game.modeState.cp[me(game)] += 360;
    ctx.at = spot(game, 180, -40);
    ctx.ring = game.tutorial.marker(ctx.at, 14);
  },
  tasks: [
    ['Call up the Guard', (g) => g.powers.cooldownLeft(me(g), 'guard') > 0],
    ['Bring them to the ring', (g, c) => g.world.stacksOf(me(g)).some((s) => s.type.id === 'guard' && near(s, c.at, 30))],
  ],
  end(game, ctx) { ctx.ring.remove(); },
};

const CONTROL_1806 = as1945(CONTROL, {
  touch: CONTROL.touch.replace('the rifle squad', 'the line company'),
  text: CONTROL.text.replace('the rifle squad', 'the line company').replace('The rest of the squad keeps fighting around you.', 'The rest of the company keeps fighting around you. A musket takes a long while to load: make each ball count.'),
  tasks: [
    ['Take control of a soldier', CONTROL.tasks[0][1]],
    ['Fire two shots', (g, c) => c.shots >= 2],
    ['Go back to the command view', (g, c) => c.took && c.shots >= 2 && !g.player.active],
  ],
});

// ------------------------------------------------------------------ chapters

export const CHAPTERS = [
  { id: 'basics', title: 'Basics', blurb: 'The camera, selecting and moving, facing and cover, a first firefight, taking ground.', steps: [CAMERA, SELECT, MOVE, FACE, CONTACT, POINT],
    outro: 'That is the core of command. Next: <b>Fire support</b> — what to do about a machine gun you can\'t walk up to.' },
  { id: 'fire', title: 'Fire support', blurb: 'Mortar smoke, artillery and forward observers, helicopters and jets, recon flights.', steps: [SMOKE, SPOTTING, AIR, RECON],
    outro: 'Fire support wins fights before your men walk into them. Next: <b>Digging in</b> — making ground hard to take.' },
  { id: 'fortify', title: 'Digging in', blurb: 'Trenches, wire and mines, calling off a job, fighting from houses, engineers clearing a minefield.', steps: [TRENCH, OBSTACLES, CANCEL, HOUSE, ENGINEERS],
    outro: 'A dug-in squad behind wire costs the enemy dearly. Next: <b>Armour and transport</b>.' },
  { id: 'armour', title: 'Armour and transport', blurb: 'Reinforcements, smoke launchers, carrying infantry in IFVs, repairs.', steps: [REINFORCE, VEHICLE_SMOKE, IFV, REPAIR],
    outro: 'Armour hits hard and moves fast — but it is blind up close, so keep infantry with it. Last: <b>Fighting in person</b>.' },
  { id: 'tactics', title: 'Fighting in person', blurb: 'Direct control of a soldier, officers, the ambush.', steps: [CONTROL, OFFICER, AMBUSH],
    outro: 'That is boot camp done. In a real battle the enemy plays the same game: it takes points, digs in, scouts, shells what its observers see and attacks from the flank under smoke. Try a <b>Frontline</b> battle on Recruit, and look up any unit in the <b>Units</b> tab of the menu.' },
];

/** 1945's boot camp: the same chapters told with its own aircraft and vehicles, and one of its own. */
const swap = { [AIR.title]: AIR_1945, [RECON.title]: RECON_1945, [VEHICLE_SMOKE.title]: VEHICLE_SMOKE_1945, [IFV.title]: IFV_1945 };
const BLURB_1945 = {
  fire: 'Mortar smoke, artillery and forward observers, fighter-bombers, recon flights.',
  armour: 'Reinforcements, smoke dischargers, carrying infantry in half-tracks, repairs.',
};
const CHAPTERS_1945 = [
  ...CHAPTERS.map((c) => ({
    ...c, blurb: BLURB_1945[c.id] ?? c.blurb, steps: c.steps.map((s) => swap[s.title] ?? s),
    outro: c.id === 'tactics' ? 'Last: <b>1945</b> — what fighting is like in this war.' : c.outro,
  })),
  { id: 'ww2', title: '1945', blurb: 'Tanks that stop to fire, the paradrop, Time on Target.', steps: [STOP_TO_FIRE, PARADROP, TOT],
    outro: CHAPTERS[CHAPTERS.length - 1].outro },
];

const CHAPTERS_1806 = [
  { id: 'basics', title: 'Basics', blurb: 'The camera, selecting and moving a company, facing, a first volley, taking ground.', steps: [CAMERA, SELECT_1806, MOVE_1806, FACE_1806, CONTACT_1806, POINT_1806],
    outro: 'That is the core of command. Next: <b>Formations</b> — line, column, square, and the bayonet.' },
  { id: 'formations', title: 'Formations', blurb: 'Column of march, line and volley, square against cavalry, the bayonet charge.', steps: [COLUMN, LINE, SQUARE, BAYONET],
    outro: 'Line beats column in a firefight, column beats line with the bayonet, square beats horse — and guns beat square. Next: <b>Horse and guns</b>.' },
  { id: 'arms', title: 'Horse and guns', blurb: 'The cavalry charge, horse and rider, a foot battery unlimbering.', steps: [CAVALRY, HORSES, GUNS],
    outro: 'Foot, horse and guns together: each covers what the others can\'t. Last: <b>Command</b>.' },
  { id: 'command', title: 'Command', blurb: 'The grand battery, the cavalry reserve, the Guard, fighting in person.', steps: [BATTERY, RESERVE, GUARD, CONTROL_1806],
    outro: 'That is boot camp done. In battle the enemy plays the same game: it masses its guns, keeps its horse for the moment, and forms square when yours comes. Try a <b>Frontline</b> battle on Jena on Recruit, and look up any unit in the <b>Units</b> tab of the menu.' },
];

/** This war's chapters. */
export const chapters = () => ({ 1945: CHAPTERS_1945, 1806: CHAPTERS_1806 }[epoch()] ?? CHAPTERS);

/** Chapters finished on this browser (the menu ticks them). */
export function chaptersDone() {
  try { return new Set(JSON.parse(localStorage.getItem(doneKey()) ?? '[]')); } catch { return new Set(); }
}

function markDone(id) {
  const done = chaptersDone();
  done.add(id);
  try { localStorage.setItem(doneKey(), JSON.stringify([...done])); } catch { /* storage blocked */ }
}

/** The battle that runs boot camp chapter `id` (also what the menu deploys). */
export const chapterBattle = (id, rules = {}) => ({ mode: 'bootcamp', map: epoch() === '1806' ? 'jena' : 'fulda-gap', side: 'nato', time: 'day', weather: 'clear', rules: { ...rules, chapter: id } });

export default {
  id: 'bootcamp',
  name: 'Boot camp',
  description: 'Learn to command, chapter by chapter: basics, fire support, digging in, armour, fighting in person (1945: and a chapter of its own).',
  hidden: true,          // started from its own menu tab, not the mode list
  fixedWeather: true,

  setup(game) {
    const me = game.playerFaction;
    const foe = enemyOf(me);
    const all = chapters();
    const chapter = all.find((c) => c.id === game.rules?.chapter) ?? all[0];
    const squad = game.spawnStack('rifles', me, spot(game, 40, -20), facing(game), epoch() === '1806' ? '1st Company' : '1st Squad');
    const at = spot(game, 330, -30);
    const state = {
      points: new ControlPoints(game, [{ id: 'A', name: epoch() === '1806' ? 'Dornberg' : 'Hill 214', x: at.x, z: at.z, radius: 14, owner: null }]),
      cp: { [me]: 0, [foe]: 0 },
      strength: { [me]: 1000, [foe]: 1000 },
      maxStrength: 1000,
      maxStacks: 12,
      statusText: '',
    };
    state.buy = makeBuyer(game, state);
    game.modeState = state;
    game.systems.push(state.points);
    game.frontlineHud = new FrontlineHUD(game, state);
    document.getElementById('frontline')?.classList.add('bootcamp');
    game.bus.on('ui:reinforce', (typeId) => game.orders.issue({ t: 'buy', u: typeId }));
    for (const f of [me, foe]) game.air.limit[f] = 0; // opened by the air support steps
    const next = all[all.indexOf(chapter) + 1];
    game.tutorial = new Tutorial(game, chapter.steps, { squad }, {
      label: `Boot camp · ${chapter.title}`,
      outro: chapter.outro,
      onFinish: () => markDone(chapter.id),
      next: next && { title: next.title, go: () => { rememberBattle(chapterBattle(next.id, game.rules)); requestReplay(); } },
    });
    game.cameraManager.tactical.target.set(squad.centroid.x, 0, squad.centroid.z);
  },

  update(game, dt) {
    game.frontlineHud.update();
    game.tutorial.update(dt);
    // 1806: the targets' volleys do no harm but still shake nerves — your companies don't break in training
    if (epoch() === '1806') for (const s of game.world.stacksOf(game.playerFaction)) if (s.morale < 0.5) s.morale = 0.5;
  },
};
