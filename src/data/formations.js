// 1806 infantry formations (data/units1806: a type with stats.formations). A company is in one of
// four; changing takes FORM_TIME while the men walk to their new places, and it can't fire then.
//   line      two ranks: every musket bears — the most firepower, the longest target, slow to turn
//   column    six files deep: fast on the march and for the bayonet; only the front rank can fire
//   square    a hollow square facing out on all sides: cavalry can't break in; guns tear it apart
//   skirmish  a loose screen of men in cover, each firing when he is ready (no volleys)
// Each sets the men's places (offsets, as at spawn: x across the front, y forward) and the stats
// it changes; `out` turns a man of the square to face outward.

export const FORM_TIME = 6;              // seconds to re-form (Prussia's rigid drill: longer, data/epoch.js)
export const FORM_ORDER = ['line', 'column', 'square', 'skirmish'];

export const FORMS = {
  line: { label: 'Line', stats: { drill: true, volley: true, leash: 0, stance: 'stand', frontOnly: false } },
  column: { label: 'Column', stats: { drill: true, volley: true, leash: 0, stance: 'stand', frontOnly: true }, speed: 1.25 },
  square: { label: 'Square', stats: { drill: true, volley: true, leash: 0, stance: 'stand', frontOnly: false, square: true }, speed: 0.25 },
  skirmish: { label: 'Skirmish', stats: { drill: false, volley: false, leash: 12, stance: 'crouch', frontOnly: false }, speed: 1.1 },
};

/** The men's places for `form` (count men, `spacing` apart): [{ x, y, row, out }]. */
export function formOffsets(form, count, spacing) {
  const grid = (cols, gap) => {
    const rows = Math.ceil(count / cols);
    return Array.from({ length: count }, (_, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      return { x: (col - (cols - 1) / 2) * gap, y: -(row - (rows - 1) / 2) * gap, row, out: null };
    });
  };
  if (form === 'line') return grid(Math.ceil(count / 2), spacing);
  if (form === 'column') return grid(Math.min(6, count), spacing);
  if (form === 'skirmish') return grid(Math.ceil(count / 2), spacing * 3.6).map((o, i) => ({ ...o, x: o.x + (o.row % 2 ? 1.6 : 0) })); // staggered, loose
  // the square: the men round its four sides, each side's men facing out
  const side = Math.max(1, Math.round(count / 4));
  const half = ((side - 1) * spacing) / 2 + spacing * 0.6;
  return Array.from({ length: count }, (_, i) => {
    const k = Math.min(3, Math.floor(i / side)), j = i - k * side;
    const t = (j - (side - 1) / 2) * spacing;
    const [x, y, out] = [[t, half, 0], [half, -t, Math.PI / 2], [-t, -half, Math.PI], [-half, t, -Math.PI / 2]][k];
    return { x, y, row: 0, out };
  });
}
