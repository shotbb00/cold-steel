# Cold Steel — prototype

*World War III, 1985.* The Cold War has gone hot: Warsaw Pact armies push through the Fulda
Gap and NATO has to hold the line. A tactical war game in Three.js: command rifle squads,
MG and anti-tank teams, tanks and self-propelled guns from above, and drop into third person
to fight as any one of them — in the spirit of *Call to Arms – Gates of Hell*. NATO is blue,
the Pact red. The game name lives in `src/data/game.js`. Built with Vite and TypeScript, drawn
with Babylon.js (the scene is built in Three.js r160; `?renderer=three` draws it with Three);
PeerJS for multiplayer. Terrain, textures and models are generated in code at load; the sounds
are CC0 recordings (`public/sounds/CREDITS.md`) with synthesised fallbacks.
Single player against the AI, or **multiplayer** against a friend — no server to host or pay for.

**Play in the browser: <https://shotbb00.github.io/cold-steel/>** (desktop Chrome, Edge or Firefox).
Every push to `main` rebuilds it (`.github/workflows/pages.yml`).

## Run

Needs [Node.js](https://nodejs.org) (LTS). Double-click **`start.bat`**, or run:

```
npm install        # once: the libraries (three, peerjs, vite, typescript)
npm run dev        # dev server with hot reload, opens http://localhost:8765/
npm run build      # the shareable game in dist/ — static files for any host (GitHub Pages, itch.io)
npm run preview    # try the built dist/ locally
npm run typecheck  # TypeScript check (files move from .js to .ts one at a time)
```

Players of a built version need only a browser: `dist/` is plain static files with relative
paths, so it works from any web host or sub-folder.

The **main menu** sits on a map table: a topographic sheet of the chosen battle map drawn from
its own terrain (ui/MapSheet.js: contours, villages, both bases, grease-pencil front arrows),
with the Cold Steel mark (ui/Logo.js). The battle setup asks three things (what kind of battle,
where, which side) and folds time, weather and battle rules into one sentence you can open.
The loading screen shows the battle's map and a tip. **Installable:** on a phone or desktop the
browser offers to install the game (manifest + service worker, src/pwa/); it then runs full
screen and offline, and every deploy reaches it on its own (it reloads into the new build at
the menu) — no reinstalling. It has these panels:
- **Boot camp:** guided exercises near your base in five chapters, taken in any order
  (modes/bootcamp.js, card in ui/Tutorial.js): *Basics* (camera, selecting, moving and facing, a
  first contact, taking a point), *Fire support* (mortar smoke, artillery and observers, air,
  gas), *Digging in* (trenches, wire and mines, cancelling a job, houses, engineers clearing a
  minefield), *Armour and transport* (reinforcements, smoke launchers, IFVs, repairs) and
  *Fighting in person* (direct control, officers, the ambush). Tasks tick off as you do them; the
  targets shoot back harmlessly; each chapter ends with the next one a click away, and the menu
  ticks the ones done.
- **Single player:** pick a mode, a map, your side, the time of day and the weather, then
  *Deploy* — against the AI, with direct control.
- **Campaign:** a war of up to twelve battles on the Fulda front with one battalion (see below).
- **Multiplayer:** host or join a battle with a friend — against each other or together (see below).
- **Units:** a 3D preview of every unit for both sides, with poses and stats.
- **Settings:** graphics quality, frame counter, volume, menu music, mouse sensitivity, invert Y. Settings
  are saved in the browser and apply live.

In battle, **Esc** pauses (resume, settings, restart, main menu; in multiplayer it opens the
menu without pausing). *Play again* / *Restart battle* go
straight back into the same battle; any other start or reload shows the menu. For development,
`?mode=<id>&map=<id>` (e.g. `?mode=frontline`) skips the menu.

## Modes and maps

- **Frontline** — the land grab and war of points described below.
- **Infantry Only** — Frontline on foot (`src/modes/infantry.js`): the same points, command
  points and front strength, but only infantry can be called in and there is no air support
  (so no MANPADS either). Any vehicles in a map's opening forces are left out.
- **Breakthrough** — the Pact attacks line by line (the villages grouped into lines across the
  front); NATO gets two minutes to dig in. Only the line under attack can be taken; take it and
  the next opens, with fresh reserves and more time. Attack reserves are limited; the defence
  earns a trickle. Play either side.
- **Rearguard** — hold your half for 20 minutes against waves that grow (rifles first, then
  armour). Supplies are cut after 10 minutes; two air strikes. Co-op in multiplayer.
- **Recon raid** — two scout teams and an IFV behind enemy lines: find the HQ, the battery and
  the dump (search areas on the minimap), keep eyes on each for six seconds to call the guns in,
  and get back. Be seen too long, or start a fight, and the alarm brings out a reaction force.
- **Lanes** — DotA on the inner-German border. Three roads, and on each road two fortifications
  per side: a bunker line (a tank turret on a concrete casemate, two MG pits) and behind it a
  strongpoint; the headquarters in front of each base. A strongpoint is shielded until its bunker
  line falls; the HQ until one whole lane of that side is down — destroy it to win. Every 45 s
  each side sends an infantry section down every road (AT, MG and tank support as the waves go
  on) that marches on the next enemy fortification by itself. Your army is what you buy: income,
  kill bounties, +400 CP per fortification, and the supply caches in the woods between the roads.
  Concrete shrugs off small arms — tanks, AT, artillery, mortars and air strikes bring it down.
- **Skirmish** — the old waves mode.
- **Maps:** *Fulda Gap* (three sectors of farmland split by wooded ridges) and *Werra Valley* (a
  river across the border with three bridges over it and no fords. Deep water stops
  everyone; stacks route over the best crossing in single file, and engineers can
  blow a bridge), *Hünfeld* (a town fight: a grid of cobbled streets, ~120 houses to occupy, the
  market square, two churches, the station and the brickworks), *Thuringian Forest* (spruce
  hills cut by three valley roads; the map's `woods` density cuts sight through the trees, so
  armour keeps to roads and clearings), *Hersfeld Airbase* (the open plain around a runway:
  aircraft shelters, hangars, the tower — long sight lines) and *Monte Kali* (a 45 m potash
  spoil heap in the middle; with `overwatch` spotters looking down see up to half again as far).
  Maps can paint their own ground with `theme.terrain.surface(x, z, y)` (streets, runways, salt).
- **Time and weather:** day, dawn, dusk or night; clear, overcast, rain or fog. Low light and bad
  weather shorten everyone's sight (night much more — except the Abrams' and Bradley's thermal
  sights); rain is mud (vehicles slower); mortars carry illumination flares for the night (L).
  In single player the weather moves on every four to seven minutes unless the battle rule says
  otherwise (systems/WeatherChange.js): announced on the radio a minute ahead, then blended in
  over a minute or so — sight, fog, sky, light, rain and mud.

## Campaign

After every battle a soldier of the battalion writes home about it: where you fought, whether
you held, the weather, who didn't come back (campaign/Letters.js). The same man writes while his
unit lives; if it's lost, a comrade takes over.

Three columns (west, centre, east), six sectors deep. Turns alternate: the enemy attacks where
it's strongest, then you pick an enemy front sector to attack. Every battle is a Breakthrough on
the map that sector looks like (Werra crossings on the river map), at the hour the war has
reached, in random weather. One battalion fights them all: survivors come back with their men
and their veterancy (★ ranks), the dead are gone, stacks you bring in during a battle join.
Between battles, replacement points (more for every sector held) refill squads or recruit new
stacks. A successful attack pushes the front a sector; a defence that holds keeps it. Break
through to the enemy's rear to win — or hold more ground after twelve turns. Saved in the browser.

About four in ten of the men a surviving stack loses were only wounded: they rejoin it after the
next battle (shown as +n). The briefing gives intel on the enemy force — counted if the battalion
has scouts or a recon vehicle, otherwise only guessed. Every turn brings an event for the coming
battle: air superiority for one side (the other's aircraft grounded), a battery of guns attached
for that battle, fresh enemy reserves, a supply convoy lost, or fog. The other two columns fight
their own battles and may move a sector (never into either rear). The map marks every battle
fought and shows an arrow on the coming one.

## Multiplayer

One player hosts, the other joins; both need this same version of the game (the same link, or
the same build).

1. Both: type **your name** at the top of the Multiplayer tab (kept for next time).
2. Host: *Multiplayer → Host a game*, pick the map and your side, press **Host game**. A
   five-letter **join code** appears (e.g. `K7Q2M`) — send it to your friend.
3. Friend: *Multiplayer → Join a game*, type the code, **Join**. Both see who is in and on
   which side, and can **chat** in the lobby.
4. Friend: **Ready**. Host: **Start battle** (it waits until the friend is ready). Both load the
   map; the battle begins when both are in.

In battle, **Enter** opens the chat line (Enter sends, Esc closes — the key can be rebound). In
co-op, **Alt + click** on the battlefield or the minimap marks a spot for your teammate and
**Alt + right-click** marks danger: a pulsing ring on the ground and the minimap for a few seconds.

The host also picks the mode and **versus** (one side each) or **co-op** (both on the same side
against the AI — each player commands their own stacks; your partner's are marked; command
points are shared).

The free public PeerJS server only introduces the two browsers; after that the game runs
directly between them (WebRTC), through PeerJS's free relay only when a network blocks direct
links. No code server reachable (no internet, a LAN party, a strict network)? Open *Connect
without a code*: the host creates an invitation, the friend pastes it and sends back a reply,
the host pastes that — no server at all. Codes and invitations work while the host waits.

How it works: the host's browser runs the whole battle, for both sides, as in single player.
The friend's browser builds the same map and shows the host's battle: 15 snapshots a second of
every unit and helicopter, played ~0.12 s behind and interpolated, so motion stays smooth; the
host's muzzle flashes, impacts, sounds and rounds fired are replayed in step (rounds fly and
burst on the friend's screen too, but only the host's do damage). The friend's orders travel to
the host and run there exactly like the host's own. Multiplayer is fought from the command view
(no direct control), the menu doesn't pause, and if the host's window is minimised the battle
keeps running. The top bar shows the ping. Frontline is the multiplayer mode.

## Controls

| Command view (default) | |
|---|---|
| WASD / arrows / screen edge · Wheel | pan · zoom |
| LMB / drag | select stacks / box-select (Shift adds) |
| RMB ground / enemy | move (frontline row in front) / attack |
| RMB **drag** | move there and hold facing the way you drag (drag next to a squad: it just turns) |
| Ctrl/Alt + RMB | move, then hold and dig in |
| Q · 1–9 | select all · select stack N |
| **Tab** or **double-click** a stack | take direct control of one of its members (single player) |
| **C** | the reinforcement window: call in stacks with command points, by infantry / armour / fire support / air defence |
| N · T · V · F (one infantry stack selected) | build sandbags · dig a trench · lay wire · lay mines — Q/E rotate, click to place |
| RMB a house / your IFV (infantry selected) | occupy the building (the men take its windows) / climb in |
| E · U · K · L | leave a building · unload IFVs · smoke (vehicles: launchers; mortars: click) · flare (night, mortars) |
| X (engineers) | clear mines and wire (click the obstacle) · blow a bridge (click it, 8 s fuse) |
| Y · J · P · I | support powers: helicopter strafing run · jet gun run · air assault (lands a squad) · gas — click the target, Q/E turn the run |
| Minimap: LMB · RMB | look there · send the selected stacks there (Ctrl: and hold) |

| Direct control | |
|---|---|
| Click | capture the mouse (Esc releases) |
| WASD · Shift · C · Z | move · sprint · crouch · prone (infantry) |
| Mouse · LMB · R | aim · fire · reload |
| Q / E | switch to another member of the same stack |
| Tab | back to command |
| G / B / O / M | graphics quality (Low / Medium / High) / bloom / ambient occlusion / mute |

Tanks can't strafe: they drive along their hull while the turret follows your aim.

The command panel shows only the actions the selection can use (the digging tools for one
infantry stack, smoke for vehicles and mortars, engineer jobs for engineers, and so on); select
all and the three support powers (with their price, or the seconds until ready) are always there.

## How it plays

- **Frontline mode.** Eleven villages to hold across a 1000 m map in three sectors (west,
  centre, east) split by wooded ridges — room for flanks and for separate battles at once. Only
  infantry captures; a point swings toward the side with soldiers in it and stops while
  contested. Each side opens with one rifle squad at its home village: the first minutes are a
  land grab, and the army is bought with command points (CP) as it goes (up to 22 stacks,
  shown in the reinforcement panel; reinforcements arrive on one of three roads). The side
  holding fewer points bleeds front strength, and every loss costs some too. Reach zero and the
  front collapses.
- **Defensive by nature.** Idle stacks never charge: when enemies come in range they dig in
  where they stand and fight from cover. Stacks told to hold (or left holding) become
  *Dug in* after 15 s — 25 % harder to hurt in cover. Advances happen only by your orders or
  the enemy director's.
- **Battles breathe.** The enemy director first claims empty villages, then works in phases:
  *build* (1.5–2.5 min of regrouping, with scouts or MG teams sent forward to probe — the lone
  shots), *plan* (target the most weakly held nearby point, only with 30 % local superiority),
  *stage* (gather on a flank, off the direct line), *assault* from that angle (opened by a
  helicopter run and a mortar smoke screen), then *consolidate* — or fall back if it fails. With
  a big enough army it runs two or three such operations at once in different sectors. It
  garrisons its exposed points, fortifies them (sandbags, trench, wire, mines) and reinforces any
  that are contested. Assaults go in as fire and manoeuvre: MG teams stop short on the direct
  line as a base of fire while the rest comes in from the flank, and the infantry waits a few
  seconds for the smoke to build; a failed assault pulls back under smoke. Its forward observers
  take ground that sees the fight (so its guns land tight there), and badly hurt stacks pull out
  to its ambulance or the rear and come back once patched up.
- **Lethal infantry.** 100 HP: a solid hit puts a soldier down ~70 % of the time, otherwise
  he's wounded — slow, prone, crawling back — and the next hit finishes him. Rifles fire single
  aimed shots (aiming takes longer at range and under fire). Soldiers stand, crouch or go
  **prone** (a quarter of the target, spotted at 45 %, steadier aim, crawling). Small arms
  barely scratch armour; only AT rockets and tank guns really hurt it (best from the flank).
- **Weapons of 1985.** Rifle squads (M16A2 / AK-74), MG teams (M60 / PKM: one gunner plus two
  riflemen), AT teams (Carl Gustaf / RPG-7: slow rockets with a smoke trail, a long aim and a
  reload after every shot). Only some rounds are tracers (NATO red, Pact green); the rest you
  see by their dust kicks. The MG must be set up (stationary, prone or in cover, ~2 s); then long bursts whose near misses pin whole squads.
- **Fog of war, Gates of Hell style.** Sight is short (infantry ~70 m, MG ~75 m, tanks ~80 m
  buttoned up) and works only inside each unit's view cone (~120° for
  infantry, 90° for tanks; the turret for vehicles). Outside the cone a soldier notices only
  what is within ~12 m. Idle soldiers slowly scan their sector; anyone shot at turns toward the
  fire. Terrain blocks sight; crouched troops in cover are spotted at 60 %, prone at 45 %;
  firing gives a unit away for a few seconds. The rule is the same for the AI: nobody shoots
  what their side can't see — weapons outrange sight, so spotters matter. Whatever none of your
  units can see right now is drawn darker and greyer — ground, trees, houses — in both camera
  modes and on the minimap (ridges cast real sight shadows). Selected stacks (and the one you lead
  in direct control) show a faint white ring at their weapon reach on the ground.
- **Fortifications.** A selected infantry stack can build **sandbags** (a chest-high wall, 15
  CP) or dig a **trench** (30 CP): the terrain is really dug out, a sandbag parapet goes in
  front and a spoil mound behind, and trench positions shelter from every direction. Building
  is faster with more men and stops while they're shooting. Defending squads man cover facing
  their front before contact. The enemy's garrisons fortify too.
- **Artillery.** *Batteries* (2 guns: NATO M109, Pact 2S1) shell anything their side has
  spotted between 45 and 300 m — no line of sight needed — preferring clusters and dug-in
  positions; shells fly real arcs, scatter with range, tear in with a rushing shriek (heard
  only near the impact) and leave craters.
- **Attack helicopters.** *Air strike* (Y, 150 CP, 90 s cooldown) sends a strafing run: an
  AH-1S Cobra for NATO, an Mi-24 Hind for the Pact. Click the target; Q/E turn the run, which
  defaults to straight in from your base. It flies in low, fires a rocket salvo on the
  approach, walks its chin gun along the strafe line, then breaks away home. Enemy MG teams,
  tanks add a little ground fire (tracers), rifles hardly any. The real answer is **SP anti-air**
  (*Flak*, 280 CP, pairs: NATO M163 VADS, Pact ZSU-23-4 Shilka): the radar picks up enemy
  helicopters within ~320 m, the turret slews onto them and fires lead-aimed bursts. Enough
  hits and the helicopter aborts trailing smoke, or goes down and crashes. Against ground
  targets the AA guns shred infantry in the open but do little to tanks. The enemy uses it ahead of assaults and against dug-in
  positions. Types live in `src/data/air.js`.
- **Jets and air assault.** The second and third support powers. *Jet* (J, 220 CP, 130 s): an
  A-10A (two Mavericks at vehicles, then the GAU-8) or an Su-25 (an S-8 rocket salvo, then the
  GSh-30) comes in fast from 1.5 km out, walks one long burst through the target and pulls away —
  flak hardly touches it. *Air assault* (P, 280 CP, 110 s): a UH-60A or Mi-8 (door guns, the
  Hip's rockets on the landing zone) flies an eight-man squad in, lands it on the spot and
  leaves; shot down before it touches down, the squad is lost. The AI sends jets at spotted
  armour and lands a squad behind its assaults.
- **Missile air defence.** *MANPADS teams* (Stinger / Strela-2, 170 CP) and *SAM vehicles*
  (Chaparral / Strela-10, 330 CP) lock on to any enemy aircraft in range (420 / 600 m) and launch
  heat-seekers that chase it down — a good chance to hit a helicopter, less a jet; a few ready
  rounds, then a long reload.
- **More armour and fire.** *Armoured recon* (M3 CFV / BRDM-2): fast, sees 130 m, slightly
  stealthy. *Missile tank destroyers* (M901 ITV / 9P148 Konkurs): ATGMs out to 360 m every 10 s.
  *Heavy tanks* (M1IP / T-80B). *Rocket artillery* (M270 MLRS / BM-21 Grad): ripples its whole
  load onto a spotted cluster (90–450 m) as a wide carpet, then a long reload. *SP mortars*
  (M106 / 2S9 Nona): armoured mortars with smoke and illumination rounds. *Forward observers*:
  any indirect fire on what they can see lands with 40 % of its usual scatter.
- **Support.** *Recovery vehicles* (M88 / BREM-1) repair damaged vehicles parked beside them and
  mend mine-blown tracks; *field ambulances* (M113 / MT-LB) heal wounded infantry nearby and are
  the enemy's last choice of target. Left alone, both drive to nearby work
  (`src/systems/Support.js`). Units can differ per side on top of their shared stats
  (`factionStats`, e.g. the M3's TOWs).
- **Wind.** It veers slowly and blows harder in rain (calm in fog): smoke screens drift with it
  and a strong wind thins them sooner (world/Wind.js).
- **Gas** (I, 200 CP, 150 s cooldown): a chemical fire mission, a support power like the air
  strikes (the AI uses it too, on dug-in infantry). Shells land 9 s after the call; the low cloud
  drifts with the wind for a few minutes. Infantry of both sides near it mask up, aim worse and see
  less until they are out of it a while; vehicles are sealed. In direct control you look through
  the mask's lenses and hear yourself breathe (systems/Gas.js). Off with the air support rule.
- **Smoke.** Tanks and IFVs carry smoke launchers (K, and automatically when hit by an
  anti-armour weapon); mortars fire smoke bombs where you click. Nobody sees through a screen.
- **Mortars** (190 CP): indirect fire on anything spotted, no line of sight needed.
- **IFVs** (420 CP: Bradley / BMP-2) carry a rifle squad (U unloads, right-click one with
  infantry to climb in) and fire a guided anti-tank missile. A knocked-out IFV loses some of its
  passengers.
- **Bridge layers** (240 CP, maps with a river: M60 AVLB / MTU-20): select, X, click the river —
  it drives to the near bank and lays a steel bridge in about 20 s. A new crossing for everyone
  (routes plan over it, engineers can blow it); one bridge per vehicle.
- **Fire.** HE bursts, burning wrecks and white phosphorus (mortar smoke rounds) can set the
  ground alight: stubble burns best, meadow and pasture less, ploughed fields hardly; woods
  well. It spreads downwind, burns out after a minute and leaves black ground; men caught in it
  are burned and pull out upwind. Damp weather slows it, rain puts it out (systems/Fire.js).
- **Engineers** (160 CP): dig and wire three times as fast, find enemy minefields from close by
  (and rarely set one off), clear mines and wire, and blow bridges.
- **Officers.** A rifle platoon's first man is its leader (LT on the label). While he lives, his
  platoon and every friendly stack within 45 m lose morale slower, rally faster and react
  quicker; when he falls the platoon is shaken and slower than one that never had him.
- **Ambush.** A unit nobody has spotted yet fires its first volley with 1.6× the damage and twice
  the suppression — hold your fire, let them come, then spring it.
- **Veterancy.** Kills earn a stack experience: Veteran, Hardened, Elite (★ on its label) — they
  aim faster and truer, shrug off losses and steady sooner.
- **After the battle** a report: both sides' losses, kills, captures, CP spent, rounds fired,
  air strikes, a chart of front strength with the moments that mattered, and the best stacks.
- **The war around you.** Jets streak over, artillery flashes on the horizon, villages burn
  beyond the edge; a radio log on the left keeps the battle's record and the rest of the
  front's traffic.
- **Buildings.** Right-click a house with infantry to occupy it: the squad goes in and each man
  takes a window; a badge over the house shows how many are inside (Leave, or E). Harder to spot and to hurt
  inside. High explosive wears it down until it collapses on whoever is in it.
- **Wire and mines.** Wire slows enemy infantry to a crawl (vehicles flatten it); a minefield is
  invisible to the enemy until the first blast and can immobilise a tank.
- **Recon scouts** (100 CP): two men with binoculars who see far, are hard to spot and hold
  their fire — spotters for your mortars, guns and helicopters.
- **Crews bail out.** A knocked-out tank or gun may leave survivors: a small crew stack
  that runs for base — rescue them and use them.
- **Direct control.** Your unit is a little sturdier, its squad follows and fights around
  you, and allies within 16 m get +30 % fire rate / +20 % damage and steadier morale. Fall, and
  you take over the next member.
- **Soldiers want to live.** Cover-to-cover advances, peek-and-shoot, reloads, suppression,
  wounded falling back, morale that breaks into retreats and recovers, callouts shown as text.
- **Vehicles.** Hulls and turrets extruded from real outlines; running gear with individual track
  links, toothed sprockets, idlers, return rollers and road wheels that turn with distance
  driven. Abrams: seven-panel skirts, bustle rack, doghouse sight, smoke launchers, .50 + M240.
  T-72B: Kontakt-1 ERA on glacis and turret, rubber skirts, fuel drums, unditching log, NSVT,
  IR searchlight. M109 and 2S1 likewise (data/models/vehicleCommon.js holds the kit).
- **Armour.** Tank platoons (3: M1 Abrams / T-72B) fire HE-frag with splash; armour is
  directional — side hits do more, rear hits much more. Knocked-out tanks explode (the T-72
  throws its turret), then burn and smoke for a minute.
- **The field remembers.** Bodies and wrecks stay for the whole battle, blasts leave black
  scorch marks and craters. Knocked-out fighting vehicles often cook off: their ammunition
  goes up in pops and showers of sparks for half a minute, sometimes ending in one big blast
  that hurts anyone close.
- **Effects.** Soft particle smoke, dust, dirt columns with falling clods, fireballs, sparks on
  armour, muzzle blasts with flash lighting, rocket backblast and trails, craters.
- **Movement.** No pathfinding: a man who keeps pushing into a wall sidesteps around it, and
  after a few failed tries climbs over. A direct move order gets men up and sprinting even
  when pinned.
- **Sound.** Synthesised per weapon and calibre (crack, body, thump, echo tail). Each calibre
  carries its own distance (a rifle a few hundred metres, a howitzer the whole map), and in the
  command view the field is heard more evenly; engines fade sooner and the wind drops while the
  guns talk. Heavy shells scream down for two seconds before they land and shake the ground near
  the camera; inside a building the battle outside is muffled and shots slap off the walls; a far
  rumble of the rest of the front swells as the fighting grows. Beyond ~110 m
  shots and blasts switch to a dull thump with a long rolling echo. Machines: the Abrams' gas
  turbine whine, T-72 / artillery diesels, track clatter and squeal, turret traverse whine —
  revs and clatter follow speed (a pool of 4 channels for the nearest vehicles). Supersonic snaps, ricochets,
  magazine reloads, your own footsteps, birds and crows coming back in the lulls. The mixer
  cuts the least audible sound instead of dropping new ones. Audio parameters update at 20 Hz
  and never queue up; sounds are synthesised in the background while the game loads. No speech: callouts are floating
  text (the Pact's in transliterated Russian).
- **Look.** Farmland patchwork (pasture, ploughed fields with per-pixel furrows, stubble,
  meadow) with grassy headlands and hedgerows (leaf-textured foliage cards that sway) along the boundaries, ground cover that follows
  the land use, large-scale colour variation so the ground never tiles, a drifting overcast
  cloud deck, woodland camouflage on NATO uniforms and the Abrams / M109, mud on boots and
  running gear, ambient occlusion, and a filmic grade (muted colour, vignette, faint grain).
  G cycles graphics quality Low / Medium / High (render scale, MSAA, AO, bloom, shadow
  resolution, grass / hedge density); the first run starts on Medium and steps down by itself
  if the frame rate stays under ~32 fps. O toggles ambient occlusion, B bloom.
- **Infantry animation.** Arms and weapon are their own part, pivoting at the shoulders:
  aimed at the target's height, held at low ready on the move, lowered for reloads, muzzle
  climb on each shot, chopping when digging, pawing forward when crawling. Running leans and
  strides longer, the wounded limp, soldiers shuffle when turning on the spot, and each dies
  one of three ways (backward, forward over the knees, sideways).

## Structure

```
index.html / css/style.css   HUD markup and styling
package.json / vite.config.js   npm scripts, Vite (dev server, build into dist/), relative base
tsconfig.json                TypeScript (allowJs: .js and .ts side by side)
start.bat                    npm install on first run, then the dev server
(npm) three 0.160.1          rendering; postprocessing/utils addons via three/addons/*
(npm) peerjs 1.5.4           multiplayer join codes, a separate chunk loaded only when used
src/
  main.js                    main menu, or straight into a battle with ?mode=…
  core/        GameEngine (renderer, loop, wiring), CameraManager (command ↔ chase cam),
               InputHandler, BattleWorld (registry, queries, neighbour hash, sim clock), EventBus, math,
               Orders (every player order as a plain command — run here, or on the host)
  campaign/    Campaign (strategic map, battalion, turns, saving)
  net/         Link (WebRTC connection: join codes via PeerJS, or pasted invitations), protocol
               (binary snapshots, call packing), NetHost (streams the battle), NetClient (shows it)
  world/       Terrain (incl. digging: trenches, craters; field furrow shader), Fields (farmland layout), Cover (colliders + cover spots),
               Props, Vegetation (trees, hedgerows, ground cover), Environment (sky, clouds), GroundDecal, Noise, textures
  data/
    factions.js            colours + allegiance
    game.js                title, tagline (title screen / future main menu)
    units/                 unit types (rifles [vanguard.js], atTeam, mgTeam, tank, artillery, aa, crew): kind, stats, cost, specialist overrides, models per faction
    models/                natoSoldier / pactSoldier (weapon variants), natoAbrams, pactT72, natoM109,
                           pact2S1, vehicleCommon
    barks.js               callout lines per faction and situation (text)
  entities/    UnitStack (squad mechanics for infantry / vehicles, stuck detection), Unit
  ai/          StackAI (Idle / MoveTo / Attack / Defend / Retreat / Follow), SoldierAI (individual
               decisions), FrontlineDirector (strategic enemy), EnemyDirector (skirmish)
  render/      StackRenderer (instanced infantry), RigRenderer (per-unit vehicle rigs), paint (camo / mud shader), FogOfWar (seen / unseen shading),
               PostFX (AO, bloom, colour grade), Quality (presets), index
  render/babylon/  the Babylon.js renderer (default; ?renderer=three for the original): BabylonView mirrors
               the Three scene graph — meshes, instanced meshes (thin instances), materials (PBR), lights,
               sun shadows (cascaded), camera, fog — into a right-handed Babylon scene each frame; sky (the
               sky shader), extras (effect particles, sprites, rain lines, stars), plugins (material
               plugins: fog of war, camo paint, vegetation wind, terrain furrows and variation)
  combat/      ProjectileSystem (rounds, tracers, rockets, shells, splash, directional armour),
               EffectsSystem (particle smoke / fire / dirt, flash lights, burning wrecks), BeamSystem (unused)
  systems/     PlayerControl (direct control), CommandSystem (RTS orders + targeting mode),
               VisibilitySystem (fog of war, view cones), ControlPoints,
               Construction (sandbags, trenches, wire, mines), AirStrike (helicopter strafing runs), CrewBailout,
               Smoke (screens that block sight), Transport (IFV passengers), Buildings (occupation, collapse),
               Flares (night illumination), BattleStats (after-action record, veterancy), Ambience (the war beyond the map)
  audio/       SoundBank (synthesised guns, explosions, impacts, radio…), SampleBank (recorded sounds
               from public/sounds/sounds.json, loudness-matched to the synth they replace; the rest
               stays synthesised), AudioSystem (3D mix, reverb, voice stealing, machine loops,
               ambience, footsteps)
  public/sounds/  recorded sounds (CC0, sources in CREDITS.md; how to add more in README.md)
  ui/          MainMenu, Lobby (multiplayer), CampaignPanel, ReinforceWindow, ActionBar, BuildingMarkers, RadioLog,
               AfterAction, RangeIndicators (weapon reach), UnitPreview, SettingsPanel, PauseMenu, HUD, FrontlineHUD, StackLabels, Barks, Minimap
  core/Settings.js           saved player settings (localStorage), live change events
  core/Conditions.js         time of day and weather: light, sky, sight, mud
  world/River.js             rivers: carving, water, crossings, routing, demolition
  maps/common.js             villages, cover sites, command posts shared by the maps
  maps/  modes/  registries + Fulda Gap / Frontline / Skirmish
```

## Extending

The data registries are TypeScript with shared types in `src/types.ts`: unit types (`satisfies
UnitType`), aircraft (`data/air.ts`, `PerFaction<Aircraft>`) and maps (`satisfies MapDef`). Run
`npm run typecheck` after editing one — a misspelt stat or a missing field is reported with the
right name suggested, instead of failing silently in battle. Engine and mode code is still
JavaScript and moves over file by file.

**Unit type** — a file in `src/data/units/` (`.ts`, `satisfies UnitType`) with `kind` (`infantry` | `vehicle`), `category`
(`infantry` | `armour` | `fire` | `airdefence` | `support`: its section in the reinforcement window),
`formation`, `stats` (hp, armor, speed, sight, range, preferredRange, weapon `rifle` | `rocket` | `cannon`
| `artillery`, tracer share, trail, damage/splash/pierce/vsArmor, aimTime, stance, deployTime, suppressPower, magazine,
reload, breakMorale, playerFireInterval…), optional `specialist: { count, stats }` for members
with a different weapon (see `mgTeam.ts`; `specialistModels` gives them their own model), `cost`,
`camera` (chase framing), `weaponSound` and `models: { faction: build }`. Register it in
`src/data/units/index.js`; it appears in the reinforcement panel and the menu's unit preview automatically (`variants: { faction: { name, weapon, text } }` gives the preview its names and text).

**Model** — infantry: `{ torso, arms, glow, thigh, shin, rig, muzzle }` (arms + weapon pivot at `rig.shoulderY`; part option `camo: 1` and `grime()` feed render/paint.js) built with the `P.*` helpers
(see `natoSoldier.js`). Vehicles: `build(mats)` returning
`{ root, muzzle, animate(u, dt, t, ctx), die(time) }` (see `natoAbrams.js`, `pactT72.js`).

**Map** — `src/maps/fuldaGap.ts` (`satisfies MapDef`; a river map: `src/maps/werraValley.ts` with `river`): `height(x, z)`, `theme`, `bounds`, `bases`, `spawns`,
`points` (control points), `description` (menu card) and `decorate(ctx)`. Register in `src/maps/index.js`.

**Mode** — `{ id, name, description, setup(game), update(game, dt) }` (shows up in the menu automatically) in `src/modes/`, registered in
`src/modes/index.js` (see `frontline.js`). For multiplayer add `multiplayer: true`, a client
setup (`game.net?.isClient`: points and HUD only) and `clientUpdate(game, dt)`; skip the AI
director when `game.net` is set, and send each side its own messages with `game.tell(faction, …)`.

**Multiplayer rules for new systems** — the host's simulation is the only truth. Player-facing
messages go through `game.tell` / `game.tellBoth` / `game.announce` (not a raw `toast`), so each
side gets its own wording. Calls to `game.effects.*` and `game.audio.play/weapon` during the
simulation reach the client by themselves; a lasting change to the battlefield the client must
copy (a new structure, a collapse …) needs a `game.netEvent(...)` and a case in
`NetClient.apply`. Player actions become a command in `core/Orders.js`.

**Faction** — colours in `factions.js`, lines in `barks.js`,
sounds keyed `<faction>.<sound>` in `audio/SoundBank.js`, and a model per unit type.

**Headless testing** — `game.step(dt)` advances the simulation without rendering; `game` is on
`window`: `game.renderer.setAnimationLoop(null); for (let i = 0; i < 1800; i++) game.step(1/30); game.render()`.
Multiplayer can be tested with two browser pages on one machine: one hosts, the other joins with
the code (the host page can run `setInterval(() => game.step(1/30), 33)` instead of rendering).
