// The settings form, used by the main menu and the in-game pause menu. Every control writes
// straight to core/Settings.js; the running game picks changes up live.
import { settings } from '../core/Settings.js';
import { QUALITY } from '../render/Quality.js';
import { ACTIONS, RESERVED, keys, keyName, keyOf } from '../core/Keys.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

function row(label, hint, control) {
  const r = el('div', 'set-row');
  const l = el('div', 'set-label', `<span>${label}</span>${hint ? `<small>${hint}</small>` : ''}`);
  r.append(l, control);
  return r;
}

function segmented(options, value, onPick) {
  const g = el('div', 'seg');
  for (const [v, text] of options) {
    const b = el('button', v === value ? 'on' : '', text);
    b.type = 'button';
    b.addEventListener('click', () => {
      for (const o of g.children) o.classList.toggle('on', o === b);
      onPick(v);
    });
    g.append(b);
  }
  return g;
}

function slider(min, max, step, value, format, onInput) {
  const w = el('div', 'slider');
  const input = el('input');
  Object.assign(input, { type: 'range', min, max, step, value });
  const out = el('output', '', format(value));
  input.addEventListener('input', () => {
    out.textContent = format(+input.value);
    onInput(+input.value);
  });
  w.append(input, out);
  return w;
}

function toggle(value, onChange) {
  const b = el('button', `toggle${value ? ' on' : ''}`, `<i></i><span>${value ? 'On' : 'Off'}</span>`);
  b.type = 'button';
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-checked', String(value));
  b.addEventListener('click', () => {
    value = !value;
    b.classList.toggle('on', value);
    b.setAttribute('aria-checked', String(value));
    b.querySelector('span').textContent = value ? 'On' : 'Off';
    onChange(value);
  });
  return b;
}

/** The GPU the browser draws with (laptops often run the browser on the weaker built-in chip). */
let GPU;
function graphicsCard() {
  if (GPU !== undefined) return GPU;
  try {
    const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    GPU = (gl && (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))) || null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    GPU = null;
  }
  return GPU;
}

/** Build the settings form into `container`. */
export function buildSettings(container) {
  container.replaceChildren();
  const g = el('section', 'set-group');
  g.append(el('h3', '', 'Graphics'));
  const q = settings.get('quality');
  g.append(row('Quality', q ? 'G cycles it in battle' : 'Not chosen yet — the first battle picks one to suit this machine',
    segmented(Object.entries(QUALITY).map(([k, v]) => [k, v.label]), q, (v) => settings.set('quality', v))));
  const bench = el('button', 'set-button', settings.get('benchmark') ? 'Runs in the next battle' : 'Find the best setting');
  bench.type = 'button';
  bench.addEventListener('click', () => { settings.set('benchmark', true); bench.textContent = window.game ? 'Running…' : 'Runs in the next battle'; });
  g.append(row('Benchmark', 'Tries the levels in a battle for a few seconds each and keeps the best one that runs smoothly (40 fps)', bench));
  g.append(row('Render scale', 'Auto follows the frame rate: sharp when there is room, softer in heavy fights. A fixed value draws exactly that many pixels',
    segmented([[null, 'Auto'], [0.5, '50 %'], [0.67, '67 %'], [0.75, '75 %'], [1, '100 %']], settings.get('renderScale'), (v) => settings.set('renderScale', v))));
  g.append(row('Frame counter', 'Also shows the CPU time per frame: near the whole frame time, the processor is the limit', toggle(settings.get('fpsCounter'), (v) => settings.set('fpsCounter', v))));
  const gpu = graphicsCard();
  if (gpu) {
    const intel = /intel/i.test(gpu);
    const name = el('div', 'set-value');
    name.textContent = gpu.replace(/^ANGLE \((.*)\)$/, '$1').replace(/ Direct3D.*$/, '');
    g.append(row('Graphics card in use', intel
      ? 'The built-in Intel chip. If this laptop also has an NVIDIA or AMD card: Windows Settings → System → Display → Graphics → add your browser → High performance, then restart the browser'
      : '', name));
  }

  const a = el('section', 'set-group');
  a.append(el('h3', '', 'Sound'));
  a.append(row('Master volume', `${keyOf('mute')} mutes in battle`,
    slider(0, 1, 0.05, settings.get('volume'), (v) => `${Math.round(v * 100)} %`, (v) => settings.set('volume', v))));
  a.append(row('Menu music', 'The synth tune in the main menu',
    slider(0, 1, 0.05, settings.get('music'), (v) => `${Math.round(v * 100)} %`, (v) => settings.set('music', v))));
  a.append(row('Radio chatter', 'Traffic from the rest of the war in the radio log, besides your own battle',
    toggle(settings.get('radioChatter'), (v) => settings.set('radioChatter', v))));

  const c = el('section', 'set-group');
  c.append(el('h3', '', 'Controls'));
  c.append(row('Mouse sensitivity', 'When you control a unit',
    slider(0.3, 2.5, 0.05, settings.get('sensitivity'), (v) => `${v.toFixed(2)}×`, (v) => settings.set('sensitivity', v))));
  c.append(row('Invert mouse Y', '', toggle(settings.get('invertY'), (v) => settings.set('invertY', v))));

  container.append(g, a, c, keyGroup(container));
}

/**
 * Every key the game uses, by where it applies; click a key, then press the new one (Esc
 * cancels). Two actions that apply at the same time on one key are marked.
 */
function keyGroup(container) {
  const k = el('section', 'set-group keys-group');
  k.append(el('h3', '', 'Keys'));
  const groups = [['both', 'Everywhere'], ['command', 'Command view'], ['control', 'Direct control']];
  for (const [ctx, title] of groups) {
    k.append(el('h4', 'keys-sub', title));
    for (const a of ACTIONS.filter((x) => x.ctx === ctx)) {
      const clash = keys.conflicts(a.id);
      const b = el('button', 'key-bind' + (clash.length ? ' clash' : ''), keyName(keys.code(a.id)));
      b.type = 'button';
      b.title = 'Click, then press the new key (Esc cancels)';
      b.addEventListener('click', () => {
        b.textContent = 'Press a key…';
        b.classList.add('listening');
        const grab = (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          window.removeEventListener('keydown', grab, true);
          if (e.code !== 'Escape' && !RESERVED.has(e.code)) keys.bind(a.id, e.code);
          buildSettings(container);                 // redraw: new key, conflicts
          container.querySelector('.keys-group')?.scrollIntoView({ block: 'nearest' });
        };
        window.addEventListener('keydown', grab, true);
      });
      const r = row(a.label, clash.length ? `Also bound to: ${clash.map((x) => x.label).join(', ')}` : '', b);
      r.classList.toggle('clash-row', clash.length > 0);
      k.append(r);
    }
  }
  const reset = el('button', 'set-button', 'Reset all keys');
  reset.type = 'button';
  reset.addEventListener('click', () => { keys.reset(); buildSettings(container); });
  k.append(row('Defaults', 'Back to the keys the game came with', reset));
  return k;
}
