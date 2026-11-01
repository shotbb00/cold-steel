// King of the Hill: a Frontline battle (frontline.js: command points, reinforcements, the AI
// director) over one point only, the one nearest the middle of the map, neutral at the start and
// wider than usual. While a side holds it the other side's bar runs down (front strength,
// STRENGTH: about five minutes of holding); losses don't count, only the hill does.
import frontline from './frontline.js';

const STRENGTH = 180; // at frontline's bleed of 0.6 a second: 5 minutes on the hill
const RADIUS = 34;    // m round the hill's centre that count as holding it

export default {
  ...frontline,
  id: 'hill',
  name: 'King of the Hill',
  description: "One point in the middle of the map. While you hold it, the enemy's bar runs down — five minutes on the hill wins.",
  strength: STRENGTH,
  lossShare: 0,
  hint: "Take the hill in the middle and hold it: while it is yours, the enemy's bar runs down.",
  pointsFor(map) {
    const hill = [...map.points].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
    return [{ ...hill, id: 'H', name: hill.name, owner: null, radius: RADIUS }];
  },
};
