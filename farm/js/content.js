/*
 * Educational content for The Enchanted Farm (Ready Steady – Unit 3: Farm Animals).
 * Pure data + pure helpers. No DOM access, so it can be unit-tested in Node.
 * Teachers/developers: change wording here, not in the game files.
 */
(function (root) {
  'use strict';

  var ANIMALS = [
    { id: 'cow',   name: 'cow', plural: 'cows',   sound: 'moo',   soundSay: 'Moo! Moo!',     home: 'barn',     colour: 'black and white', size: 'big' },
    { id: 'horse', name: 'horse', plural: 'horses', sound: 'neigh', soundSay: 'Neigh!',        home: 'stable',   colour: 'brown',           size: 'big' },
    { id: 'pig',   name: 'pig', plural: 'pigs',   sound: 'oink',  soundSay: 'Oink! Oink!',   home: 'mud',      colour: 'pink',            size: 'small' },
    { id: 'hen',   name: 'hen', plural: 'hens',   sound: 'cluck', soundSay: 'Cluck, cluck!', home: 'henhouse', colour: 'brown',           size: 'small' },
    { id: 'sheep', name: 'sheep', plural: 'sheep', sound: 'baa',   soundSay: 'Baa! Baa!',     home: 'field',    colour: 'white',           size: 'small' },
    { id: 'duck',  name: 'duck', plural: 'ducks',  sound: 'quack', soundSay: 'Quack! Quack!', home: 'pond',     colour: 'white',           size: 'small' }
  ];

  var HOMES = {
    barn:     { id: 'barn',     animal: 'cow' },
    stable:   { id: 'stable',   animal: 'horse' },
    mud:      { id: 'mud',      animal: 'pig' },
    henhouse: { id: 'henhouse', animal: 'hen' },
    field:    { id: 'field',    animal: 'sheep' },
    pond:     { id: 'pond',     animal: 'duck' }
  };

  /* Short, warm phrases. Varied so praise does not repeat after every action. */
  var PHRASES = {
    welcome: "Hello! I'm Pip. Welcome to the Enchanted Farm!",
    story: 'Oh no! The magic lights are gone. Can you help me, Farm Explorer?',
    letsGo: "Let's go!",
    mapChoose: 'Touch the shining lantern!',
    mapLocked: 'This lantern is still sleeping. Touch the shining lantern!',
    lookAnimals: 'Look! Animals!',
    whatCanYouSee: 'What can you see?',
    yourTurn: 'Your turn!',
    everybody: 'Everybody, together!',
    sayAgain: 'Say it again!',
    touchIt: function (a) { return 'Touch the ' + a.name + '!'; },
    /* "Find" is for listening tasks; "Where is …?" is kept for the location question (It's next to / under …). */
    findIt: function (a) { return 'Find the ' + a.name + '!'; },
    says: function (a) { return 'The ' + a.name + ' says ' + a.sound + '!'; },
    whereIs: function (a) { return 'Where is the ' + a.name + '?'; },
    thatsA: function (a) { return "That's the " + a.name + '.'; },
    whoIsIt: 'Who is hiding? What can you see?',
    itsA: function (a) { return "It's the " + a.name + '!'; },
    canYouFind: function (a) { return 'Can you find the ' + a.name + '?'; },
    takeHome: function (a) { return 'Take the ' + a.name + ' home!'; },
    takeTo: function (a, homeName) { return 'Take the ' + a.name + ' to the ' + homeName + '!'; },
    notHere: 'Hmm, not here. Try again!',
    lostAnimals: 'Oh no! The animals are lost! Can you help them go home?',
    allHome: 'All the animals are home!',
    thankYou: ['Thank you!', 'Hooray!', 'Look, it is happy!'],
    praise: ['Good job!', 'Well done!', 'Great speaking!', 'Wonderful!', 'Yes!'],
    gentle: ["Let's go on.", 'Okay!', 'Next one!'],
    star: 'You found a magic star! The farm is waking up!',
    bye: 'See you soon, Farm Explorer!'
  };

  /* Colour of each animal (black and white are Unit 3 words; pink and brown are reviewed from Units 1–2). */
  var COLOURS = { cow: 'black and white', horse: 'brown', pig: 'pink', hen: 'brown', sheep: 'white', duck: 'white' };
  function colourSentence(a) { return "It's " + COLOURS[a.id] + '.'; }
  var NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  function countSentence(n, a) { var w = NUMBERS[n]; return w.charAt(0).toUpperCase() + w.slice(1) + ' ' + a.plural + '.'; }
  /* Caring for animals (Mission 12). */
  var CARE = {
    feed: { tool: 'hay', say: function (a) { return 'Feed the ' + a.name + '!'; }, model: 'I feed the animals.' },
    brush: { tool: 'brush', say: function (a) { return 'Brush the ' + a.name + '!'; }, model: 'I brush the animals.' },
    kind: { tool: 'heart', say: function (a) { return 'Be kind to the ' + a.name + '!'; }, model: "I'm kind to animals." }
  };

  /* Home names are only spoken in the supported (practice) round. */
  var HOME_NAMES = { barn: 'barn', stable: 'stable', mud: 'mud', henhouse: 'hen house', field: 'field', pond: 'pond' };

  function canSee(animal) { return 'I can see a ' + animal.name + '.'; }

  /*
   * 14-mission plan (two weeks, seven lessons each).
   * status 'ready' = playable now; 'planned' = shown as a sleeping lantern on the map.
   */
  var MISSIONS = [
    { id: 1, week: 1, status: 'ready', game: 'meet', title: 'Meet the Animals', location: 'gate',
      objective: 'Recognise the six farm animals by sound and picture; answer "What can you see?"',
      vocabulary: ['cow', 'horse', 'pig', 'hen', 'sheep', 'duck'],
      patterns: ['Look! Animals!', 'What can you see?', 'I can see a cow.'],
      story: 'The animals walk through the Magic Gate one by one.',
      reward: 'Magic star · the barn doors open · animals appear in the meadow' },
    { id: 2, week: 1, status: 'ready', game: 'rescue', title: 'The Great Animal Rescue', location: 'meadow',
      objective: 'Follow spoken instructions to find animals; say what you see; take animals home.',
      vocabulary: ['cow', 'horse', 'pig', 'hen', 'sheep', 'duck'],
      patterns: ['Can you find the duck?', 'What can you see?', 'I can see a duck.'],
      story: 'The animals are lost. Find them and take them home.',
      reward: 'Magic star · animals return home on the map · flowers grow' },
    { id: 3, week: 1, status: 'ready', game: 'littlefarm', title: 'My Little Farm', location: 'barn',
      objective: 'Build your own farm with the animals; say what you see, where animals are (next to, under) and if they are big or small.',
      vocabulary: ['cow', 'horse', 'pig', 'hen', 'sheep', 'duck', 'next to', 'under', 'big', 'small'],
      patterns: ['What can you see?', 'Where is the duck?', "It's next to the cow.", "It's under the tree.", "It's big.", "It's small.", 'This is my farm.'],
      story: 'Pip gives you a little farm. You choose where every animal lives (like the cardboard farm in class).',
      reward: 'Magic star · your farm is saved · the barn lights up' },
    { id: 4, week: 1, status: 'ready', game: 'talkingfarm', title: 'My Talking Farm', location: 'barn',
      objective: 'Guided speaking at three levels: 1 Speak with Pip (repeat), 2 Help Pip (answer with hints), 3 Little Farm Speaker (describe alone).',
      vocabulary: ['animals', 'black', 'white', 'big', 'small', 'next to', 'under', 'big eyes', 'four legs'],
      patterns: ['I can see a sheep.', "It's white.", "It's next to the cow.", 'It has got big eyes.', 'It has got four legs.'],
      story: 'Pip shows changing farm scenes and asks about them.',
      reward: 'Magic star for each level · the rainbow appears' },
    { id: 5, week: 1, status: 'ready', game: 'counting', title: 'Counting Meadow', location: 'field',
      objective: 'Count to seven, eight and nine.',
      vocabulary: ['seven', 'eight', 'nine'], patterns: ['How many ducks?', 'Eight ducks!'],
      story: 'Count the animals so the field can grow.', reward: 'Haystacks and sunflowers' },
    { id: 6, week: 1, status: 'ready', game: 'rainbow', title: 'Rainbow Farm', location: 'garden',
      objective: 'Colours black and white; describe animals.',
      vocabulary: ['black', 'white'], patterns: ["It's black.", "It's white."],
      story: 'Paint the farm back to life.', reward: 'Rainbow over the garden' },
    { id: 7, week: 1, status: 'ready', game: 'review', title: 'Little Farm Speaker', location: 'pond',
      objective: 'Week 1 review: guided speaking at three levels.',
      vocabulary: ['all week 1 words'], patterns: ['I can see a cow.', "It's white.", "It's next to the cow."],
      story: 'Pip asks about the farm scene.', reward: 'Week 1 badge · fireflies' },
    { id: 8, week: 2, status: 'ready', game: 'bigsmall', title: 'Big and Small', location: 'pond',
      objective: 'Describe size; big eyes, four legs.',
      vocabulary: ['big', 'small', 'big eyes', 'four legs'], patterns: ["It's big.", "It's small.", 'It has got big eyes.', 'It has got four legs.'],
      story: 'Help Pip sort big and small friends.', reward: 'Lily pads bloom' },
    { id: 9, week: 2, status: 'ready', game: 'story', title: 'On the Farm – Story', location: 'tree',
      objective: 'Listen to an interactive story.',
      vocabulary: ['unit words'], patterns: ['Look!', 'Where is the duck?', "It's under the tree."],
      story: 'A story under the Story Tree.', reward: 'Story Tree blossoms' },
    { id: 10, week: 2, status: 'ready', game: 'detective', title: 'Story Detective', location: 'tree',
      objective: 'Sequence and retell the story with picture support.',
      vocabulary: ['unit words'], patterns: ['First…', 'I can see a horse.'],
      story: 'The story pictures are mixed up.', reward: 'Story book page' },
    { id: 11, week: 2, status: 'ready', game: 'favourite', title: 'My Favourite Animal', location: 'garden',
      objective: 'Describe a chosen animal.',
      vocabulary: ['colours', 'big', 'small'], patterns: ["It's white.", 'It has got big eyes.', 'It has got four legs.'],
      story: 'Make a portrait for the festival.', reward: 'Portrait in the gallery' },
    { id: 12, week: 2, status: 'ready', game: 'caring', title: 'Caring for Animals', location: 'care',
      objective: 'Feed, brush, be kind to animals.',
      vocabulary: ['feed', 'brush', 'be kind'], patterns: ['I feed the animals.', 'I brush the animals.', "I'm kind to animals."],
      story: 'The animals need care before the festival.', reward: 'Happy animals · hearts' },
    { id: 13, week: 2, status: 'ready', game: 'mystery', title: 'The Mystery Barn', location: 'care',
      objective: 'Listening review: identify animals from sounds and hidden parts.',
      vocabulary: ['unit words'], patterns: ['What can you see?', 'I can see a sheep.', 'Where is the hen?'],
      story: 'Who is behind the barn doors?', reward: 'Barn windows light up' },
    { id: 14, week: 2, status: 'ready', game: 'festival', title: 'The Great Farm Festival', location: 'festival',
      objective: 'Final speaking adventure using all unit language.',
      vocabulary: ['all unit words'], patterns: ['all unit sentences'],
      story: 'The lights return and the festival begins!', reward: 'Festival · Farm Explorer certificate' }
  ];

  /* ---------- pure helpers (tested) ---------- */

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    var r = rng || Math.random;
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function getAnimal(id) {
    for (var i = 0; i < ANIMALS.length; i++) if (ANIMALS[i].id === id) return ANIMALS[i];
    return null;
  }

  function getMission(id) {
    for (var i = 0; i < MISSIONS.length; i++) if (MISSIONS[i].id === id) return MISSIONS[i];
    return null;
  }

  /*
   * Meet the Animals – challenge rounds after the guided introduction.
   * Every animal appears once in random order; types alternate between
   * listening ("find": touch the named animal among 3) and speaking ("peek":
   * name a half-hidden animal before it is revealed).
   */
  function buildMeetChallenge(rng) {
    var r = rng || Math.random;
    var order = shuffle(ANIMALS.map(function (a) { return a.id; }), r);
    return order.map(function (id, i) {
      var round = { type: i % 2 === 0 ? 'find' : 'peek', target: id };
      if (round.type === 'find') {
        var others = shuffle(ANIMALS.filter(function (a) { return a.id !== id; }).map(function (a) { return a.id; }), r).slice(0, 2);
        round.choices = shuffle([id].concat(others), r);
      }
      return round;
    });
  }

  /*
   * Great Animal Rescue rounds. Round 1 is a supported practice round with
   * the duck; the rest are independent and randomised.
   */
  function buildRescueRounds(rng) {
    var r = rng || Math.random;
    var rest = shuffle(ANIMALS.filter(function (a) { return a.id !== 'duck'; }).map(function (a) { return a.id; }), r);
    return [{ target: 'duck', supported: true }].concat(rest.map(function (id) { return { target: id, supported: false }; }));
  }

  /* Random assignment of animals to hiding spots. */
  function assignHidingSpots(spotIds, rng) {
    var animals = shuffle(ANIMALS.map(function (a) { return a.id; }), rng);
    var map = {};
    spotIds.forEach(function (s, i) { map[s] = animals[i % animals.length]; });
    return map;
  }

  /* ---------- descriptions (Missions 3 and 4) ---------- */

  /* Only sentences from the unit: colours black/white, big/small, big eyes, four legs. */
  /* eyes: true only where the picture really shows big eyes (cow, sheep). One form everywhere: "It has got …". */
  var FACTS = {
    cow:   { colour: "It's black and white.", legs: true, eyes: true },
    horse: { colour: null, legs: true, eyes: false },
    pig:   { colour: null, legs: true, eyes: false },
    hen:   { colour: null, legs: false, eyes: false },
    sheep: { colour: "It's white.", legs: true, eyes: true },
    duck:  { colour: "It's white.", legs: false, eyes: false }
  };
  var BIG_EYES = 'It has got big eyes.';
  var FOUR_LEGS = 'It has got four legs.';
  /* "next to" only when the animals really stand close together (stage units, feet points). */
  var NEAR = 420;

  function sizeSentence(animal) { return animal.size === 'big' ? "It's big." : "It's small."; }

  /*
   * Where is an animal? positions: { id: {x, y} } = feet point in stage units.
   * tree: {x, y, w, h} box or null. Returns "It's under the tree." or "It's next to the cow."
   */
  function describePosition(id, positions, tree) {
    var p = positions[id];
    if (!p) return null;
    if (tree && p.x >= tree.x && p.x <= tree.x + tree.w && p.y >= tree.y + tree.h * 0.45 && p.y <= tree.y + tree.h + 90) {
      return "It's under the tree.";
    }
    var best = null, bestD = Infinity;
    Object.keys(positions).forEach(function (other) {
      if (other === id) return;
      var q = positions[other];
      var d = Math.pow(q.x - p.x, 2) + Math.pow(q.y - p.y, 2);
      if (d < bestD) { bestD = d; best = other; }
    });
    return best && bestD <= NEAR * NEAR ? "It's next to the " + getAnimal(best).name + '.' : null;
  }

  /*
   * My Talking Farm question set for one scene. scene: { animals: [ids], positions, tree }.
   * Returns 6 questions; each { kind, target, prompt, model }.
   */
  function buildTalkingQuestions(scene, level, rng) {
    var r = rng || Math.random;
    var qs = [];
    var ids = shuffle(scene.animals, r);
    ids.forEach(function (id) {
      var a = getAnimal(id), f = FACTS[id];
      var pool = [
        { kind: 'see', prompt: 'What can you see?', model: canSee(a) },
        { kind: 'size', prompt: 'Look at the ' + a.name + '. Is it big or small?', model: sizeSentence(a) },
        { kind: 'where', prompt: 'Where is the ' + a.name + '?', model: describePosition(id, scene.positions, scene.tree) }
      ];
      if (f.eyes) pool.push({ kind: 'eyes', prompt: 'Look at the ' + a.name + '. Look at its eyes!', model: BIG_EYES });
      if (f.colour) pool.push({ kind: 'colour', prompt: 'What colour is the ' + a.name + '?', model: f.colour });
      if (f.legs) pool.push({ kind: 'legs', prompt: 'Look at the ' + a.name + '. How many legs?', model: FOUR_LEGS });
      pool.forEach(function (q) { q.target = id; });
      qs = qs.concat(pool.filter(function (q) { return q.model; }));
    });
    var picked;
    if (level === 3) {
      // Little Farm Speaker: describe each animal in several sentences.
      // Each sentence is also kept as a "part" (with a picture cue and a sentence starter) for the fading support.
      picked = ids.map(function (id) {
        var a = getAnimal(id), f = FACTS[id];
        var parts = [{ cue: 'see', id: id, text: canSee(a), starter: 'I can see a…' }, { cue: 'size', text: sizeSentence(a), starter: "It's…" }];
        if (f.colour) parts.push({ cue: 'colour', text: f.colour, starter: "It's…" });
        var where = describePosition(id, scene.positions, scene.tree);
        if (where) {
          var under = /under/.test(where);
          parts.push({ cue: under ? 'tree' : 'next', id: under ? null : where.replace(/^It's next to the (\w+)\.$/, '$1'), text: where, starter: under ? "It's under the…" : "It's next to the…" });
        }
        if (f.legs) parts.push({ cue: 'legs', text: FOUR_LEGS, starter: 'It has got…' }); else if (f.eyes) parts.push({ cue: 'eyes', text: BIG_EYES, starter: 'It has got…' });
        return { kind: 'describe', target: id, prompt: 'Tell me about the ' + a.name + '!', model: parts.map(function (p) { return p.text; }).join(' '), parts: parts };
      });
      var farmParts = [{ cue: 'farm', text: 'This is my farm.', starter: 'This is my…' }].concat(ids.map(function (id) { return { cue: 'see', id: id, text: canSee(getAnimal(id)), starter: 'I can see a…' }; }));
      picked.push({ kind: 'farm', target: null, prompt: 'Now tell me about the farm!', model: farmParts.map(function (p) { return p.text; }).join(' '), parts: farmParts });
      return picked;
    }
    // Levels 1 and 2: one "What can you see?" first, then a varied mix (no question kind twice in a row).
    var first = qs.filter(function (q) { return q.kind === 'see'; })[0];
    var rest = shuffle(qs.filter(function (q) { return q !== first; }), r);
    picked = [first];
    while (picked.length < 6 && rest.length) {
      var lastKind = picked[picked.length - 1].kind;
      var idx = 0;
      while (idx < rest.length && rest[idx].kind === lastKind) idx++;
      if (idx === rest.length) idx = 0;
      picked.push(rest.splice(idx, 1)[0]);
    }
    return picked;
  }

  function pick(list, rng) { return list[Math.floor((rng || Math.random)() * list.length)]; }

  var API = {
    ANIMALS: ANIMALS, HOMES: HOMES, HOME_NAMES: HOME_NAMES, PHRASES: PHRASES, MISSIONS: MISSIONS,
    canSee: canSee, getAnimal: getAnimal, getMission: getMission, shuffle: shuffle, mulberry32: mulberry32,
    buildMeetChallenge: buildMeetChallenge, buildRescueRounds: buildRescueRounds,
    FACTS: FACTS, NEAR: NEAR, sizeSentence: sizeSentence, describePosition: describePosition, buildTalkingQuestions: buildTalkingQuestions,
    assignHidingSpots: assignHidingSpots, pick: pick,
    COLOURS: COLOURS, colourSentence: colourSentence, NUMBERS: NUMBERS, countSentence: countSentence, CARE: CARE
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.EF = root.EF || {}; root.EF.content = API; }
})(this);
