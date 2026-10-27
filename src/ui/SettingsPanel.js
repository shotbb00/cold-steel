// The settings form, used by the main menu and the in-game pause menu. Every control writes
// straight to core/Settings.js; the running game picks changes up live.
import { settings } from '../core/Settings.js';
import { QUALITY } from '../render/Quality.js';

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

/** Build the settings form into `container`. */
export function buildSettings(container) {
  container.replaceChildren();
  const g = el('section', 'set-group');
  g.append(el('h3', '', 'Graphics'));
  const q = settings.get('quality');
  g.append(row('Quality', q ? 'G cycles it in battle' : 'Not chosen yet — the first battle picks one to suit this machine',
    segmented(Object.entries(QUALITY).map(([k, v]) => [k, v.label]), q, (v) => settings.set('quality', v))));
  g.append(row('Frame counter', '', toggle(settings.get('showFps'), (v) => settings.set('showFps', v))));

  const a = el('section', 'set-group');
  a.append(el('h3', '', 'Sound'));
  a.append(row('Master volume', 'M mutes in battle',
    slider(0, 1, 0.05, settings.get('volume'), (v) => `${Math.round(v * 100)} %`, (v) => settings.set('volume', v))));

  const c = el('section', 'set-group');
  c.append(el('h3', '', 'Controls'));
  c.append(row('Mouse sensitivity', 'When you control a unit',
    slider(0.3, 2.5, 0.05, settings.get('sensitivity'), (v) => `${v.toFixed(2)}×`, (v) => settings.set('sensitivity', v))));
  c.append(row('Invert mouse Y', '', toggle(settings.get('invertY'), (v) => settings.set('invertY', v))));

  container.append(g, a, c);
}
