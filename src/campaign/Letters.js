// Letters home between campaign battles: after each battle one soldier of the battalion writes
// to his family about it — where they fought, whether they held or broke through, the weather,
// who didn't come back. The same man writes every time while his unit lives; if it's lost, a
// comrade takes over and says so. Built from the battle's real outcome (campaign/Campaign.js
// recordBattle), worded for the side: an American GI, or a Soviet soldier (in translation).
import { UNIT_TYPES } from '../data/units/index.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

const PEOPLE = {
  nato: {
    first: ['Danny', 'Mike', 'Tom', 'Ray', 'Eddie', 'Joe', 'Billy', 'Carl', 'Luis', 'Marcus', 'Steve', 'Andy', 'Frank', 'Tony'],
    last: ['Kowalski', 'Miller', 'Reyes', 'Johnson', 'O\'Brien', 'Walsh', 'Hernandez', 'Novak', 'Carter', 'Brooks', 'Schultz', 'Murphy'],
    rank: ['Pvt.', 'PFC', 'Spc.', 'Cpl.'],
    to: [['Mom', 'Dear Mom,'], ['Dad', 'Dear Dad,'], ['Sarah', 'Dear Sarah,'], ['Linda', 'Linda, honey,'], ['Mom and Dad', 'Dear Mom and Dad,']],
    sign: ['Love,', 'All my love,', 'Your son,', 'See you soon, I promise,'],
  },
  pact: {
    first: ['Sasha', 'Dima', 'Kolya', 'Seryozha', 'Vanya', 'Misha', 'Lyosha', 'Andrei', 'Yura', 'Pasha', 'Oleg', 'Volodya'],
    last: ['Ivanov', 'Petrov', 'Smirnov', 'Kuznetsov', 'Sokolov', 'Popov', 'Lebedev', 'Kozlov', 'Novikov', 'Morozov', 'Volkov', 'Orlov'],
    rank: ['Pvt.', 'Pvt.', 'Jr. Sgt.', 'Cpl.'],
    to: [['Mama', 'Dear Mama,'], ['Papa', 'Dear Papa,'], ['Natasha', 'My dear Natasha,'], ['Lena', 'Lenochka,'], ['Mama and Papa', 'Dear Mama and Papa,']],
    sign: ['I kiss you,', 'Your son,', 'Until we meet,', 'Wait for me,'],
  },
};

const OPEN = {
  nato: ['I don\'t know when this will get to you, but I wanted to write while I can.', 'They gave us an hour, so here\'s a letter.', 'Writing this on my knee in a hole, sorry for the handwriting.', 'Got your last letter. Read it about ten times.'],
  pact: ['The field post goes tonight, so I am writing quickly.', 'Do not worry about me, I am fed and warm enough.', 'We have a quiet hour, the first in days.', 'Your letter came. The others were jealous of the photograph.'],
};

const WHERE = (place) => [
  `We were at a place called ${place}.`,
  `The fighting was around ${place}. You won't find it on any map at home.`,
  `Today it was ${place}. Just a village, a church and some fields, and everybody wanted it.`,
];

const OUTCOME = {
  attackWon: ['We went forward and we took it. I still can\'t believe it.', 'We attacked, and this time they broke before we did.', 'We pushed them out. The lieutenant says it\'s the first ground we\'ve gained in a week.'],
  attackLost: ['We tried to take it and they threw us back. We\'re where we started, minus a lot of guys.', 'The attack didn\'t work. They were dug in better than anyone said.', 'We got close. Close isn\'t enough.'],
  held: ['They came at us all day and we held. Nobody really knows how.', 'We held the line. They kept coming and we kept being there.', 'They attacked and we didn\'t move. The captain shook everybody\'s hand.'],
  broken: ['They broke through and we had to pull back. It was a mess.', 'We couldn\'t hold it. We fell back in the dark and nobody talked.', 'They were too many. We lost the village and a lot more.'],
};

const SKY = {
  night: ['Most of it happened in the dark, which is its own kind of awful.', 'At night the flares turn everything white and then it\'s black again.'],
  dawn: ['It started at first light, before anybody had coffee.'],
  dusk: ['It went on until it got dark.'],
  rain: ['It rained the whole time. Everything I own is wet.', 'Rain, mud, more rain.'],
  fog: ['There was fog so thick you couldn\'t see the next hole.', 'In the fog you only hear them coming.'],
  clear: ['It was a beautiful day, which felt wrong.'],
};

const LOSSES = {
  none: ['Everybody in my squad made it. I keep counting them.', 'We didn\'t lose anybody from our platoon. Somebody up there likes us.'],
  some: (n, friend) => [`We lost ${n === 1 ? 'one unit' : `${n} units`} today. ${friend} was with them.`, `${friend} didn't come back. I don't know what to write to his folks.`, `${n === 1 ? 'One of our crews' : `${n} of our units`} didn't come back. ${friend} was one of them.`],
  wounded: (n) => [`${n} guys went back to the aid station. Most of them will be okay, they say.`, `The medics took ${n} of ours back. One of them was laughing, so that's something.`],
};

const CLOSE = {
  nato: ['Tell everybody I\'m fine. I mostly am.', 'Don\'t watch the news too much.', 'I think about the lake a lot. Save me a spot on the dock.', 'Send socks. Seriously. Socks.'],
  pact: ['Do not cry, Mama, I am careful.', 'Tell Grandfather I remember what he told me about his war.', 'I dream of your pirozhki.', 'Kiss the little ones for me.'],
};

const LOST_WRITER = (name) => [`${name} asked me to write if anything happened to him. I'm sorry. He talked about you all the time.`, `I'm writing instead of ${name}. He was my friend. He'd want you to know he wasn't alone.`];

function newWriter(c, side) {
  const P = PEOPLE[side];
  const unit = pick(c.battalion.filter((u) => UNIT_TYPES[u.type]?.kind === 'infantry').length ? c.battalion.filter((u) => UNIT_TYPES[u.type]?.kind === 'infantry') : c.battalion);
  const [to, greet] = pick(P.to);
  return { name: `${pick(P.first)} ${pick(P.last)}`, rank: pick(P.rank), unit: unit?.cid ?? null, unitName: unit?.name ?? '', to, greet };
}

/** Write the letter after the battle `b` and keep it on the campaign (c.letter). */
export function writeLetter(c, b, { attackerWon, lost, wounded }) {
  const side = c.side;
  const P = PEOPLE[side];
  const lines = [];
  let w = c.writer;
  if (w && !c.battalion.some((u) => u.cid === w.unit)) { // his unit is gone: a comrade writes
    const fallen = w;
    w = newWriter(c, side);
    w.to = fallen.to;
    w.greet = fallen.greet;
    lines.push(pick(LOST_WRITER(fallen.name.split(' ')[0])));
  }
  w ??= newWriter(c, side);
  c.writer = w;
  if (!lines.length) lines.push(pick(OPEN[side]));
  lines.push(pick(WHERE(b.name)));
  const ours = b.attacker === side;
  lines.push(pick(OUTCOME[ours ? (attackerWon ? 'attackWon' : 'attackLost') : attackerWon ? 'broken' : 'held']));
  const sky = SKY[b.weather === 'rain' || b.weather === 'fog' ? b.weather : b.time] ?? SKY[b.weather];
  if (sky && Math.random() < 0.75) lines.push(pick(sky));
  const friend = `${pick(P.first)}`;
  if (lost) lines.push(pick(LOSSES.some(lost, friend)));
  else lines.push(pick(LOSSES.none));
  if (wounded) lines.push(pick(LOSSES.wounded(wounded)));
  lines.push(pick(CLOSE[side]));
  c.letter = { turn: c.turn, greet: w.greet, body: lines, sign: pick(P.sign), from: `${w.rank} ${w.name}`, unit: w.unitName };
  return c.letter;
}
