// Infantry only: a Frontline battle (frontline.js — points, command points, front strength) fought
// on foot. Only infantry can be called in — riflemen, MGs, AT teams, scouts, engineers, mortars,
// observers — and there is no air support (so no MANPADS either). Slower, closer, every hedgerow matters.
import frontline from './frontline.js';

export default {
  ...frontline,
  id: 'infantry',
  name: 'Infantry Only',
  description: 'Frontline on foot: hold and take the villages with infantry alone. No vehicles, no air support.',
  allow: (type) => type.kind === 'infantry' && type.category !== 'airdefence', // nothing in the sky to shoot at
  air: false,
};
