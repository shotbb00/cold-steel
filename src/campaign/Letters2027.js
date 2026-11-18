// The 2027 campaign's letters home (campaign/Letters.js writes them): four voices of a war that has not
// happened — an American soldier, a Polish one, a Russian contract soldier and a Belarusian conscript
// (the last three in translation). Keyed us27 / pl27 / ru27 / by27. Phones that must stay off, drones
// overhead, the buzzing that means run, the jammer's hum, messages that may never get through.

export const PEOPLE_2027 = {
  us27: {
    first: ['Tyler', 'Jordan', 'Brandon', 'Josh', 'Austin', 'Marcus', 'Diego', 'Kyle', 'Malik', 'Ethan', 'Caleb', 'Luis', 'Andre', 'Noah', 'Hunter', 'Kevin'],
    last: ['Miller', 'Rodriguez', 'Johnson', 'Nguyen', 'Brooks', 'Garcia', 'Williams', 'Kowalski', 'Patel', 'Turner', 'Hughes', 'Ramirez', 'Jackson', 'Olsen', 'Reed', 'Cruz'],
    rank: ['PV2', 'PFC', 'SPC', 'SPC', 'CPL', 'SGT'],
    to: [['Mom', 'Hey Mom,'], ['Dad', 'Dad,'], ['Kayla', 'Kayla,'], ['Ashley', 'Ash,'], ['Mom and Dad', 'Mom & Dad,'], ['Grandma', 'Dear Grandma,'], ['Jess', 'Jess,']],
    sign: ['Love you,', 'Love you guys,', 'Talk soon (I hope),', 'Miss you,', 'Stay safe,', 'Your son,'],
  },
  pl27: {
    first: ['Kacper', 'Jakub', 'Mateusz', 'Bartek', 'Michał', 'Paweł', 'Szymon', 'Krzysztof', 'Tomek', 'Adrian', 'Kamil', 'Łukasz', 'Piotr', 'Damian', 'Wojtek', 'Marcin'],
    last: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Krawczyk', 'Piotrowski', 'Grabowski'],
    rank: ['szer.', 'st. szer.', 'st. szer.', 'kpr.', 'plut.'],
    to: [['Mama', 'Kochana Mamo,'], ['Tata', 'Drogi Tato,'], ['Ola', 'Olu,'], ['Kasia', 'Kochana Kasiu,'], ['Rodzice', 'Kochani Rodzice,'], ['Babcia', 'Droga Babciu,'], ['Magda', 'Magda,']],
    sign: ['Ściskam mocno,', 'Kocham Was,', 'Wasz syn,', 'Do zobaczenia,', 'Trzymajcie się,', 'Twój,'],
  },
  ru27: {
    first: ['Artyom', 'Maksim', 'Denis', 'Kirill', 'Nikita', 'Ilya', 'Roman', 'Anton', 'Vadim', 'Egor', 'Timur', 'Ruslan', 'Aleksei', 'Bair', 'Sergei', 'Danil'],
    last: ['Ivanov', 'Smirnov', 'Kuznetsov', 'Popov', 'Sokolov', 'Volkov', 'Fedorov', 'Morozov', 'Lebedev', 'Kozlov', 'Novikov', 'Dorzhiev', 'Khasanov', 'Orlov', 'Belov', 'Zaitsev'],
    rank: ['Pvt.', 'Pvt.', 'Jr. Sgt.', 'Sgt.', 'Sr. Sgt.'],
    to: [['Mama', 'Mama,'], ['Papa', 'Papa,'], ['Dasha', 'Dashenka,'], ['Katya', 'Katya,'], ['Mama and Papa', 'Dear Mama and Papa,'], ['Babushka', 'Babulya,'], ['Lera', 'Lera,']],
    sign: ['I kiss you,', 'Your son,', 'Wait for me,', 'Everything will be fine,', 'Hugs,', 'Yours,'],
  },
  by27: {
    first: ['Uladzimir', 'Dzmitry', 'Andrei', 'Pavel', 'Artsiom', 'Siarhei', 'Aliaksandr', 'Yauhen', 'Mikalai', 'Ihar', 'Vadzim', 'Kanstantsin', 'Maksim', 'Raman', 'Viktar', 'Yury'],
    last: ['Ivanou', 'Kavaliou', 'Novik', 'Kazlou', 'Mel’nik', 'Shautsou', 'Bandarenka', 'Marozau', 'Lukashevich', 'Paulau', 'Ramanovich', 'Hrynevich', 'Sakalou', 'Zhuk', 'Karpovich', 'Tsimoshyk'],
    rank: ['Pvt.', 'Pvt.', 'Jr. Sgt.', 'Sgt.'],
    to: [['Mama', 'Mamachka,'], ['Papa', 'Papa,'], ['Nasta', 'Nastsia,'], ['Volha', 'Volechka,'], ['Mama and Papa', 'Dear Mama and Papa,'], ['Babulia', 'Babulia,']],
    sign: ['I kiss you,', 'Your son,', 'Don’t worry,', 'Until we meet,', 'Hugs to everyone,'],
  },
};

const OPEN = {
  us27: ['Got a few minutes and a signal, so here goes.', 'They’re letting us send these through the battalion now. No pictures, no locations, sorry.', 'Writing this in a basement by headlamp.', 'Your package came. The guys destroyed the beef jerky in about four minutes.'],
  pl27: ['Mam chwilę, więc piszę.', 'They let us write again. I can’t say where, but you know roughly.', 'Writing on my knee in a cellar, sorry for the handwriting.', 'Got your parcel — the pierogi survived, can you believe it.'],
  ru27: ['I have a minute, so I am writing.', 'The phones were taken away, so I am writing on paper like grandfather did.', 'Writing by torchlight in a dugout.', 'Your parcel came. Thank you for the socks, they are the most valuable thing here.'],
  by27: ['I have a moment to write.', 'They took our phones at the border, so this is on paper.', 'Writing in the tent by a candle.', 'Thank you for the parcel. The salo is gone already, the lads helped.'],
};
const FOOD = {
  us27: ['MREs again. I would trade a kidney for a burger.', 'Hot chow came up once this week. Best spaghetti of my life.', 'The Polish guys share their sausage and we share our Skittles. Fair trade.'],
  pl27: ['Konserwy and bread. Mama, I dream of your żurek.', 'The Americans give us their MRE candy. We give them kiełbasa. Everyone wins.', 'A village woman brought us hot soup. I nearly cried.'],
  ru27: ['Rations and tea, tea and rations.', 'The field kitchen got hit by a drone, so it is dry rations for now.', 'We traded cigarettes for a chicken. Best night of the month.'],
  by27: ['The food is all right. Porridge in the morning, porridge at night.', 'We miss home food. Even the canteen at the base seems good now.', 'Bread and canned meat. I count the days to your draniki.'],
};
const ENEMY = {
  us27: ['Their artillery is no joke. When it starts you just get low and wait.', 'Their drones never stop. You learn to listen for the whine.', 'Saw their prisoners today. Kids, mostly. Looked as scared as us.'],
  pl27: ['They came the way everyone said they would. We were ready this time.', 'Their drones are everywhere. You hear the buzzing in your sleep.', 'Took prisoners today. Some of them did not even know they were in Poland.'],
  ru27: ['The NATO drones see everything. Move in the open and you are dead.', 'Their rockets came out of nowhere and hit the depot exactly.', 'The Poles fight hard. Nobody told us they would.'],
  by27: ['They said it would be quick. It is not quick.', 'The Poles have good weapons, and they are not running.', 'Their drones hunt us even at night. You cannot see them, only hear them.'],
};
const HOME = {
  us27: ['How’s Max? Tell him I miss our walks.', 'Did the Steelers win? Nobody here knows anything.', 'Tell everyone at church I said thanks for the letters.'],
  pl27: ['Jak tam w domu? Is the garden done?', 'Tell Babcia I am eating well (not true, but tell her).', 'Did Legia win? Here nobody knows anything.'],
  ru27: ['How is the dacha? Did you get the potatoes in?', 'Tell my little brother not to sign any contract. Tell him from me.', 'I think about the river at home, about fishing with Papa.'],
  by27: ['How is everything at home? Is the harvest in?', 'Tell Nasta I will be back for the wedding. I promise.', 'I miss the forest at home, the quiet.'],
};
const CLOSE = {
  us27: ['Gotta go, we’re moving. Don’t worry about me.', 'Lights out. Love you all.', 'Will write when I can. Don’t believe everything on the news.'],
  pl27: ['Muszę kończyć. Don’t worry about me.', 'We are moving out soon. Pray for us.', 'I’ll write when I can. Hug everyone.'],
  ru27: ['I must finish, we are moving. Don’t worry.', 'Don’t believe everything they say on television.', 'I will write again when I can.'],
  by27: ['I must stop now. Don’t worry, Mama.', 'We are moving soon. I will write.', 'Everything will be all right. Hug everyone.'],
};

export const L2027 = {
  OPEN,
  CLOSE,
  WHERE: (x) => [
    `We were at ${x.place}. A week ago nobody had heard of it.`,
    `${x.place} — little houses, a church, a few cows. That was before.`,
    `They moved us up to ${x.place} at night, no lights, no phones.`,
    `It was around ${x.place}, in the woods and the lakes.`,
    `${x.place}. I’ll remember that name.`,
  ],
  OUTCOME: {
    attackWon: (x) => ['We went in behind the guns and the drones, and they pulled back.', `${x.place} is ours. The drones found them, the guns did the rest, and we walked in.`, 'We pushed through faster than anyone expected. The tanks led and nobody stopped them.', 'They broke and ran. We took prisoners who had not slept in days.'],
    attackLost: () => ['We tried to go in, but their drones saw us coming a kilometre away.', 'Their artillery found us before we got anywhere. We pulled back in the dark.', 'We lost vehicles on the road in. They were waiting for us.', 'The attack stalled at the tree line. Too many good guys are still out there.'],
    held: () => ['They came at us with everything — guns, drones, tanks. We held.', 'Their drones came first, then the tanks. We stopped them at the edge of the village.', 'We held. Our jammers brought their drones down like flies.', 'They came three times. We are still here.'],
    broken: () => ['We had to fall back. There was nothing left to hold with.', 'Their artillery flattened the line and the tanks came through.', 'We pulled back in the night. I don’t want to write about it.', 'We lost the position. Some of the guys are missing.'],
  },
  SKY: {
    night: ['It went on all night. You hear the drones before you see anything.', 'At night the thermals see everything. You stay in the hole and don’t move.'],
    dawn: ['It started at first light, as they always do.', 'At dawn the guns started, and then the buzzing.'],
    dusk: ['It went on until dark, and then the evacuation teams went out.', 'At sunset the smoke lay red over the lakes.'],
    day: ['It went on all day. The drones never stopped.', 'Broad daylight, and you still couldn’t lift your head.'],
    rain: ['It rained, so fewer drones. That was the good part.', 'Rain all day. Mud up to the knees and the vehicles stuck.'],
    fog: ['Fog over the lakes. The drones couldn’t see, and neither could we.', 'Thick fog all morning. That saved us, I think.'],
    clear: ['A beautiful day, which here means more drones.', 'Blue sky, the fields golden. And the guns.'],
    overcast: ['Grey sky, low clouds, the jets stayed away.', 'Overcast all day. Good for us.'],
  },
  CUT: ['The road behind us is cut. No resupply, no evacuation.', 'We’re cut off, they say. The drones still find us.', 'Nothing has come up for two days. The batteries are running down.', 'If this gets to you, somebody got through.'],
  LOSSES: {
    none: ['Everyone in my squad made it. I keep counting.', 'We lost nobody this time. Thank God.', 'All of us came back. Nobody said a word all night.'],
    some: (x) => [
      `We lost ${x.n === 1 ? 'a whole team' : `${x.n} teams`}. ${x.friend} was with them.`,
      `${x.friend} didn’t come back. I don’t know what to tell his family.`,
      `A drone got ${x.friend}. There was nothing anyone could do.`,
      `${x.friend} gave me a note for his girlfriend, in case. I still have it.`,
    ],
    wounded: (x) => [`${x.wounded} of ours were evacuated. The medics are amazing.`, `${x.wounded} wounded. They went back in the armoured ambulances.`, `They got ${x.wounded} wounded out under fire. One of them was joking the whole way.`],
  },
  TOPICS: {
    food: (x) => FOOD[x.army],
    sleep: () => ['We sleep in shifts, two hours at a time, if you can call it sleep.', 'Haven’t had my boots off in a week.', 'You learn to sleep anywhere. Even with the guns going.', 'Nobody sleeps when the drones are up. And they’re always up.'],
    land: () => ['It is beautiful here — lakes, forests, little villages. It feels wrong.', 'The fields are full of craters now. The farmers left everything.', 'The forest goes on forever. You can hide a whole army in it.', 'There are storks everywhere. They don’t care about the war.'],
    enemy: (x) => ENEMY[x.army],
    mates: (x) => [
      `${x.friend} keeps us sane. He has a joke for everything.`,
      `${x.friend} and I share a hole and a thermos. He snores like a generator.`,
      `${x.friend} flies our drone. He says it’s like a video game, but it isn’t.`,
      `${x.friend} got a letter from his mother and read it out to everyone.`,
    ],
    rumor: (x) => [
      'Everybody has a different story about how long this lasts.',
      'There’s talk of rotation. There’s always talk of rotation.',
      ...(x.side === 'nato' ? ['They say more brigades are coming from home. I hope they hurry.'] : ['They say there will be negotiations soon. Nobody believes it.']),
    ],
    weapon: (x) => ({
      infantry: ['My rifle is the cleanest thing I own.', 'We carry a jammer everywhere now. It hums all the time.', 'You stop thinking about the drones. You just listen.', 'We dig, dig, dig. The deeper the hole, the longer you live.'],
      armour: ['Inside the tank you feel safe until you hear the buzzing.', 'They welded bars over our turret. Ugly, but the crews love it.', 'Our vehicle got hit by a drone and the cage stopped it. I kissed the bars.', 'The thermal sight sees everything at night. It’s almost unfair.'],
      fire: ['We fire and move, fire and move. Stay in one place and you’re dead.', 'The guns work day and night. My ears ring all the time.', 'Their counter-battery is fast. We drive off before the shells come back.', 'A drone watched us all day. We moved four times.'],
    })[x.kind],
    home: (x) => HOME[x.army],
    phase: (x) => (x.day <= 2 ? ['Only a few days, and it feels like a year.'] : x.day >= 6 ? ['More than a week now. The days blur together.', 'The new guys look at us like we are old men.'] : ['A few days in. You learn which sounds mean run.']),
  },
};
