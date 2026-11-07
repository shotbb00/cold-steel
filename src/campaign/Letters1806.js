// The 1806 campaign's letters home (campaign/Letters.js writes them): four voices of October 1806 —
// a French conscript, a Bavarian, a Prussian musketeer and a Saxon — in translation, with their own
// greetings. Many soldiers of the day could not write: some letters are taken down by a comrade.
// Besides the armies' own pools, 1806 has its own shared pools (L1806): the 1985 ones speak of
// tanks, tracers, diesel and aircraft.

export const PEOPLE_1806 = {
  fr: {
    first: ['Jean', 'Pierre', 'Louis', 'François', 'Jacques', 'Antoine', 'Joseph', 'Nicolas', 'Étienne', 'Michel', 'Claude', 'Benoît', 'Guillaume', 'Martin', 'Hippolyte', 'Baptiste'],
    last: ['Martin', 'Bernard', 'Dubois', 'Durand', 'Lefèvre', 'Moreau', 'Laurent', 'Girard', 'Roux', 'Fournier', 'Mercier', 'Blanc', 'Guérin', 'Faure', 'Chevalier', 'Gauthier'],
    rank: ['Fusilier', 'Voltigeur', 'Grenadier', 'Caporal', 'Sergent'],
    to: [['Mother', 'Ma chère mère,'], ['Father', 'Mon cher père,'], ['Marie', 'Ma chère Marie,'], ['Jeanne', 'Ma bonne Jeanne,'], ['my parents', 'Mes chers parents,'], ['my brother', 'Mon cher frère,']],
    sign: ['Your son who embraces you,', 'Your affectionate son,', 'I embrace you with all my heart,', 'Vive l\'Empereur, and your son,', 'Until I see you again,'],
  },
  by: {
    first: ['Sepp', 'Xaver', 'Alois', 'Michl', 'Hias', 'Korbinian', 'Lenz', 'Wastl', 'Toni', 'Franz', 'Martl', 'Girgl', 'Florian', 'Kaspar', 'Ludwig'],
    last: ['Huber', 'Bauer', 'Mayr', 'Wimmer', 'Gruber', 'Brunner', 'Stadler', 'Hofbauer', 'Eder', 'Moser', 'Reiter', 'Obermaier', 'Kainz', 'Lechner', 'Pichler'],
    rank: ['Füsilier', 'Füsilier', 'Gefreiter', 'Korporal', 'Sergeant'],
    to: [['Mutter', 'Liebe Mutter,'], ['Vater', 'Lieber Vater,'], ['Resi', 'Liebe Resi,'], ['Vroni', 'Meine liebe Vroni,'], ['Eltern', 'Liebe Eltern,'], ['the Bäuerin', 'Liebe Bäuerin,']],
    sign: ['Dein Sohn', 'Gott befohlen, dein', 'In Treue, dein', 'Es grüßt euch herzlich', 'Behüt euch Gott,'],
  },
  pr: {
    first: ['Friedrich', 'Wilhelm', 'Johann', 'Gottlieb', 'Christian', 'August', 'Karl', 'Ernst', 'Heinrich', 'Gottfried', 'Ludwig', 'Martin', 'Daniel', 'Joachim', 'Christoph'],
    last: ['Schulze', 'Krüger', 'Lehmann', 'Neumann', 'Schröder', 'Wendt', 'Hahn', 'Köhler', 'Ziegler', 'Lange', 'Wolff', 'Pohl', 'Kühn', 'Böttcher', 'Hübner'],
    rank: ['Musketier', 'Musketier', 'Gefreiter', 'Unteroffizier', 'Feldwebel'],
    to: [['Mutter', 'Herzliebe Mutter,'], ['Vater', 'Hochgeehrter Herr Vater,'], ['Dorothea', 'Liebe Dorothea,'], ['Lottchen', 'Mein liebes Lottchen,'], ['Eltern', 'Liebe Eltern,'], ['Schwester', 'Liebe Schwester,']],
    sign: ['Euer gehorsamer Sohn', 'Dein treuer', 'Mit Gott für König und Vaterland, dein', 'Lebt wohl,', 'Verbleibe euer'],
  },
  sx: {
    first: ['Gottlob', 'Traugott', 'Christian', 'Johann', 'Gotthelf', 'Karl', 'Friedrich', 'August', 'Benjamin', 'Samuel', 'Heinrich', 'Ehregott', 'Wilhelm', 'Fürchtegott'],
    last: ['Richter', 'Seidel', 'Lorenz', 'Herrmann', 'Kretzschmar', 'Ulbricht', 'Frenzel', 'Hänel', 'Rößler', 'Uhlig', 'Kaden', 'Pötzsch', 'Haubold', 'Fiedler', 'Wünsche'],
    rank: ['Musketier', 'Musketier', 'Gefreiter', 'Korporal', 'Sergeant'],
    to: [['Mutter', 'Liebe Mutter,'], ['Vater', 'Lieber Vater,'], ['Christiane', 'Liebe Christiane,'], ['Hanne', 'Meine Hanne,'], ['Eltern', 'Liebe Eltern,'], ['Muhme', 'Liebe Muhme,']],
    sign: ['Dein getreuer Sohn', 'Gott mit euch, dein', 'Es grüßt euch vielmals', 'Behüt euch der Herrgott,', 'Euer'],
  },
};

export const OPEN_1806 = {
  fr: ['The sergeant writes this for me, for I cannot hold the pen well, but every word is mine.', 'We halted at last, and a comrade lends me paper torn from a German prayer book.', 'Your letter found me at the bivouac. I keep it in my shako.', 'I write by the fire, so forgive the blots.', 'A courier rides for France tomorrow, they say, and I give him this.'],
  by: ['The Feldwebel lets us write, so I write.', 'Your letter came with the baggage wagons. I read it three times.', 'I write on the drum, so the lines are crooked.', 'The schoolmaster in our company writes this for me, he writes nicer than I could.', 'A quiet evening at last, the first since we left Bamberg.'],
  pr: ['I take the pen in hand to tell you that I am alive, God be thanked.', 'The Feldwebel allows us an hour, so here is a letter.', 'Your letter reached me in the camp. It smelled of home.', 'I write by a camp fire, the paper is from the sutler and dear.', 'Forgive the short letter last time. The march left no hour for it.'],
  sx: ['I write in haste, the post leaves at first light.', 'Your letter came. I carry it in my cartridge pouch, where it stays dry.', 'A comrade from Freiberg writes this for me, I tell him the words.', 'At last a rest day, if a wet field counts as rest.', 'I take this chance to send you word of me.'],
};

const FOOD = {
  fr: ['We live on what we find. The Germans hide their hens, but our voltigeurs find them.', 'Bread is a memory. We roast potatoes in the ashes and call it a feast.', 'A farmer\'s wife gave us soup and would not take our sous. Not all of them hate us.', 'The Emperor\'s army marches on its stomach, they say. Ours is very empty.'],
  by: ['The bread is black and hard, but there is beer here, Thuringian beer, thin as rain.', 'I would give a week\'s pay for your Knödel.', 'The French take everything from the villages before we arrive.', 'We cooked a goose the Feldwebel did not see. He smelled it, though.'],
  pr: ['The bread wagons are behind somewhere. We have not seen them in three days.', 'The ration is a pound of bread and a little meat, when it comes.', 'The peasants here sell us potatoes dearly. They know we are hungry.', 'We had soup with nothing in it but hope.'],
  sx: ['The commissariat is in disorder. We eat what the villages give.', 'Your sausage arrived, Mother, and made me many friends for one evening.', 'We march on empty bellies and the Prussians eat first.', 'Coffee is a thing of the past. We boil acorns and pretend.'],
};
const ENEMY = {
  fr: ['The Prussians stand in their lines like statues, very beautiful, very slow.', 'Their cavalry is fine, big men on big horses. We form square and let them come.', 'The prisoners say they thought the Emperor was still in Paris. He is here, and so are we.'],
  by: ['The Prussians are proud, but they march as if it were still old Fritz\'s day.', 'A Saxon prisoner spoke our tongue nearly. He said he never wanted this war.', 'The French are our allies now. Strange times. They fight like devils.'],
  pr: ['The French come in swarms, not in lines, and shoot from every hedge.', 'They say Bonaparte marches faster than a letter. I believe it now.', 'Their skirmishers hide in the gardens and pick off our officers.'],
  sx: ['The French are everywhere at once. Our officers do not know where to turn.', 'The Prussians look down on us, but it is our blood on the field too.', 'I saw the French Guard from afar. Tall men in bearskins, very quiet.'],
};
const HOME = {
  fr: ['Is the harvest in? Tell Father I think of the vines.', 'I dream of our village fête, the music and the dancing.', 'Tell my little brother not to wish for the army. There is no glory in mud.', 'When I come home I will never leave the valley again.'],
  by: ['Is the hay in, and the potatoes? Who helps Vater now?', 'I think of Kirchweih, the music, the dancing under the linden.', 'Light a candle for me at the chapel, Mutter.', 'Greet the cows for me. I am not joking.'],
  pr: ['Has the rye come in well? I think of the fields every day.', 'Tell little Gottlieb his brother wears the King\'s coat with honour.', 'I miss the quiet Sundays, the church, the bells.', 'When I come home, God willing, I will marry you, Lottchen, if you still want me.'],
  sx: ['Is the harvest in? Tell Vater I think of the orchard.', 'I miss the Dresden bells on Sunday.', 'Greet the neighbours, and tell old Seidel his boy is well.', 'Light the lamp in the window for me, Mutter.'],
};
const CLOSE = {
  fr: ['Do not weep for me, Mother. I am well and I eat when I can.', 'Pray for me at the church, and greet everyone in the village.', 'Write to me at the regiment, the letters find us in the end.', 'Embrace my sisters for me.'],
  by: ['Do not worry, Mutter. Gott schützt die Bayern.', 'Write soon. Every letter is a little bit of home.', 'Greet everyone at the inn.', 'Pray for me, and I pray for you.'],
  pr: ['Do not worry, God and the King will keep me.', 'Greet the pastor and all our friends.', 'Write soon, even two lines are a great joy.', 'I remain your faithful son until death.'],
  sx: ['Do not worry, Mutter, the Lord keeps me.', 'Greet the whole village.', 'Write soon, and send stockings if you can.', 'God grant this war ends quickly.'],
};

/** The shared pools as 1806 has them (no tanks, no tracers, no aircraft). */
export const L1806 = {
  OPEN: OPEN_1806,
  CLOSE,
  WHERE: (x) => [
    `We fought at a place called ${x.place}.`,
    `It was ${x.place}: a church, a mill, some farms, and both armies wanted it.`,
    `${x.place}. I will remember that name as long as I live.`,
    `They marched us to ${x.place} at the double, and there we stood.`,
    `The day was spent round ${x.place}, in the fields and the orchards.`,
  ],
  OUTCOME: {
    attackWon: (x) => ['We went forward with the drums beating and they gave way.', 'We charged with the bayonet and they ran before we reached them.', `${x.place} is ours. The colonel had the band play.`, 'We took the village house by house, and then it was quiet.'],
    attackLost: () => ['We went forward three times and three times their fire threw us back.', 'Their guns swept the field. We lay down in the furrows until night.', 'The attack failed. Too many good men stayed on that slope.', 'We could not reach them. Their line did not waver.'],
    held: () => ['They came at us all day and we stood. The colonel shook every man\'s hand.', 'Their columns came on with the drums, and our volleys sent them back.', 'Their horse charged us twice. We formed square and they broke on our bayonets.', 'We held. My hands still shake writing it.'],
    broken: () => ['They broke our line and we had to fall back. It was disorder.', 'We could not hold. We retreated in the dark, nobody spoke.', 'Their cavalry caught us in the open. I do not want to write of it.', 'We lost the village and many more besides.'],
  },
  SKY: {
    night: ['It went on into the night, the flashes of the muskets like lightning.', 'At night you see only the fires of the bivouacs, theirs and ours.'],
    dawn: ['It began at first light, the mist still on the fields.', 'At dawn their drums woke us before our own did.'],
    dusk: ['It went on until dark, and then the cries of the wounded.', 'At sunset the smoke lay red over the fields.'],
    day: ['It lasted the whole day. The smoke was so thick the sun was a coin.', 'Broad day, and the smoke so thick we fired at shadows.'],
    rain: ['It rained, and half the muskets would not fire.', 'Rain all day. The powder in the pan is wet more than dry.'],
    fog: ['The fog was so thick we heard their drums before we saw a coat.', 'In the fog you only hear them, the drums and the horses.'],
    clear: ['A fine autumn day, which felt wrong.', 'Blue sky, the leaves turning. And the guns.'],
    overcast: ['A grey October sky, cold wind across the fields.', 'Low cloud all day, and the smoke would not rise.'],
  },
  CUT: ['The roads behind us are theirs now. No bread comes up, no letters.', 'We are surrounded, the officers say, but they say it softly.', 'Nothing has come up for days. We share the last crusts.', 'If this letter reaches you, someone has broken through to us. Pray they do.'],
  LOSSES: {
    none: ['Everyone from my company came through. I keep counting them.', 'We lost no one this time, God be thanked.', 'All of us came back. We sat by the fire and said nothing for a long time.'],
    some: (x) => [
      `We lost ${x.n === 1 ? 'a whole company' : `${x.n} companies`} today. ${x.friend} was with them.`,
      `${x.friend} did not come back. I do not know what to write to his people.`,
      `We buried ${x.friend} under a lime tree by the road. I will show his mother where.`,
      `${x.friend} gave me his tobacco pouch before it began. I keep it for his father.`,
    ],
    wounded: (x) => [`${x.wounded} of ours went to the surgeons. God help them there.`, `The carts took ${x.wounded} wounded back. One of them sang the whole way.`, `${x.wounded} wounded. The lucky ones go home with a pension.`],
  },
  TOPICS: {
    food: (x) => FOOD[x.army],
    sleep: () => ['We sleep on the bare field, wrapped in our greatcoats, feet to the fire.', 'I have not slept in a bed since we left home.', 'You learn to sleep on the march, holding the man in front.', 'The bivouac fires keep us warm on one side only.'],
    land: () => ['This Thuringia is all hills and forests, and the roads are mud.', 'Every village has a church with an onion tower, and every one is empty when we come.', 'The woods are so thick a regiment could get lost. One did.', 'Fine country, if you could forget why we are in it.'],
    enemy: (x) => ENEMY[x.army],
    mates: (x) => [
      `${x.friend} keeps us laughing. He imitates the colonel on his horse.`,
      `${x.friend} and I share a blanket and a cooking pot. He snores like a bellows.`,
      `${x.friend} got a letter from his sweetheart and read it aloud to the whole file.`,
      `${x.friend} can sing, and when he sings at the fire even the sergeant listens.`,
    ],
    rumor: (x) => [
      'Everyone says something different about how long this lasts.',
      'There is a rumour we go into winter quarters soon. There is always that rumour.',
      ...(x.side === 'nato' ? ['They say we will be in Berlin before the first snow.'] : ['They say the Russians are coming to help us. Nobody has seen them.']),
    ],
    weapon: (x) => ({
      infantry: ['My musket is the cleanest thing I own. The sergeant sees to that.', 'We bite the cartridges until our mouths are black with powder.', 'My shoulder is blue from the musket\'s kick.', 'We march thirty miles a day with the pack. My feet are one blister.'],
      armour: ['My horse is called Fuchs and he is braver than I am.', 'We ride all day and groom the horses half the night.', 'In the charge you hear nothing but the hooves and your own heart.', 'A trooper without a horse is nothing, so I care for mine like a brother.'],
      fire: ['We serve the guns until we are deaf and black with powder.', 'Our battery fires until the barrels are too hot to touch.', 'The horses pull the guns through the mud, and we pull with them.', 'The canister at close range — I will not write what it does.'],
    })[x.kind],
    home: (x) => HOME[x.army],
    phase: (x) => (x.day <= 2 ? ['Only a few days, and it feels like a year.'] : x.day >= 6 ? ['It is more than a week now, I think. The days are all the same.', 'The recruits look at us like old men now.'] : ['A few days in now. You learn the sounds.']),
  },
};
