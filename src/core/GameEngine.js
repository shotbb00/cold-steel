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
import { armiesOn } from '../maps/index.js';
import { Caves } from '../systems/Caves.js';
import { setClimate } from '../render/paint.js';
import { setWind } from '../world/Wind.js';
import { Deployment } from '../systems/Deployment.js';
import { watchBattle } from '../wcampaign/battle.js';
import { Powers1806 } from '../systems/Powers1806.js';
import { Barrage } from '../systems/Barrage.js';
import { Doctrine } from '../systems/Doctrine.js';
import { Torpedoes } from '../systems/Torpedoes.js';
import { SeaFoam } from '../world/SeaFoam.js';
import { Squalls } from '../systems/Squalls.js';
import { Landing } from '../systems/Landing.js';
import { Minefields } from '../systems/Minefields.js';
import { Blockships } from '../systems/Blockships.js';
import { Searchlights } from '../systems/Searchlights.js';
import { Missiles } from '../systems/Missiles.js';
import { Sensors } from '../systems/Sensors.js';
import { AutoFlares } from '../systems/AutoFlares.js';
import { Breakdowns } from '../systems/Breakdowns.js';
import { Gas } from '../systems/Gas.js';
import { SEA_STATE } from '../world/Sea.js';
import { unitCost, armyDoctrine, doctrineCovers } from '../data/doctrine.js';
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
import { EPOCHS, epoch } from '../data/epoch.js';
import { Drones } from '../systems/Drones.js';
import { Airfields } from '../systems/Airfields.js';
import { getUnitType, UNIT_TYPES, standInFor, fieldsUnits, campaignArmy } from '../data/units/index.js';
import { warmRig } from '../render/RigRenderer.js';
import { BlobShadows } from '../render/BlobShadows.js';
import { VehicleDust } from '../render/VehicleDust.js';
import { buildEnvironment } from '../world/Environment.js';
import { Terrain } from '../world/Terrain.js';
import { CoverMap } from '../world/Cover.js';
import { EffectsSystem } from '../combat/EffectsSystem.js';
import { ProjectileSystem } from '../combat/ProjectileSystem.js';
import { BeamSystem } from '../combat/BeamSystem.js';
import { UnitStack, RANKS } from '../entities/UnitStack.js';
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
import { keys, touchScreen, keyOf } from './Keys.js';
import { rulesFrom, DIFFICULTY } from '../data/rules.js';
import { BattleChat } from '../ui/Chat.js';
import { WeatherChange } from '../systems/WeatherChange.js';
import { CounterBattery } from '../systems/CounterBattery.js';
import { Jamming } from '../systems/Jamming.js';
import { Fire } from '../systems/Fire.js';

/** Which renderer draws the battle: Babylon.js (default), or ?renderer=three for the original. */
const CRATER_COVER = 0.4; // m: a crater this deep (artillery, rockets) shelters men lying in it
const RENDERER = new URLSearchParams(location.search).get('renderer') === 'three' ? 'three' : 'babylon';

/**
 * A sea map's homes and spawn points in water a ship can float in. maps/index.js widenSea moves them out with the map
 * but leaves the coasts where they are, so one can end up on land (Savo Sound, the Baltic, North Cape did): each
 * ship's spawn (and, on a widened map, a home) goes to the nearest water at least DEEP m deep; the console says so — the map wants fixing.
 */
function seaward(map, terrain, DEEP = 4) {
  const level = map.river?.level ?? 0, b = map.bounds;
  const wet = (x, z) => Math.abs(x) < b.x - 40 && Math.abs(z) < b.z - 40 && level - terrain.heightAt(x, z) >= DEEP;
  const fix = (p, what) => {
    if (!p || wet(p.x, p.z)) return p;
    for (let r = 25; r <= 2000; r += 25) for (let k = 0; k < 32; k++) {
      const x = p.x + Math.cos((k / 32) * Math.PI * 2) * r, z = p.z + Math.sin((k / 32) * Math.PI * 2) * r;
      if (wet(x, z)) { console.warn(`${map.id}: ${what} was ashore at ${Math.round(p.x)},${Math.round(p.z)} — moved ${r} m out to sea`); return { ...p, x, z }; }
    }
    return p;
  };
  for (const f of ['nato', 'pact']) {
    if (map.widenedHere && map.bases?.[f]) map.bases[f] = fix(map.bases[f], `${f} home`); // (a map laid out by hand keeps its own: Copenhagen's)
    if (map.spawns?.[f]) map.spawns[f] = map.spawns[f].map((sp, i) => (getUnitType(sp.unit)?.stats?.naval ? fix(sp, `${f} ${sp.unit} ${i + 1}`) : sp)); // (ships only: a shore battery stands ashore)
  }
}

export class GameEngine {
  /** How rough the sea runs (1 calm … 1.8 rough: the weather at sea, systems/Squalls.js); 1 on land. */
  get seaState() { return this.squalls ? SEA_STATE.value : 1; }

  /**
   * `net`: { role: 'host' | 'client', link } for a multiplayer battle;
   * `conditions`: { time, weather } (core/Conditions.js).
   */
  constructor(container, { map, mode, playerFaction = PLAYER_FACTION, net = null, conditions = null, coop = false, campaign = null, rules = null, armies = null }) {
    this.map = map;
    setWind(map.wind ?? (epoch() === '1806' && map.theatre === 'sea' ? { from: 250, speed: 7, veer: 0.3 } : null)); // (a map's own wind: the sea's for the sails — world/Wind.js; 1806 at sea on a map with none, openSea: a fresh westerly, or the sails would barely move)
    setClimate(map.climate); // winter whitewash, desert sand paint (render/paint.js)
    const sides = { ...EPOCHS[epoch()]?.sides, ...map.sides }; // (a map may name its own sides: the Pacific's United States and Japan)
    if (sides.nato) FACTIONS.nato.name = sides.nato;
    if (sides.pact) FACTIONS.pact.name = sides.pact;
    this.mode = mode;
    // the size the picture is drawn at: the container, not innerWidth/innerHeight — on an iPhone
    // Safari's sliding toolbar makes those differ, and every label placed by them drifts (onResize)
    this.container = container;
    this.view = { w: container.clientWidth || innerWidth, h: container.clientHeight || innerHeight };
    this.playerFaction = playerFaction;
    this.coop = !!(net && coop);
    this.campaign = campaign; // a world-campaign battle (wcampaign/battle.js battleChoice)
    this.rules = rulesFrom(campaign ? null : rules); // battle rules (data/rules.js; multiplayer: the host's)
    this.armies = armiesFrom(armies, map); // which army each side fields (data/factions.js ARMIES; the Pacific's on its maps only)
    const only = armiesOn(map); // (a map fought by particular armies only, in this war: Omaha, Stalingrad, the Hesse maps in 1945 — maps/index.js)
    for (const f of ['nato', 'pact']) if (only?.[f] && (map.theatre === 'sea' || !only[f].includes(this.armies[f]) || !fieldsUnits(this.armies[f]))) this.armies[f] = only[f].find(fieldsUnits) ?? only[f][0]; // (at sea: the map's navy, the first it names — as the menu's side card)
    if (campaign) for (const f of ['nato', 'pact']) if (campaignArmy(armies?.[f], map)) this.armies[f] = armies[f]; // (a world-campaign battle: the army that is there fights, any map — data/units/index.js campaignArmy)
    this.myOwner = !net ? null : net.role === 'host' ? 'host' : 'guest'; // co-op: whose stacks are mine
    this.currentOwner = null;  // while an order runs: who gave it (new stacks are theirs)
    this.bus = new EventBus();
    this.torpedoes = new Torpedoes(this); // (the sea: systems/Torpedoes.js)
    this.systems = [new Doctrine(this), this.torpedoes]; // extra per-frame systems (game modes add theirs); the armies' doctrine
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
    this.camera = new THREE.PerspectiveCamera(62, this.view.w / this.view.h, map.camera?.near ?? 0.1, map.camera?.far ?? 2000); // (a sea map sees further — and starts further: depth precision for shoals under the surface km away)
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
    this.terrain.occluders = this.cover; // (sight stops at buildings: Terrain.lineOfSight → Cover.sightBlocked)
    this.decor = map.decorate?.({
      scene: this.scene, terrain: this.terrain, cover: this.cover, bounds: map.bounds, rand: mulberry32(map.seed ?? 1),
    }) ?? null;
    if (!this.cover.finalized) this.cover.finalize(map.bounds);
    if (map.theatre === 'sea') seaward(map, this.terrain); // (no fleet ashore: the widening moves homes, not coasts)
    this.world = new BattleWorld({ bounds: map.bounds, terrain: this.terrain, cover: this.cover, bases: map.bases });
    this.world.playerFaction = playerFaction;
    this.world.river = map.river ?? null; // water that stops and slows (a sea map: world/Sea.js)
    this.world.coastal = map.theatre === 'coastal'; // the sea and the land in one battle (Omaha): ships and armies both
    this.world.openSea = !!map.river?.sea && !this.world.coastal; // ships only, nothing ashore
    this.world.navCell = map.navCell; // (a sea map: coarser routing cells)
    this.world.steep = map.steep ?? null; // (ground too steep for vehicles: Omaha's bluffs)
    this.world.soft = map.soft ?? null;   // (soft ground: Bobruisk's bog, Iwo Jima's ash — routes go round it: world/Nav.js)
    this.world.armies = this.armies;
    this.world.mapArmies = only; // (the armies the map names: its ships' names are theirs — entities/UnitStack.js shipName)
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
    if (map.camera?.maxHeight) this.cameraManager.tactical.maxHeight = map.camera.maxHeight; // (a 5 km sea: zoom out much further)
    if (map.river?.sea) this.cameraManager.waterLevel = map.river.level; // (never down to the sea floor)
    if (map.river?.foam) this.systems.push(new SeaFoam(this, map.river)); // wakes, boils, torpedo tracks (world/SeaFoam.js)
    if (map.river?.sea) { this.squalls = new Squalls(this); this.missiles = new Missiles(this); this.sensors = new Sensors(this); this.searchlights = new Searchlights(this); this.systems.push(this.squalls, this.searchlights, this.missiles, this.sensors); } // (1985: anti-ship missiles and their defence, radar and ESM bearings) // rain squalls and the sea state; searchlight beams at night
    if (this.world.coastal) { this.landing = new Landing(this); this.systems.push(this.landing); } // the side that lands comes ashore in landing craft
    if (map.landing?.blockships) { this.blockships = new Blockships(this); this.systems.push(this.blockships); } // (Zeebrugge: the blockships for the canal mouth)
    if (map.theatre === 'sea') { this.mines = new Minefields(this); this.systems.push(this.mines); } // moored mines: the map's fields, the minelayers', the sweepers (1918)
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
    this.buildings = new Buildings(this, (this.decor?.buildings ?? []).filter((b) => !b.removed)); // (one that stood in a bigger one was taken out: world/Props.js clearOverlaps)
    this.projectiles.buildings = this.buildings;
    this.air = new AirStrike(this);
    this.support = new Support(this);
    this.powers = new Powers1806(this);   // 1806's grand battery, cavalry reserve, the Guard
    this.systems.push(this.powers, new AutoFlares(this), new Breakdowns(this), (this.gas = new Gas(this))); // (the first tanks' breakdowns and ditchings, gas: 1918) (and flares of their own at night for the player's mortars and ships)
    this.barrage = new Barrage(this);     // the Soviet Army's preparatory barrage (a support power)
    this.counterBattery = new CounterBattery(this); // radars that find the enemy's guns
    this.jamming = new Jamming(this);     // electronic warfare: jammed radio nets
    this.drones = epoch() === '2027' ? new Drones(this) : null; // recon quads, FPVs, loitering munitions
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
    this.dust = new VehicleDust(this); // what moving vehicles throw up (render/VehicleDust.js)
    this.blobs = new BlobShadows(this); // contact shadows where the preset has no sun shadows (Very low)
    this.hud = new HUD(this);
    this.labels = new StackLabels(this);
    this.buildingMarkers = new BuildingMarkers(this);
    this.barks = new Barks(this);
    this.minimap = new Minimap(this);
    this.pause = new PauseMenu(this);
    this.paused = false;

    this.bindControls();
    if (campaign) { this.blasts = []; if (campaign.scars) this.replayScars(campaign.scars); } // the sector as the last battle left it
    // a fought-over field (1918: maps/common.js trenchLine, shellField), the same on every machine (seeded alike): the craters,
    // the ruins, the trenches and the wire — built quietly by each, first, so their site ids match (a stretch of wire cut later is cleared by id)
    const field = map.battlefield?.(this);
    if (field) {
      field.paint?.(this.terrain); // (the churned ground first: the craters dig into it)
      this.replayScars({ blasts: field.blasts, ruins: field.ruins });
      const n0 = this.construction.structures.length;
      this.quietly(() => this.replayScars({ works: field.works.map((w) => [w.kind, w.x, w.z, w.yaw, w.faction]) }));
      for (const st of this.construction.structures.slice(n0)) st.fromMap = true; // (the map's own: not a scar the campaign keeps — the map lays them again)
    }
    this.airfields = new Airfields(this); // each side's airfield, its runway laid on every machine alike (tester feedback 2026-11-17)
    this.airfields.plan(mode.id === 'bootcamp'); // (boot camp: only the player's, for its airfield lesson)
    this.caves = new Caves(this); // a map's cave mouths and the tunnels between them (Iwo Jima)
    this.systems.push(this.caves);
    mode.setup(this);
    if (campaign?.wc) this.worldCampaign(campaign); // (a battle of the world campaign: its sides' weight, the AI on both, the result back)
    if (!this.net?.isClient) this.airfields.spawn(); // (the host's: a guest gets the stacks)
    if (!this.net?.isClient) this.construction.predig(); // the Bundeswehr's Sperrverband (data/doctrine.js)
    this.deployment = new Deployment(this); // the clock stopped while you place your stacks — campaign battles only, alone or in co-op
    this.deploys = ((!!campaign && !(campaign.wc && !campaign.forces)) || !!mode.deploys) && mode.id !== 'bootcamp'; // (the world campaign: only a fought land battle opens in it) // (a pitched battle opens in it too: modes/pitched.js)
    if (this.deploys && !this.net?.isClient) this.deployment.begin(); // (a co-op guest begins once the host's battle is in: NetClient.init)
    if (this.rules.air === false) for (const f of Object.keys(FACTIONS)) this.air.limit[f] = 0; // battle rules: no air support
    for (const [f, n] of Object.entries(map.airLimit ?? {})) this.air.limit[f] = n; // (a map's own: no Japanese aircraft over Iwo Jima)
    // co-op: each player has command points of their own, earned at the full rate (wallet()), and
    // the AI side starts with and earns twice as much to make up for it
    const cp = this.modeState?.cp;
    if (this.coop && cp) {
      cp[this.wallet(playerFaction, 'guest')] = cp[playerFaction];
      cp[enemyOf(playerFaction)] *= 2;
    }
    // co-op: the opening forces are shared out between the two players
    if (this.coop && this.net.isHost) {
      // (a campaign battle: the stacks of the battalions the friend commands are the friend's — unless that leaves one of you with nothing)
      const fr = this.campaign?.friend ?? [], mine = this.world.stacksOf(playerFaction);
      const byBn = mine.map((s) => (s.campBid ? (fr.includes(s.campBid) ? 'guest' : 'host') : null));
      const split = fr.length && byBn.includes('guest') && byBn.includes('host');
      mine.forEach((s, i) => { s.owner = split && byBn[i] ? byBn[i] : i % 2 ? 'guest' : 'host'; });
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
      for (const f of ['nato', 'pact']) { // (and the vehicles' paint, though none is on the field yet)
        const army = this.armyOf(f), t = Object.values(UNIT_TYPES).find((u) => u.kind && u.kind !== 'infantry' && !['cavalry', 'gun', 'wagon'].includes(u.kind) && (u.models?.[army] ?? u.models?.[f])); // (an army with no vehicle of its own, the British of 1801: its side's boats, in its own paint)
        try { if (t) warmRig(this.babylon, t, army, new THREE.Color(FACTIONS[f].marking)); } catch { /* (a model that needs a battle around it) */ }
      }
      // horses and riders (render/paint.js fabric 'coat' and 'cloth'): one shared shader each — compiled now, or the first squadron rides in invisible for seconds
      const cav = Object.values(UNIT_TYPES).find((u) => u.kind === 'cavalry' && u.models);
      try { if (cav) warmRig(this.babylon, cav, this.armyOf('nato'), new THREE.Color(FACTIONS.nato.marking)); } catch { /* (as above) */ }
      this.air?.warm(); // (and every aircraft this battle can call: AirStrike.warm)
      this.babylon.render(0);
      this.babylon.scene.whenReadyAsync().then(begin, begin);
    } else begin();
  }

  /**
   * Create a stack of `unitId` for `faction` at {x, z}. Used by game modes. Every army fields only its own units: a type it lacks
   * comes as its stand-in (data/units/index.js standInFor), and one it has nothing for not at all — null.
   */
  spawnStack(unitId, faction, position, facing = 0, name, { count, id = null } = {}) {
    const typeId = standInFor(unitId, this.armyOf(faction));
    if (!typeId) return null;
    if (count && typeId !== unitId) count = Math.max(1, Math.round(count * (getUnitType(typeId).formation?.count ?? 1) / (getUnitType(unitId).formation?.count ?? 1))); // (the same share of its men: a campaign battalion's losses)
    const stack = this.spawnStackRaw(typeId, faction, position, facing, name, { count, id });
    if (doctrineCovers(stack.army, 'veteran', stack.type, stack.stats) && stack.xp < RANKS[1].xp) stack.setXp(RANKS[1].xp); // (data/doctrine.js veteran: the ROK's conscripts)
    if (stack.type.id === 'heavyTank' && armyDoctrine(stack.army, 'cats') && stack.xp < RANKS[1].xp) stack.setXp(RANKS[1].xp); // the Wehrmacht's Big cats: Veteran crews
    if (stack.type.id === 'tank' && stack.stats.cavalry && armyDoctrine(stack.army, 'gardeDuCorps') && stack.xp < RANKS[1].xp) stack.setXp(RANKS[1].xp); // Saxony's Garde du Corps: Veteran
    const light = stack.type.id === 'reconVehicle' && stack.stats.cavalry && armyDoctrine(stack.army, 'lightHorse');
    if (light) { stack.stats = { ...stack.stats, sight: stack.stats.sight * light.sight }; for (const u of stack.units) u.stats = stack.unitStats(u.index); } // Bavaria's light horse sees farther
    return stack;
  }

  spawnStackRaw(unitId, faction, position, facing = 0, name, { count, id = null } = {}) {
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
      const at = river.at(c, (Math.random() - 0.5) * c.width, (i - 1.5) * river.halfWidth * 0.5); // (along the deck, whichever way the river runs)
      this.effects.explosion({ x: at.x, y: pos.y, z: at.z }, 1.6, { ground: false, fire: 0.4 });
    }
    this.audio.play('explosion.big', pos, { volume: 1 });
    for (const s of this.world.stacks) {
      for (const u of s.units) {
        if (!u.alive) continue;
        const L = river.local(c, u.pos.x, u.pos.z);
        if (Math.abs(L.u) < c.width / 2 + 2 && Math.abs(L.v) < river.halfWidth + 2) u.receiveDamage(600, null, 0.6);
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
   * A campaign's memory of a battlefield (its scars): what this battle leaves behind —
   * its craters (with the ones from before), the defences still standing, the collapsed houses,
   * the blown bridges and the ones laid.
   */
  scars() {
    const river = this.world.river;
    return {
      blasts: this.blasts ?? [],
      works: this.construction.structures.filter((s) => !s.def.action && !s.fromMap).map((s) => [s.kind, Math.round(s.x * 10) / 10, Math.round(s.z * 10) / 10, Math.round(s.yaw * 100) / 100, s.faction]),
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
      for (const i of ruins) { const b = this.buildings.list[i]; if (b) this.buildings.collapseVisual(b, true); }
      if (river) {
        for (const id of blown) { const c = river.crossings.find((k) => k.id === id); if (c) river.blow(c, t, this.scene); }
        for (const [x, z] of laid) river.lay(x, t, this.scene, z);
      }
    });
    const C = this.construction;
    if (works.length) C.startBatch(); // (built in one go: no work in progress, the ground changed once, one mesh for the trenches and one for the wire)
    for (const [kind, x, z, yaw, faction] of works) {
      const site = C.place(kind, x, z, yaw, faction, null, { force: true });
      if (!site) continue;
      site.quiet = true;
      C.finish(site);
    }
    C.endBatch();
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
    if (!stack) return this.bus.emit('toast', touchScreen() ? 'Select one of your stacks, then tap Control' : `Select one of your stacks, then press ${keyOf('toggleView')} to take control`);
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

  /** Pay from a budget of the mode's ('build', 'support': systems/Economy.js) — CP where it has none. */
  spendFrom(pool, faction, cost) {
    const p = this.modeState?.[pool];
    if (!p) return this.spend(faction, cost);
    if (p[faction] < cost) return false;
    p[faction] -= cost;
    return true;
  }

  refundTo(pool, faction, cost) {
    const p = this.modeState?.[pool];
    if (p) p[faction] += cost; else this.refund(faction, cost);
  }

  /** What a budget is called in messages. */
  poolName(pool) {
    return this.modeState?.[pool] ? (pool === 'build' ? 'building budget' : 'support points') : 'command points';
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
    // the report is up: a moment later the battle behind it stops — no simulation, no drawing (a faster
    // frame would only raise the resolution, and a phone near its memory limit dies on the bigger buffers)
    if (this.ended && (this.endedFor = (this.endedFor ?? 0) + raw) > 2) {
      if (!this.frozen) { this.frozen = true; this.audio.fadeOut?.(); }
      return;
    }
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

  /**
   * A world-campaign battle (wcampaign/battle.js): at sea and on a beach each side's command points (and a frontline's
   * strength) by its campaign power;
   * and what the battle cost each side stored for the war room.
   */
  worldCampaign(camp) {
    const st = this.modeState;
    for (const [f, k] of Object.entries(camp.scale ?? {})) {
      if (st?.cp?.[f] != null) st.cp[f] *= k;
      if (st?.strength?.[f] != null) st.strength[f] *= k;
      if (st?.income?.[f] != null) st.income[f] *= k;
    }
    if (st?.strength && camp.scale) st.maxStrength = Math.max(st.strength.nato ?? 0, st.strength.pact ?? 0, st.maxStrength ?? 0);
    watchBattle(this);
    for (const [f, n] of Object.entries(camp.air ?? {})) this.air.limit[f] = n; // (the campaign's aircraft over the battle: so many calls, none without)
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
    this.crews.update(dt);
    this.buildings.update(dt);
    this.smoke.update(dt);
    this.flares.update(dt);
    this.barrage.update(dt);
    this.fire.update(dt);
    this.counterBattery.update(dt);
    this.jamming.update(dt);
    this.drones?.update(dt);

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
    this.landing?.clientUpdate(dt); // (coastal: the tide by the clock)
    this.projectiles.update(dt);
    this.effects.update(dt);
    this.smoke.update(dt);
    this.flares.update(dt);
    this.barrage.update(dt);
    this.fire.update(dt);
    this.air.updateChutes(dt); // a paradrop's men on the way down (the host's 'chute')
    this.drones?.update(dt);   // the host's drones, drawn where it says (Drones.apply)
    for (const sys of [this.squalls, this.searchlights, this.missiles, this.sensors]) sys?.update(dt, t); // at sea: squalls, beams, the host's missiles in flight, your own ESM bearings
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
    this.blobs.update();
    this.dust.update(dt);
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
