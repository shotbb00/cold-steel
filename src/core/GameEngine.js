// Owns the renderer, scene and main loop, and wires the modules together. The frame order:
//   step:   input → player-controlled unit → squad AI → units (think, move,
//           fight) → squad separation → construction → air strikes → projectiles → beams →
//           unit renderers → effects → fog of war → mode systems / win check → environment →
//           camera → HUD   (render: labels, callouts, minimap → post-processed render)
//   render: stack labels, callouts → post-processed render
// Multiplayer (`net`, see net/): the host runs exactly this step for both sides, recording
// what it shows and plays for the client (net/NetHost.js); the client runs stepClient instead —
// no simulation, its stacks follow the host's snapshots (net/NetClient.js). Direct control is
// single player only. Co-op (`coop`): both players on the same side against the AI; every
// stack of that side belongs to one of them (stack.owner 'host' | 'guest') and only its owner
// can select and order it.
import { Deployment } from '../systems/Deployment.js';
import { Barrage } from '../systems/Barrage.js';
import { Doctrine } from '../systems/Doctrine.js';
import { unitCost } from '../data/doctrine.js';
import { NavGrid } from '../world/Nav.js';
import * as THREE from 'three';

import { requestReplay } from './replay.js';
import { EventBus } from './EventBus.js';
import { createPostFX } from '../render/PostFX.js';
import { Quality } from '../render/Quality.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { InputHandler } from './InputHandler.js';
import { CameraManager, CameraMode } from './CameraManager.js';
import { BattleWorld } from './BattleWorld.js';
import { mulberry32 } from './math.js';
import { PLAYER_FACTION, FACTIONS, enemyOf, armiesFrom } from '../data/factions.js';
import { getUnitType } from '../data/units/index.js';
import { buildEnvironment } from '../world/Environment.js';
import { Terrain } from '../world/Terrain.js';
import { CoverMap } from '../world/Cover.js';
import { EffectsSystem } from '../combat/EffectsSystem.js';
import { ProjectileSystem } from '../combat/ProjectileSystem.js';
import { BeamSystem } from '../combat/BeamSystem.js';
import { UnitStack } from '../entities/UnitStack.js';
import { StackAI } from '../ai/StackAI.js';
import { CommandSystem } from '../systems/CommandSystem.js';
import { PlayerControl } from '../systems/PlayerControl.js';
import { TouchControls } from '../ui/TouchControls.js';
import { VisibilitySystem } from '../systems/VisibilitySystem.js';
import { Construction } from '../systems/Construction.js';
import { CrewBailout } from '../systems/CrewBailout.js';
import { AirStrike } from '../systems/AirStrike.js';
import { Support } from '../systems/Support.js';
import { SmokeSystem } from '../systems/Smoke.js';
import { Transport } from '../systems/Transport.js';
import { Buildings } from '../systems/Buildings.js';
import { Minimap } from '../ui/Minimap.js';
import { HUD } from '../ui/HUD.js';
import { StackLabels } from '../ui/StackLabels.js';
import { Barks } from '../ui/Barks.js';
import { AudioSystem } from '../audio/AudioSystem.js';
import { Orders } from './Orders.js';
import { FogOfWar } from '../render/FogOfWar.js';
import { applyConditions } from './Conditions.js';
import { Flares } from '../systems/Flares.js';
import { Rain } from '../render/Weather.js';
import { BattleStats } from '../systems/BattleStats.js';
import { Ambience } from '../systems/Ambience.js';
import { RadioLog } from '../ui/RadioLog.js';
import { BuildingMarkers } from '../ui/BuildingMarkers.js';
import { RangeIndicators } from '../ui/RangeIndicators.js';
import { NetHost } from '../net/NetHost.js';
import { NetClient } from '../net/NetClient.js';
import { BabylonView } from '../render/babylon/BabylonView.js';
import { keys } from './Keys.js';
import { rulesFrom, DIFFICULTY } from '../data/rules.js';
import { BattleChat } from '../ui/Chat.js';
import { WeatherChange } from '../systems/WeatherChange.js';
import { Gas } from '../systems/Gas.js';
import { CounterBattery } from '../systems/CounterBattery.js';
import { Jamming } from '../systems/Jamming.js';
import { Fire } from '../systems/Fire.js';

/** Which renderer draws the battle: Babylon.js (default), or ?renderer=three for the original. */
const CRATER_COVER = 0.4; // m: a crater this deep (artillery, rockets) shelters men lying in it
const RENDERER = new URLSearchParams(location.search).get('renderer') === 'three' ? 'three' : 'babylon';

export class GameEngine {
  /**
   * `net`: { role: 'host' | 'client', link } for a multiplayer battle;
   * `conditions`: { time, weather } (core/Conditions.js).
   */
  constructor(container, { map, mode, playerFaction = PLAYER_FACTION, net = null, conditions = null, coop = false, campaign = null, rules = null, armies = null }) {
    this.map = map;
    this.mode = mode;
    // the size the picture is drawn at: the container, not innerWidth/innerHeight — on an iPhone
    // Safari's sliding toolbar makes those differ, and every label placed by them drifts (onResize)
    this.container = container;
    this.view = { w: container.clientWidth || innerWidth, h: container.clientHeight || innerHeight };
    this.playerFaction = playerFaction;
    this.coop = !!(net && coop);
    this.campaign = campaign; // a campaign battle (campaign/Campaign.js battleChoice)
    this.rules = rulesFrom(campaign ? null : rules); // battle rules (data/rules.js; multiplayer: the host's)
    this.armies = armiesFrom(armies); // which army each side fields (data/factions.js ARMIES)
    this.myOwner = !net ? null : net.role === 'host' ? 'host' : 'guest'; // co-op: whose stacks are mine
    this.currentOwner = null;  // while an order runs: who gave it (new stacks are theirs)
    this.bus = new EventBus();
    this.systems = [new Doctrine(this)]; // extra per-frame systems (game modes add theirs); the armies' doctrine
    this.ended = false;
    this.time = 0;

    // ---- rendering
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1); // render/Quality.js sets the real value
    this.renderer.setSize(this.view.w, this.view.h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.conditions = applyConditions(map.theme, conditions ?? map.conditions ?? undefined);
    this.renderer.toneMappingExposure = this.conditions.theme.exposure ?? 1.1;
    if (RENDERER === 'three') container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, this.view.w / this.view.h, 0.1, 2000);
    // Babylon mirrors the Three scene graph and draws it (render/babylon/BabylonView.js)
    this.babylon = RENDERER === 'babylon'
      ? new BabylonView(container, { scene: this.scene, camera: this.camera }, { exposure: this.conditions.theme.exposure ?? 1.1, theme: this.conditions.theme })
      : null;
    this.canvas = this.babylon?.canvas ?? this.renderer.domElement;

    this.post = createPostFX(this.renderer, this.scene, this.camera); // AO, bloom, colour grade
    this.composer = this.post.composer;
    this.bloom = this.post.bloom;

    // ---- simulation modules
    this.input = new InputHandler(this.canvas, this.bus);
    this.environment = buildEnvironment(this.scene, this.conditions.theme);
    this.terrain = new Terrain({ size: map.size, segments: map.segments, height: map.height, palette: map.theme.terrain, fields: map.fields ?? null });
    this.scene.add(this.terrain.mesh);
    this.cover = new CoverMap(this.terrain);
    this.decor = map.decorate?.({
      scene: this.scene, terrain: this.terrain, cover: this.cover, bounds: map.bounds, rand: mulberry32(map.seed ?? 1),
    }) ?? null;
    if (!this.cover.finalized) this.cover.finalize(map.bounds);
    this.world = new BattleWorld({ bounds: map.bounds, terrain: this.terrain, cover: this.cover, bases: map.bases });
    this.world.playerFaction = playerFaction;
    this.world.river = map.river ?? null; // water that stops and slows
    this.world.armies = this.armies;
    this.world.nav = new NavGrid(this.world); // where bodies can go, and the way there
    this.cover.onAdd = (c) => this.world.nav.addCollider(c);
    this.cover.onRemove = (c) => this.world.nav.removeCollider(c); // (a tree that came down)
    this.bus.on('terrain:changed', () => this.world.nav.water()); // a bridge blown or laid
    this.world.conditions = this.conditions;
    this.effects = new EffectsSystem(this.scene, this.bus);
    this.projectiles = new ProjectileSystem(this.scene, this.world, this.effects);
    this.projectiles.onCrater = (point, r, crater) => { // (host only: projectiles call it when not cosmetic)
      this.blastTerrain(point, r, crater);
      this.blasts?.push([Math.round(point.x * 10) / 10, Math.round(point.z * 10) / 10, r, crater]); // the campaign keeps the sector's scars
    };
    this.smoke = new SmokeSystem(this);
    this.projectiles.smoke = this.smoke;
    this.flares = new Flares(this);       // night: illumination rounds
    this.projectiles.flares = this.flares;
    this.world.flares = this.flares;
    this.cameraManager = new CameraManager(this.camera, this.input, { bounds: map.bounds, terrain: this.terrain, cover: this.cover });
    this.beams = new BeamSystem(this.scene, this.world, this.effects);
    this.audio = new AudioSystem(this);
    this.projectiles.audio = this.audio;
    this.projectiles.cameraManager = this.cameraManager; // big blasts nearby shake the view
    this.beams.audio = this.audio;
    const cs = map.cameraStart?.[playerFaction] ?? map.cameraStart;
    const start = cs && 'x' in cs ? cs : map.bases?.[playerFaction] ?? { x: 0, z: 0 };
    this.cameraManager.tactical.target.set(start.x, 0, start.z);
    // the command view looks from your own side of the map toward the enemy
    this.cameraManager.tactical.facing = Math.sign(map.bases?.[playerFaction]?.z ?? 1) || 1;
    // "ally" / "enemy" in the interface take the sides' colours
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--ally', FACTIONS[playerFaction].css);
    rootStyle.setProperty('--enemy', FACTIONS[enemyOf(playerFaction)].css);

    this.commands = new CommandSystem(this);
    this.player = new PlayerControl(this);
    this.visibility = new VisibilitySystem(this, playerFaction);
    this.construction = new Construction(this);
    this.crews = new CrewBailout(this);
    this.transport = new Transport(this);
    this.buildings = new Buildings(this, this.decor?.buildings ?? []);
    this.projectiles.buildings = this.buildings;
    this.air = new AirStrike(this);
    this.support = new Support(this);
    this.gas = new Gas(this);             // chemical fire missions (a support power)
    this.barrage = new Barrage(this);     // the Soviet Army's preparatory barrage (a support power)
    this.counterBattery = new CounterBattery(this); // radars that find the enemy's guns
    this.jamming = new Jamming(this);     // electronic warfare: jammed radio nets
    this.fire = new Fire(this);           // grass and forest fires
    this.projectiles.fire = this.fire;
    // multiplayer: the connection is set up before the interface, which adapts to it
    this.orders = new Orders(this);
    this.stats = net?.role === 'client' ? null : new BattleStats(this); // where the simulation runs
    this.net = net?.role === 'host' ? new NetHost(this, net.link) : net?.role === 'client' ? new NetClient(this, net.link) : null;
    this.netNames = net?.names ?? null;      // { me, peer } from the lobby (ui/Chat.js)
    this.chat = new BattleChat(this);        // multiplayer chat and co-op pings
    this.touchControls = new TouchControls(this); // fingers: gestures, toolbar, direct-control pad
    if (this.net?.isHost) this.setWaiting(true); // until the other player has loaded
    if (this.net) this.showNetStatus();
    this.quality = new Quality(this); // after the map is decorated: it thins detail meshes
    this.hud = new HUD(this);
    this.labels = new StackLabels(this);
    this.buildingMarkers = new BuildingMarkers(this);
    this.barks = new Barks(this);
    this.minimap = new Minimap(this);
    this.pause = new PauseMenu(this);
    this.paused = false;

    this.bindControls();
    if (campaign) { this.blasts = []; if (campaign.scars) this.replayScars(campaign.scars); } // the sector as the last battle left it
    mode.setup(this);
    if (!this.net?.isClient) this.construction.predig(); // the Bundeswehr's Sperrverband (data/doctrine.js)
    this.deployment = new Deployment(this); // the clock stopped while you place your stacks (single player)
    if (!net && mode.id !== 'bootcamp') this.deployment.begin();
    if (this.rules.air === false) for (const f of Object.keys(FACTIONS)) this.air.limit[f] = 0; // battle rules: no air support
    // co-op: each player has command points of their own, earned at the full rate (wallet()), and
    // the AI side starts with and earns twice as much to make up for it
    const cp = this.modeState?.cp;
    if (this.coop && cp) {
      cp[this.wallet(playerFaction, 'guest')] = cp[playerFaction];
      cp[enemyOf(playerFaction)] *= 2;
    }
    // co-op: the opening forces are shared out between the two players
    if (this.coop && this.net.isHost) {
      this.world.stacksOf(playerFaction).forEach((s, i) => { s.owner = i % 2 ? 'guest' : 'host'; });
      if (this.world.stacksOf(playerFaction).length < 2) {
        const first = this.world.stacksOf(playerFaction)[0];
        if (first) { this.currentOwner = 'guest'; this.spawnStack(first.type.id, playerFaction, { x: first.anchor.x + 14, z: first.anchor.z }, first.facing, `${first.name} (2)`); this.currentOwner = null; }
      }
    }
    this.net?.attached?.();
    this.fow = new FogOfWar(this);              // after the map and the first stacks exist
    this.babylon?.setFogOfWar(this.fow);
    this.ranges = new RangeIndicators(this);
    this.ambience = new Ambience(this);
    this.rain = this.conditions.rain ? new Rain(this) : null;
    this.radio = new RadioLog(this);
    // single player: the weather can change and the day go on during the battle (systems/WeatherChange.js)
    const sky = { weather: this.rules.changingWeather !== false, time: this.rules.timePasses !== false };
    if (!net && !campaign && !mode.fixedWeather && (sky.weather || sky.time)) this.systems.push(new WeatherChange(this, sky));

    window.addEventListener('resize', () => this.onResize());
    // a multiplayer host whose window is minimised or in the background gets no animation
    // frames: keep the battle running for the other player on a timer (no drawing)
    if (this.net?.isHost) document.addEventListener('visibilitychange', () => this.onVisibility());
    this.clock = new THREE.Clock();
    const begin = () => {
      document.getElementById('loading')?.remove();
      this.clock.getDelta(); // the warm-up doesn't count as a frame
      this.renderer.setAnimationLoop(() => this.tick());
    };
    if (this.babylon) {
      // Babylon compiles its shaders in the background: keep the loading screen up until the
      // opening view is ready, so the battle doesn't start on a half-drawn field
      this.babylon.render(0);
      this.babylon.scene.whenReadyAsync().then(begin, begin);
    } else begin();
  }

  /** Create a stack of `unitId` for `faction` at {x, z}. Used by game modes. */
  spawnStack(unitId, faction, position, facing = 0, name, { count, id = null } = {}) {
    const stack = new UnitStack({
      type: getUnitType(unitId),
      faction,
      position,
      facing,
      name,
      count,
      id,
      services: {
        scene: this.scene, bus: this.bus, projectiles: this.projectiles, beams: this.beams,
        effects: this.effects, world: this.world, audio: this.audio, air: this.air, smoke: this.smoke,
        tell: (f, msg) => this.tell(f, msg),
        game: this,
      },
    });
    stack.ai = new StackAI(stack, this.world);
    // difficulty (data/rules.js): the AI side shoots better or worse
    const aim = !this.isHuman(faction) ? DIFFICULTY[this.rules.difficulty]?.aim ?? 1 : 1;
    if (aim !== 1) for (const u of stack.units) u.skill *= aim;
    if (this.coop && faction === this.playerFaction && !stack.owner) stack.owner = this.currentOwner ?? 'host';
    // unseen until the fog of war has looked: new enemy stacks don't flash up on the map
    if (!stack.stats.structure && this.visibility?.enabled !== false) {
      const own = faction === this.playerFaction;
      for (const u of stack.units) { u.spotted = false; u.visible = own; }
      stack.visible = own;
    }
    this.world.addStack(stack);
    this.transport?.setup(stack);
    this.net?.onSpawn?.(stack);
    this.bus.emit('stack:spawned', stack);
    return stack;
  }

  // ---------------------------------------------------------------- messages & multiplayer

  /** A player-facing message for `faction`'s side, on whichever machine that side is played. */
  tell(faction, message) {
    if (this.net?.isClient) return; // the client's messages come from the host
    if (faction === this.playerFaction) this.bus.emit('toast', message);
    if (faction === this.net?.remoteFaction) this.net.toast(message); // (co-op: both, same side)
  }

  /** The same news worded for each side: `mine` to `faction`, `theirs` to its enemy. */
  tellBoth(faction, mine, theirs) {
    this.tell(faction, mine);
    this.tell(enemyOf(faction), theirs);
  }

  /** News for everyone. */
  announce(message) {
    this.tellBoth(this.playerFaction, message, message);
  }

  /**
   * A bridge goes up (engineers' charges, systems/Construction.js): the span drops into the
   * river, whoever is on it is caught in the blast, and nobody routes over it any more.
   */
  blowBridge(c) {
    const river = this.world.river;
    if (!river || c.blown) return;
    const pos = { x: c.x, y: river.level + 1.5, z: c.z };
    for (let i = 0; i < 4; i++) {
      this.effects.explosion({ x: c.x + (Math.random() - 0.5) * c.width, y: pos.y, z: c.z + (i - 1.5) * river.halfWidth * 0.5 }, 1.6, { ground: false, fire: 0.4 });
    }
    this.audio.play('explosion.big', pos, { volume: 1 });
    for (const s of this.world.stacks) {
      for (const u of s.units) {
        if (u.alive && Math.abs(u.pos.x - c.x) < c.width / 2 + 2 && Math.abs(u.pos.z - c.z) < river.halfWidth + 2) u.receiveDamage(600, null, 0.6);
      }
    }
    this.quietly(() => river.blow(c, this.terrain, this.scene));
    this.netEvent('bridge', c.id);
    this.bus.emit('terrain:changed');
    this.announce(`The ${c.name} has been blown!`);
  }

  /**
   * A heavy blast (a shell or rocket that digs a crater) at `point`, splash radius `r`: trees round
   * it come down (logs to hide behind), and a deep enough crater is cover for infantry. The host
   * decides; a multiplayer guest gets the same ('terrain' event with the felled trees' dice).
   */
  blastTerrain(point, r, crater) {
    const felled = [];
    for (const f of this.cover.forests ?? []) f.fell(point.x, point.z, r * 0.9, (d) => { const yes = Math.random() < 0.65 * (1 - d / (r * 0.9)); felled.push(yes ? 1 : 0); return yes; });
    if (crater >= CRATER_COVER) this.cover.addCraterSpots(point.x, point.z, r * 0.45 + 1, this.terrain.heightAt(point.x, point.z) + crater);
    if (felled.includes(1) || crater >= CRATER_COVER) this.netEvent('terrain', Math.round(point.x * 10) / 10, Math.round(point.z * 10) / 10, r, crater, felled.join(''));
  }

  /**
   * The campaign's memory of a sector (campaign/Campaign.js scars): what this battle leaves behind —
   * its craters (with the ones from before), the defences still standing, the collapsed houses,
   * the blown bridges and the ones laid.
   */
  scars() {
    const river = this.world.river;
    return {
      blasts: this.blasts ?? [],
      works: this.construction.structures.filter((s) => !s.def.action).map((s) => [s.kind, Math.round(s.x * 10) / 10, Math.round(s.z * 10) / 10, Math.round(s.yaw * 100) / 100, s.faction]),
      ruins: this.buildings.list.filter((b) => b.collapsed).map((b) => b.index),
      blown: river ? river.crossings.filter((c) => c.blown && !c.laid).map((c) => c.id) : [],
      laid: river ? river.crossings.filter((c) => c.laid && !c.blown).map((c) => [Math.round(c.x * 10) / 10, Math.round(c.z * 10) / 10]) : [],
    };
  }

  /** Put the sector back the way scars() found it, before anyone deploys: the same calls that made it. */
  replayScars({ blasts = [], works = [], ruins = [], blown = [], laid = [] }) {
    const t = this.terrain;
    const river = this.world.river;
    this.quietly(() => {
      for (const [x, z, r, crater] of blasts) {
        const cr = r * 0.45;
        t.dig(x, z, cr + 1, crater, (px, pz) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / cr) ** 1.5, 0.9);
        t.scorch(x, z, r * 0.7 + 1, 0.3);
        for (const f of this.cover.forests ?? []) f.fell(x, z, r * 0.9, (d) => Math.random() < 0.65 * (1 - d / (r * 0.9)));
        if (crater >= CRATER_COVER) this.cover.addCraterSpots(x, z, cr + 1, t.heightAt(x, z) + crater);
      }
      for (const i of ruins) { const b = this.buildings.list[i]; if (b) this.buildings.collapseVisual(b); }
      if (river) {
        for (const id of blown) { const c = river.crossings.find((k) => k.id === id); if (c) river.blow(c, t, this.scene); }
        for (const [x, z] of laid) river.lay(x, t, this.scene, z);
      }
    });
    for (const [kind, x, z, yaw, faction] of works) {
      const site = this.construction.place(kind, x, z, yaw, faction, null, { force: true });
      if (!site) continue;
      site.quiet = true;
      this.construction.finish(site);
    }
    this.blasts = [...blasts]; // this battle adds to them
    if (blown.length || laid.length) this.bus.emit('terrain:changed');
  }

  /** A bridge layer's bridge goes down across the river at x (the channel nearest z): a new crossing for everyone. */
  layBridge(x, z = null) {
    const river = this.world.river;
    if (!river) return;
    const c = this.quietly(() => river.lay(x, this.terrain, this.scene, z));
    this.netEvent('span', Math.round(x * 10) / 10, Math.round(c.z * 10) / 10);
    this.bus.emit('terrain:changed');
    this.audio.play('stomp', { x, y: river.level + 1, z: c.z }, { volume: 1 });
    this.announce('A bridge has been laid across the river.');
  }

  /** The army `faction` fields this battle ('us', 'bw', 'sov', 'nva'). */
  armyOf(faction) {
    return this.armies[faction];
  }

  /** May this machine's player command stack `s`? (Co-op: only their own.) */
  mine(s) {
    return s.faction === this.playerFaction && (!this.coop || s.owner === this.myOwner);
  }

  /** Is `faction` played by a person (here or across the network), not the AI? */
  isHuman(faction) {
    return faction === this.playerFaction || faction === this.net?.remoteFaction;
  }

  /** A battlefield change the multiplayer client must copy (no-op otherwise). */
  netEvent(type, ...args) {
    if (this.net?.isHost) this.net.event(type, ...args);
  }

  /** Run visuals the client produces itself without recording them for it. */
  quietly(fn) {
    return this.net?.isHost ? this.net.muted(fn) : fn();
  }

  setWaiting(on) {
    this.waiting = on;
    let el = document.getElementById('net-wait');
    if (on && !el) {
      el = document.createElement('div');
      el.id = 'net-wait';
      el.innerHTML = '<b>Waiting for your opponent</b><span>Their map is still loading — the battle starts the moment they\'re in.</span>';
      document.body.append(el);
    }
    if (el) el.hidden = !on;
  }

  showNetStatus() {
    const el = document.createElement('div');
    el.id = 'net-status';
    document.getElementById('topbar')?.append(el);
    setInterval(() => {
      const rtt = this.net.link.rtt;
      el.textContent = this.net.status;
      el.classList.toggle('bad', this.net.link.closed || rtt > 250);
    }, 1000);
  }

  /**
   * Take a stack off the field without casualties (a squad climbing into its vehicles): it
   * stops existing for every system — no deaths, no losses counted.
   */
  removeStack(stack) {
    for (const u of stack.units) u.alive = false;
    stack.aliveCount = 0;
    stack.removed = true;
    stack.renderer.dispose();
    const i = this.world.stacks.indexOf(stack);
    if (i >= 0) this.world.stacks.splice(i, 1);
    this.world.cover.release && stack.units.forEach((u) => this.world.cover.release(u));
    this.bus.emit('stack:removed', stack);
  }

  bindControls() {
    this.bus.on('key', ({ code }) => {
      if (keys.is(code, 'toggleView')) this.toggleView();
      else if (keys.is(code, 'bloom')) this.bloom.enabled = !this.bloom.enabled;
      else if (keys.is(code, 'ao')) {
        this.post.ao.enabled = !this.post.ao.enabled;
        this.bus.emit('toast', `Ambient occlusion ${this.post.ao.enabled ? 'on' : 'off'} (O)`);
      }
      else if (code === 'KeyR' && this.ended) requestReplay();
      else if (keys.is(code, 'resetView')) this.cameraManager.resetView();
    });
    // double-click the middle button: the command camera back to its default angle
    let lastMiddle = -1;
    this.bus.on('mousedown', ({ button }) => {
      if (button !== 1) return;
      const now = performance.now();
      if (now - lastMiddle < 350) { this.cameraManager.resetView(); lastMiddle = -1; } else lastMiddle = now;
    });
    this.bus.on('ui:possess', (stack) => this.takeControl(stack));
    // In action view a click (re)captures the mouse.
    this.bus.on('mousedown', ({ button }) => {
      if (button === 0 && this.cameraManager.mode === CameraMode.ACTION && !this.input.locked && !this.ended) {
        this.input.requestLock();
      }
    });
  }

  /** Tab: take control of the selected stack, or hand control back and return to command. */
  toggleView() {
    if (this.ended) return;
    if (this.net) return this.bus.emit('toast', 'Direct control is single player only — multiplayer is fought from the command view');
    if (this.player.active) return this.player.release();
    const stack = [...this.commands.selected].find((s) => s.alive);
    if (!stack) return this.bus.emit('toast', 'Select one of your stacks, then press Tab to take control');
    this.takeControl(stack);
  }

  takeControl(stack) {
    if (this.ended || !stack?.alive || stack.faction !== this.playerFaction) return;
    if (this.net) return this.bus.emit('toast', 'Direct control is single player only — multiplayer is fought from the command view');
    this.player.possess(stack);
  }

  /**
   * Pay `cost` command points for `faction`. Modes without an economy (no modeState.cp) make
   * everything free. Returns false when the side can't afford it.
   */
  spend(faction, cost) {
    const cp = this.modeState?.cp;
    if (!cp) return true;
    const w = this.wallet(faction);
    if (cp[w] < cost) return false;
    cp[w] -= cost;
    return true;
  }

  /**
   * The key in modeState.cp that `owner` (default: whoever gives the order running now) pays
   * from: the side's — but in co-op the guest has a pool of their own on the players' side.
   */
  wallet(faction, owner = this.currentOwner) {
    return this.coop && faction === this.playerFaction && owner === 'guest' ? `${faction}:guest` : faction;
  }

  /** A withdrawn stack reaches its base: off the field, and half its price back for what is left of it. */
  retire(stack) {
    const alive = stack.units.filter((u) => u.alive);
    const health = alive.reduce((a, u) => a + u.hp / u.maxHp, 0) / stack.units.length;
    const back = Math.round(unitCost(stack.type, stack.army) * 0.5 * health);
    this.removeStack(stack);
    if (this.modeState?.cp) this.refund(stack.faction, back, stack.owner);
    this.tell(stack.faction, `${stack.name} withdrawn${this.modeState?.cp ? ` — ${back} CP back` : ''}`);
  }

  refund(faction, cost, owner = this.currentOwner) {
    const cp = this.modeState?.cp;
    if (cp) cp[this.wallet(faction, owner)] += cost;
  }

  end(result) {
    if (this.ended) return;
    if (!result.report && this.stats) result.report = this.stats.report(); // the after-action report
    this.ended = true;
    this.input.releaseLock();
    this.bus.emit('game:end', result);
  }

  onVisibility() {
    clearInterval(this.backgroundTimer);
    this.backgroundTimer = null;
    if (!document.hidden) {
      this.clock.getDelta(); // don't count the time away as one long frame
      return;
    }
    let last = performance.now();
    this.backgroundTimer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      if (this.waiting) return;
      try { this.step(dt); } catch (e) { this.reportError(e); }
    }, 33);
  }

  onResize() {
    const w = this.container.clientWidth || innerWidth;
    const h = this.container.clientHeight || innerHeight;
    this.view.w = w;
    this.view.h = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
    this.babylon?.resize();
  }

  tick() {
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 1 / 20); // clamp so a hitch can't teleport units
    this.quality.update(raw);
    // An exception here would stop the render loop for good (a frozen picture while the
    // audio plays on). Keep running, and show the error so it can be reported.
    const t0 = performance.now();
    try {
      if (this.net?.isClient) this.stepClient(dt);
      else if (this.waiting) this.stepWaiting(dt);
      else if (this.deployment?.on && !this.paused) this.deployment.step(dt);
      else if (!this.paused) this.step(dt);
      this.render(this.paused ? 0 : dt);
    } catch (e) {
      this.reportError(e);
    }
    // the processor's share of the frame (simulation + preparing the draw), shown by the frame
    // counter: close to the whole frame time = the CPU is the limit, far below = the GPU is
    this.cpuMs = (this.cpuMs ?? 0) * 0.9 + (performance.now() - t0) * 0.1;
  }

  reportError(e) {
    console.error(e);
    const now = performance.now();
    if (now - (this._lastError ?? -1e9) < 3000) return;
    this._lastError = now;
    let el = document.getElementById('error-banner');
    if (!el) {
      el = document.createElement('pre');
      el.id = 'error-banner';
      el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:20;max-width:70vw;margin:0;padding:8px 10px;'
        + 'background:rgba(40,8,6,.9);color:#ff8a78;font:12px/1.4 Consolas,monospace;white-space:pre-wrap;pointer-events:none';
      document.body.appendChild(el);
    }
    const where = String(e?.stack ?? '').split('\n').slice(1, 5).join('\n');
    el.textContent = `Error (game keeps running): ${e?.message ?? e}\n${where}`;
  }

  /** Advance the simulation by dt seconds. Callable on its own for headless tests or replays. */
  step(dt) {
    this.time += dt;
    const t = this.time;
    const world = this.world;
    world.time = t;

    const net = this.net;
    net?.begin(); // multiplayer host: the client's orders; record what the simulation shows

    world.refresh();
    this.cameraManager.handleInput(dt);
    this.player.update(dt);

    for (const s of world.stacks) s.ai.update(dt);
    for (const s of world.stacks) s.update(dt, t);
    for (const s of world.stacks.filter((s) => s.retireNow)) this.retire(s); // withdrawn stacks home at their base
    world.separate(dt);
    this.construction.update(dt);
    this.air.update(dt);
    this.transport.update(dt);
    this.support.update(dt);
    this.buildings.update(dt);
    this.smoke.update(dt);
    this.flares.update(dt);
    this.gas.update(dt);
    this.barrage.update(dt);
    this.fire.update(dt);
    this.counterBattery.update(dt);
    this.jamming.update(dt);

    net?.mute(); // the client flies its own rounds and runs its own renderers and effects
    this.projectiles.update(dt);
    this.beams.update(dt);
    for (const s of world.stacks) s.renderer.update(dt, t);
    this.effects.update(dt);
    net?.unmute();
    this.visibility.update(dt);
    for (const sys of this.systems) sys.update(dt, t);
    if (!this.ended) {
      // co-op: what the mode pays out to the side (income) goes to both players, and twice to the AI
      const cp = this.coop && !this.net?.isClient ? this.modeState?.cp : null;
      const foe = enemyOf(this.playerFaction);
      const was = cp && [cp[this.playerFaction], cp[foe]];
      this.mode.update?.(this, dt);
      if (cp) {
        const mine = cp[this.playerFaction] - was[0];
        const theirs = cp[foe] - was[1];
        if (mine > 0) cp[this.wallet(this.playerFaction, 'guest')] += mine;
        if (theirs > 0) cp[foe] += theirs;
      }
    }
    if (!this.ended) this.stats.update(dt);
    net?.end(dt);

    this.environment.update(dt, t, this.cameraManager.lookTarget);
    this.decor?.update?.(dt, t);
    this.cameraManager.update(dt);
    this.audio.update(dt);
    this.commands.update(dt);
    this.hud.update(dt);
  }

  /** Multiplayer client: no simulation — show the host's battle (net/NetClient.js). */
  stepClient(dt) {
    const world = this.world;
    this.net.update(dt); // host clock, due events, interpolated units
    const t = this.time;
    world.refresh();
    this.cameraManager.handleInput(dt);
    for (const s of world.stacks) s.renderer.update(dt, t);
    this.projectiles.update(dt);
    this.effects.update(dt);
    this.smoke.update(dt);
    this.flares.update(dt);
    this.gas.update(dt);
    this.barrage.update(dt);
    this.fire.update(dt);
    this.mode.clientUpdate?.(this, dt);
    this.environment.update(dt, t, this.cameraManager.lookTarget);
    this.decor?.update?.(dt, t);
    this.cameraManager.update(dt);
    this.audio.update(dt);
    this.commands.update(dt);
    this.hud.update(dt);
  }

  /** Multiplayer host before the client has loaded: the camera works, the battle hasn't begun. */
  stepWaiting(dt) {
    this.cameraManager.handleInput(dt);
    this.environment.update(dt, this.time, this.cameraManager.lookTarget);
    this.cameraManager.update(dt);
    this.audio.update(dt);
    this.commands.update(dt);
    this.hud.update(dt);
  }

  render(dt = 0) {
    // iOS doesn't always say when its toolbar slides: check the size every frame (two reads)
    if (this.container.clientWidth !== this.view.w || this.container.clientHeight !== this.view.h) this.onResize();
    this.buildingMarkers.update();
    this.chat?.update(dt);
    this.touchControls?.update();
    this.fow.update(dt);
    this.ranges.update();
    this.ambience.update(dt);
    this.rain?.update(dt);
    this.radio.update();
    this.labels.update();
    this.barks.update(dt);
    this.minimap.update(dt);
    if (this.babylon) this.babylon.render(this.time);
    else this.post.render(this.time);
  }
}
