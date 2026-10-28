// Boot camp: the tutorial (main menu → Boot camp). One rifle squad on the Fulda Gap near your
// base, taught one thing at a time by a card on the left (ui/Tutorial.js): the camera,
// selecting, moving, attacking, mortar smoke, artillery and spotting, direct control,
// reinforcements, taking a point.
// Each step lists its tasks and ticks them off as you do them; the next step starts by itself
// (or Skip). The enemies it sets up are targets — they shoot back, but their rounds do no harm.
// Single player, always clear daylight, no weather change.
//
// A step is { title, text (HTML; <kbd data-key="action"> shows the bound key), touch? (the text
// for fingers, ui/TouchControls.js), tasks: [[label,
// done(game, ctx)]], start?(game, ctx), update?(game, ctx, dt) }; ctx carries the step's state.
import { ControlPoints } from '../systems/ControlPoints.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { Tutorial } from '../ui/Tutorial.js';
import { enemyOf } from '../data/factions.js';
import { makeBuyer } from './shared.js';
import { AIState } from '../ai/StackAI.js';

const near = (s, p, r) => s?.alive && Math.hypot(s.centroid.x - p.x, s.centroid.z - p.z) < r;

/** Positions in front of your base: `ahead` metres toward the enemy, `side` to the right. */
function spot(game, ahead, side = 0) {
  const base = game.map.bases[game.playerFaction];
  const f = -Math.sign(base.z) || 1;
  return game.world.clampToBounds({ x: base.x - side * f, z: base.z + f * ahead });
}

/** An enemy stack that fights back harmlessly and stays where it is put. */
function target(game, unit, at, name) {
  const s = game.spawnStack(unit, enemyOf(game.playerFaction), at, game.playerFaction === 'nato' ? 0 : Math.PI, name);
  for (const u of s.units) u.damageMult = 0;
  s.ai.moveTo(at, { hold: true, ordered: false });
  return s;
}

const STEPS = [
  {
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
  },
  {
    title: 'Selecting',
    touch: 'Your units fight in <b>stacks</b> — a squad, a team, a platoon of vehicles. <b>Tap</b> your rifle squad to select it. To pick up several, hold a finger still for a moment, then drag a box around them.',
    text: 'Your units fight in <b>stacks</b> — a squad, a team, a platoon of vehicles. <b>Left-click</b> your rifle squad to select it (or drag a box around it). <kbd data-key="selectAll"></kbd> selects everything you have.',
    start(game, ctx) { game.tutorial.highlight(ctx.squad); },
    tasks: [['Select the rifle squad', (g, c) => g.commands.selected.has(c.squad)]],
  },
  {
    title: 'Moving',
    touch: 'With the squad selected, <b>tap</b> the ground to send it there. Infantry looks for cover where it stops.',
    text: 'With the squad selected, <b>right-click</b> on the ground to send it there. Right-click and <b>drag</b> to also choose which way it faces when it gets there. Infantry looks for cover where it stops.',
    start(game, ctx) {
      ctx.at = spot(game, 95, -25);
      ctx.ring = game.tutorial.marker(ctx.at, 9);
    },
    tasks: [['Move the squad into the marked ring', (g, c) => near(c.squad, c.at, 11)]],
    end(game, ctx) { ctx.ring.remove(); },
  },
  {
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
  },
  {
    title: 'Mortar smoke',
    touch: 'An enemy machine gun covers the open field — crossing it in the open would be costly. A mortar team has joined you. Tap it, tap <b>Smoke</b> in the panel, then tap the ground between your squad and the gun. Smoke blocks sight both ways for about forty seconds. Mortars also fire on their own at enemies your side can see, but not closer than their minimum range.',
    text: 'An enemy machine gun covers the open field — crossing it in the open would be costly. A mortar team has joined you. Select it, press <kbd data-key="smoke"></kbd> (or the Smoke button at the bottom), then <b>left-click</b> on the ground between your squad and the gun. Smoke blocks sight both ways for about forty seconds. Mortars also fire on their own at enemies your side can see, but they cannot hit anything closer than their minimum range.',
    start(game, ctx) {
      const me = game.playerFaction;
      ctx.mortar = game.spawnStack('mortar', me, spot(game, 60, -10), me === 'nato' ? Math.PI : 0, 'Mortar section');
      ctx.mg = target(game, 'mgTeam', spot(game, 250, -15), 'MG nest');
      ctx.clouds = game.smoke.clouds.length;
      game.tutorial.highlight(ctx.mortar);
    },
    tasks: [
      ['Select the mortar team', (g, c) => g.commands.selected.has(c.mortar)],
      ['Lay smoke', (g, c) => g.smoke.clouds.length > c.clouds || !!c.mortar.smokeOrder],
    ],
  },
  {
    title: 'Artillery and spotting',
    text: 'Mortars and guns fire on their own at any enemy your side has <b>spotted</b> — no line of sight of their own needed — but from far away their bombs scatter widely. A <b>forward observer</b> team that can see the target makes them land tight. The mortar reaches 180 m: move it up to the near ring. Then send the observers, who have just arrived, to the far ring, where they can see the machine gun. Watch how tight the bombs fall once the observers see the gun — against men dug in they pin more than they kill. Smoke blinds observers too.',
    start(game, ctx) {
      const me = game.playerFaction;
      ctx.mortar = game.world.stacksOf(me).find((s) => s.type.id === 'mortar');
      ctx.mg = game.world.stacksOf(enemyOf(me)).find((s) => s.type.id === 'mgTeam');
      // what's left of the routed recce section has slipped away: the gun is the only target
      for (const s of game.world.stacksOf(enemyOf(me))) if (s !== ctx.mg) game.removeStack(s);
      ctx.fo = game.spawnStack('observers', me, spot(game, 50, -35), me === 'nato' ? Math.PI : 0, 'Observer team');
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
  },
  {
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
  },
  {
    title: 'Reinforcements',
    touch: 'Battles are won with what you bring in. You earn <b>command points</b> over time (more for every point you hold) and spend them on reinforcements: tap <b>Reinforcements</b> at the top of the panel. New units drive in from your base. You have been given enough for a tank.',
    text: 'Battles are won with what you bring in. You earn <b>command points</b> over time (more for every point you hold) and spend them on reinforcements: press <kbd data-key="reinforce"></kbd> or click <b>Reinforcements</b> at the bottom right. New units drive in from your base. You have been given enough for a tank.',
    start(game, ctx) {
      game.modeState.cp[game.playerFaction] += 450;
      ctx.had = new Set(game.world.stacksOf(game.playerFaction));
    },
    tasks: [['Call in a tank', (g, c) => g.world.stacksOf(g.playerFaction).some((s) => !c.had.has(s) && s.type.category === 'armour')]],
  },
  {
    title: 'Taking ground',
    text: 'Battles are fought over <b>control points</b>. Only infantry can take one: soldiers inside the ring swing it toward your side — the more of them, the faster — and nobody gains it while both sides are inside. Move the rifle squad into the ring and hold it until the flag is yours. Tanks are strong but blind and vulnerable up close; let the infantry lead.',
    start(game, ctx) {
      ctx.point = game.modeState.points.points[0];
      game.tutorial.show(ctx.point);
    },
    tasks: [['Capture the point', (g, c) => c.point.owner === g.playerFaction]],
  },
];

export default {
  id: 'bootcamp',
  name: 'Boot camp',
  description: 'Learn to command: the camera, orders, smoke, direct control, reinforcements and taking ground.',
  hidden: true,          // started from its own menu tab, not the mode list
  fixedWeather: true,

  setup(game) {
    const me = game.playerFaction;
    const foe = enemyOf(me);
    const squad = game.spawnStack('rifles', me, spot(game, 40, -20), me === 'nato' ? Math.PI : 0, '1st Squad');
    const at = spot(game, 330, -30);
    const state = {
      points: new ControlPoints(game, [{ id: 'A', name: 'Hill 214', x: at.x, z: at.z, radius: 14, owner: null }]),
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
    for (const f of [me, foe]) game.air.limit[f] = 0;
    game.tutorial = new Tutorial(game, STEPS, { squad });
    game.cameraManager.tactical.target.set(squad.centroid.x, 0, squad.centroid.z);
  },

  update(game, dt) {
    game.frontlineHud.update();
    game.tutorial.update(dt);
  },
};
