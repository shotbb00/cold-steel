// The 1945 campaign's letters home (campaign/Letters.js writes them): the same shape as 1985's, in
// four voices of April 1945 — an American GI, a Red Army soldier, a Wehrmacht Landser and a
// Fallschirmjäger (the last three in translation). Keyed us45 / sov45 / wh / fj, since 1985's us and
// sov are other men in another war. The Germans write as tired men at the end of a lost war: home,
// hunger, the family in the bombed city — never the regime's words.

export const PEOPLE_1945 = {
  us45: {
    first: ['Bob', 'Walt', 'Eddie', 'Joe', 'Frank', 'Hank', 'Stan', 'Charlie', 'Bud', 'Ray', 'Gus', 'Tony', 'Lou', 'Ernie', 'Al', 'Johnny', 'Harold', 'Vic', 'Sal'],
    last: ['Kowalski', 'Miller', 'Sullivan', 'Johnson', "O'Brien", 'Walsh', 'Garcia', 'Novak', 'Carter', 'Brooks', 'Schultz', 'Murphy', 'Rossi', 'Lindqvist', 'Hayes', 'Dombrowski', 'Parker', 'Russo'],
    rank: ['Pvt.', 'Pfc.', 'T/5', 'Cpl.', 'Sgt.'],
    to: [['Mom', 'Dear Mom,'], ['Pop', 'Dear Pop,'], ['Dorothy', 'Dearest Dorothy,'], ['Betty', 'Betty, sweetheart,'], ['Mom and Pop', 'Dear Mom and Pop,'], ['Grandma', 'Dear Grandma,'], ['Sis', 'Dear Sis,']],
    sign: ['Love,', 'All my love,', 'Your son,', 'Keep your chin up,', 'Yours always,', 'Be home before you know it,'],
  },
  sov45: {
    first: ['Sasha', 'Vanya', 'Kolya', 'Fedya', 'Petya', 'Misha', 'Grisha', 'Stepan', 'Yasha', 'Pasha', 'Tolya', 'Volodya', 'Seryozha', 'Ilya', 'Timur', 'Mykola', 'Arkady'],
    last: ['Ivanov', 'Petrov', 'Smirnov', 'Kuznetsov', 'Sokolov', 'Popov', 'Lebedev', 'Kozlov', 'Morozov', 'Volkov', 'Orlov', 'Bondarenko', 'Tkachenko', 'Abdullaev', 'Zaitsev', 'Melnik'],
    rank: ['Pvt.', 'Pvt.', 'Jr. Sgt.', 'Sgt.', 'Sr. Sgt.'],
    to: [['Mama', 'Dear Mama,'], ['Papa', 'Dear Papa,'], ['Nadya', 'My dear Nadya,'], ['Katya', 'Katyusha, my dear,'], ['Mama and Papa', 'Dear Mama and Papa,'], ['Babushka', 'Dear Babushka,'], ['my sister', 'Dear sister,']],
    sign: ['I kiss you,', 'Your son,', 'Until our meeting,', 'Wait for me,', 'With a front-line greeting,', 'Yours,'],
  },
  wh: {
    first: ['Heinz', 'Werner', 'Karl', 'Fritz', 'Kurt', 'Willi', 'Helmut', 'Günter', 'Hans', 'Otto', 'Erich', 'Gerhard', 'Walter', 'Rudi', 'Horst', 'Ernst'],
    last: ['Müller', 'Schmidt', 'Becker', 'Hoffmann', 'Wagner', 'Schäfer', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Braun', 'Krüger', 'Hartmann', 'Lange', 'Vogel'],
    rank: ['Grenadier', 'Gefreiter', 'Obergefreiter', 'Unteroffizier', 'Feldwebel'],
    to: [['Mutter', 'Liebe Mutter,'], ['Vater', 'Lieber Vater,'], ['Liesel', 'Meine liebe Liesel,'], ['Gretel', 'Liebe Gretel,'], ['Eltern', 'Liebe Eltern,'], ['Oma', 'Liebe Oma,'], ['Annemarie', 'Meine Annemarie,']],
    sign: ['Dein', 'Herzlichst, dein', 'In Liebe,', 'Auf ein Wiedersehen,', 'Bleibt gesund,', 'Es grüßt euch'],
  },
  fj: {
    first: ['Hein', 'Jupp', 'Franz', 'Toni', 'Sepp', 'Klaus', 'Bernd', 'Herbert', 'Alfred', 'Paul', 'Georg', 'Ludwig', 'Max', 'Rolf', 'Dieter', 'Konrad'],
    last: ['Bauer', 'Weber', 'Fischer', 'Meyer', 'Schulz', 'Zimmermann', 'Krause', 'Hofmann', 'Lehmann', 'Huber', 'Kaiser', 'Fuchs', 'Peters', 'Jung', 'Roth', 'Seidel'],
    rank: ['Jäger', 'Gefreiter', 'Obergefreiter', 'Oberjäger', 'Feldwebel'],
    to: [['Mutter', 'Liebe Mutter,'], ['Vater', 'Lieber Vater,'], ['Hilde', 'Meine liebe Hilde,'], ['Erna', 'Liebe Erna,'], ['Eltern', 'Liebe Eltern,'], ['Schwesterherz', 'Liebes Schwesterherz,']],
    sign: ['Dein', 'Dein Junge', 'In Liebe,', 'Kopf hoch,', 'Auf bald,', 'Herzlich, dein'],
  },
};

export const OPEN_1945 = {
  us45: ['The mail clerk says this goes out tonight, so here is a quick one.', 'Got your letter and the cookies. The cookies lasted about four minutes.', 'Writing by candle in a German farmhouse cellar, so excuse the scrawl.', 'We are off the line for a few hours, first time in days.', 'V-mail again, sorry, it is all they had.'],
  sov45: ['A quiet minute: the sergeant says we may write.', 'Your triangle letter found me, Mama. I read it three times.', 'I am writing on my knee in a German barn. The paper is German too.', 'We are so far west now. I never thought I would see these places.', 'The field post leaves at dawn, so I write quickly.'],
  wh: ['Endlich ein ruhiger Moment. I do not know when this will reach you, or if.', 'Your last letter is from February. Is everyone still well?', 'I write in a cellar by a candle stump, so do not mind the hand.', 'The Feldpost hardly runs any more, but I try.', 'We are not far from home now. That is the worst of it.'],
  fj: ['A quiet hour, and paper from an abandoned schoolroom.', 'Your parcel never came, but your letter did. That is worth more.', 'We are in a house with a roof, for once. I am writing quickly.', 'Who knows if the post still goes. I write anyway.', 'Since Holland we have hardly stopped moving.'],
};

export const FOOD_1945 = {
  us45: ['K-rations again. The cheese one is the good one. There is no good one.', 'We liberated a crate of eggs from a henhouse. Fried them in a helmet.', 'A Hausfrau gave us potatoes and would not take anything. We left her chocolate anyway.', 'Hot chow came up for the first time in a week. Grown men nearly cried.'],
  sov45: ['The kasha is cold but there is plenty, and American tushonka in the cans.', 'We found a German cellar with jars of everything. The sergeant looked away.', 'The field kitchen caught up with us. Borscht, real borscht, here in Germany.', 'I dream of your pirozhki, Mama. Every night, pirozhki.'],
  wh: ['We have nothing left but Kommissbrot and what the farmers give us.', 'The Feldküche has not come up in three days. Somebody found potatoes, so we boiled them in a bucket.', 'A farmer\'s wife gave us milk and cried. Her boys are in the east, she said.', 'Ersatzkaffee for breakfast, Ersatzkaffee for supper.'],
  fj: ['We live on what we find: a sack of oats, a ham in a smokehouse, once a jar of honey.', 'The supply lorry got through for once. Bread, real bread.', 'We traded cigarettes for eggs with an old man. He said his sons were Fallschirmjäger too, in Crete.', 'Hunger is the one comrade who never leaves.'],
};

export const ENEMY_1945 = {
  us45: ['The prisoners we take now are old men and kids. A boy of fifteen asked me for a cigarette and cried.', 'Their tanks are big and their guns reach a mile, but there are fewer of them every day.', 'Jerry still fights hard in the woods. Out in the open he quits faster now.', 'One of their screaming meemies came over last night. I never want to hear that sound again.'],
  sov45: ['The Germans fight for every village, but they are tired now. You can see it.', 'The Americans are somewhere close, they say. Allies. I would like to shake one\'s hand.', 'Their prisoners keep saying "Hitler kaputt". As if that settles it.', 'Their Panzerfausts are the worst. A boy with a pipe can kill a tank.'],
  wh: ['The Amis have everything: planes, tanks, shells without end. We have courage and a few Panzerfausts.', 'When the Jabos come, nothing moves on the roads by day.', 'One of their prisoners gave me a cigarette. He was from Milwaukee. His grandfather came from Bavaria.', 'They say the Russians are at the Oder. Then home is between two fronts.'],
  fj: ['The Amis are careful. They wait for their artillery and their planes. Then they come.', 'Their Shermans burn well, but there are always more.', 'We took a few prisoners. Young lads, scared, the same as our replacements.', 'The Jabos hunt anything that moves. We march at night now, always at night.'],
};

export const HOME_1945 = {
  us45: ['Is the old Ford still running? Tell Pop to keep it oiled for me.', 'Tell me about the ball games. Normal stuff. I need normal stuff.', 'I think about the porch swing and a cold Coke all the time.', 'Save me a seat at Thanksgiving. I mean this one, not the next one.'],
  sov45: ['Is the house standing again? Did they rebuild the school?', 'Tell me about the kolkhoz. Did the spring sowing go well?', 'I dream of the river at home in summer.', 'Kiss the little ones for me. Tell them their brother is coming home, from Berlin if he must.'],
  wh: ['Is the cellar safe? Go down at once when the sirens go, Mutter, do not wait.', 'Is the house still standing? I heard about the raid and have had no word.', 'I think about the garden, the apple tree. Who will cut it back this spring?', 'When this is over I want only one thing: to sleep in my own bed.'],
  fj: ['Has the house come through the raids? Write, even two lines.', 'I think about the Sunday walks to the lake. Will we ever walk there again?', 'How is Vater\'s leg? And did the hens survive the winter?', 'When I am home I will never complain about the rain again. Here it rains on us and on the war.'],
};

export const CLOSE_1945 = {
  us45: ['Tell everybody I am fine. I mostly am.', 'Send socks. And more of those cookies.', 'Write soon. Mail call is the best part of the day.', 'Don\'t worry, the war over here can\'t last much longer.', 'Kiss the baby for me.'],
  sov45: ['Do not cry, Mama, I am careful.', 'Write to me, even short. Every letter is like bread.', 'Our sergeant is a wise man, he keeps us alive.', 'Wait for me and I will come back.', 'Victory is close now. Then home.'],
  wh: ['Macht euch keine Sorgen um mich.', 'Pray for me, and for all of us.', 'If you have to leave, leave word with Frau Schulze where you went.', 'It cannot last much longer now. One way or the other.', 'Hold out. I will come home.'],
  fj: ['Macht euch keine Sorgen. We Fallschirmjäger are tough.', 'Write to the old Feldpostnummer, it still finds us sometimes.', 'Stay in the cellar when the bombers come.', 'It will be over soon. Then we start again.', 'I will come home. I promise you that.'],
};
