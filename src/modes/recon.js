// Recon raid: a small team slips across the line to find three targets for the guns — the
// regimental HQ, an artillery battery and a fuel and ammunition dump — somewhere on the enemy's
// half (search areas on the minimap; the exact spot you have to find).
//   • You have two scout teams and an IFV with a squad inside. No reinforcements, no air.
//   • Marking: keep eyes on a target (one of your men within 140 m with a clear view of it) for
//     six seconds; the guns do the rest a few seconds later.
//   • Stay hidden: enemy patrols walk between their villages, garrisons guard the targets. Let
//     yourselves be seen for too long — or start a firefight — and the alarm goes up: a quick
//     reaction force of armour and infantry comes out hunting you, and the patrols close in.
//   • Win: mark at least two targets and get anyone back to your base. All three is a full
//     success. Lose: the whole team, or 25 minutes gone.
// Single player.
import * as THREE from 'three';
import { ControlPoints } from '../systems/ControlPoints.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { PropBuilder } from '../world/Props.js';
import { enemyOf } from '../data/factions.js';
import { AIState } from '../ai/StackAI.js';
import { mulberry32 } from '../core/math.js';
import { clock } from './shared.js';

const TIME = 25 * 60;
const MARK_TIME = 6;
const MARK_RANGE = 140;
const ALARM_EXPOSURE = 7;       // seconds of being seen before the alarm
const SEARCH = 70;              // search circle radius
const TARGETS = [
  { kind: 'hq', name: 'Regimental HQ' },
  { kind: 'battery', name: 'Artillery battery' },
  { kind: 'dump', name: 'Fuel and ammunition dump' },
];

export default {
  id: 'recon',
  name: 'Recon raid',
  description: 'Two scout teams and an IFV behind enemy lines: find three targets for the guns, stay hidden, get back.',
  multiplayer: false,

  setup(game) {
    const map = game.map;
    const me = game.playerFaction;
    const foe = enemyOf(me);
    const rand = mulberry32((Math.random() * 1e9) | 0);
    const mySide = Math.sign(map.bases[me].z);
    // where the targets can be: around the enemy's villages and in the fields between
    const theirPoints = map.points.filter((p) => Math.sign(p.z) === -mySide && Math.abs(p.z) > 40);
    const spots = [];
    const candidates = [...theirPoints.map((p) => ({ x: p.x + (rand() - 0.5) * 50, z: p.z + (rand() - 0.5) * 40 }))];
    for (let i = 0; i < 8; i++) candidates.push({ x: (rand() * 2 - 1) * (map.bounds.x - 60), z: -mySide * (90 + rand() * (map.bounds.z - 150)) });
    candidates.sort(() => rand() - 0.5);
    for (const c of candidates) {
      const p = game.world.river ? game.world.river.dry(c) : c;
      if (spots.length < 3 && spots.every((s) => Math.hypot(s.x - p.x, s.z - p.z) > 120)) spots.push(p);
    }
    const objectives = TARGETS.map((t, i) => ({
      ...t, x: spots[i].x, z: spots[i].z, progress: 0, marked: false, destroyed: false,
      // the search area is centred off the true spot
      cx: spots[i].x + (rand() - 0.5) * SEARCH, cz: spots[i].z + (rand() - 0.5) * SEARCH,
    }));
    this.buildCamps(game, objectives, rand);

    // the raiders
    const base = map.bases[me];
    const toward = -Math.sign(base.z);
    const team = [
      game.spawnStack('scouts', me, { x: base.x - 12, z: base.z + toward * 20 }, toward > 0 ? 0 : Math.PI, 'Recon 1'),
      game.spawnStack('scouts', me, { x: base.x + 12, z: base.z + toward * 20 }, toward > 0 ? 0 : Math.PI, 'Recon 2'),
      game.spawnStack('ifv', me, { x: base.x, z: base.z + toward * 8 }, toward > 0 ? 0 : Math.PI, 'Raid IFVs', { count: 1 }),
    ];
    // the enemy: garrisons on the targets, patrols between villages
    const guards = [];
    for (const o of objectives) {
      const g1 = game.spawnStack(o.kind === 'battery' ? 'artillery' : 'rifles', foe, { x: o.x, z: o.z }, Math.atan2(-mySide, 0) || 0, `${o.name} ${o.kind === 'battery' ? 'guns' : 'guard'}`);
      const g2 = game.spawnStack('mgTeam', foe, { x: o.x + 10, z: o.z + mySide * 12 }, 0, `${o.name} MG`);
      for (const s of [g1, g2]) s.ai.defend();
      o.stacks = [g1, g2];
      guards.push(g1, g2);
    }
    const route = theirPoints.length ? theirPoints : [{ x: 0, z: -mySide * 150 }];
    const patrols = [0, 1, 2].map((i) => {
      const start = route[i % route.length];
      const s = game.spawnStack('rifles', foe, { x: start.x + 15, z: start.z }, 0, `Patrol ${i + 1}`, { count: 5 });
      s.patrol = { route: [...route].sort(() => rand() - 0.5), leg: 0 };
      return s;
    });

    const state = {
      points: new ControlPoints(game, []),
      cp: { [me]: 0, [foe]: 0 },
      strength: { [me]: 1, [foe]: 1 },
      maxStrength: 1,
      maxStacks: 0,
      noReinforcements: true,
      objectives,
      team,
      patrols,
      guards,
      exposure: 0,
      alarm: false,
      t0: game.time,
      status: () => {
        const marked = objectives.filter((o) => o.marked).length;
        const watch = objectives.find((o) => !o.marked && o.progress > 0);
        const now = watch ? ` · marking ${watch.name} ${Math.round((watch.progress / MARK_TIME) * 100)} %` : '';
        const goal = marked >= 2 ? ' · get back to base!' : '';
        return `${marked} of 3 targets marked${now}${goal} · ${clock(TIME - game.time)} left${state.alarm ? ' · ALARM' : ''}`;
      },
      // minimap: the search areas (and the marked targets)
      markers: () => objectives.map((o) => (o.marked
        ? { x: o.x, z: o.z, r: 8, color: o.destroyed ? '#777' : '#ffc35a', label: o.destroyed ? '✕' : '!' }
        : { x: o.cx, z: o.cz, r: SEARCH, color: 'rgba(255,195,90,0.7)', dashed: true })),
    };
    game.modeState = state;
    game.air.limit[me] = 0;
    game.frontlineHud = new FrontlineHUD(game, state);
    game.tell(me, 'Recon raid — find the three targets, mark them for the guns, and get back. Stay out of sight.');
  },

  /** Each target's camp: tents and a mast for the HQ, guns dug in, stacks of crates and drums. */
  buildCamps(game, objectives, rand) {
    const cover = game.cover;
    // after the map is built new cover goes in through addStructureBox (it fixes up the spots)
    const proxy = {
      addBox: (o) => cover.addStructureBox(o),
      addCylinder: () => {},
      pointBlocked: (...a) => cover.pointBlocked(...a),
    };
    const props = new PropBuilder({ scene: game.scene, terrain: game.terrain, cover: proxy });
    props.rand = rand;
    for (const o of objectives) {
      const yaw = rand() * Math.PI;
      if (o.kind === 'hq') {
        props.tent({ x: o.x - 3, z: o.z, yaw, color: 0x5a5a3c });
        props.tent({ x: o.x + 4, z: o.z + 2, yaw: yaw + 0.3, color: 0x5a5a3c });
        props.mast({ x: o.x, z: o.z - 7 });
        props.crates({ x: o.x + 1, z: o.z + 5, yaw });
      } else if (o.kind === 'battery') {
        props.sandbagRing({ x: o.x, z: o.z, radius: 9, toward: 1 });
        props.crates({ x: o.x - 5, z: o.z + 4, yaw });
      } else {
        for (let i = 0; i < 5; i++) props.crates({ x: o.x + (i % 3) * 3 - 3, z: o.z + Math.floor(i / 3) * 3, yaw });
        props.tent({ x: o.x + 6, z: o.z - 3, yaw, color: 0x4a4a34 });
      }
    }
    props.finish();
  },

  update(game, dt) {
    const state = game.modeState;
    const me = game.playerFaction;
    const foe = enemyOf(me);
    const world = game.world;
    const team = world.stacksOf(me);

    // ---- being seen: exposure builds the alarm (a firefight sets it off at once)
    const seen = team.some((s) => s.units.some((u) => u.alive && u.spotted));
    state.exposure = seen ? state.exposure + dt : Math.max(0, state.exposure - dt * 0.3);
    // a firefight: we've been hit, or hit someone, in the last second (not counting the spawn)
    const shooting = team.some((s) => game.time - s.lastHitTime < 1 || (s.lastDamageDealt > state.t0 + 1 && game.time - s.lastDamageDealt < 1));
    if (!state.alarm && (state.exposure > ALARM_EXPOSURE || shooting)) this.raiseAlarm(game, state, foe, me);

    // ---- patrols walk their rounds until the alarm
    for (const p of state.patrols) {
      if (!p.alive || state.alarm || !p.patrol) continue;
      if (p.ai.state === AIState.IDLE) {
        const r = p.patrol.route;
        const next = r[p.patrol.leg++ % r.length];
        p.ai.moveTo({ x: next.x + (Math.random() - 0.5) * 30, z: next.z + (Math.random() - 0.5) * 30 }, { ordered: false });
      }
    }

    // ---- marking targets
    for (const o of state.objectives) {
      if (o.marked) continue;
      const watching = team.some((s) => s.units.some((u) => u.alive
        && Math.hypot(u.pos.x - o.x, u.pos.z - o.z) < MARK_RANGE * (u.stats.binoculars ? 1 : 0.6)
        && game.terrain.lineOfSight(u.pos.x, u.pos.y + 1.4, u.pos.z, o.x, game.terrain.heightAt(o.x, o.z) + 2, o.z)
        && !game.smoke.blocks(u.pos.x, u.pos.z, o.x, o.z)));
      o.progress = watching ? o.progress + dt : Math.max(0, o.progress - dt * 0.5);
      if (o.progress >= MARK_TIME) {
        o.marked = true;
        o.strikeAt = game.time + 7;
        game.tell(me, `${o.name} marked — fire mission on the way!`);
      }
    }
    for (const o of state.objectives) {
      this.shellsLanding(game, o);
      if (!o.marked || o.destroyed || game.time < o.strikeAt) continue;
      o.destroyed = true;
      this.barrage(game, o);
      game.tell(me, `${o.name} destroyed. Good work.`);
    }

    // ---- the end
    const marked = state.objectives.filter((o) => o.marked).length;
    const base = game.map.bases[me];
    const home = team.some((s) => s.units.some((u) => u.alive && Math.hypot(u.pos.x - base.x, u.pos.z - base.z) < 45));
    let result = null;
    if (marked >= 2 && home && state.objectives.filter((o) => o.marked).every((o) => o.destroyed)) {
      result = marked === 3
        ? { victory: true, title: 'Victory', subtitle: 'All three targets found and hit — the team is home.' }
        : { victory: true, title: 'Partial success', subtitle: `${marked} of 3 targets hit, and the team got back.` };
    } else if (!team.length) result = { victory: false, title: 'Defeat', subtitle: 'The raid team is lost.' };
    else if (game.time >= TIME) result = { victory: false, title: 'Defeat', subtitle: 'Out of time — the raid has failed.' };
    game.frontlineHud.update();
    if (result) game.end(result);
  },

  raiseAlarm(game, state, foe, me) {
    state.alarm = true;
    game.tellBoth(foe, 'Intruders! Quick reaction force, move out!', 'We\'ve been spotted — the alarm is up! Get out of there!');
    game.bus.emit('wave', { faction: foe, units: ['tank', 'ifv', 'rifles'] });
    const target = game.world.stacksOf(me).find((s) => s.units.some((u) => u.alive && u.spotted)) ?? game.world.stacksOf(me)[0];
    const base = game.map.bases[foe];
    const qrf = ['tank', 'ifv', 'rifles'].map((id, i) => game.spawnStack(id, foe, { x: base.x + (i - 1) * 14, z: base.z - Math.sign(base.z) * 15 }, 0, `QRF ${i + 1}`));
    for (const s of [...qrf, ...state.patrols.filter((p) => p.alive)]) if (target) s.ai.attack(target, { ordered: false });
  },

  /** The guns: a dozen heavy shells over the target in about ten seconds (on the game clock). */
  barrage(game, o) {
    o.shells = Array.from({ length: 12 }, (_, i) => game.time + i * 0.8 + Math.random() * 0.4);
  },

  /** Shells due now land. */
  shellsLanding(game, o) {
    while (o.shells?.length && o.shells[0] <= game.time) {
      o.shells.shift();
      const x = o.x + (Math.random() - 0.5) * 28;
      const z = o.z + (Math.random() - 0.5) * 28;
      const pos = new THREE.Vector3(x, game.terrain.heightAt(x, z), z);
      game.effects.explosion(pos, 1.8, { ground: true });
      game.audio.play('explosion.big', pos, { volume: 0.9 });
      game.terrain.dig(x, z, 3.5, 0.5, (px, pz) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 2.5), 0.9);
      for (const u of game.world.neighbors(pos, 9, [])) u.receiveDamage(500, null, 0.5, null, 0.8);
    }
  },
};
