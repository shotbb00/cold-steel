// The 1918 campaign's letters home (campaign/Letters.js writes them): four voices of August 1918 —
// a British Tommy, a French poilu, a German infantryman and a stormtrooper (the last three in
// translation). Keyed uk18 / fr18 / de18 / st18. Field-service postcards, the censor, the trench:
// the mud, the rats, the gas, the tanks that came at last. The Germans write as men who know by now
// that the war is lost — home, hunger under the blockade, never the regime's words.

export const PEOPLE_1918 = {
  uk18: {
    first: ['Tom', 'Bill', 'Alf', 'Harry', 'Fred', 'Albert', 'Jack', 'George', 'Ernie', 'Sid', 'Percy', 'Walter', 'Arthur', 'Charlie', 'Reg', 'Stan', 'Dick', 'Jim'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Hughes', 'Edwards', 'Green', 'Hall', 'Wood', 'Clarke', 'Harris'],
    rank: ['Pte.', 'Pte.', 'L/Cpl.', 'Cpl.', 'Sgt.'],
    to: [['Mother', 'Dear Mother,'], ['Dad', 'Dear Dad,'], ['Edith', 'My dearest Edith,'], ['Flo', 'Dear Flo,'], ['Mother and Dad', 'Dear Mother and Dad,'], ['Gran', 'Dear Gran,'], ['Nellie', 'Dear Sis,']],
    sign: ['Your loving son,', 'With love from your affectionate son,', 'Ever yours,', 'Your loving husband,', 'Cheerio for now,', 'Keep smiling,'],
  },
  fr18: {
    first: ['Marcel', 'Henri', 'Lucien', 'Gaston', 'Émile', 'Fernand', 'René', 'Léon', 'Albert', 'Maurice', 'Georges', 'Paul', 'Raymond', 'André', 'Eugène', 'Louis'],
    last: ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefèbvre', 'Leroy', 'Roux', 'Fontaine'],
    rank: ['Soldat', 'Soldat', 'Caporal', 'Sergent', 'Adjudant'],
    to: [['Mother', 'Ma chère maman,'], ['Father', 'Mon cher papa,'], ['Germaine', 'Ma chère Germaine,'], ['Marguerite', 'Ma petite Marguerite,'], ['my parents', 'Mes chers parents,'], ['my wife', 'Ma chère femme,']],
    sign: ['Je vous embrasse bien fort,', 'Ton fils qui t\'aime,', 'Mille baisers,', 'Ton mari qui pense à toi,', 'À bientôt, j\'espère,'],
  },
  de18: {
    first: ['Karl', 'Wilhelm', 'Friedrich', 'Otto', 'Hermann', 'Paul', 'Heinrich', 'Ernst', 'Max', 'Richard', 'Walter', 'Fritz', 'August', 'Franz', 'Emil', 'Gustav'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder'],
    rank: ['Musketier', 'Musketier', 'Gefreiter', 'Unteroffizier', 'Vizefeldwebel'],
    to: [['Mutter', 'Liebe Mutter,'], ['Vater', 'Lieber Vater,'], ['Frieda', 'Meine liebe Frieda,'], ['Martha', 'Liebe Martha,'], ['Eltern', 'Liebe Eltern,'], ['Großmutter', 'Liebe Großmutter,']],
    sign: ['Dein Sohn', 'In Liebe, dein', 'Es grüßt und küßt euch', 'Auf ein frohes Wiedersehen,', 'Bleibt gesund,'],
  },
  st18: {
    first: ['Ernst', 'Hans', 'Kurt', 'Willi', 'Rudolf', 'Bruno', 'Georg', 'Alfred', 'Konrad', 'Josef', 'Anton', 'Ludwig', 'Hugo', 'Erich', 'Arno', 'Theo'],
    last: ['Krüger', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Lehmann', 'Schmitz', 'Peters', 'Brandt', 'Haas', 'Vogt', 'Engel', 'Horn', 'Roth', 'Busch', 'Kühn'],
    rank: ['Sturmsoldat', 'Gefreiter', 'Gefreiter', 'Unteroffizier', 'Feldwebel'],
    to: [['Mutter', 'Liebe Mutter,'], ['Vater', 'Lieber Vater,'], ['Käthe', 'Meine liebe Käthe,'], ['Anna', 'Liebe Anna,'], ['Eltern', 'Liebe Eltern,'], ['Bruder', 'Lieber Bruder,']],
    sign: ['Dein', 'Dein Junge', 'Kopf hoch,', 'Herzlich, dein', 'Auf bald,'],
  },
};

const OPEN = {
  uk18: ['Just a line to let you know I am in the pink, as the saying goes.', 'Thanks for the parcel. The cake arrived in crumbs but we ate every crumb.', 'Writing this in a dugout by the light of a candle stuck in a bully-beef tin.', 'We are out of the line for a few days, so here is a proper letter at last.', 'The censor will have his pencil out, so I will keep it short.'],
  fr18: ['Je profite d\'un moment de calme pour t\'écrire.', 'Ta lettre m\'a trouvé au repos. Je l\'ai lue trois fois.', 'I write on my knee in the trench, so forgive the hand.', 'We have come down from the line, and at last there is time to write.', 'The post leaves tonight, so a few lines quickly.'],
  de18: ['Endlich eine ruhige Stunde in einem Unterstand.', 'Your parcel came, Mutter. I know what it cost you at home.', 'I write by a candle stump in a dugout, so do not mind the hand.', 'We are out of the line for once and I take the chance to write.', 'The Feldpost goes this evening, so only a few lines.'],
  st18: ['A quiet hour behind the line, the first in many days.', 'Your letter came with the rations. It was the best thing in the sack.', 'I write quickly; tonight we go forward again.', 'We have been taken out of the line to rest. Rest! We sleep and eat.', 'The Feldpost still finds us, wherever we are.'],
};
const FOOD = {
  uk18: ['Bully beef and biscuits again. The biscuits would make good roof tiles.', 'Plum and apple jam, always plum and apple. Never strawberry.', 'Tea made in a petrol tin tastes of petrol. We drink it anyway.', 'A Frenchwoman behind the line sells eggs and chips. Best meal I\'ve had since home.'],
  fr18: ['The soup came up cold, as always, but there was wine — the pinard never fails.', 'We had a parcel from Germaine\'s mother. The sausage did not last the night.', 'The cook\'s kitchen was hit and we went hungry till dark.', 'Bread, a little wine, and a tin of singe. "Monkey" they call it. It is not monkey, I hope.'],
  de18: ['We eat turnips. Turnip soup, turnip bread, turnip jam.', 'When we took the English trenches in the spring, we found their stores: white bread, jam, real coffee. Then we knew.', 'The bread is half sawdust. The Feldküche comes up at night, if at all.', 'At home you have less than we do, I know. Do not send me anything, Mutter.'],
  st18: ['We are fed better than the line regiments, for what they ask of us.', 'In March we lived on English rations for a week. Bully beef, corned beef — and cigarettes!', 'The rations are thin again now. The spring is long gone.', 'We share everything in the Stoßtrupp, even the last biscuit.'],
};
const ENEMY = {
  uk18: ['Fritz is a decent enough sort when he comes in with his hands up. Mostly boys, now.', 'The Jerry machine gunners are brave men, I\'ll give them that. They stay to the last.', 'The prisoners say they are hungry at home. You can see it in them.'],
  fr18: ['Les Boches still fight, but they come over with their hands up more and more.', 'The Americans are here now, big healthy fellows. The Boches must know it.', 'Their machine guns are the worst. A nest can hold up a regiment.'],
  de18: ['The English have tanks now, more and more of them, and aircraft everywhere.', 'The Americans are coming over in hundreds of thousands, they say. We are fewer every week.', 'The Tommies are not bad fellows, the prisoners. Tired like us.'],
  st18: ['In the spring we went right through the English. We thought it was the end of the war.', 'Their tanks come now in dozens. Our Tankgewehr kicks like a horse.', 'The French fight hard for every yard of their country. Who can blame them.'],
};
const HOME = {
  uk18: ['How is the allotment, Dad? Are the runner beans up?', 'Give my love to little Jim. Tell him his dad will be home for Christmas, perhaps.', 'I think of the pub on a Saturday and the football. Seems another world.', 'Tell Mrs Barnes I saw her Bert and he is well.'],
  fr18: ['Is the harvest in? Who helps you with it, with all the men gone?', 'I dream of the farm, the cows, the smell of the hay.', 'Tell the little one his father thinks of him every day.', 'When this is finished I will never leave the village again.'],
  de18: ['How are you all getting along at home with so little to eat?', 'Is Father still at the works? Do they still pay with these paper notes?', 'Kiss the children for me. Tell them Papa is coming home.', 'I think of the Sunday walks to the Kaffeegarten. Will it ever be like that again?'],
  st18: ['Is my brother still in Flanders? I have had no word.', 'Greet everyone in the street. Tell them I am well.', 'When I come home I want to sleep in a bed for a week and do nothing.', 'Light a candle for me at the church, Mutter.'],
};
const CLOSE = {
  uk18: ['Don\'t worry about me, I\'ll be all right.', 'Write soon and send some fags if you can.', 'Give my love to everyone at home.', 'Must close now as the post corporal is waiting.'],
  fr18: ['Ne t\'inquiète pas pour moi.', 'Write soon, every letter is a bit of home.', 'Embrace everyone for me.', 'I must stop, the sergeant is calling.'],
  de18: ['Macht euch keine Sorgen um mich.', 'Write soon, even two lines are a joy.', 'Greet everyone at home.', 'May God grant this war ends soon.'],
  st18: ['Do not worry, Mutter, I am careful.', 'Write soon.', 'Greet the whole family.', 'It cannot last much longer now.'],
};

/** The shared pools as 1918 has them: trenches, gas, tanks, shells. */
export const L1918 = {
  OPEN,
  CLOSE,
  WHERE: (x) => [
    `We were in the line at ${x.place}, if you can call what is left of it a place.`,
    `${x.place} — a village on the map. There is nothing there now but brick dust.`,
    `They sent us up to ${x.place} by night, through the communication trenches.`,
    `It was round ${x.place}, in the shell holes and the old trenches.`,
    `${x.place}. I will not forget that name.`,
  ],
  OUTCOME: {
    attackWon: (x) => ['We went over behind the barrage and their front line was ours before we knew it.', 'The tanks went ahead and crushed the wire. We followed and Fritz came out with his hands up.', `${x.place} is ours. We took more prisoners than we have men.`, 'We went forward further in a morning than in all the years before.'],
    attackLost: () => ['We went over at dawn and their machine guns caught us on the wire.', 'The barrage lifted and they were still there, every one of them. We lay in the shell holes till dark.', 'The attack was held up. Too many good men are lying out there.', 'We could not get through their wire. The tanks broke down before they reached it.'],
    held: () => ['They came at us after a bombardment that lasted hours. We held.', 'Their storm troops got into our trench, but we bombed them out again.', 'They came on in the mist and our machine guns stopped them on the wire.', 'We held the line. My hands still shake writing it.'],
    broken: () => ['They came through in the fog and we had to fall back.', 'We lost the trench, then the next one. We are a long way back now.', 'Their tanks came over the top and there was nothing to stop them.', 'We could not hold. Many of the lads are prisoners.'],
  },
  SKY: {
    night: ['It went on into the night, the flares going up all along the line.', 'At night the Very lights make it bright as day, and then dark again.'],
    dawn: ['It began at first light, the mist still lying in the shell holes.', 'At dawn the barrage started, and the whole earth shook.'],
    dusk: ['It went on until dark, and then the stretcher bearers went out.', 'At sunset the smoke lay red over the whole front.'],
    day: ['It lasted all day. The shelling never stopped.', 'Broad day, the larks singing over no man\'s land, and the guns.'],
    rain: ['It rained, and the trenches are knee-deep in water.', 'Rain all day. The mud would swallow a horse.'],
    fog: ['The fog was so thick you could not see the next traverse.', 'In the fog the gas and the mist look alike. That is the worst of it.'],
    clear: ['A fine summer day, which felt wrong.', 'Blue sky, the wheat standing in the fields. And the guns.'],
    overcast: ['A grey sky, the smoke lying low over everything.', 'Low cloud all day, and the aeroplanes could not see us — nor we them.'],
  },
  CUT: ['The communication trench behind us is in their hands. No rations come up, no letters.', 'We are cut off, the officers say, but they say it quietly.', 'Nothing has come up for two days. We share the last tins.', 'If this letter reaches you, someone has got through to us.'],
  LOSSES: {
    none: ['Everyone in our section came through. I keep counting them.', 'We lost nobody this time, thank God.', 'All of us came back. We sat in the dugout and nobody said a word.'],
    some: (x) => [
      `We lost ${x.n === 1 ? 'a whole section' : `${x.n} sections`}. ${x.friend} was with them.`,
      `${x.friend} did not come back. I don\'t know what to write to his people.`,
      `We buried ${x.friend} behind the support line, with a cross made from a ration box.`,
      `${x.friend} gave me his photograph to send home if anything happened. I have it here.`,
    ],
    wounded: (x) => [`${x.wounded} of ours went back with the stretcher bearers.`, `${x.wounded} wounded. A few will get a Blighty one and go home.`, `The ambulances took ${x.wounded} wounded back. One of them was laughing.`],
  },
  TOPICS: {
    food: (x) => FOOD[x.army],
    sleep: () => ['We sleep in the dugout, if you can sleep with the rats running over you.', 'I have not had my boots off in nine days.', 'You learn to sleep standing up on the fire step.', 'The lice are worse than the shells. At least the shells stop sometimes.'],
    land: () => ['This was all farmland once. Now it is craters as far as you can see.', 'Behind the line the fields are green and there are poppies everywhere.', 'The woods are just stumps now, black stumps.', 'There is a village on the map here. I have not found it yet.'],
    enemy: (x) => ENEMY[x.army],
    mates: (x) => [
      `${x.friend} keeps us laughing. He can imitate the sergeant-major perfectly.`,
      `${x.friend} and I share a dugout and a tin of tea. He snores like a howitzer.`,
      `${x.friend} got a letter from his girl and read it out to the whole section.`,
      `${x.friend} plays the mouth organ, and when he plays even Fritz goes quiet.`,
    ],
    rumor: (x) => [
      'Everyone says something different about how long this lasts.',
      'There is talk of leave. There is always talk of leave.',
      ...(x.side === 'nato' ? ['They say we will be over the Rhine by Christmas.'] : ['They say there will be peace by autumn. Nobody believes it any more.']),
    ],
    weapon: (x) => ({
      infantry: ['My rifle is the cleanest thing I own.', 'We carry our masks everywhere now. The gas comes at any hour.', 'We practised going over with the tanks. It is a new kind of war.', 'Bombs, bombs, always more bombs. My arm is stiff from throwing.'],
      armour: ['Inside the tank it is hot as an oven and the fumes make you sick.', 'Our tank broke down twice before we even reached the line.', 'The bullets ring on the armour like hail on a tin roof.', 'The horses are thin, but they still go when you ask.'],
      fire: ['We serve the guns until we are deaf.', 'Our battery fired four hundred rounds in a night.', 'The horses pull the guns through the mud and we push.', 'The counter-battery fire is the worst. They know where we are.'],
    })[x.kind],
    home: (x) => HOME[x.army],
    phase: (x) => (x.day <= 2 ? ['Only a few days, and it feels like a year.'] : x.day >= 6 ? ['It is more than a week now. The days are all the same.', 'The new drafts look at us like old men.'] : ['A few days in now. You learn which shells to duck.']),
  },
};
