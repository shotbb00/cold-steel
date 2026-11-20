// Saving the world campaign so it can go from one device to another without a server (the game is static, on GitHub
// Pages): the same save as
//   a code    `CS1.<checksum>.<data>` — the state's JSON, compressed by the browser's own CompressionStream
//             (deflate-raw) and written in base64url; paste it on another device
//   a file    the code in a small `.coldsteel` file (download on a PC, the share sheet on a phone)
//   QR codes  the code cut into pieces of `QR_PIECE` characters, each `CSQ.<n>/<count>.<piece>` (drawn and read by the
//             campaign screen later)
//   autosave  IndexedDB in the browser, the last AUTOSAVES turns kept
// Every save carries the format version (old saves are upgraded by MIGRATIONS, never refused) and a checksum of the
// JSON, so a damaged or edited code says so instead of loading half a war.
import { VERSION } from './engine.js';

const PREFIX = 'CS1';
export const QR_PIECE = 1800;     // characters a QR code (version ~30, error level L) holds comfortably
const AUTOSAVES = 3;

/** FNV-1a over the JSON: 8 hex digits. */
function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
const toB64url = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64url = (s) => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); const out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; };
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }

/** The campaign as a save code. */
export async function encode(c) {
  const json = JSON.stringify({ ...c, power: undefined }); // (the power table is the game's, not the save's)
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw'));
  return `${PREFIX}.${checksum(json)}.${toB64url(packed)}`;
}

/** A save code back into a campaign (upgraded to this version). Throws with a reason a person can read. */
export async function decode(code) {
  const [tag, sum, data] = code.trim().split('.');
  if (tag !== PREFIX || !sum || !data) throw new Error('This is not a Cold Steel campaign code.');
  let json;
  try { json = new TextDecoder().decode(await pipe(fromB64url(data), new DecompressionStream('deflate-raw'))); } catch { throw new Error('The code is damaged: part of it is missing or changed.'); }
  if (checksum(json) !== sum) throw new Error('The code is damaged: part of it is missing or changed.');
  return migrate(JSON.parse(json));
}

/** Upgrades from older save formats, one version at a time (none yet: version 1 is the first). */
const MIGRATIONS = {};
export function migrate(c) {
  while ((c.v ?? 1) < VERSION) { c = MIGRATIONS[c.v ?? 1](c); }
  if (c.v > VERSION) throw new Error('This campaign was saved by a newer version of the game: update the game first.');
  return c;
}

/** The code in QR-sized pieces, and back (any order; a missing piece says which). */
export const toPieces = (code) => { const n = Math.ceil(code.length / QR_PIECE); return Array.from({ length: n }, (_, i) => `CSQ.${i + 1}/${n}.${code.slice(i * QR_PIECE, (i + 1) * QR_PIECE)}`); };
export function fromPieces(pieces) {
  const got = new Map(); let count = 0;
  for (const p of pieces) { const m = /^CSQ\.(\d+)\/(\d+)\.(.*)$/s.exec(p.trim()); if (!m) continue; count = +m[2]; got.set(+m[1], m[3]); }
  const missing = Array.from({ length: count }, (_, i) => i + 1).filter((i) => !got.has(i));
  if (!count || missing.length) throw new Error(missing.length ? `Still to scan: ${missing.join(', ')} of ${count}.` : 'No campaign codes found.');
  return Array.from({ length: count }, (_, i) => got.get(i + 1)).join('');
}

/** A file name for the save. */
export const fileName = (c) => `coldsteel-${c.war}-turn${c.turn}.coldsteel`;

/** Give the save to the player as a file: the share sheet where there is one (phones), else a download. */
export async function saveFile(c) {
  const code = await encode(c), file = new File([code], fileName(c), { type: 'text/plain' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Cold Steel campaign' }); return; } catch { /* (cancelled: fall back to a download) */ } }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: file.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------------------------------------------------------------- autosave (IndexedDB)

const DB = 'coldsteel-campaign', STORE = 'saves';
function db() {
  return new Promise((ok, fail) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'key' });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((ok, fail) => { const t = d.transaction(STORE, mode), s = t.objectStore(STORE), out = fn(s); t.oncomplete = () => ok(out.result ?? out); t.onerror = () => fail(t.error); }); };

/** Autosave this turn (the code, not the object: one format everywhere); keep the last AUTOSAVES of this campaign. */
export async function autosave(c) {
  try {
    const code = await encode(c), key = `${c.war}:${c.seed}:${c.turn}`;
    await tx('readwrite', (s) => s.put({ key, war: c.war, seed: c.seed, turn: c.turn, at: Date.now(), code }));
    const all = await listSaves();
    for (const old of all.filter((x) => x.war === c.war && x.seed === c.seed).slice(AUTOSAVES)) await tx('readwrite', (s) => s.delete(old.key));
  } catch { /* (storage blocked or full: the campaign plays on; the code and file still work) */ }
}
/** Every autosave, newest first: { key, war, seed, turn, at }. */
export async function listSaves() {
  try { const all = await tx('readonly', (s) => s.getAll()); return (all ?? []).map(({ code, ...rest }) => rest).sort((a, b) => b.at - a.at); } catch { return []; }
}
export async function loadSave(key) { const r = await tx('readonly', (s) => s.get(key)); return r ? decode(r.code) : null; }
