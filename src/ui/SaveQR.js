// A world-campaign save as QR codes (wcampaign/save.js toPieces: CSQ.n/m pieces of the save code), for moving a war to
// another device in the same room without typing: one device shows them one after another, the other's camera reads them.
//   showQR(host, code)   the pieces in turn (on their own every 1.8 s; back / pause / next), "2 / 5" under them
//   scanQR(onCode)       the camera, reading pieces in any order until the save is whole → onCode(code); returns stop()
// Reading needs the browser's BarcodeDetector (Chrome, Edge, Android); without it, the code or the file does it.
import QRCode from 'qrcode';
import { toPieces, fromPieces } from '../wcampaign/save.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const btn = (label, fn) => { const b = el('button', 'mp-btn', label); b.type = 'button'; b.addEventListener('click', fn); return b; };

export function showQR(host, code) {
  const pieces = toPieces(code);
  const wrap = el('div', 'wc-qr'), canvas = el('canvas'), label = el('p', 'cp-hint');
  let i = 0, playing = pieces.length > 1, timer = 0;
  const draw = () => {
    QRCode.toCanvas(canvas, pieces[i], { errorCorrectionLevel: 'L', margin: 2, width: 320, color: { dark: '#111111', light: '#ffffff' } });
    label.textContent = `${i + 1} / ${pieces.length}${pieces.length > 1 ? (playing ? ' — the codes change on their own' : ' — paused') : ''}`;
  };
  const step = (d) => { i = (i + d + pieces.length) % pieces.length; draw(); };
  const tick = () => { clearTimeout(timer); if (playing && wrap.isConnected) { step(1); timer = setTimeout(tick, 1800); } };
  const row = el('div', 'deploy-row');
  if (pieces.length > 1) {
    const pause = btn('Pause', () => { playing = !playing; pause.textContent = playing ? 'Pause' : 'Play'; draw(); if (playing) timer = setTimeout(tick, 1800); });
    row.append(btn('‹', () => step(-1)), pause, btn('›', () => step(1)));
  }
  wrap.append(canvas, label, row);
  host.append(wrap);
  draw();
  if (playing) timer = setTimeout(tick, 1800);
}

export function scanQR(onCode) {
  const modal = el('div', 'wc-modal'), box = el('div', 'wc-modal-box'), msg = el('p', 'cp-hint'), video = el('video');
  video.playsInline = true; video.muted = true;
  let stream = null, raf = 0;
  const stop = () => { cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); modal.remove(); };
  box.append(el('span', 'cp-kicker', 'Scan'), el('h3', '', 'Read the QR codes'), el('p', 'cp-hint', 'Point the camera at the other device’s Save / move screen. The codes may come in any order; it stops when it has them all.'), video, msg, btn('Cancel', stop));
  modal.append(box);
  (document.querySelector('.wc-room') ?? document.body).append(modal);
  if (!('BarcodeDetector' in window)) { msg.textContent = 'This browser cannot read QR codes. Use the code or the file instead (Save / move on the other device).'; video.remove(); return stop; }
  const detector = new window.BarcodeDetector({ formats: ['qr_code'] }), got = new Set();
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((s) => {
    stream = s; video.srcObject = s; video.play();
    const look = async () => {
      if (!modal.isConnected) return;
      try {
        for (const r of await detector.detect(video)) if (r.rawValue?.startsWith('CSQ.')) got.add(r.rawValue);
        if (got.size) {
          try { const code = fromPieces([...got]); stop(); onCode(code); return; } catch (e) { msg.textContent = `${got.size} read. ${e.message}`; }
        }
      } catch { /* a frame it could not read: the next one */ }
      raf = requestAnimationFrame(look);
    };
    look();
  }).catch(() => { msg.textContent = 'No camera (or no permission). Use the code or the file instead.'; });
  return stop;
}
