// The armies' signature mechanics that change from moment to moment (data/doctrine.js), as
// multipliers on each stack (stack.doc), refreshed every second on the host:
//   aim    the spread is divided by it   (Verbundene Waffen: infantry near a friendly IFV)
//   supp   suppression taken             (Verbundene Waffen: less; Reckless tempo: more once stalled)
//   speed, fire                          (Reckless tempo: advancing on the enemy)
//   dmg, take                            damage dealt and taken (situational(): Banzai, Arditi, Dig in …)
// and the Cavalry screen's marks: enemies a US recon stack can see take more damage from
// everyone for a while (stack.markedUntil, stack.markDamage — UnitStack.damageUnit).
import { doctrine, ARTILLERY } from '../data/doctrine.js';
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

  /** The doctrines that hang on where a stack is and what it is doing (data/doctrine.js): dmg is the damage it
   *  deals, take what it takes. */
  situational(s, doc, near) {
    const g = this.game, w = g.world;
    const D = (id) => doctrine(g, s.faction, id);
    const inf = s.usesCover && !s.stats.cavalry && !s.stats.structure; // soldiers on foot
    const gun = ARTILLERY.has(s.type.id);
    const mine = w.stacksOf(s.faction);
    const moved = s.lastC ? Math.hypot(s.centroid.x - s.lastC.x, s.centroid.z - s.lastC.z) : 0;
    s.lastC = { x: s.centroid.x, z: s.centroid.z };
    s.stillT = moved < 0.5 ? (s.stillT ?? 0) + 1 : 0;
    let fd;
    const foe = () => (fd ??= w.stacksOf(enemyOf(s.faction)).reduce((b, e) => { // the nearest enemy: [m, stack]
      const d = e.alive ? Math.hypot(e.centroid.x - s.centroid.x, e.centroid.z - s.centroid.z) : Infinity;
      return d < b[0] ? [d, e] : b;
    }, [Infinity, null]));
    const steady = () => { if (s.stats.breakMorale) s.morale = Math.max(s.morale, s.stats.breakMorale + 0.05); };
    let x;
    if (gun && (x = D('greatBattery')) && mine.filter((o) => o !== s && o.alive && ARTILLERY.has(o.type.id) && near(o.centroid, x.near)).length >= x.count) doc.fire *= x.fire;
    if (gun && (x = D('stonk')) && mine.some((o) => o.alive && o.type.id === 'observers')) doc.fire *= x.fire;
    if (inf && s.form === 'line' && (x = D('stubborn'))) doc.take *= x.take;
    if (inf && s.form === 'line' && (x = D('twoDeep')) && s.stillT >= x.still) doc.dmg *= x.dmg;
    if (inf && (x = D('digIn')) && s.stillT >= x.still) doc.take *= x.take;
    if (inf && (x = D('ridge'))) {
      const [d, e] = foe();
      if (e && d < x.within && g.terrain.heightAt(s.centroid.x, s.centroid.z) - g.terrain.heightAt(e.centroid.x, e.centroid.z) >= x.rise) doc.aim *= x.aim;
    }
    if (inf && (x = D('hamel')) && mine.some((o) => o.alive && (o.type.id === 'tank' || o.type.id === 'heavyTank') && near(o.centroid, x.range))) doc.take *= x.take;
    if (inf && (x = D('arditi')) && foe()[0] < x.range) doc.dmg *= x.dmg;
    if (inf && (x = D('banzai')) && foe()[0] < x.range) { doc.speed *= x.speed; doc.dmg *= x.dmg; doc.take *= x.take; steady(); }
    if (inf && (x = D('valor')) && s.units.filter((u) => u.alive).length <= s.units.length / 2) { doc.aim *= x.aim; steady(); }
    if (!s.stats.structure && (x = D('adminBox')) && mine.some((o) => o.alive && o.type.id === 'commandPost' && near(o.centroid, x.range))) steady();
    if (inf && (x = D('airSupply')) && (s.supplyT = (s.supplyT ?? 0) + 1) >= x.every) { // the Dakotas' drop: one man patched up
      s.supplyT = 0;
      const u = s.units.find((m) => m.alive && m.hp < m.maxHp);
      if (u) u.hp = Math.min(u.maxHp, u.hp + x.hp);
    }
  }

  update(dt) {
    if (this.game.net?.isClient || (this.t -= dt) > 0) return;
    this.t = 1;
    const g = this.game;
    const w = g.world;
    for (const s of w.stacks) {
      const doc = { aim: 1, supp: 1, speed: 1, fire: 1, dmg: 1, take: 1 };
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
      this.situational(s, doc, near);
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
