/*
 * Educational content for Momo's Little Restaurant (Ready Steady 2A – Unit 4: The Restaurant).
 * Pure data + pure helpers (no DOM), so it can be tested in Node. Change wording here, not in the games.
 * Target language (teacher's book): pasta, rice, fish, chicken, salad, apple pie, a slice of cake, water, orange juice;
 * ten, eleven, twelve; sweet, delicious, tasty; What do you want? I want (apple pie), please. It's (delicious).
 * What do you want to eat / to drink? Here you are. Thank you. What is your favourite food / drink? My favourite food is (chicken).
 */
(function (root) {
  'use strict';

  /* word: what the child says for the picture; want: inside "I want …, please."; the: after "Touch …". */
  var FOODS = [
    { id: 'pasta',    word: 'Pasta',            want: 'pasta',            the: 'the pasta',        kind: 'eat',   taste: 'delicious' },
    { id: 'rice',     word: 'Rice',             want: 'rice',             the: 'the rice',         kind: 'eat',   taste: 'tasty' },
    { id: 'fish',     word: 'Fish',             want: 'fish',             the: 'the fish',         kind: 'eat',   taste: 'delicious' },
    { id: 'chicken',  word: 'Chicken',          want: 'chicken',          the: 'the chicken',      kind: 'eat',   taste: 'tasty' },
    { id: 'salad',    word: 'Salad',            want: 'salad',            the: 'the salad',        kind: 'eat',   taste: 'tasty' },
    { id: 'applepie', word: 'Apple pie',        want: 'apple pie',        the: 'the apple pie',    kind: 'eat',   taste: 'sweet' },
    { id: 'cake',     word: 'A slice of cake',  want: 'a slice of cake',  the: 'the cake',         kind: 'eat',   taste: 'sweet' },
    { id: 'water',    word: 'Water',            want: 'water',            the: 'the water',        kind: 'drink', taste: null },
    { id: 'juice',    word: 'Orange juice',     want: 'orange juice',     the: 'the orange juice', kind: 'drink', taste: 'sweet' }
  ];

  /* Customers = the family from Unit 2 (pictures in ../assets/c_<id>.webp). */
  var CUSTOMERS = [
    { id: 'mum', name: 'Mum', he: 'She', voice: 'woman' }, { id: 'dad', name: 'Dad', he: 'He', voice: 'man' },
    { id: 'sister', name: 'Sister', he: 'She', voice: 'woman' }, { id: 'brother', name: 'Brother', he: 'He', voice: 'man' },
    { id: 'grandma', name: 'Grandma', he: 'She', voice: 'woman' }, { id: 'grandpa', name: 'Grandpa', he: 'He', voice: 'man' },
    { id: 'aunt', name: 'Aunt', he: 'She', voice: 'woman' }, { id: 'uncle', name: 'Uncle', he: 'He', voice: 'man' }
  ];

  /* The orders of the book's restaurant scene (Track 15), then more. */
  var BOOK_ORDERS = [
    { who: 'mum', food: ['fish', 'salad'] }, { who: 'dad', food: ['chicken', 'rice'] },
    { who: 'sister', food: ['pasta'] }, { who: 'brother', food: ['cake'] }
  ];

  var PHRASES = {
    welcome: "Hello! I'm Chef Momo. Welcome to my little restaurant!",
    story: 'Oh no! My restaurant is not ready. The customers are hungry! Can you help me, Little Chef?',
    letsGo: "Let's go!",
    hello: 'Hello again, Little Chef!',
    mapChoose: 'Touch the shining plate!',
    mapLocked: 'Not yet! Touch the shining plate!',
    allDone: 'You are a super Little Chef! Thank you!',
    yourTurn: 'Your turn!',
    everybody: 'Everybody, together!',
    whatDoYouWant: 'What do you want?',
    whatToEat: 'What do you want to eat?',
    whatToDrink: 'What do you want to drink?',
    hereYouAre: 'Here you are.',
    thankYou: 'Thank you!',
    favFood: "What's your favourite food?",
    favDrink: "What's your favourite drink?",
    notHere: 'Hmm, not this one. Try again!',
    praise: ['Good job!', 'Well done!', 'Great speaking!', 'Wonderful!', 'Yes!'],
    star: 'You got a golden star! Thank you, Little Chef!'
  };

  var NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

  var MISSIONS = [
    { id: 1, status: 'ready', game: 'menu', title: 'Meet the Menu', food: 'pasta',
      objective: 'Recognise and say the nine food and drink words.', patterns: ['Pasta!', 'Touch the fish!'] },
    { id: 2, status: 'ready', game: 'hungry', title: 'Hungry Customers', food: 'fish',
      objective: 'Answer "What do you want?" with "I want …, please."', patterns: ['What do you want?', 'I want fish and salad, please.'] },
    { id: 3, status: 'ready', game: 'serve', title: 'Here You Are!', food: 'chicken',
      objective: 'Listen to an order, serve it and say "Here you are." / "Thank you!"', patterns: ['Here you are.', 'Thank you!'] },
    { id: 4, status: 'ready', game: 'eatdrink', title: 'Eat or Drink?', food: 'juice',
      objective: 'What do you want to eat / to drink?', patterns: ['What do you want to drink?', 'I want water, please.'] },
    { id: 5, status: 'ready', game: 'yummy', title: 'Yummy!', food: 'cake',
      objective: 'Adjectives: sweet, delicious, tasty.', patterns: ["It's sweet!", "It's delicious!", "It's tasty!"] },
    { id: 6, status: 'ready', game: 'counting', title: 'Count with Momo', food: 'apple',
      objective: 'Numbers ten, eleven and twelve.', patterns: ['How many apples?', 'Twelve apples!'] },
    { id: 7, status: 'ready', game: 'missing', title: "What's Missing?", food: 'salad',
      objective: 'Visual memory and naming food.', patterns: ["What's missing?", 'The rice!'] },
    { id: 8, status: 'ready', game: 'memory', title: 'Memory Game', food: 'applepie',
      objective: 'Find pairs and say the word.', patterns: ['Apple pie!'] },
    { id: 9, status: 'ready', game: 'manners', title: 'Table Manners', food: 'water',
      objective: 'Value: we use table manners (please, thank you).', patterns: ['Water, please!', 'Here you are.', 'Thank you!'] },
    { id: 10, status: 'ready', game: 'redhen', title: 'The Little Red Hen', food: 'bread',
      objective: 'Listen to the fable and join in.', patterns: ['Who will help me?', 'Not I!', 'I will!'] },
    { id: 11, status: 'ready', game: 'favourite', title: 'My Favourite Food', food: 'rice',
      objective: "What's your favourite food / drink? My favourite food is …", patterns: ['My favourite food is chicken.'] },
    { id: 12, status: 'ready', game: 'party', title: 'Restaurant Party', food: 'pasta',
      objective: 'Role-play the whole restaurant dialogue.', patterns: ['all unit sentences'] }
  ];

  /* ---------- helpers ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(list, rng) {
    var r = rng || Math.random, a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pick(list, rng) { return list[Math.floor((rng || Math.random)() * list.length)]; }
  function getFood(id) { for (var i = 0; i < FOODS.length; i++) if (FOODS[i].id === id) return FOODS[i]; return null; }
  function getCustomer(id) { for (var i = 0; i < CUSTOMERS.length; i++) if (CUSTOMERS[i].id === id) return CUSTOMERS[i]; return null; }
  function getMission(id) { for (var i = 0; i < MISSIONS.length; i++) if (MISSIONS[i].id === id) return MISSIONS[i]; return null; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* "I want fish and salad, please." */
  function wantSentence(ids) {
    var w = ids.map(function (id) { return getFood(id).want; });
    return 'I want ' + (w.length > 1 ? w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1] : w[0]) + ', please.';
  }
  function wordSentence(id) { return getFood(id).word + '!'; }
  function touchSentence(id) { return 'Touch ' + getFood(id).the + '!'; }
  function tasteSentence(id) { var t = getFood(id).taste; return t ? "It's " + t + '!' : null; }
  function favSentence(id) { var f = getFood(id); return 'My favourite ' + (f.kind === 'drink' ? 'drink' : 'food') + ' is ' + f.want.replace(/^a slice of /, '') + '.'; }
  function countSentence(n, plural) { return cap(NUMBERS[n]) + ' ' + plural + '.'; }
  function missingSentence(id) { return cap(getFood(id).the) + '!'; }

  var API = {
    FOODS: FOODS, CUSTOMERS: CUSTOMERS, BOOK_ORDERS: BOOK_ORDERS, PHRASES: PHRASES, NUMBERS: NUMBERS, MISSIONS: MISSIONS,
    mulberry32: mulberry32, shuffle: shuffle, pick: pick, getFood: getFood, getCustomer: getCustomer, getMission: getMission, cap: cap,
    wantSentence: wantSentence, wordSentence: wordSentence, touchSentence: touchSentence, tasteSentence: tasteSentence,
    favSentence: favSentence, countSentence: countSentence, missingSentence: missingSentence
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.EF = root.EF || {}; root.EF.content = API; }
})(this);
