// The connection between two players' browsers: a direct WebRTC link, no game server.
// Two ways to set it up:
//   • a join code (hostGame / joinGame): the free public PeerJS server (0.peerjs.com) only
//     introduces the two browsers; once they're connected the game traffic flows directly
//     between them (or through PeerJS's free TURN relay if a network blocks direct links)
//   • manual codes (createInvite / acceptInvite / acceptReply): the two browsers' connection
//     offers are pasted by hand — no server at all, so it also works on a LAN without internet
// Either way the result is a Link with two channels on the same peer connection:
//   rel   – ordered and reliable, JSON messages (orders, events, state)
//   snap  – unordered, no retransmits, binary snapshots (a lost one is replaced 1/15 s later)
// The PeerJS library (npm `peerjs`) is a separate chunk, only loaded when multiplayer is used.

const ID_PREFIX = 'coldsteel-';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I, L, O, 0, 1: easy to read out
const CODE_LENGTH = 5;
const ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
];
const REL_ID = 40;   // negotiated data channel ids (both sides open them with the same id)
const SNAP_ID = 41;

let peerLib = null;
function loadPeerJs() {
  peerLib ??= import('peerjs').then((m) => m.Peer ?? m.default, () => {
    peerLib = null;
    throw new Error('Could not load the connection library');
  });
  return peerLib;
}

export function randomCode() {
  let c = '';
  for (let i = 0; i < CODE_LENGTH; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

/** Tidy a typed code: upper case, spaces and dashes dropped. */
export function cleanCode(text) {
  return String(text).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

export const CODE_LEN = CODE_LENGTH;

const friendly = (err) => {
  const t = err?.type ?? '';
  if (t === 'peer-unavailable') return 'No game with that code — check it with your friend (codes are valid while the host waits).';
  if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') {
    return 'Couldn\'t reach the free code server. Check the internet connection, or use "Connect without a code" below.';
  }
  if (t === 'browser-incompatible') return 'This browser can\'t make direct connections (WebRTC).';
  return err?.message ?? String(err);
};

/**
 * Open the two game channels on an established peer connection; resolves with a Link.
 * Each side opens its channels when it gets round to it, and anything sent before the other
 * side has opened its own is lost — so both keep saying hello (`_hi`, every 0.2 s) until they
 * hear from the other; a hello is always answered (`_ok`, never answered itself).
 */
function openChannels(pc, keep = null) {
  const rel = pc.createDataChannel('rel', { negotiated: true, id: REL_ID, ordered: true });
  const snap = pc.createDataChannel('snap', { negotiated: true, id: SNAP_ID, ordered: false, maxRetransmits: 0 });
  snap.binaryType = 'arraybuffer';
  return new Promise((resolve, reject) => {
    let open = 0;
    let hello = null;
    const ready = () => {
      if (!hello) return;
      clearInterval(hello);
      hello = null;
      resolve(new Link(pc, rel, snap, keep));
    };
    rel.onmessage = (e) => {
      const k = JSON.parse(e.data).k;
      if (k === '_hi' && rel.readyState === 'open') rel.send('{"k":"_ok"}');
      if (k === '_hi' || k === '_ok') ready();
    };
    const done = () => {
      if (++open < 2) return;
      const hi = () => rel.readyState === 'open' && rel.send('{"k":"_hi"}');
      hello = setInterval(hi, 200);
      hi();
    };
    rel.onopen = done;
    snap.onopen = done;
    rel.onerror = (e) => reject(new Error(`Connection failed (${e?.error?.message ?? 'channel error'})`));
    setTimeout(() => { if (open < 2) reject(new Error('Connection timed out')); }, 20000);
  });
}

export class Link {
  constructor(pc, rel, snap, keep) {
    this.pc = pc;
    this.rel = rel;
    this.snap = snap;
    this.keep = keep;        // PeerJS objects that must stay referenced
    this.handlers = new Map();
    this.queue = [];         // messages that arrived before anyone listened for their kind
    this.snapHandler = null;
    this.closeHandlers = [];
    this.closed = false;
    this.rtt = 0;            // ms, smoothed
    rel.onmessage = (e) => this.receive(JSON.parse(e.data));
    snap.onmessage = (e) => this.snapHandler?.(e.data);
    const lost = () => this.lost();
    rel.onclose = lost;
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') lost();
    });
    // late hellos from the channel handshake (openChannels): answer, never queue
    this.on('_hi', () => this.send({ k: '_ok' }));
    this.on('_ok', () => {});
    // a ping every second: round-trip time for the HUD, and a heartbeat
    this.on('ping', (m) => this.send({ k: 'pong', t: m.t }));
    this.on('pong', (m) => {
      const rtt = performance.now() - m.t;
      this.rtt = this.rtt ? this.rtt + (rtt - this.rtt) * 0.2 : rtt;
    });
    this.pinger = setInterval(() => this.send({ k: 'ping', t: performance.now() }), 1000);
  }

  receive(msg) {
    const h = this.handlers.get(msg.k);
    if (h) h(msg);
    else this.queue.push(msg);
  }

  /** Listen for messages of kind `k` (a message's `k` field); queued ones are delivered now. */
  on(k, fn) {
    this.handlers.set(k, fn);
    const waiting = this.queue.filter((m) => m.k === k);
    this.queue = this.queue.filter((m) => m.k !== k);
    for (const m of waiting) fn(m);
  }

  off(k) {
    this.handlers.delete(k);
  }

  onSnapshot(fn) {
    this.snapHandler = fn;
  }

  onClose(fn) {
    this.closeHandlers.push(fn);
  }

  send(msg) {
    if (this.closed || this.rel.readyState !== 'open') return;
    try { this.rel.send(JSON.stringify(msg)); } catch { /* closing under us: the onClose handler reports it */ }
  }

  sendSnapshot(buffer) {
    if (this.closed || this.snap.readyState !== 'open') return;
    if (this.snap.bufferedAmount > 256 * 1024) return; // the link is choking: skip this one
    try { this.snap.send(buffer); } catch { /* closing under us */ }
  }

  lost() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.pinger);
    for (const fn of this.closeHandlers) fn();
  }

  close() {
    this.send({ k: 'bye' });
    this.lost();
    setTimeout(() => {
      try { this.pc.close(); } catch { /* already gone */ }
      try { this.keep?.peer?.destroy(); } catch { /* already gone */ }
    }, 100);
  }
}

// ------------------------------------------------------------------ join codes (PeerJS)

/**
 * Host a game under a fresh join code. `onCode(code)` fires once the code is registered;
 * resolves with the Link when someone joins. `cancel()` on the returned handle stops waiting.
 */
export function hostGame({ onCode, onError }) {
  let peer = null;
  let cancelled = false;
  let stopWaiting = null;
  const handle = {
    cancel() {
      cancelled = true;
      peer?.destroy();
      stopWaiting?.(new Error('cancelled'));
    },
    link: (async () => {
      const Peer = await loadPeerJs();
      for (let attempt = 0; attempt < 4; attempt++) {
        if (cancelled) throw new Error('cancelled');
        const code = randomCode();
        try {
          const link = await new Promise((resolve, reject) => {
            stopWaiting = reject;
            peer = new Peer(ID_PREFIX + code, { config: { iceServers: ICE }, debug: 0 });
            let connected = false;
            peer.on('open', () => onCode?.(code));
            peer.on('error', (e) => {
              if (connected) return;
              if (e.type === 'unavailable-id') reject(Object.assign(new Error('taken'), { retry: true }));
              else reject(new Error(friendly(e)));
            });
            peer.on('connection', (conn) => {
              if (connected) { conn.close(); return; } // one opponent per game
              connected = true;
              conn.on('open', () => {
                openChannels(conn.peerConnection, { peer, conn }).then((l) => {
                  peer.disconnect(); // off the code server: the game runs peer to peer now
                  resolve(l);
                }, reject);
              });
            });
          });
          return link;
        } catch (e) {
          peer?.destroy();
          if (cancelled) throw new Error('cancelled');
          if (!e.retry) { onError?.(e.message); throw e; }
        }
      }
      throw new Error('Could not get a free code — try again');
    })(),
  };
  return handle;
}

/** Join the game hosted under `code`. Resolves with the Link. */
export async function joinGame(code) {
  const Peer = await loadPeerJs();
  return new Promise((resolve, reject) => {
    const peer = new Peer({ config: { iceServers: ICE }, debug: 0 });
    let settled = false;
    const fail = (msg) => { if (settled) return; settled = true; peer.destroy(); reject(new Error(msg)); };
    peer.on('error', (e) => fail(friendly(e)));
    peer.on('open', () => {
      const conn = peer.connect(ID_PREFIX + cleanCode(code), { reliable: true });
      conn.on('open', () => {
        openChannels(conn.peerConnection, { peer, conn }).then((l) => {
          settled = true;
          peer.disconnect();
          resolve(l);
        }, (e) => fail(e.message));
      });
    });
    setTimeout(() => fail('No answer from the host — check the code and that they are waiting.'), 25000);
  });
}

// ------------------------------------------------------------------ manual codes (no server)

async function packDescription(desc) {
  const bytes = new TextEncoder().encode(JSON.stringify({ t: desc.type, s: desc.sdp }));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const packed = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (const b of packed) bin += String.fromCharCode(b);
  return `CS1-${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

async function unpackDescription(text) {
  const raw = String(text).trim().replace(/\s+/g, '');
  if (!raw.startsWith('CS1-')) throw new Error('That isn\'t a Cold Steel connection code');
  const b64 = raw.slice(4).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const { t, s } = JSON.parse(await new Response(stream).text());
  return { type: t, sdp: s };
}

/** Wait until the browser has found all its addresses (no trickle: the code carries them all). */
function gathered(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => { if (pc.iceGatheringState === 'complete') resolve(); };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(resolve, 4000); // good enough: use what we have
  });
}

/** Host side, step 1: the invitation code to send to the other player. */
export async function createInvite() {
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const link = openChannels(pc);
  await pc.setLocalDescription(await pc.createOffer());
  await gathered(pc);
  return { code: await packDescription(pc.localDescription), pc, link };
}

/** Joiner: take the invitation, return the reply code (and the Link, once the host accepts). */
export async function acceptInvite(inviteText) {
  const offer = await unpackDescription(inviteText);
  if (offer.type !== 'offer') throw new Error('That is a reply code — paste the host\'s invitation here');
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const link = openChannels(pc);
  await pc.setRemoteDescription(offer);
  await pc.setLocalDescription(await pc.createAnswer());
  await gathered(pc);
  return { code: await packDescription(pc.localDescription), link };
}

/** Host side, step 2: take the joiner's reply; the invite's link then opens. */
export async function acceptReply(invite, replyText) {
  const answer = await unpackDescription(replyText);
  if (answer.type !== 'answer') throw new Error('That is an invitation — paste your friend\'s reply here');
  await invite.pc.setRemoteDescription(answer);
  return invite.link;
}
