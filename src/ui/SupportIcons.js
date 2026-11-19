// The support powers' tiles (tester feedback 2026-11-17: on a phone there is no text, and an aircraft's
// silhouette doesn't say what it does). Each icon on the 32 px grid tells three things:
//   • what it does — the effect, drawn as it happens (bombs falling in a row, shells walking forward,
//     a cloud drifting), in the tile's colour (currentColor via CSS: .sup .ico);
//   • where it lands — a strip along the bottom in the shape and colour of its ground marker
//     (ui/TargetMarkers.js MARK): a run, a carpet, a belt, a circle, a dashed catch circle, a band;
//   • where it comes from — a small badge top left: the map edge, a runway, a carrier's deck, the guns.
// supportIcon(cmd, era) → the <svg> markup.
import { MARK } from './TargetMarkers.js';

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

// ---------------------------------------------------------------- the pieces

/** The footprint along the bottom (y 26–31), in the marker's colour. */
const FOOT = {
  run: (c = MARK.air) => `<g fill="${hex(c)}"><rect x="5" y="28" width="19" height="2.2" rx="1"/><path d="M23 26.4l5 2.7-5 2.7z"/></g>`,
  carpet: (c = MARK.air) => `<g fill="${hex(c)}"><rect x="3" y="27.4" width="26" height="3.2" opacity="0.45"/><rect x="3" y="27.4" width="26" height="3.2" fill="none" stroke="${hex(c)}" stroke-width="1"/></g>`,
  wide: (c = MARK.air) => `<g fill="${hex(c)}"><rect x="2" y="25.8" width="28" height="5.4" opacity="0.45"/><rect x="2" y="25.8" width="28" height="5.4" fill="none" stroke="${hex(c)}" stroke-width="1"/></g>`,
  belt: (c = MARK.fire) => `<g fill="${hex(c)}"><rect x="4" y="28.6" width="18" height="2.6"/><rect x="4" y="25.6" width="18" height="0.9" opacity="0.6"/><path d="M24 29.9h3.5v-3.4h-1.6l2.6-3.2 2.6 3.2h-1.6v5H24z"/></g>`,
  circle: (c = MARK.fire) => `<g><ellipse cx="16" cy="28.6" rx="10" ry="2.6" fill="${hex(c)}" opacity="0.4"/><ellipse cx="16" cy="28.6" rx="10" ry="2.6" fill="none" stroke="${hex(c)}" stroke-width="1.2"/></g>`,
  ring: (c = MARK.air) => `<ellipse cx="16" cy="28.6" rx="11" ry="2.4" fill="none" stroke="${hex(c)}" stroke-width="1.5"/>`,
  dashed: (c = MARK.air) => `<g><ellipse cx="16" cy="28.6" rx="11" ry="2.4" fill="none" stroke="${hex(c)}" stroke-width="1.4" stroke-dasharray="2.2 1.6"/><circle cx="16" cy="28.6" r="1.2" fill="${hex(c)}"/></g>`,
  band: (c = MARK.recon) => `<g fill="${hex(c)}"><rect x="1" y="26" width="30" height="5" opacity="0.35"/><rect x="1" y="26" width="30" height="5" fill="none" stroke="${hex(c)}" stroke-width="1"/></g>`,
  lz: (c = MARK.troops) => `<g><ellipse cx="16" cy="28.6" rx="5.5" ry="2" fill="${hex(c)}" opacity="0.45"/><ellipse cx="16" cy="28.6" rx="5.5" ry="2" fill="none" stroke="${hex(c)}" stroke-width="1.2"/></g>`,
  stick: (c = MARK.troops) => `<g fill="${hex(c)}"><rect x="6" y="27.6" width="20" height="2.8" opacity="0.5"/><rect x="6" y="27.6" width="20" height="2.8" fill="none" stroke="${hex(c)}" stroke-width="1"/></g>`,
  drift: (c = MARK.gas) => `<g fill="${hex(c)}"><ellipse cx="9" cy="28.6" rx="6" ry="2.4" opacity="0.5"/><rect x="9" y="27" width="16" height="3.2" opacity="0.25"/><path d="M24 26.2l5 2.4-5 2.4z"/></g>`,
  line: (c = MARK.smoke) => `<g fill="${hex(c)}"><circle cx="5" cy="28.6" r="2.2"/><circle cx="10.5" cy="28.6" r="2.2"/><circle cx="16" cy="28.6" r="2.2"/><circle cx="21.5" cy="28.6" r="2.2"/><circle cx="27" cy="28.6" r="2.2"/></g>`,
};

/** The source badge, top left (0–8). */
const BADGE = {
  edge: '<g opacity="0.85"><rect x="0.5" y="0.5" width="1.4" height="7"/><path d="M3 3.2h2.2V1.4L8 4.2 5.2 7V5.2H3z"/></g>',                       // in from the map edge
  base: '<g opacity="0.85"><rect x="0.5" y="2" width="7.5" height="4" rx="0.6"/><rect x="1.6" y="3.7" width="1.4" height="0.6" fill="#1b1d1f"/><rect x="3.6" y="3.7" width="1.4" height="0.6" fill="#1b1d1f"/><rect x="5.6" y="3.7" width="1.4" height="0.6" fill="#1b1d1f"/></g>', // a runway
  deck: '<g opacity="0.85"><path d="M0.5 3.5h6.5l1.5 1.5-1.5 1.5H0.5z"/><rect x="5" y="1" width="1.3" height="2.6"/></g>',                         // a carrier
  guns: '<g opacity="0.85"><rect x="1.2" y="2.6" width="6.4" height="1.5" transform="rotate(-25 4 3.4)"/><circle cx="2.6" cy="5.8" r="1.7"/></g>', // the guns
  shore: '<g opacity="0.85"><path d="M0.5 7.5V4l2-1.5L4 4l1.5-2L8 4.5v3z"/></g>',                                                                // from the coast
};

// effect pieces (currentColor)
const fighter = (x, y, s, r = 0) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s}) translate(-16 -16)" d="M16 2l2.2 9 11.3 9.5v3L18 19.5l-.8 5.5 3.3 2.6V30L16 28.6 11.5 30v-2.4l3.3-2.6-.8-5.5-11.5 4v-3L13.8 11z"/>`;
/** A four-engined bomber from above, nose up. */
const heavy = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-1.3" y="-7" width="2.6" height="14" rx="1.3"/><path d="M-9 -1.2h18v2.6L1.3 2.2h-2.6L-9 1.4z"/><rect x="-3.6" y="5" width="7.2" height="1.6" rx="0.6"/><rect x="-7.6" y="-2.6" width="1.6" height="3"/><rect x="-4.3" y="-2.6" width="1.6" height="3"/><rect x="2.7" y="-2.6" width="1.6" height="3"/><rect x="6" y="-2.6" width="1.6" height="3"/></g>`;
const bomb = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="0.95" ry="1.7"/><path d="M-1 -1.8h2l-.4 -1h-1.2z"/></g>`;
const burst = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-3.2l.9 1.9 2-.9-.8 2 2 .9-2 .6.6 2-1.9-.9L0 3.2l-.8-1.8-1.9.9.6-2-2-.6 2-.9-.8-2 2 .9z"/>`;
const streak = (x, y, len = 6, a = 0) => `<g transform="translate(${x} ${y}) rotate(${a})"><rect x="-0.45" y="${-len}" width="0.9" height="${len}" opacity="0.55"/><ellipse cx="0" cy="0.4" rx="0.9" ry="1.5"/></g>`;
const man = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-3.6" r="1.25"/><path d="M-1.3-2.2h2.6l.4 3h-.9l-.4 3.2h-.9L0 1h-.2l-.4 3h-.9l-.4-3.2h-.9z"/></g>`;
const chute = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-3.4 0c0-2.2 1.5-3.6 3.4-3.6S3.4-2.2 3.4 0z"/><path d="M-3.2 0.1L-0.4 3.4h.8L3.2.1 2.6.1 0 3 -2.6.1z" opacity="0.8"/><circle cx="0" cy="4.1" r="0.9"/></g>`;
const ship = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-7 0h14l-2 2.6H-5.2z"/><rect x="-3.5" y="-2.2" width="5" height="2.3"/><rect x="-1.4" y="-4.2" width="1.4" height="2.2"/><rect x="2.5" y="-1.4" width="2.6" height="1.5"/></g>`;
const waves = (y) => `<path opacity="0.45" d="M0 ${y}c2.3-1.4 4.4-1.4 6.7 0s4.4 1.4 6.7 0 4.4-1.4 6.7 0 4.4 1.4 6.7 0 3.6-1.2 5.2-.6v1.6H0z"/>`;
const cloud = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="-3.4" cy="0.6" r="2.8"/><circle cx="0" cy="-1.2" r="3.6"/><circle cx="3.6" cy="0.8" r="2.6"/><rect x="-5.6" y="0.6" width="11.2" height="2.8" rx="1.4"/></g>`;
const windArrow = (x, y) => `<g transform="translate(${x} ${y})" opacity="0.9"><rect x="0" y="-0.5" width="6" height="1"/><rect x="1" y="-2.4" width="4" height="0.9"/><path d="M6-1.8l2.4 1.8L6 1.8z"/></g>`;
const heliSide = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s}) translate(-16 -14)"><rect x="2" y="7" width="28" height="1.4"/><rect x="17.3" y="8.2" width="1.6" height="3.5"/><path d="M2 14.6h10.5l3.5-2.6h8c3.2 0 5.7 1.5 6.8 3.6-1 2-3.6 3.2-6.8 3.2h-9.5l-2.8-2.4H2z"/><rect x="1.2" y="11" width="1.6" height="7.5"/></g>`;
const transport = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-9 0c0-1.3 1-2 2.4-2H6c2 0 3.4 .8 3.4 2S8 2 6 2H-6.6C-8 2-9 1.3-9 0z"/><path d="M-1 -1.6h3l-3.6-4.4h-1.6z"/><path d="M-9 -1l-1.6-3.2h1.6l2 3z"/></g>`;
const cannon = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-1" y="-1.3" width="7" height="2.2" rx="0.9" transform="rotate(-28)"/><circle cx="0" cy="1.6" r="2.2"/><rect x="-5" y="1.2" width="4" height="1.1"/></g>`;
const sailShip = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-8 0h16l-2.2 2.8H-6z"/><rect x="-5.2" y="-8" width="0.8" height="8"/><rect x="-0.4" y="-10" width="0.8" height="10"/><rect x="4.4" y="-7.5" width="0.8" height="7.5"/><rect x="-7.2" y="-7" width="4.8" height="2.6" rx="0.4"/><rect x="-7.2" y="-3.8" width="4.8" height="2.6" rx="0.4"/><rect x="-2.6" y="-9" width="5.2" height="2.8" rx="0.4"/><rect x="-2.6" y="-5.6" width="5.2" height="2.8" rx="0.4"/><rect x="2.3" y="-6.5" width="5" height="2.4" rx="0.4"/><rect x="2.3" y="-3.5" width="5" height="2.4" rx="0.4"/></g>`;
const arc = (d) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="0.9" stroke-dasharray="1.6 1.2" opacity="0.8"/>`;

// ---------------------------------------------------------------- the icons

const ICONS = {
  // ---- the air, on land
  heli: () => BADGE.edge + heliSide(16, 10, 0.55) + `<g opacity="0.85"><rect x="17" y="12" width="7" height="0.9" transform="rotate(32 17 12)"/><rect x="16" y="14" width="8" height="0.9" transform="rotate(38 16 14)"/></g>` + burst(24, 21, 0.9) + burst(18.5, 22.5, 0.7) + arc('M14 12L27 23') + FOOT.run(),
  jet: () => BADGE.base + fighter(11, 11, 0.42, 135) + `<g opacity="0.8">${[0, 1, 2, 3, 4].map((i) => `<rect x="${13 + i * 2.4}" y="${12 + i * 2}" width="1.5" height="0.9" transform="rotate(40 ${13 + i * 2.4} ${12 + i * 2})"/>`).join('')}</g>` + burst(13, 23, 0.6) + burst(19, 22.5, 0.75) + burst(25, 23, 0.6) + FOOT.run(),
  ground18: () => BADGE.edge + `<g transform="translate(13 11) rotate(20)"><rect x="-8" y="-3.4" width="16" height="1.3"/><rect x="-8" y="0.6" width="16" height="1.3"/><rect x="-1" y="-3" width="2" height="4"/><path d="M-2 -1h9l2 1-2 1H-2z"/></g>` + arc('M16 13L26 22') + burst(20, 22.5, 0.7) + burst(26, 22, 0.8) + bomb(23, 15, 0.7) + FOOT.run(),
  lift: () => BADGE.base + heliSide(16, 7, 0.55) + man(10, 20, 1) + man(16, 21, 1) + man(22, 20, 1) + `<path d="M16 12.5l2.4 2.6h-1.5v2h-1.8v-2h-1.5z" opacity="0.8"/>` + FOOT.lz(),
  para: () => BADGE.base + transport(12, 6.5, 0.75) + chute(10.5, 11, 0.85) + chute(15.5, 14, 0.85) + chute(20.5, 17, 0.85) + chute(25.5, 20, 0.85) + FOOT.stick(),
  cap: () => BADGE.edge + `<ellipse cx="16" cy="12.5" rx="12" ry="8" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 1.5" opacity="0.7"/>` + fighter(5, 12, 0.36, 0) + fighter(27, 12.5, 0.36, 180) + fighter(16, 13, 0.3, 160).replace('<path', '<path opacity="0.7"') + `<path d="M17 12c3 2 4 5 6 9" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.4"/>` + FOOT.ring(),
  recon: () => BADGE.edge + fighter(16, 5, 0.3, 0) + `<path d="M16 8L3 24h26z" opacity="0.28"/><path fill-rule="evenodd" d="M16 13c-3.6 0-6 2.2-7.3 3.8 1.3 1.6 3.7 3.8 7.3 3.8s6-2.2 7.3-3.8C22 15.2 19.6 13 16 13zm0 1.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z"/>` + FOOT.band(),
  spotter: () => BADGE.edge + `<g transform="translate(12 9)"><rect x="-6" y="-2.6" width="12" height="1.1"/><rect x="-6" y="0.6" width="12" height="1.1"/><path d="M-1.6 -1h7l1.6.9-1.6.9h-7z"/><circle cx="-0.6" cy="-2.4" r="1"/></g>` + `<path d="M11 10L28 22" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1.6 1.2"/><g transform="translate(24 17)"><circle cx="-1.6" cy="0" r="1.6"/><circle cx="1.6" cy="0" r="1.6"/><rect x="-1.6" y="-0.7" width="3.2" height="1.4"/></g>` + FOOT.band(),
  lightBomber: () => BADGE.base + fighter(16, 5.5, 0.26, 180) + fighter(10, 8.5, 0.26, 180) + fighter(22, 8.5, 0.26, 180) + bomb(16, 12) + bomb(16, 17) + bomb(16, 22) + bomb(9.5, 15, 0.9) + bomb(22.5, 15, 0.9) + FOOT.carpet(),
  heavyBomber: () => BADGE.edge + heavy(8, 8, 0.6) + heavy(16.5, 6.5, 0.6) + heavy(25, 8, 0.6) + [7, 12, 16, 20, 25].map((x, i) => bomb(x, 14 + (i % 2) * 2.4, 0.85) + bomb(x + 1.5, 19 + (i % 2) * 1.6, 0.85)).join('') + `<rect x="3" y="23.5" width="26" height="0.8" opacity="0.4"/>` + FOOT.wide(),
  // ---- the guns
  barrage: () => BADGE.guns + [6, 10.5, 15, 19.5, 24, 28].map((x, i) => streak(x - 1, 9 + (i % 3) * 3.5, 6, 14)).join('') + burst(9, 23, 0.7) + burst(17, 22, 0.85) + burst(24, 23.4, 0.7) + `<g opacity="0.7"><circle cx="27" cy="4.5" r="3.4" fill="none" stroke="currentColor" stroke-width="0.9"/><rect x="26.6" y="2" width="0.8" height="2.8"/><rect x="26.8" y="4.1" width="2.2" height="0.8"/></g>` + FOOT.circle(),
  creep: () => BADGE.guns + [6, 11, 16, 21].map((x) => streak(x, 19, 5, 12)).join('') + `<rect x="3" y="21.5" width="21" height="2" opacity="0.85"/><g opacity="0.45"><rect x="3" y="16.5" width="21" height="0.8"/><rect x="3" y="12.5" width="21" height="0.8"/><rect x="3" y="8.5" width="21" height="0.8"/></g><path d="M25.5 23.5V10h-2.2l3.6-5 3.6 5h-2.2v13.5z"/>` + FOOT.belt(),
  tot: () => BADGE.guns + cannon(3.5, 20, 0.85) + cannon(6, 13, 0.85) + cannon(4, 6.5, 0.85) + arc('M9 17Q17 14 24 19') + arc('M11 10Q19 8 24 18.5') + arc('M9 3.5Q20 2 24.5 18') + burst(25, 20.5, 1.1) + FOOT.circle(),
  walze: () => BADGE.guns + [5, 10, 15, 20].map((x) => streak(x, 19, 5, 12)).join('') + `<rect x="2" y="21.5" width="21" height="2" opacity="0.85"/><rect x="2" y="13" width="21" height="0.8" opacity="0.45"/><path d="M25.5 23.5V10h-2.2l3.6-5 3.6 5h-2.2v13.5z"/>` + FOOT.belt(),
  gas: () => BADGE.guns + streak(7, 17, 6, 20) + burst(8, 20.5, 0.8) + cloud(14, 14, 1) + cloud(23, 10, 0.75).replace('<g ', '<g opacity="0.6" ') + windArrow(22, 3.5) + FOOT.drift(),
  // ---- at sea
  diveBomb: () => BADGE.deck + fighter(11, 9, 0.4, 150) + bomb(15, 14, 1.1) + `<rect x="13.6" y="9.5" width="0.8" height="3" opacity="0.5" transform="rotate(-30 14 11)"/>` + ship(22, 21, 1) + burst(21, 17.5, 0.7) + waves(24.5) + FOOT.dashed(),
  torpBomb: () => BADGE.deck + `<g transform="translate(-1 -2) scale(0.6)"><path d="M1.5 8.5h3.2l3.2 3.5h16.6c2.8 0 5 .9 6 2.2-1 1.3-3.2 2-6 2H7.2L1.5 14.3z"/></g>` + `<rect x="5" y="20.6" width="15" height="0.9" opacity="0.6"/><rect x="18" y="20" width="4" height="1.8" rx="0.9"/>` + ship(26, 19.5, 0.75) + waves(22.5) + FOOT.dashed(),
  navCap: () => BADGE.deck + `<ellipse cx="16" cy="10" rx="12" ry="6.5" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 1.5" opacity="0.7"/>` + fighter(5, 10, 0.34, 0) + fighter(27, 10, 0.34, 180) + ship(16, 20, 1) + waves(23) + FOOT.ring(),
  navScout: () => BADGE.deck + fighter(16, 4.5, 0.3, 0) + `<path d="M16 7L2 22h28z" opacity="0.25"/>` + ship(8, 19, 0.55) + ship(24, 20, 0.55) + waves(22.5) + FOOT.band(),
  zeppelin: () => BADGE.edge + `<ellipse cx="14" cy="6" rx="11" ry="3.2"/><path d="M24 6l4-3v6z"/><rect x="11" y="9" width="5" height="1.6" rx="0.5"/><path d="M14 10L3 22h26z" opacity="0.25"/>` + ship(22, 19, 0.6) + waves(22.5) + FOOT.band(),
  asw: () => BADGE.edge + fighter(11, 7.5, 0.32, 135) + waves(14) + `<g fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.7"><path d="M12 18a4 2 0 0 1 8 0"/><path d="M9.5 19.5a6.5 3.2 0 0 1 13 0"/></g><circle cx="16" cy="17.5" r="1"/><path d="M8 23h13c1.6 0 2.8.6 3.4 1.3-.6.7-1.8 1.2-3.4 1.2H8z" opacity="0.85"/><rect x="13" y="21.4" width="3" height="1.8"/>` + FOOT.band(),
  seaStrike: () => BADGE.deck + heavy(8, 8.5, 0.55) + `<g><path d="M10 15h7l1.4.8-1.4.8h-7z"/><path d="M13 19h7l1.4.8-1.4.8h-7z"/></g><g opacity="0.45"><rect x="4" y="15.4" width="6" height="0.8"/><rect x="7" y="19.4" width="6" height="0.8"/></g>` + ship(26.5, 19.5, 0.7) + waves(22.5) + FOOT.dashed(),
  coastStrike: () => BADGE.shore + fighter(9.5, 10, 0.32, 110) + `<g><path d="M11 15h7l1.4.8-1.4.8h-7z"/><path d="M14 19h7l1.4.8-1.4.8h-7z"/></g><g opacity="0.45"><rect x="5" y="15.4" width="6" height="0.8"/><rect x="8" y="19.4" width="6" height="0.8"/></g>` + ship(26.5, 19.5, 0.7) + waves(22.5) + FOOT.dashed(),
  aew: () => BADGE.edge + fighter(16, 8, 0.32, 0) + `<ellipse cx="16" cy="6.5" rx="3.4" ry="1.2"/><g fill="none" stroke="currentColor" stroke-width="1" opacity="0.6"><ellipse cx="16" cy="14" rx="8" ry="3.4"/><ellipse cx="16" cy="15" rx="13" ry="5.6"/></g><circle cx="5" cy="19" r="1.1"/><circle cx="25" cy="18" r="1.1"/><circle cx="21" cy="21" r="1.1"/>` + waves(22.5) + FOOT.ring(MARK.recon),
  seaDrone: () => BADGE.edge + `<path d="M4 7.5h24v1.2H4z"/><path d="M14 6h5l1.4 1.5-1.4 2.6h-5z"/><path d="M13 7l-2.4-2.4h1.2z"/>` + `<g fill="none" stroke="currentColor" stroke-width="1" opacity="0.6"><ellipse cx="16" cy="15" rx="8" ry="3.4"/><ellipse cx="16" cy="16" rx="13" ry="5.6"/></g>` + ship(21, 20, 0.6) + waves(22.5) + FOOT.ring(MARK.recon),
  // ---- 1806
  battery: () => BADGE.guns + cannon(4, 21, 0.9) + cannon(9, 21, 0.9) + cannon(14, 21, 0.9) + `<g opacity="0.55"><circle cx="9" cy="15" r="2.2"/><circle cx="14" cy="14" r="2.6"/><circle cx="19" cy="15.5" r="2"/></g>` + arc('M8 16Q17 4 27 19') + arc('M13 16Q20 7 27 19') + burst(27, 21, 0.9) + FOOT.circle(),
  reserve: () => BADGE.edge + `<g transform="translate(15 15)"><ellipse cx="0" cy="0" rx="7" ry="3"/><path d="M6 -1.6l3.6-3.4 1.4.8-2 4z"/><ellipse cx="10.2" cy="-4.6" rx="1.8" ry="1.1"/><path d="M-6 0l-3.6 1.4-.6-.8 3.4-2z"/><path d="M-4.6 2l-3.6 4.6.9.6 4-4.2zM-2 2.4l-1 5.4h1L-.4 2.6zM3.6 2.2L6 7.4l.9-.4-2-5zM5.4 1.2l4.4 3.6.6-.8-4-3.6z"/><path d="M-1.4 -3h2.6l.6 -4.2h-2.4z"/><circle cx="0" cy="-8.4" r="1.3"/><rect x="1" y="-14" width="0.9" height="8" transform="rotate(30 1.4 -7)"/></g>` + FOOT.dashed(MARK.troops),
  guard: () => BADGE.edge + `<g transform="translate(11 6)"><rect x="-2.4" y="-4" width="4.8" height="6" rx="2.2"/><circle cx="0" cy="3.2" r="1.4"/><path d="M-2.4 4.6h4.8l.6 8h-1.6l-.6 6h-1.3l-.3-5h-.2l-.3 5h-1.3l-.6-6h-1.6z"/><rect x="2.8" y="0" width="0.8" height="13"/></g><path d="M18 13h7v-2.4l4 3.6-4 3.6v-2.4h-7z" opacity="0.85"/>` + FOOT.circle(MARK.troops),
  fireship: () => BADGE.edge + sailShip(15, 18, 1) + `<g opacity="0.95"><path d="M9 14c-1-3 1-5 2-7 .4 2 2 3 1.6 5.4-.4 1.6-2.6 2.6-3.6 1.6z"/><path d="M15 12c-1.4-3.4 1-6 2-8.6.6 2.6 2.6 3.8 2 6.6-.4 2-2.6 3.2-4 2z"/><path d="M20 14c-.8-2.6.8-4.2 1.6-6 .4 1.8 1.8 2.6 1.4 4.6-.4 1.4-2.2 2.2-3 1.4z"/></g>` + windArrow(1, 24) + waves(22) + FOOT.ring(MARK.fire),
  squadron: () => BADGE.edge + sailShip(10, 15, 0.8) + sailShip(22, 20, 0.8) + waves(22.5) + `<path d="M24 6h3v-2l3 3-3 3v-2h-3z" opacity="0.85"/>` + FOOT.dashed(MARK.troops),
  signal: () => `<rect x="7" y="2" width="1.2" height="24"/><rect x="2" y="25" width="11" height="2"/><path d="M8.2 3h6v4h-6z"/><path d="M8.2 8.5h6l-2 2 2 2h-6z"/><path d="M8.2 14h6v4h-6z" opacity="0.6"/><path d="M17 8h11M17 13h9M17 18h11" stroke="currentColor" stroke-width="1" opacity="0.45"/>`,
  monitors: () => BADGE.edge + `<path d="M2 21h18l-2.4 2.6H4z"/><rect x="7" y="17.4" width="6" height="3.8" rx="1"/><rect x="11" y="17.8" width="7" height="1.8" transform="rotate(-20 11 18.6)"/>` + arc('M18 15Q24 4 28 20') + burst(28, 21.5, 0.9) + waves(23.5) + FOOT.circle(),
  smokeScreen: () => BADGE.edge + `<path d="M2 21h9l-1.8 2H3z"/><rect x="4" y="19" width="3.5" height="2"/>` + cloud(14, 18, 0.65) + cloud(21, 14, 0.75) + cloud(27, 10, 0.6) + waves(23) + FOOT.line(),
  starShell: () => BADGE.guns + [[8, 6], [16, 4], [24, 7]].map(([x, y]) => `<path d="M${x - 1.6} ${y - 2}c0-1 .7-1.6 1.6-1.6s1.6.6 1.6 1.6z" opacity="0.8"/><path transform="translate(${x} ${y})" d="M0-1.6l.5 1.1 1.1-.5-.5 1.1 1.1.5-1.1.5.5 1.1L.5.5 0 1.6l-.5-1.1-1.1.5.5-1.1-1.1-.5 1.1-.5-.5-1.1 1.1.5z"/><path d="M${x} ${y + 2}L${x - 5} 22h10z" opacity="0.18"/>`).join('') + ship(16, 21, 0.7) + FOOT.circle(MARK.smoke),
};

/** Which icon a support command shows, in this war. */
function iconFor(cmd, era) {
  if (cmd.startsWith('power:')) return cmd.slice(6);
  if (cmd === 'barrage') return era === '1918' ? 'creep' : 'barrage'; // (the caller picks tot / walze: supportIcon(…, kind))
  if (cmd === 'gas') return 'gas';
  const k = cmd === 'air' ? 'heli' : cmd.slice(4).split('@')[0];
  if (era === '1918') return { jet: 'ground18', recon: 'spotter', navScout: 'zeppelin' }[k] ?? k;
  if (era === '1945' && k === 'lift') return 'para';
  return k;
}

/** The tile's icon for support command `cmd` (`variant`: a barrage's own — 'tot', 'walze', 'creep'). */
export function supportIcon(cmd, era, variant = null) {
  const name = variant && ICONS[variant] ? variant : iconFor(cmd, era);
  const draw = ICONS[name];
  return draw ? `<svg class="ico sup-ico" viewBox="0 0 32 32" aria-hidden="true">${draw()}</svg>` : '';
}

/** Every icon by name (the contact sheet). */
export const SUPPORT_ICON_NAMES = Object.keys(ICONS);
export const supportIconByName = (name) => `<svg class="ico sup-ico" viewBox="0 0 32 32" aria-hidden="true">${ICONS[name]()}</svg>`;
