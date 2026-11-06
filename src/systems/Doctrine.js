// The armies' signature mechanics that change from moment to moment (data/doctrine.js), as
// multipliers on each stack (stack.doc), refreshed every second on the host:
//   aim    the spread is divided by it   (Verbundene Waffen: infantry near a friendly IFV)
//   supp   suppression taken             (Verbundene Waffen: less; Reckless tempo: more once stalled)
//   speed, fire                          (Reckless tempo: advancing on the enemy)
// and the Cavalry screen's marks: enemies a US recon stack can see take more damage from
// everyone for a while (stack.markedUntil, stack.markDamage — UnitStack.damageUnit).
import { doctrine } from '../data/doctrine.js';
import { enemyOf } from '../data/factions.js';

export const RECON = new Set(['scouts', 'reconVehicle']);
const DEEP = new Set(['artillery', 'rockets', 'spMortar', 'mortar', 'commandPost']); // AirLand Battle's bounty: guns and HQs

export class Doctrine {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.lost = []; // the Wehrmacht's Counter-attack (1945): { faction, p, until } — points just lost
    game.bus.on('point:owner', ({ point, owner, prev }) => {
      if (prev && !owner) this.lost.push({ faction: prev, p: point, until: game.time + (doctrine(game, prev, 'counter')?.window ?? 0) });
      if (owner) this.lost = this.lost.filter((l) => l.p !== point || l.faction !== owner); // taken back
    });
    game.bus.on('unit:death', ({ stack, killer }) => {
      const f = killer?.faction;
      const al = f && f !== stack.faction && DEEP.has(stack.type.id) && doctrine(game, f, 'airland');
      if (!al || game.net?.isClient || stack.units.some((u) => u.alive)) return;
      game.refund(f, al.bounty, killer.owner);
      game.tell(f, `${stack.name} knocked out — AirLand Battle: +${al.bounty} CP`);
    });
  }

  update(dt) {
    if (this.game.net?.isClient || (this.t -= dt) > 0) return;
    this.t = 1;
    const g = this.game;
    const w = g.world;
    for (const s of w.stacks) {
      const doc = { aim: 1, supp: 1, speed: 1, fire: 1 };
      const near = (o, r) => Math.hypot(o.x - s.centroid.x, o.z - s.centroid.z) < r;
      const vw = s.usesCover && doctrine(g, s.faction, 'verbund');
      if (vw && w.stacksOf(s.faction).some((o) => o.type.id === 'ifv' && near(o.centroid, vw.range))) {
        doc.aim = vw.aim;
        doc.supp = vw.suppression;
      }
      const ca = !s.stats.structure && doctrine(g, s.faction, 'counter');
      if (ca && this.lost.some((l) => l.faction === s.faction && l.until > g.time && near(l.p, ca.radius))) {
        doc.fire *= ca.fire;
        doc.aim *= ca.aim;
        s.morale = Math.min(1, s.morale + ca.morale);
      }
      const tempo = !s.stats.structure && doctrine(g, s.faction, 'tempo');
      if (tempo) {
        const foe = w.bases[enemyOf(s.faction)];
        const d = foe ? Math.hypot(foe.x - s.centroid.x, foe.z - s.centroid.z) : 0;
        const advancing = s.foeD !== undefined && s.foeD - d > 0.5;
        s.foeD = d;
        const contact = s.units.some((u) => u.alive && u.target);
        s.stallT = contact && !advancing ? (s.stallT ?? 0) + 1 : 0;
        if (advancing) { doc.speed = tempo.speed; doc.fire = tempo.fire; }
        if (s.stallT >= tempo.stall) doc.supp *= tempo.suppression;
      }
      s.doc = doc;
      const b = s.barrage;
      if (b && (b.t += 1) >= b.every) { // the Feuerwalze steps forward
        b.t = 0;
        if (--b.left <= 0) {
          b.target.alive = false;
          s.barrage = null;
        } else {
          const p = b.target.pos;
          p.x += Math.sin(b.yaw) * b.step;
          p.z += Math.cos(b.yaw) * b.step;
          p.y = g.terrain.heightAt(p.x, p.z);
        }
      }
      const cav = RECON.has(s.type.id) && doctrine(g, s.faction, 'cavalry');
      if (cav) {
        for (const e of w.stacksOf(enemyOf(s.faction))) {
          if (!e.units.some((u) => u.alive && u.spotted && near(u.pos, s.stats.sight ?? 100))) continue;
          e.markedUntil = w.time + cav.mark;
          e.markDamage = cav.damage;
        }
      }
    }
  }
}
