// The 1918 campaign's letters home (campaign/Letters.js writes them): four voices of August 1918 (and the world
// campaign's other armies: Italians, Austro-Hungarians, Ottomans, Russians, ANZACs, Americans, Serbs, Bulgarians) —
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
  // the world campaign's other armies (wcampaign/wars/ww1.js): Italy, Austria-Hungary, the Ottomans, Russia, the ANZACs, the
  // Americans, the Serbs and the Bulgarians (all but the Australians, New Zealanders and Americans in translation)
  it18: {
    first: ['Giovanni', 'Giuseppe', 'Antonio', 'Luigi', 'Francesco', 'Angelo', 'Pietro', 'Carlo', 'Mario', 'Salvatore', 'Domenico', 'Vincenzo', 'Enrico', 'Battista'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca'],
    rank: ['Fante', 'Fante', 'Caporale', 'Caporal maggiore', 'Sergente'],
    to: [['Mother', 'Cara mamma,'], ['Father', 'Caro papà,'], ['Maria', 'Mia cara Maria,'], ['Teresa', 'Cara Teresa,'], ['my parents', 'Carissimi genitori,'], ['my wife', 'Mia cara moglie,']],
    sign: ['Vi abbraccio tutti,', 'Il vostro figlio,', 'Tuo per sempre,', 'Baci, baci,', 'A presto, se Dio vuole,'],
  },
  ah18: {
    first: ['Josef', 'Franz', 'Johann', 'Karl', 'István', 'János', 'Václav', 'Jan', 'Anton', 'Ferenc', 'Ludwig', 'Tomáš', 'Stanisław', 'Ivan'],
    last: ['Gruber', 'Huber', 'Bauer', 'Wagner', 'Nagy', 'Kovács', 'Novák', 'Svoboda', 'Horváth', 'Pichler', 'Kowalski', 'Moser', 'Dvořák', 'Kranjc'],
    rank: ['Infanterist', 'Infanterist', 'Gefreiter', 'Korporal', 'Zugsführer'],
    to: [['Mother', 'Liebe Mutter,'], ['Father', 'Lieber Vater,'], ['Rosa', 'Liebe Rosa,'], ['Anna', 'Meine liebe Anna,'], ['my parents', 'Liebe Eltern,'], ['my wife', 'Liebes Weib,']],
    sign: ['Dein treuer Sohn', 'Es küsst dich', 'Gott befohlen,', 'Auf Wiedersehen,', 'Dein'],
  },
  ot18: {
    first: ['Mehmet', 'Ahmet', 'Mustafa', 'Ali', 'Hasan', 'Hüseyin', 'İbrahim', 'Osman', 'Halil', 'Yusuf', 'Süleyman', 'Ömer', 'Kemal', 'Rıza'],
    last: ['oğlu Ahmet', 'oğlu Mehmet', 'oğlu Hasan', 'oğlu Ali', 'oğlu Osman', 'oğlu Mustafa', 'oğlu İsmail', 'oğlu Halil'],
    rank: ['Nefer', 'Nefer', 'Onbaşı', 'Çavuş'],
    to: [['Mother', 'My dear mother,'], ['Father', 'My respected father,'], ['Fatma', 'My Fatma,'], ['Ayşe', 'Dear Ayşe,'], ['my brother', 'My brother,'], ['the family', 'To all of you at home,']],
    sign: ['Your son,', 'Kiss my mother’s hands for me,', 'May God keep you,', 'Your son, who prays for you,'],
  },
  ru18: {
    first: ['Ivan', 'Pyotr', 'Fyodor', 'Grigory', 'Semyon', 'Vasily', 'Nikolai', 'Mikhail', 'Stepan', 'Yakov', 'Andrei', 'Matvei', 'Taras', 'Kuzma'],
    last: ['Ivanov', 'Petrov', 'Sidorov', 'Kuznetsov', 'Smirnov', 'Popov', 'Vasiliev', 'Fedorov', 'Morozov', 'Shevchenko', 'Volkov', 'Zaitsev', 'Belov', 'Kovalenko'],
    rank: ['Ryadovoy', 'Ryadovoy', 'Yefreytor', 'Mladshiy unter-ofitser'],
    to: [['Mother', 'Dear Mother,'], ['Father', 'Dear Father,'], ['Akulina', 'My dear Akulina,'], ['Dunya', 'Dunyasha,'], ['my parents', 'Dear parents, I bow to you to the ground,'], ['my wife', 'My dear wife,']],
    sign: ['Your son,', 'I bow to you all,', 'Your loving husband,', 'Pray for me,', 'With greetings from the front,'],
  },
  anzac18: {
    first: ['Bill', 'Jack', 'Bert', 'Les', 'Harry', 'Jim', 'Ted', 'Wally', 'Clarrie', 'Mick', 'Norm', 'Frank', 'Alf', 'Stan'],
    last: ['Smith', 'Murphy', 'Kelly', 'Brown', 'O’Connor', 'MacDonald', 'Ryan', 'Wilson', 'Thompson', 'Campbell', 'Walker', 'Anderson', 'Te Rangi', 'Fraser'],
    rank: ['Pte.', 'Tpr.', 'L/Cpl.', 'Cpl.', 'Sgt.'],
    to: [['Mum', 'Dear Mum,'], ['Dad', 'Dear Dad,'], ['Maggie', 'Dear Maggie,'], ['Ethel', 'My dear Ethel,'], ['Mum and Dad', 'Dear Mum and Dad,'], ['Sis', 'Dear Sis,']],
    sign: ['Your loving son,', 'Cheerio,', 'Your affectionate son,', 'Hooroo for now,', 'Love to all,'],
  },
  aef18: {
    first: ['Joe', 'Harry', 'Walter', 'Frank', 'Eddie', 'Charlie', 'Willie', 'Sam', 'Floyd', 'Elmer', 'Tony', 'Herman', 'Roy', 'Leo'],
    last: ['Johnson', 'Miller', 'O’Brien', 'Schmidt', 'Rossi', 'Kowalski', 'Davis', 'Jackson', 'Larsen', 'Murphy', 'Cohen', 'Garcia', 'Baker', 'Nelson'],
    rank: ['Pvt.', 'Pvt.', 'Pfc.', 'Cpl.', 'Sgt.'],
    to: [['Ma', 'Dear Ma,'], ['Pa', 'Dear Pa,'], ['Mabel', 'Dearest Mabel,'], ['Ruth', 'Dear Ruth,'], ['Ma and Pa', 'Dear Folks,'], ['Sis', 'Dear Sis,']],
    sign: ['Your loving son,', 'Love to all the folks,', 'Yours till the cows come home,', 'Your doughboy,', 'So long for now,'],
  },
  serb18: {
    first: ['Milan', 'Dragan', 'Miloš', 'Stevan', 'Radomir', 'Živojin', 'Petar', 'Vojislav', 'Dragutin', 'Nikola', 'Jovan', 'Stojan', 'Đorđe', 'Lazar'],
    last: ['Petrović', 'Jovanović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Stanković', 'Pavlović', 'Milošević', 'Popović', 'Lazić'],
    rank: ['Redov', 'Redov', 'Kaplar', 'Podnarednik', 'Narednik'],
    to: [['Mother', 'Draga majko,'], ['Father', 'Dragi oče,'], ['Milica', 'Mila moja Milice,'], ['Jelena', 'Draga Jelena,'], ['my parents', 'Dragi moji,'], ['my sister', 'Sestro draga,']],
    sign: ['Tvoj sin,', 'Pozdravlja vas', 'Do viđenja u Srbiji,', 'Ljubim vas sve,'],
  },
  bg18: {
    first: ['Ivan', 'Georgi', 'Dimitar', 'Petar', 'Stoyan', 'Todor', 'Hristo', 'Nikola', 'Vasil', 'Atanas', 'Kiril', 'Boris', 'Stefan', 'Angel'],
    last: ['Ivanov', 'Georgiev', 'Dimitrov', 'Petrov', 'Stoyanov', 'Todorov', 'Hristov', 'Nikolov', 'Iliev', 'Angelov', 'Kolev', 'Marinov'],
    rank: ['Rednik', 'Rednik', 'Efreytor', 'Podofitser'],
    to: [['Mother', 'Mila mamo,'], ['Father', 'Mili tatko,'], ['Rada', 'Mila Rado,'], ['Penka', 'Mila Penke,'], ['my parents', 'Mili moi roditeli,'], ['my wife', 'Mila moya zheno,']],
    sign: ['Vashiyat sin,', 'Tseluvam vi,', 'Ostavayte zdravi,', 'S boga,'],
  },
};

const OPEN = {
  uk18: ['Just a line to let you know I am in the pink, as the saying goes.', 'Thanks for the parcel. The cake arrived in crumbs but we ate every crumb.', 'Writing this in a dugout by the light of a candle stuck in a bully-beef tin.', 'We are out of the line for a few days, so here is a proper letter at last.', 'The censor will have his pencil out, so I will keep it short.'],
  fr18: ['Je profite d\'un moment de calme pour t\'écrire.', 'Ta lettre m\'a trouvé au repos. Je l\'ai lue trois fois.', 'I write on my knee in the trench, so forgive the hand.', 'We have come down from the line, and at last there is time to write.', 'The post leaves tonight, so a few lines quickly.'],
  de18: ['Endlich eine ruhige Stunde in einem Unterstand.', 'Your parcel came, Mutter. I know what it cost you at home.', 'I write by a candle stump in a dugout, so do not mind the hand.', 'We are out of the line for once and I take the chance to write.', 'The Feldpost goes this evening, so only a few lines.'],
  st18: ['A quiet hour behind the line, the first in many days.', 'Your letter came with the rations. It was the best thing in the sack.', 'I write quickly; tonight we go forward again.', 'We have been taken out of the line to rest. Rest! We sleep and eat.', 'The Feldpost still finds us, wherever we are.'],
  it18: ['Ti scrivo dalla trincea, on my knee, between two shellings.', 'The post came up with the mules last night. Your letter was in it.', 'We are down from the mountain for a few days, so at last a proper letter.', 'The cappellano lends me his pencil, so I write.'],
  ah18: ['Endlich eine ruhige Stunde. I write by a candle in the cavern.', 'Your parcel came, and the Speck too. The whole Zug thanks you.', 'We are out of the line in a village with a church and a well. Paradise.', 'In our company we speak five languages, but the Feldpost understands them all.'],
  ot18: ['The hoca writes this letter for me; I say the words.', 'We are by the wells now, and there is water. Thanks be to God.', 'The post has not come for two months. I write anyway.', 'An officer gave us paper, so the whole tent is writing home.'],
  ru18: ['A comrade who can write is writing this for me. I bow to you all to the ground.', 'We have had no letters for a month. Write, even a few words.', 'There is a committee in the regiment now, and meetings every evening.', 'They say there will be leave soon, but they always say that.'],
  anzac18: ['Just a few lines to let you know I am still kicking.', 'Got your parcel, Mum. The Anzac biscuits went round the whole section.', 'We are out of the line for a spell, so here is a proper letter at last.', 'Writing this on an upturned bully tin in the shade of the horse lines.'],
  aef18: ['Well folks, here I am somewhere in France, as they say.', 'Got your letter today and the socks too. Swell.', 'They gave us a Y.M.C.A. hut with a stove, so I am writing where it is warm.', 'The censor will cut out half of this, so I will stick to the weather.'],
  serb18: ['Pišem ti iz rova, high up on the mountain.', 'Three years we have not seen Serbia. From this crest you can almost see it.', 'Your letter came through Corfu and Salonika. It took four months.', 'We are resting behind the line, and the French gave us white bread.'],
  bg18: ['I write from the mountain. From here you can see half of Macedonia.', 'Your letter came with the supply column. I read it three times.', 'We are dug in on the crest, as we have been for two years.', 'The post goes down tonight with the mules, so a few quick lines.'],
};
const FOOD = {
  uk18: ['Bully beef and biscuits again. The biscuits would make good roof tiles.', 'Plum and apple jam, always plum and apple. Never strawberry.', 'Tea made in a petrol tin tastes of petrol. We drink it anyway.', 'A Frenchwoman behind the line sells eggs and chips. Best meal I\'ve had since home.'],
  fr18: ['The soup came up cold, as always, but there was wine — the pinard never fails.', 'We had a parcel from Germaine\'s mother. The sausage did not last the night.', 'The cook\'s kitchen was hit and we went hungry till dark.', 'Bread, a little wine, and a tin of singe. "Monkey" they call it. It is not monkey, I hope.'],
  de18: ['We eat turnips. Turnip soup, turnip bread, turnip jam.', 'When we took the English trenches in the spring, we found their stores: white bread, jam, real coffee. Then we knew.', 'The bread is half sawdust. The Feldküche comes up at night, if at all.', 'At home you have less than we do, I know. Do not send me anything, Mutter.'],
  st18: ['We are fed better than the line regiments, for what they ask of us.', 'In March we lived on English rations for a week. Bully beef, corned beef — and cigarettes!', 'The rations are thin again now. The spring is long gone.', 'We share everything in the Stoßtrupp, even the last biscuit.'],
  it18: ['The rancio came up cold, as always. The pasta stuck together, but it was pasta.', 'Up here the bread freezes. We thaw it inside our coats.', 'A Sicilian in the company got olives from home. We fought over them like children.'],
  ah18: ['Dörrgemüse again, the “barbed wire” we call it. There is no meat.', 'The bread is made of who knows what. The Germans have more than we do.', 'When we took the Italian trenches at Caporetto we ate for a week.'],
  ot18: ['A handful of dates, a piece of bread. Some days not even that.', 'The water in the cistern is green, but we drink it.', 'The English have everything, the prisoners say: tinned meat, jam, tea with sugar.'],
  ru18: ['Black bread and shchi, and the shchi is mostly water.', 'Kasha when the field kitchen finds us. Often it does not.', 'At home there is no flour either, they say. Then what are we fighting for?'],
  anzac18: ['Bully beef and biscuits again. The flies get to it before we do.', 'Tea made with sandy water. You get used to it, more or less.', 'A Frenchwoman sold us eggs and chips. Best tucker since the boat.'],
  aef18: ['Corned willy and hardtack. The French call it monkey meat.', 'We traded cigarettes for a whole loaf of French bread, long as my arm.', 'The chow line is a mile long but the coffee is hot.'],
  serb18: ['The French give us rations now, but nothing tastes like bread from home.', 'A Macedonian peasant sold us cheese and paprika. We were Serbs again for an evening.', 'In Albania we ate our horses. Here at least there is bread.'],
  bg18: ['Bread and beans, beans and bread.', 'From home they send peppers and cheese, if the post finds us.', 'The Germans have tinned meat. We have the mountain air.'],
};
const ENEMY = {
  uk18: ['Fritz is a decent enough sort when he comes in with his hands up. Mostly boys, now.', 'The Jerry machine gunners are brave men, I\'ll give them that. They stay to the last.', 'The prisoners say they are hungry at home. You can see it in them.'],
  fr18: ['Les Boches still fight, but they come over with their hands up more and more.', 'The Americans are here now, big healthy fellows. The Boches must know it.', 'Their machine guns are the worst. A nest can hold up a regiment.'],
  de18: ['The English have tanks now, more and more of them, and aircraft everywhere.', 'The Americans are coming over in hundreds of thousands, they say. We are fewer every week.', 'The Tommies are not bad fellows, the prisoners. Tired like us.'],
  st18: ['In the spring we went right through the English. We thought it was the end of the war.', 'Their tanks come now in dozens. Our Tankgewehr kicks like a horse.', 'The French fight hard for every yard of their country. Who can blame them.'],
  it18: ['The Austrians shoot well from up there. They see everything.', 'The prisoners we take are boys and old men now. They are hungry too.', 'The English came to help us after Caporetto. Good soldiers, but they drink their tea at any hour.'],
  ah18: ['The Italians come up the mountain again and again. Brave men, I will say it.', 'The prisoners say they are as tired of the war as we are.', 'The Russians over there do not fight any more. They come across to trade bread for tobacco.'],
  ot18: ['The English have aeroplanes and big guns. We have the hills and our faith.', 'The Australians on their horses come like the wind. Nobody stops them.', 'The prisoners are Indians, many of them Muslims like us. A strange war.'],
  ru18: ['The Germans have so many guns. They fire all day; we fire a little in the evening.', 'The Germans across the wire came out at Easter and shared their schnapps with us.', 'They say the officers want to fight on. We do not.'],
  anzac18: ['Johnny Turk is a clean fighter, I will give him that.', 'Fritz is a good soldier, but he puts his hands up quick enough now.', 'The prisoners look half starved. You almost feel sorry for them.'],
  aef18: ['The Heinies put up a stiff fight in the woods, but we got through.', 'The prisoners are mostly kids or old men. They seem glad to be out of it.', 'The French poilus have been at it four years. You can see it in their faces.'],
  serb18: ['The Bulgarians were our brothers once. Now they shoot down at us from our own mountains.', 'The Germans have gone from the front over there. Only the Bulgarians are left, and they are tired.', 'The French and the English are good allies, but this is our land, not theirs.'],
  bg18: ['The Serbs fight like devils for every rock. It is their country, after all.', 'The English and the French on the plain are many, and more come every month.', 'The Germans left us their machine guns and went to France.'],
};
const HOME = {
  uk18: ['How is the allotment, Dad? Are the runner beans up?', 'Give my love to little Jim. Tell him his dad will be home for Christmas, perhaps.', 'I think of the pub on a Saturday and the football. Seems another world.', 'Tell Mrs Barnes I saw her Bert and he is well.'],
  fr18: ['Is the harvest in? Who helps you with it, with all the men gone?', 'I dream of the farm, the cows, the smell of the hay.', 'Tell the little one his father thinks of him every day.', 'When this is finished I will never leave the village again.'],
  de18: ['How are you all getting along at home with so little to eat?', 'Is Father still at the works? Do they still pay with these paper notes?', 'Kiss the children for me. Tell them Papa is coming home.', 'I think of the Sunday walks to the Kaffeegarten. Will it ever be like that again?'],
  st18: ['Is my brother still in Flanders? I have had no word.', 'Greet everyone in the street. Tell them I am well.', 'When I come home I want to sleep in a bed for a week and do nothing.', 'Light a candle for me at the church, Mutter.'],
  it18: ['Is the harvest in? Who helps you now that Beppe is at the front too?', 'I dream of the piazza on a Sunday and the bells.', 'Kiss the little one for me. Tell him papà is in the mountains.'],
  ah18: ['How is it in Vienna? They say there is no coal and no bread.', 'Tell me if the cow has calved. I think of the farm every night.', 'Greet the priest and tell him to pray that it ends.'],
  ot18: ['Is there rain in the village? Did the wheat come up?', 'Tell my little son his father thinks of him at every prayer.', 'I want only to sit under the walnut tree again and drink tea.'],
  ru18: ['They say the land will be given to the peasants. Is it true? Write what you hear.', 'Who will plough in the spring if I am not home?', 'Kiss the children. Tell them I will bring them something from the front.'],
  anzac18: ['How is the farm, Dad? Did the rain come in time?', 'Tell the boys at the footy club I will be back for next season.', 'I miss the sun on the verandah and the smell of the gum trees.'],
  aef18: ['How is the farm doing, Pa? Is the corn in?', 'Tell the gang at the drugstore I said hello.', 'I think about the county fair and your apple pie, Ma.'],
  serb18: ['Is there news from Serbia? Is anyone left in the village?', 'When we go home I will rebuild the house with my own hands.', 'Light a candle for me at the monastery.'],
  bg18: ['How is it in the village? Are the vines looked after?', 'Tell the children their father will be home for the grape harvest.', 'I hear there is no bread in Sofia. Is it so?'],
};
const CLOSE = {
  uk18: ['Don\'t worry about me, I\'ll be all right.', 'Write soon and send some fags if you can.', 'Give my love to everyone at home.', 'Must close now as the post corporal is waiting.'],
  fr18: ['Ne t\'inquiète pas pour moi.', 'Write soon, every letter is a bit of home.', 'Embrace everyone for me.', 'I must stop, the sergeant is calling.'],
  de18: ['Macht euch keine Sorgen um mich.', 'Write soon, even two lines are a joy.', 'Greet everyone at home.', 'May God grant this war ends soon.'],
  st18: ['Do not worry, Mutter, I am careful.', 'Write soon.', 'Greet the whole family.', 'It cannot last much longer now.'],
  it18: ['Non preoccuparti per me.', 'Write soon, every letter is a feast.', 'Pray for me to the Madonna.'],
  ah18: ['Macht euch keine Sorgen.', 'Write soon, even a postcard.', 'God grant this war ends soon.'],
  ot18: ['Do not worry, I am in God’s hands.', 'Pray for me.', 'If God wills, I will come home.'],
  ru18: ['Do not grieve for me.', 'Write, write, even a few words.', 'They say it will end soon. God grant it.'],
  anzac18: ['Don’t worry about me, Mum, I’ll be right.', 'Write soon and send some smokes.', 'Love to everyone at home.'],
  aef18: ['Don’t worry about me, I’m fine and dandy.', 'Write soon and send the home paper.', 'Love to all the folks.'],
  serb18: ['Ne brinite za mene.', 'Write, though the letters take months.', 'We will see each other in a free Serbia.'],
  bg18: ['Ne se trevozhete za men.', 'Write soon.', 'God keep you all.'],
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
