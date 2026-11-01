// Letters home between campaign battles: after each battle one soldier of the brigade writes to
// his family about it — where they fought, whether they held or broke through, who didn't come
// back. The same man writes while his unit lives; if it's lost, a comrade takes over and says so.
// Built from the battle's real outcome (campaign/Campaign.js recordBattle) and voiced by army: an
// American GI, a West German conscript, a Soviet soldier and an East German one (the last three in
// translation). Each letter draws a few topics from a dozen (food, sleep, the land, the enemy, his
// own weapon, rumours, home, being cut off…) and its lines from big pools, and no line comes back
// until about sixty others have been written (c.letterUsed).
import { UNIT_TYPES } from '../data/units/index.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const MEMORY = 60; // lines remembered so they don't repeat

// ------------------------------------------------------------------ who writes, and to whom

const PEOPLE = {
  us: {
    first: ['Danny', 'Mike', 'Tom', 'Ray', 'Eddie', 'Joe', 'Billy', 'Carl', 'Luis', 'Marcus', 'Steve', 'Andy', 'Frank', 'Tony', 'Darnell', 'Kevin', 'Jimmy', 'Rob', 'Hector', 'Wes'],
    last: ['Kowalski', 'Miller', 'Reyes', 'Johnson', 'O\'Brien', 'Walsh', 'Hernandez', 'Novak', 'Carter', 'Brooks', 'Schultz', 'Murphy', 'Washington', 'Kim', 'Delgado', 'Parker', 'Lindqvist', 'Russo'],
    rank: ['Pvt.', 'PFC', 'Spc.', 'Cpl.', 'Sgt.'],
    to: [['Mom', 'Dear Mom,'], ['Dad', 'Dear Dad,'], ['Sarah', 'Dear Sarah,'], ['Linda', 'Linda, honey,'], ['Mom and Dad', 'Dear Mom and Dad,'], ['Grandma', 'Dear Grandma,'], ['Jenny', 'Jen,'], ['Ricky', 'Hey Rick,']],
    sign: ['Love,', 'All my love,', 'Your son,', 'See you soon, I promise,', 'Miss you,', 'Hang in there,', 'Yours,'],
  },
  bw: {
    first: ['Jürgen', 'Thomas', 'Michael', 'Andreas', 'Stefan', 'Frank', 'Uwe', 'Ralf', 'Klaus', 'Dirk', 'Matthias', 'Bernd', 'Holger', 'Jörg', 'Markus', 'Torsten'],
    last: ['Müller', 'Schmidt', 'Becker', 'Hoffmann', 'Wagner', 'Schäfer', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Braun', 'Krüger', 'Hartmann', 'Lange', 'Vogel'],
    rank: ['Gefreiter', 'Obergefreiter', 'Hauptgefreiter', 'Unteroffizier'],
    to: [['Mutti', 'Liebe Mutti,'], ['Vati', 'Lieber Vati,'], ['Sabine', 'Liebe Sabine,'], ['Petra', 'Meine liebe Petra,'], ['Mutti and Vati', 'Liebe Eltern,'], ['Oma', 'Liebe Oma,'], ['Claudia', 'Claudia, mein Schatz,']],
    sign: ['Dein', 'Viele Grüße, dein', 'In Liebe,', 'Bis bald, versprochen,', 'Kopf hoch,', 'Alles Liebe,'],
  },
  sov: {
    first: ['Sasha', 'Dima', 'Kolya', 'Seryozha', 'Vanya', 'Misha', 'Lyosha', 'Andrei', 'Yura', 'Pasha', 'Oleg', 'Volodya', 'Tolya', 'Grisha', 'Ruslan', 'Aibek', 'Taras', 'Zhenya'],
    last: ['Ivanov', 'Petrov', 'Smirnov', 'Kuznetsov', 'Sokolov', 'Popov', 'Lebedev', 'Kozlov', 'Novikov', 'Morozov', 'Volkov', 'Orlov', 'Bondarenko', 'Nurmagambetov', 'Melnyk', 'Abdullaev'],
    rank: ['Pvt.', 'Pvt.', 'Jr. Sgt.', 'Cpl.', 'Sgt.'],
    to: [['Mama', 'Dear Mama,'], ['Papa', 'Dear Papa,'], ['Natasha', 'My dear Natasha,'], ['Lena', 'Lenochka,'], ['Mama and Papa', 'Dear Mama and Papa,'], ['Babushka', 'Dear Babushka,'], ['Olya', 'Olechka, my sun,']],
    sign: ['I kiss you,', 'Your son,', 'Until we meet,', 'Wait for me,', 'Firmly, your', 'With a soldier\'s greeting,'],
  },
  nva: {
    first: ['Jens', 'Uwe', 'Lutz', 'Ronny', 'Heiko', 'Mario', 'Steffen', 'Thomas', 'Frank', 'René', 'Sven', 'Andreas', 'Mike', 'Enrico', 'Dirk', 'Torsten'],
    last: ['Schulze', 'Krause', 'Lehmann', 'Zimmermann', 'Fischer', 'Weber', 'Meier', 'Hahn', 'Schröder', 'König', 'Pohl', 'Seidel', 'Günther', 'Fuchs', 'Kühn', 'Winkler'],
    rank: ['Soldat', 'Gefreiter', 'Stabsgefreiter', 'Unteroffizier'],
    to: [['Mutti', 'Liebe Mutti,'], ['Vati', 'Lieber Vati,'], ['Kerstin', 'Liebe Kerstin,'], ['Anja', 'Meine Anja,'], ['Mutti and Vati', 'Liebe Eltern,'], ['Oma', 'Liebe Oma,'], ['Ines', 'Ines, mein Mädchen,']],
    sign: ['Dein', 'Es grüßt dich herzlich', 'Bis bald,', 'Halt die Ohren steif,', 'In Liebe,', 'Dein Junge,'],
  },
};
const DEFAULT = { nato: 'us', pact: 'sov' };

// ------------------------------------------------------------------ the parts of a letter
// Each pool: (ctx) => [lines]. ctx: { army, side, place, friend, n, wounded, kind, day, time, weather, cut, to }

const OPEN = {
  us: ['I don\'t know when this will get to you, but I wanted to write while I can.', 'They gave us an hour, so here\'s a letter.', 'Writing this on my knee in a hole, sorry for the handwriting.', 'Got your last letter. Read it about ten times.', 'The mail truck made it up today, so I\'m sending one back down with it.', 'Borrowed a pen from the LT, so this is official.', 'It\'s quiet right now. Too quiet to sleep, so I\'m writing.', 'Sorry I didn\'t write sooner. There wasn\'t a sooner.'],
  bw: ['I am writing quickly, the Feldpost goes in ten minutes.','We have a break, the first one in two days, so here is a letter.', 'Your package came. The cake was a bit squashed, the others ate it anyway in five minutes.', 'I am writing in the Marder, the light is bad, please excuse the writing.', 'Do not believe everything on the Tagesschau. Here it is different and also not so bad.', 'Finally a moment. Everyone else is asleep.', 'I got your letter yesterday. I carry it in my breast pocket.'],
  sov: ['The field post goes tonight, so I am writing quickly.', 'Do not worry about me, I am fed and warm enough.', 'We have a quiet hour, the first in days.', 'Your letter came. The others were jealous of the photograph.', 'I write on an ammunition box, so the letters jump.', 'The politruk says we may write, so I write.', 'I have three minutes and a stub of pencil.', 'Forgive me for the short letter last time. This one will be longer.'],
  nva: ['The Feldpost leaves tonight, so I am writing quickly.', 'Your letter reached me. Everyone wanted to know who the girl in the photo is.', 'Finally a quiet hour. The Spieß says we may write.', 'I am writing under the tarpaulin with a torch, please excuse the scrawl.', 'Do not worry. We are eating properly and I have dry socks, mostly.', 'A short letter, the paper is rationed too now.', 'I read your last letter until it fell apart at the folds.'],
};

const LOST_WRITER = (name) => [
  `${name} asked me to write if anything happened to him. I'm sorry. He talked about you all the time.`,
  `I'm writing instead of ${name}. He was my friend. He'd want you to know he wasn't alone.`,
  `You don't know me. I was with ${name} in the same unit. I'm so sorry. He carried your letters everywhere.`,
  `${name} and I made a deal: whoever is left writes to the other's family. I wish I didn't have to.`,
];

const WHERE = (x) => [
  `We were at a place called ${x.place}.`,
  `The fighting was around ${x.place}. You won't find it on any map at home.`,
  `Today it was ${x.place}. Just a village, a church and some fields, and everybody wanted it.`,
  `${x.place}. I'll remember that name for the rest of my life.`,
  `They sent us to ${x.place}. Somebody on a map decided it mattered.`,
  `We spent the day around ${x.place}: a crossroads, a few farms, a lot of mud.`,
  ...(x.army === 'bw' ? [`It was ${x.place}. We used to drive through there on the way to the Rhön. Now look at it.`, `${x.place} — Oma has a cousin there. I hope they got out in time.`] : []),
  ...(x.army === 'nva' ? [`It was near ${x.place}. On the other side of the border they speak like us, that is the strange thing.`, `${x.place}. Before the war I only knew it from the weather report.`] : []),
];

const OUTCOME = {
  attackWon: (x) => ['We went forward and we took it. I still can\'t believe it.', 'We attacked, and this time they broke before we did.', 'We pushed them out. The lieutenant says it\'s the first ground we\'ve gained in a week.', 'We took the place. There was nobody left to take it from by the end.', 'We went in behind the tanks and it worked, more or less like they drew it.', `${x.place} is ours now. For how long, nobody says.`, 'They ran. I didn\'t think they would. I didn\'t think we would get that far.'],
  attackLost: () => ['We tried to take it and they threw us back. We\'re where we started, minus a lot of guys.', 'The attack didn\'t work. They were dug in better than anyone said.', 'We got close. Close isn\'t enough.', 'We went twice. The second time was worse.', 'Their guns had the whole field. We lay in it until dark and crawled back.', 'Whoever planned it should have walked it first.'],
  held: () => ['They came at us all day and we held. Nobody really knows how.', 'We held the line. They kept coming and we kept being there.', 'They attacked and we didn\'t move. The captain shook everybody\'s hand.', 'We dug in and let them come. They stopped coming around noon.', 'Three times they tried. Three times they went back.', 'We held. My hands still shake a bit writing it.'],
  broken: () => ['They broke through and we had to pull back. It was a mess.', 'We couldn\'t hold it. We fell back in the dark and nobody talked.', 'They were too many. We lost the village and a lot more.', 'We got the order to fall back just before they would have cut us off.', 'They came through on the left where nobody was. Then everybody was running.', 'We left most of our things in the holes. Not the important things.'],
};

const SKY = {
  night: ['Most of it happened in the dark, which is its own kind of awful.', 'At night the flares turn everything white and then it\'s black again.', 'You can\'t see anything at night, you just see the tracers and guess.', 'The night was the worst part. Every noise is them.'],
  dawn: ['It started at first light, before anybody had coffee.', 'They came with the sunrise. It was almost pretty, the mist on the fields.', 'Dawn here is grey and wet and full of engines.'],
  dusk: ['It went on until it got dark.', 'By sunset it was over and the sky was orange, I can\'t say from what.', 'At dusk it finally stopped. Then everybody just sat down where they were.'],
  day: ['It went on the whole day. I didn\'t notice the hours.', 'Broad daylight, nowhere to hide, and still everybody hid.'],
  rain: ['It rained the whole time. Everything I own is wet.', 'Rain, mud, more rain.', 'The rain filled the trenches up to the knee.', 'It rains here like it means it.'],
  fog: ['There was fog so thick you couldn\'t see the next hole.', 'In the fog you only hear them coming.', 'The fog lay in the valley all morning. You shoot at sounds.'],
  clear: ['It was a beautiful day, which felt wrong.', 'Blue sky, not a cloud. The jets loved it. We didn\'t.'],
  overcast: ['Grey sky all day, the kind that doesn\'t rain and doesn\'t stop threatening to.', 'The clouds were so low the helicopters stayed home.'],
};

// the middle: a few topics each time
const TOPICS = {
  food: (x) => ({
    us: ['We eat out of brown plastic bags. The beef stew is the good one. There is no good one.', 'Somebody traded a whole carton of smokes for a box of German chocolate. Worth it.', 'A farmer\'s wife gave us bread and sausage this morning and wouldn\'t take money.', 'Hot chow came up last night for the first time in four days. I almost cried.'],
    bw: ['The EPa is as bad as ever. I would kill for one of your Rouladen.', 'The field kitchen came up with Erbsensuppe. Everybody had three helpings.', 'A baker in the last village gave us all his Brötchen before he left.', 'We live on Knäckebrot and Leberwurst from tubes.'],
    sov: ['The kasha is cold but there is a lot of it.', 'We found a cellar full of jars — pickles and jam. The sergeant pretended not to see.', 'The canned meat is from 1979, the date says. It is still meat.', 'I dream of your pirozhki every night.'],
    nva: ['The Feldküche brought Soljanka, the good kind. A small miracle.', 'We have the hard bread again, the one you can build a bunker from.', 'In an abandoned house we found West coffee. Real coffee. We drank all of it.', 'Mutti, your Stollen would be worth a medal here.'],
  })[x.army],
  sleep: () => ['I think I slept two hours in the last two days.', 'We sleep in shifts, sitting up, boots on.', 'You can sleep anywhere once you\'re tired enough. I slept on a tank engine deck, it was warm.', 'Nobody really sleeps. You close your eyes and listen.', 'I fell asleep standing up on watch and the sergeant just let me.'],
  land: (x) => [
    'The country here is beautiful, if you can forget why you\'re looking at it. Hills, woods, little villages with pointed churches.',
    'Every village has a church, a pond and a dog that won\'t stop barking.',
    'The woods are so dark and thick you could lose a battalion in them. Somebody probably has.',
    'There are cows standing in the fields like nothing is happening. Some of them are dead now.',
    ...(x.army === 'bw' || x.army === 'nva' ? ['It is so strange to fight here. It looks like every Sunday drive we ever made.'] : ['It looks like a postcard. A postcard somebody is shooting at.']),
  ],
  enemy: (x) => ({
    us: ['We took some prisoners today. They looked about sixteen and scared out of their minds, same as us.', 'Their tanks are low and fast. You see the gun before you see anything else.', 'The guys who fought them say they come in waves and don\'t stop. That\'s about right.'],
    bw: ['The prisoners we took were from the NVA. They speak exactly like my cousins in Thüringen. That was hard.', 'The Russians come in waves, like Opa always said. He was right about that too.', 'Their artillery never stops. You learn to hear which ones are for you.'],
    sov: ['The Americans have a lot of everything. Their helicopters especially.', 'The Germans fight hard here. It is their country, after all.', 'We captured a jeep full of chocolate and cigarettes. The capitalists live well, the boys say.'],
    nva: ['Over there it is Germans too. Bundeswehr. Sometimes you hear them shout, and it is our language. I cannot describe it.', 'The West has so many tanks, I did not know there were so many.', 'One of their prisoners asked me where I am from. Gotha, I said. He said his aunt lives there.'],
  })[x.army],
  mates: (x) => [
    `${x.friend} keeps us laughing. Today he did the colonel's voice and nearly got caught.`,
    `${x.friend} plays cards with me every night. I owe him a fortune by now.`,
    `${x.friend} snores like a diesel. We'd know where he is even in the dark.`,
    `${x.friend} got a letter from his girl. She's waiting. He showed everybody the letter, twice.`,
    `${x.friend} and I share a hole. He's from a farm, he can dig like a machine.`,
  ],
  rumor: (x) => [
    'Everybody says something different about how long this lasts. Christmas, some say. Which one, I ask.',
    'There\'s a rumour we get relieved next week. There\'s always a rumour we get relieved next week.',
    'Somebody heard on the radio that the politicians are talking. I hope they talk fast.',
    ...(x.side === 'nato' ? ['They say the reinforcements from the States are on the way. Every day they\'re on the way.'] : ['They say the second echelon is right behind us, a whole army. I haven\'t seen it.']),
  ],
  weapon: (x) => ({
    infantry: ['My rifle is the cleanest thing I own. The sergeant makes sure.', 'I carry so much ammunition I walk like an old man.', 'We dig, we move, we dig again. My hands are one big blister.', 'The machine gunner in our squad is the most popular man in the company.'],
    armour: ['Four of us live in the tank now. It smells like diesel, sweat and cold coffee.', 'Our tank has a name now. I won\'t write it, Mom would be shocked.', 'Inside the tank you only see through a little slit. Then you see too much.', 'We spent half the night fixing a track. My knuckles are skinned to the bone.'],
    fire: ['We fire at map squares. We never see what we hit. Maybe that\'s better.', 'My ears ring all the time from the guns. Speak up when I come home.', 'We fired so many rounds the barrel was glowing.', 'Our battery moves every time we fire, before their guns find us. Pack, drive, unpack.'],
  })[x.kind],
  home: (x) => ({
    us: ['I think about the lake a lot. Save me a spot on the dock.', 'Is the Camaro still in the garage? Don\'t let Dad sell it.', 'Tell me about the football games. Normal stuff. I need normal stuff.', 'I want a cheeseburger and a whole Saturday on the couch.'],
    bw: ['Is the garden ready for winter? Vati, cover the roses.', 'I miss Sunday mornings: Brötchen, the radio, nobody in a hurry.', 'Did Eintracht win? Nobody here knows.', 'When this is over I am driving to the Ostsee... no, the Nordsee. Anywhere with water and no trees.'],
    sov: ['Is the birch by the house still standing? I think about it.', 'Tell me about the dacha. Did the apples come in?', 'I dream of the Volga in summer.', 'Kiss the little ones for me. Tell them their brother is a hero, but a careful one.'],
    nva: ['Is the Trabi running? Vati, do not let anyone borrow it.', 'I think about the Datsche, the barbecue in summer, everybody there.', 'When I come back we go to the Ostsee, like before. Promise.', 'Tell Oma I wear the scarf she knitted. It is the warmest thing I have.'],
  })[x.army],
  phase: (x) => (x.day <= 2
    ? ['It\'s only been a couple of days. It feels like a year already.', 'Everything is still new. They say you get used to it.']
    : x.day >= 6 ? ['It\'s been more than a week now, I think. The days all look the same.', 'I don\'t jump at every bang any more. I don\'t know if that\'s good.', 'The new guys look at us like we\'re old men. Maybe we are.'] : ['A few days in now. You start to know the sounds.', 'You learn fast here or you don\'t learn at all.']),
};

const CUT = ['We\'re cut off. The roads behind us are theirs now. Nothing comes up, not mail, not food, not men.', 'We\'re in a pocket, the officers say. That\'s a soft word for it.', 'No supplies for days. We share everything, even the last cigarettes.', 'If this letter gets out, it means somebody broke through to us. Pray they do.'];

const LOSSES = {
  none: ['Everybody in my squad made it. I keep counting them.', 'We didn\'t lose anybody from our platoon. Somebody up there likes us.', 'All of us came back. We just sat together for an hour and didn\'t say much.', 'No one from our unit got hurt this time. I touched wood, there\'s a lot of it here.'],
  some: (x) => [
    `We lost ${x.n === 1 ? 'one unit' : `${x.n} units`} today. ${x.friend} was with them.`,
    `${x.friend} didn't come back. I don't know what to write to his folks.`,
    `${x.n === 1 ? 'One of our crews' : `${x.n} of our units`} didn't come back. ${x.friend} was one of them.`,
    `We buried ${x.friend} by the road, with his helmet on a stick. I'll show his parents where, after.`,
    `${x.friend} gave me his watch to hold before it started. I still have it. I'll keep it until I can give it to his mother.`,
  ],
  wounded: (x) => [`${x.wounded} guys went back to the aid station. Most of them will be okay, they say.`, `The medics took ${x.wounded} of ours back. One of them was laughing, so that's something.`, `${x.wounded} wounded. The lucky ones go home with that.`, ...(x.wounded >= 3 ? [`I helped carry two of the ${x.wounded} wounded back. One of them held my hand the whole way.`] : [])],
};

const CLOSE = {
  us: ['Tell everybody I\'m fine. I mostly am.', 'Don\'t watch the news too much.', 'Send socks. Seriously. Socks.', 'Write back soon. Your letters are the best part of everything.', 'Give the dog a hug for me.', 'Don\'t worry. Or worry a little, but not a lot.'],
  bw: ['Macht euch keine Sorgen. I am careful.', 'Please send socks and Nivea, my hands are cracked.', 'Write soon. Every letter is a little bit of home.', 'Greet the neighbours. And the dog.', 'Do not watch the news every evening, Mutti. It does not help.'],
  sov: ['Do not cry, Mama, I am careful.', 'Tell Grandfather I remember what he told me about his war.', 'Write to me, even short. Every letter is like bread.', 'Do not worry. Our sergeant is a wise man, he keeps us alive.', 'Wait for me and I will come back.'],
  nva: ['Mach dir keine Sorgen, Mutti. I keep my head down.', 'Send me a few cigarettes if you can, they are worth more than money here.', 'Write soon, even just two lines.', 'Greet everyone in the Hausgemeinschaft.', 'Tell my brother he is not missing anything. He should stay in school.'],
};

// ------------------------------------------------------------------

function newWriter(c, army) {
  const P = PEOPLE[army];
  const inf = c.battalion.filter((u) => UNIT_TYPES[u.type]?.kind === 'infantry');
  const unit = pick(inf.length && Math.random() < 0.6 ? inf : c.battalion);
  const [to, greet] = pick(P.to);
  return { name: `${pick(P.first)} ${pick(P.last)}`, rank: pick(P.rank), unit: unit?.cid ?? null, unitName: unit?.name ?? '', type: unit?.type ?? 'rifles', to, greet, army };
}

const kindOf = (type) => {
  const T = UNIT_TYPES[type];
  if (!T || T.kind === 'infantry') return 'infantry';
  return T.category === 'fire' ? 'fire' : 'armour';
};

/**
 * Write the letter after battle `b` and keep it on the campaign (c.letter). `c` brings side, the
 * stacks (battalion), writer, letterUsed, and optionally army, day and cut (the writer's
 * battalion's cut-off level).
 */
export function writeLetter(c, b, { attackerWon, lost, wounded }) {
  const side = c.side;
  const army = PEOPLE[c.army] ? c.army : DEFAULT[side];
  const P = PEOPLE[army];
  const used = new Set(c.letterUsed ?? []);
  // a line counts as used with its place, names and numbers blanked out: the same sentence about another village is still the same sentence
  let key = (l) => l;
  const take = (lines) => { const fresh = lines.filter((l) => !used.has(key(l))); const l = pick(fresh.length ? fresh : lines); used.add(key(l)); return l; };
  const lines = [];
  let w = c.writer;
  if (w && (w.army !== army || !c.battalion.some((u) => u.cid === w.unit))) { // his unit is gone: a comrade writes
    const fallen = w;
    w = newWriter(c, army);
    if (fallen.army === army) {
      w.to = fallen.to;
      w.greet = fallen.greet;
      lines.push(take(LOST_WRITER(fallen.name.split(' ')[0])));
    }
  }
  w ??= newWriter(c, army);
  c.writer = w;
  const x = {
    army, side, place: b.name, friend: pick(P.first.filter((n) => !w.name.startsWith(n))), n: lost, wounded,
    kind: kindOf(w.type), day: c.day ?? Math.ceil((c.turn ?? 1) / 2), cut: c.cut ?? 0,
  };
  key = (l) => l.split(x.place).join('§').split(x.friend).join('@').replace(/\d+/g, '#');
  if (!lines.length) lines.push(take(OPEN[army]));
  lines.push(take(WHERE(x)));
  const ours = b.attacker === side;
  lines.push(take(OUTCOME[ours ? (attackerWon ? 'attackWon' : 'attackLost') : attackerWon ? 'broken' : 'held'](x)));
  const sky = SKY[b.weather === 'rain' || b.weather === 'fog' ? b.weather : Math.random() < 0.5 ? b.time : b.weather] ?? SKY[b.time];
  if (sky && Math.random() < 0.6) lines.push(take(sky));
  if (x.cut) lines.push(take(CUT));
  // two or three topics, never the same mix twice in a row
  for (const t of shuffle(Object.keys(TOPICS)).slice(0, x.cut ? 2 : 2 + (Math.random() < 0.5 ? 1 : 0))) {
    const pool = TOPICS[t](x);
    if (pool?.length) lines.push(take(pool));
  }
  lines.push(take(lost ? LOSSES.some(x) : LOSSES.none));
  if (wounded) lines.push(take(LOSSES.wounded(x)));
  lines.push(take(CLOSE[army]));
  c.letterUsed = [...used].slice(-MEMORY);
  c.letter = { turn: c.turn, greet: w.greet, body: lines, sign: pick(P.sign), from: `${w.rank} ${w.name}`, unit: w.unitName };
  return c.letter;
}
