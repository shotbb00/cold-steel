# Sounds

Recorded sounds for Cold Steel. Put audio files in this folder (sub-folders are fine) and list them
in `sounds.json` under the key they replace:

```json
{
  "nato.rifle": ["guns/m16-1.ogg", "guns/m16-2.ogg", "guns/m16-3.ogg"],
  "explosion.big": { "files": ["blasts/he-big-1.ogg"], "gain": 0.8 }
}
```

- Several files per key: each shot picks one at random — three to five takes make fire sound alive.
- Loudness is matched automatically to the synthesised sound the file replaces, so the mix stays
  balanced; `gain` trims it further (1 = as matched).
- Keys you don't list keep their synthesised sound. A file that fails to load is skipped (the
  browser console says which).
- Loops (engines, tracks, rotors, wind, rain) are made seamless when they load: a few seconds of
  steady sound is plenty.
- Formats: `.ogg` or `.mp3` (both play in every current browser), mono is fine and smaller.
- Licence: only use sounds you may redistribute (CC0 / public domain, or your own). Note the source
  of each in `CREDITS.md`.

## Keys

| Group | Keys |
|---|---|
| Small arms | `nato.rifle` `pact.rifle` (M16A2 / AK-74) · `nato.mg` `pact.mg` (M60 / PKM) · `*.far` versions heard beyond ~110 m: `nato.rifle.far` `pact.rifle.far` `nato.mg.far` `pact.mg.far` |
| Heavy weapons | `nato.cannon` `pact.cannon` (tank guns) · `nato.autocannon` `pact.autocannon` (IFV, recon) · `nato.aa` `pact.aa` (Vulcan / Shilka) · `nato.rocket` `pact.rocket` (AT launchers, ATGMs) · `.far` versions: `nato.cannon.far` `pact.cannon.far` `nato.autocannon.far` `pact.autocannon.far` `nato.aa.far` `pact.aa.far` |
| Indirect fire | `nato.arty` `pact.arty` (howitzers) · `nato.mortar` `pact.mortar` · `nato.mlrs` `pact.mlrs` (one rocket of a salvo) · `nato.sam` `pact.sam` (SAM / MANPADS launch) · `nato.arty.far` `pact.arty.far` · `arty.distant` (the war over the horizon) · `incoming.0` `incoming.1` `incoming.2` (a shell coming down — keep it low, no high whistle) |
| Explosions and impacts | `explosion` `explosion.big` `explosion.far` `explosion.big.far` · `impact.ground` `impact.stone` `impact.armor` `impact.flesh` · `ricochet` · `snap` (a round passing close) · `smoke.pop` |
| Aircraft | `rotor.cobra` `rotor.hind` `rotor.uh60` `rotor.mi8` (loops) · `heli.m197` `heli.yakb` (chin guns) · `heli.rocket` · `jet` (loop) · `jet.gau8` `jet.gsh30` (one whole gun burst) · `jet.missile` |
| Vehicles (loops) | `engine.diesel` `engine.dieselSmall` `engine.turbine` · `tracks.heavy` `tracks.light` · `traverse` (turret drive) |
| Soldiers | `nato.reload` `pact.reload` · `death` · `step.0` – `step.3` (footsteps: grass, long grass, stones, soft earth) |
| Radio and UI | `nato.radio` `pact.radio` (a short transmission) · `nato.horn` `pact.horn` (objective taken, new wave) · `order` `click` `ready` `hurt` `whoosh` |
| Ambience | `wind` `rain` (loops) · `birds` `crow` · `flare.pop` |
