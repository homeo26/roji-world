// Who each person around town is, what Roji and Homama can do with them, and what they say.
// Lines use {me} (Roji or Homama), {dr} (Dr. Roji or Homama) and {other} (the partner's name).
//
// Actions: 'talk' (a profile's own question), 'highfive', 'handshake', 'selfie', 'flower', 'dance',
// 'hug', 'wave', 'checkup' (Roji the doctor), 'cheer' (cheer a patient up), 'bug' (Homama the engineer),
// 'coffee' (bring a coffee), 'latte' (order a drink), 'play' (with a toddler).

const GIRL_NAMES = ['Dana', 'Sara', 'Leila', 'Hala', 'Rana', 'Yara', 'Mira', 'Salma'];
const BOY_NAMES = ['Zaid', 'Rami', 'Karim', 'Tariq', 'Nabil', 'Fares', 'Hadi', 'Majd'];
const BOYISH = new Set(['yusuf', 'yousef', 'fadi', 'adam', 'omar', 'zaid', 'rami', 'kai', 'sami', 'karim', 'basem', 'odeh', 'sultan']);
const GIRLISH = new Set(['lina', 'leen', 'mina', 'maya', 'nour', 'tala', 'sara', 'hanan', 'dana']);
const ROLES = { fan: 'a fan', guest: 'a guest', server: 'the waiter', instructor: 'the ski teacher' };
// Names that are jobs rather than names read as "the usher", "the ticket seller"
const ROLE_WORDS = /\b(keeper|lifeguard|barista|instructor|cook|chef|server|waiter|helper|usher|seller|guard|nurse|doctor|teacher|driver|vendor|fisher|fisherman|captain|clerk|cashier|attendant|ranger|coach|referee|baker|florist|gardener|worker|staff|player|racer|guide|pilot|sailor|visitor|tourist|kid|child|neighbou?r|jogger|walker|friend)\b/i;

// ------------------------------------------------------------------ shared lines
export const LINES = {
  greet: ['Hi {dr}!', 'Oh, hello {me}!', 'Lovely day, isn\'t it?', '{me}! Nice to see you.', 'Hey there, {me}!', 'Look who it is!'],
  highfive: ['Up top!', 'Nice one!', 'Ouch! Strong hands, {me}.', 'Best high five today!', 'Yes! Again tomorrow?'],
  handshake: ['A pleasure, {me}.', 'Good to see you!', 'What a firm handshake!'],
  selfie: ['Say cheese!', 'Get my good side!', 'Send me that one!', 'We look great!', 'One more, I blinked!'],
  flower: ['For me? Thank you!', 'It smells like spring!', 'You are so kind, {me}.', 'I will put it in water.', 'My favourite colour!'],
  dance: ['I love this song!', 'Look at us go!', 'You dance so well, {me}!', 'One more time!', 'My feet cannot stop!'],
  talk: ['I am great, thank you for asking!', 'Busy day, but a good one.', 'Better now that you said hi.', 'Happy, and a little hungry.', 'Every day is sunny here.'],
  hug: ['Aww, come here!', 'The best hugs in town.', 'I needed that.'],
  wave: ['Hi hi!', 'Hello down there!', 'Have a lovely day!'],
  bye: ['See you later!', 'Bye for now!', 'Take care, {me}!'],
  // Seen walking past hand in hand
  holding: ['Aww, look at you two!', 'Hand in hand, so sweet!', 'Hi, lovebirds!', 'You two are adorable.', 'Roji and Homama, always together!', 'Young love on a sunny day!'],
  // Calling out as the player walks up
  callout: ['Hi {dr}!', 'Hey, {me}!', 'Good to see you, {me}!', 'Hello, {me}!'],
};

const T = (label, sub, lines) => ({ label, sub, lines });

// ------------------------------------------------------------------ profiles
// match(npc): true for the people a profile is for. actions(me, seated): up to three action ids.
const PROFILES = [
  {
    id: 'nurse',
    match: (n) => n.space.id === 'hospital' && /maya/i.test(n.look.name || ''),
    role: 'Nurse at the hospital',
    accent: '#21a99a',
    actions: () => ['talk', 'highfive', 'selfie'],
    talk: T('Ask about the shift', 'How is the ward today?', {
      all: ['Busy morning, but everyone is smiling.', 'The coffee machine is my best friend today.', 'Ten patients and zero tears so far!'],
      roji: ['Grandpa Sami asked for you again, Dr. Roji.'],
      homama: ['She saved the day again, Homama.', 'Bring Dr. Roji a snack, she skipped lunch.'],
    }),
    greet: { roji: ['Dr. Roji! Perfect timing.', 'Morning, Dr. Roji!'], homama: ['Hi Homama! She is on the ward.', 'Homama! Dr. Roji will be happy you came.'] },
  },
  {
    id: 'patient',
    match: (n) => n.space.id === 'hospital' && n.kid.pose !== 'stand',
    role: 'Patient',
    accent: '#7fd3ff',
    actions: (me) => (me === 'roji' ? ['checkup', 'flower', 'selfie'] : ['cheer', 'flower', 'selfie']),
    checkup: ['My tummy feels much better now!', 'Is my heart still happy, Dr. Roji?', 'No more sneezing, thank you!', 'Can I go home soon?', 'You have the gentlest hands, Dr. Roji.'],
    cheer: ['Ha! You are so funny, Homama.', 'That made my day!', 'Do the robot again!', 'I feel better already.'],
    greet: { roji: ['Dr. Roji! You came to see me!', 'Hello, Dr. Roji!'], homama: ['Hi Homama! Is Dr. Roji here?', 'Homama! Tell me a joke?'] },
  },
  {
    id: 'grandpa',
    match: (n) => /grandpa/i.test(n.look.name || ''),
    role: 'Patient, and a great storyteller',
    accent: '#b9a6ff',
    actions: (me) => (me === 'roji' ? ['checkup', 'talk', 'flower'] : ['cheer', 'talk', 'flower']),
    talk: T('Ask for a story', 'He has many', [
      'In my day we walked to school uphill. Both ways!',
      'You two remind me of my first love.',
      'I met my wife at a dance. She stepped on my toes.',
      'When I was your age, this island had one road.',
    ]),
    checkup: ['Strong as a horse, the doctor says!', 'My knees thank you, Dr. Roji.', 'You are the best doctor on the island.'],
    cheer: ['Ha! I have not laughed like that in years.', 'You remind me of me, young man.'],
    greet: { roji: ['Ah, Dr. Roji, my favourite visitor.'], homama: ['Homama! Come, sit with an old man.'] },
  },
  {
    id: 'coworker',
    match: (n) => n.space.id === 'tech',
    role: 'Engineer at the studio',
    accent: '#7f6bd8',
    actions: (me, seated) => (me === 'homama' ? ['bug', 'highfive', 'selfie'] : ['coffee', seated ? 'talk' : 'highfive', 'selfie']),
    talk: T('Ask about work', 'What are they building?', {
      all: ['We are building something fun. Top secret!', 'Lunch at YumYum later?'],
      roji: ['Homama fixed my bug yesterday.', 'Homama has your photo on his desk, Dr. Roji.'],
      homama: ['Your last fix saved my week.', 'Dr. Roji brought cookies last time!'],
    }),
    bug: ['It works now! You are a genius.', 'A missing comma. Thank you!', 'The tests are green! Coffee is on me.', 'How did you spot that so fast?'],
    coffee: ['Coffee from Dr. Roji? Best day ever.', 'Just what I needed, thank you!', 'Homama never stops talking about you, Dr. Roji.'],
    greet: { roji: ['Dr. Roji! Homama said you might drop by.', 'Hi Dr. Roji!'], homama: ['Hey Homama! Got a minute?', 'Homama, my code is crying.'] },
  },
  {
    id: 'abusanad',
    match: (n) => /abu sanad/i.test(n.look.name || ''),
    role: 'Driving instructor',
    accent: '#f59f3a',
    actions: () => ['talk', 'handshake', 'selfie'],
    talk: T('Ask for a tip', 'He has a lot of them', [
      'Mirrors, signal, then a smile.',
      'Slow and steady wins the licence.',
      'Hands at ten and two, please.',
      'Never drive hungry. Trust me.',
      'Good music makes good drivers.',
    ]),
    greet: { roji: ['Ah, my best student!', 'Roji! Seat belt first.'], homama: ['Homama! Ready for a lesson?', 'Welcome, Homama.'] },
  },
  {
    id: 'reception',
    match: (n) => n.space.id === 'driving' && /tala/i.test(n.look.name || ''),
    role: 'At the driving school desk',
    accent: '#f59f3a',
    actions: () => ['talk', 'dance', 'selfie'],
    talk: T('Ask about lessons', 'When is the next one?', ['Abu Sanad says you are a natural.', 'The next lesson is waiting for you.', 'Remember your learner card!', 'The road test is easier than it looks.']),
  },
  {
    id: 'popcorn',
    match: (n) => n.space.id === 'cinema' && /popcorn|snack|candy/i.test(n.look.name || ''),
    role: 'Popcorn counter',
    accent: '#ffd166',
    actions: () => ['talk', 'highfive', 'selfie'],
    talk: T('Ask for extra butter', 'Go on', ['Extra butter, coming right up!', 'Salty or sweet? Why not both?', 'The biggest bucket for you two.']),
  },
  {
    id: 'usher',
    match: (n) => n.space.id === 'cinema',
    role: 'At the cinema',
    accent: '#7f6bd8',
    actions: () => ['talk', 'highfive', 'selfie'],
    talk: T("Ask what's on", 'Tonight at the cinema', ['Tonight: a cartoon about two cats in love.', 'The back row is the cosiest.', 'Popcorn first, then the film.', 'Bring tissues for the ending.']),
  },
  {
    id: 'cook',
    match: (n) => n.space.id === 'yumyum' && /cook/i.test(n.look.name || ''),
    role: 'Cook at YumYum',
    accent: '#ef5b6f',
    actions: () => ['talk', 'highfive', 'selfie'],
    talk: T('Taste the sauce', 'Just a little spoon', ['Secret recipe. Roji\'s, of course!', 'A little more garlic? Perfect.', 'Careful, it is hot!', 'Chef Roji taught me this one.']),
  },
  {
    id: 'waiter',
    match: (n) => n.space.id === 'yumyum' && /server/i.test(n.look.name || ''),
    role: 'Waiter at YumYum',
    accent: '#ef5b6f',
    actions: () => ['talk', 'dance', 'selfie'],
    talk: T('Ask for the special', 'What is good today?', ["Today's special: the Roji burger.", 'The milkshakes are extra thick today.', 'Pecan cake, fresh from the oven.']),
  },
  {
    id: 'guest',
    match: (n) => n.space.id === 'yumyum',
    role: 'Having lunch at YumYum',
    accent: '#ff8fb1',
    actions: () => ['talk', 'flower', 'selfie'],
    talk: T('Ask about the food', 'Is it good?', ['The burger is the best on the island!', 'I come here every weekend.', 'Have you tried the pecan cake?', 'This mansaf is just like home.', 'Do not tell anyone, I ordered two desserts.']),
  },
  {
    id: 'barista',
    match: (n) => n.space.id === 'clay',
    role: 'Barista at the Clay Cafe',
    accent: '#c8875a',
    actions: () => ['latte', 'highfive', 'selfie'],
    latte: ['One Spanish latte, extra love.', 'Want a heart in the foam?', 'Coming right up!', 'On the house for you two.'],
  },
  {
    id: 'lifeguard',
    match: (n) => n.space.id === 'pool',
    role: 'Lifeguard',
    accent: '#7fd3ff',
    actions: () => ['wave', 'talk', 'selfie'],
    talk: T('Ask about the water', 'Is it warm?', ['Perfect for a swim today.', 'No running by the pool, please!', 'The water is warm, jump in!', 'I saw that double jump. Nice!']),
    callout: { roji: ['Hi Dr. Roji!', 'Hi Dr. Roji! The water is lovely!'], homama: ['Hey Homama!', 'Hey Homama! Where is Dr. Roji?'] },
  },
  {
    id: 'keeper',
    match: (n) => n.space.id === 'zoo' && /keeper/i.test(n.look.name || ''),
    role: 'Zoo keeper',
    accent: '#7a9a4f',
    actions: () => ['talk', 'highfive', 'dance'],
    talk: T('Ask about Jouri', 'The tallest girl in town', ['Jouri loves carrots. And you two!', 'Jouri did a little dance this morning.', 'Jouri is the tallest girl in town.', 'Shh, Jouri is napping. Just kidding, she is eating.']),
  },
  {
    id: 'zoo-visitor',
    match: (n) => n.space.id === 'zoo',
    role: 'Visiting the zoo',
    accent: '#7a9a4f',
    actions: () => ['talk', 'highfive', 'dance'],
    talk: T('Ask about Jouri', 'Have they seen her?', ['Jouri looked right at me!', 'I want a giraffe at home.', 'Did you see the penguins waddle?', 'Jouri is taller than my house!']),
  },
  {
    id: 'school',
    match: (n) => n.space.id === 'school',
    role: 'At the school',
    accent: '#ffd166',
    actions: () => ['talk', 'highfive', 'selfie'],
    talk: T('Ask about class', 'What did they learn?', ['Today we learned about volcanoes!', 'Recess is my favourite subject.', 'I got a gold star for my drawing.', 'The bus driver sings every morning.']),
  },
  {
    id: 'football',
    match: (n) => n.space.id === 'football',
    role: 'At the football pitch',
    accent: '#3fbf7f',
    actions: () => ['talk', 'highfive', 'dance'],
    talk: T('Ask about the match', 'Who is winning?', ['The Sunny Stars are unbeatable!', 'Did you see that goal?', 'Next time, you two play with us.']),
  },
  {
    id: 'harbour',
    match: (n) => n.space.id === 'harbour',
    role: 'At the harbour',
    accent: '#3f7bf0',
    actions: () => ['talk', 'highfive', 'selfie'],
    talk: T('Ask about the fish', 'Are they biting?', ['The fish are biting today!', 'Mind the seagulls, they steal snacks.', 'The sunset from the pier is the best.']),
  },
  {
    id: 'park',
    match: (n) => n.space.id === 'park',
    role: 'At the park',
    accent: '#b9a6ff',
    actions: () => ['talk', 'highfive', 'selfie'],
    talk: T('Ask about the rides', 'Which one is best?', ['The coaster made me scream!', 'Try the big wheel at sunset.', 'I have been on the swings ten times.']),
  },
  {
    id: 'ski',
    match: (n) => n.space.id === 'ski',
    role: 'Ski teacher',
    accent: '#7fd3ff',
    actions: () => ['talk', 'highfive', 'selfie'],
    talk: T('Ask about the snow', 'Is it good today?', ['Fresh snow this morning!', 'Bend your knees and smile.', 'The red run is fun, {me}.', 'Hot cocoa at the lodge after.']),
  },
  {
    id: 'karting',
    match: (n) => n.space.id === 'karting',
    role: 'Kart racer',
    accent: '#ef5b6f',
    actions: () => ['talk', 'wave', 'selfie'],
    talk: T('Wish them luck', 'Ready, steady', ['Thanks! See you at the finish.', 'I will try not to spin out.', 'Race you later?']),
  },
  // Roji's family (Odeh's house)
  {
    id: 'odeh',
    match: (n) => /odeh/i.test(`${n.look.id} ${n.look.name}`),
    role: "Roji's father",
    accent: '#c8875a',
    actions: (me) => (me === 'roji' ? ['hug', 'talk', 'selfie'] : ['handshake', 'talk', 'selfie']),
    talk: T('Ask for a story', 'He tells the best ones', {
      all: ['When Roji was little, she bandaged all her dolls.', 'Sit down, the tea is ready.', 'I knew she would be a doctor at six.'],
      homama: ['Homama, you take good care of my girl.'],
    }),
    hug: ['My Roji! Come here.', 'You are still my little girl.'],
    greet: { roji: ['My Roji is here!'], homama: ['Welcome, Homama!', 'Homama! How is my daughter?'] },
  },
  {
    id: 'hanan',
    match: (n) => /hanan/i.test(`${n.look.id} ${n.look.name}`),
    role: "Roji's mother",
    accent: '#ff8fb1',
    actions: (me) => (me === 'roji' ? ['hug', 'talk', 'selfie'] : ['flower', 'talk', 'selfie']),
    talk: T("Ask what's cooking", 'It smells amazing', {
      all: ['Mansaf, of course. Your favourite!', 'Did you eat enough today?', 'Take some cookies home with you.'],
      homama: ['Homama, you are like a son to me.'],
    }),
    hug: ['My sweet girl.', 'You work too hard, habibti.'],
    flower: ['Homama, you are such a sweetheart.', 'Roji is lucky to have you.'],
    greet: { roji: ['Roji! My heart!'], homama: ['Homama! Come in, come in.'] },
  },
  {
    id: 'basem',
    match: (n) => /basem/i.test(`${n.look.id} ${n.look.name}`),
    role: "Roji's brother",
    accent: '#3f7bf0',
    actions: () => ['highfive', 'talk', 'dance'],
    talk: T('Ask about his day', 'Big brother news', {
      all: ['Sultan kept me up all night!', 'Work, gym, then mama\'s food.'],
      roji: ['Busy, but I always have time for my sister.'],
      homama: ['Homama, rematch at football later?'],
    }),
  },
  {
    id: 'sultan',
    match: (n) => /sultan/i.test(`${n.look.id} ${n.look.name}`),
    role: 'The littlest one',
    accent: '#ffd166',
    actions: () => ['play', 'highfive', 'selfie'],
    play: ['Again! Again!', 'Catch me!', 'Higher! Higher!', 'Hehehe!'],
    highfive: ['Tiny high five!', 'Up! Up!'],
  },
];

const GENERIC = {
  id: 'generic',
  role: 'Out and about',
  accent: '#ef5b6f',
  actions: (me, seated) => (seated ? ['talk', 'flower', 'selfie'] : ['talk', 'highfive', 'selfie']),
  talk: T('Ask how they are', 'A little chat', LINES.talk),
};

// A friendly name to show: real names stay, roles read as "the keeper", and nameless people get one.
export function nameFor(n, i) {
  const raw = (n.look.name || '').trim();
  const low = raw.toLowerCase();
  const girl = n.look.gender === 'girl';
  if (low === 'coworker' || !raw) return (girl ? GIRL_NAMES : BOY_NAMES)[i % 8];
  if (ROLES[low]) return ROLES[low];
  if (/^(the|a) /.test(low)) return low;
  if (low === 'ticket usher') return 'the usher';
  if (ROLE_WORDS.test(low)) return 'the ' + low;
  // A guest whose name does not fit (the diner picks names at random)
  if ((girl && BOYISH.has(low)) || (!girl && GIRLISH.has(low))) return (girl ? GIRL_NAMES : BOY_NAMES)[(i + 3) % 8];
  return raw;
}

export function profileFor(n) {
  return PROFILES.find((p) => p.match(n)) || GENERIC;
}

// Lines for whoever is playing: a list, or { all, roji, homama }
export function linesFor(spec, me) {
  if (!spec) return [];
  if (Array.isArray(spec)) return spec;
  return [...(spec.all || []), ...(spec[me] || [])];
}

// Fill in {me}, {dr} and {other}
export function fill(line, me, other) {
  return line.replace(/\{me\}/g, me === 'roji' ? 'Roji' : 'Homama').replace(/\{dr\}/g, me === 'roji' ? 'Dr. Roji' : 'Homama').replace(/\{other\}/g, other === 'roji' ? 'Roji' : 'Homama');
}

// The words on each action's button. talk uses the profile's own label.
export function actionLabel(id, prof, rec) {
  const them = rec.name.startsWith('the ') || rec.name.startsWith('a ') ? 'them' : rec.name;
  return (
    {
      talk: prof.talk || GENERIC.talk,
      highfive: T('High five', 'Up top!'),
      handshake: T('Shake hands', 'A warm hello'),
      selfie: T('Take a selfie', 'For the album'),
      flower: T('Give a flower', 'A little bouquet'),
      dance: T('Dance together', 'Pick a song'),
      hug: T(`Hug ${them}`, 'A big warm one'),
      wave: T('Say hi', 'A big wave'),
      checkup: T('Check on them', 'Dr. Roji at work'),
      cheer: T('Cheer them up', 'A silly dance'),
      bug: T('Help with the bug', 'Two heads are better'),
      coffee: T('Bring a coffee', 'A little treat'),
      latte: T('Order a latte', 'Spanish latte, please'),
      play: T(`Play with ${them}`, 'Hop hop hop'),
    }[id] || T(id, '')
  );
}
