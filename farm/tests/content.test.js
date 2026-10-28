'use strict';

const test = require('node:test');
const assert = require('node:assert');
const content = require('../js/content.js');

const EXPECTED_IDS = ['cow', 'horse', 'pig', 'hen', 'sheep', 'duck'];

test('6 farm animals have valid homes, sounds, and lookups', () => {
  assert.strictEqual(content.ANIMALS.length, 6);
  assert.deepStrictEqual(
    content.ANIMALS.map((a) => a.id),
    EXPECTED_IDS
  );

  const homes = new Set();
  const sounds = new Set();

  for (const animal of content.ANIMALS) {
    assert.strictEqual(typeof animal.name, 'string');
    assert.ok(animal.name.length > 0);
    assert.strictEqual(typeof animal.sound, 'string');
    assert.ok(animal.sound.length > 0);
    assert.strictEqual(typeof animal.soundSay, 'string');
    assert.ok(animal.soundSay.length > 0);
    assert.strictEqual(typeof animal.home, 'string');
    assert.ok(animal.home.length > 0);
    assert.ok(animal.size === 'big' || animal.size === 'small');

    assert.ok(content.HOMES[animal.home], `Missing HOMES entry for ${animal.home}`);
    assert.strictEqual(content.HOMES[animal.home].animal, animal.id);
    assert.strictEqual(typeof content.HOME_NAMES[animal.home], 'string');
    assert.ok(content.HOME_NAMES[animal.home].length > 0);

    homes.add(animal.home);
    sounds.add(animal.sound);
    assert.strictEqual(content.getAnimal(animal.id), animal);
  }

  assert.strictEqual(homes.size, 6);
  assert.strictEqual(sounds.size, 6);
  assert.strictEqual(content.getAnimal('nonexistent'), null);
});

test('canSee() produces course-aligned sentences for every animal', () => {
  assert.strictEqual(content.canSee(content.getAnimal('cow')), 'I can see a cow.');
  assert.strictEqual(content.canSee(content.getAnimal('horse')), 'I can see a horse.');

  for (const animal of content.ANIMALS) {
    assert.strictEqual(content.canSee(animal), `I can see a ${animal.name}.`);
    assert.strictEqual(content.PHRASES.touchIt(animal), `Touch the ${animal.name}!`);
    assert.strictEqual(content.PHRASES.says(animal), `The ${animal.name} says ${animal.sound}!`);
    assert.strictEqual(content.PHRASES.whereIs(animal), `Where is the ${animal.name}?`);
    assert.strictEqual(content.PHRASES.canYouFind(animal), `Can you find the ${animal.name}?`);
    assert.strictEqual(content.PHRASES.takeHome(animal), `Take the ${animal.name} home!`);
    assert.strictEqual(
      content.PHRASES.takeTo(animal, content.HOME_NAMES[animal.home]),
      `Take the ${animal.name} to the ${content.HOME_NAMES[animal.home]}!`
    );
  }
});

test('14 missions have ids 1-14 and missions 1-4 are ready (meet, rescue, littlefarm, talkingfarm)', () => {
  assert.strictEqual(content.MISSIONS.length, 14);
  assert.deepStrictEqual(
    content.MISSIONS.map((m) => m.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
  );

  for (const m of content.MISSIONS) {
    assert.strictEqual(m.week, m.id <= 7 ? 1 : 2);
    assert.strictEqual(typeof m.title, 'string');
    assert.ok(m.title.length > 0);
    assert.strictEqual(typeof m.location, 'string');
    assert.ok(Array.isArray(m.vocabulary) && m.vocabulary.length > 0);
    assert.ok(Array.isArray(m.patterns) && m.patterns.length > 0);
    assert.strictEqual(content.getMission(m.id), m);
  }

  const ready = content.MISSIONS.filter((m) => m.status === 'ready');
  assert.deepStrictEqual(
    ready.map((m) => ({ id: m.id, game: m.game })),
    [
      { id: 1, game: 'meet' },
      { id: 2, game: 'rescue' },
      { id: 3, game: 'littlefarm' },
      { id: 4, game: 'talkingfarm' }
    ]
  );

  const planned = content.MISSIONS.filter((m) => m.status === 'planned');
  assert.strictEqual(planned.length, 10);
  assert.deepStrictEqual(
    planned.map((m) => m.id),
    [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
  );

  assert.strictEqual(content.getMission(0), null);
  assert.strictEqual(content.getMission(15), null);
});

test('shuffle is deterministic with mulberry32(seed) and does not mutate input', () => {
  const input = EXPECTED_IDS.slice();
  const snapshot = input.slice();

  const outA = content.shuffle(input, content.mulberry32(42));
  const outB = content.shuffle(input, content.mulberry32(42));

  assert.deepStrictEqual(input, snapshot);
  assert.notStrictEqual(outA, input);
  assert.deepStrictEqual(outA, outB);
  assert.deepStrictEqual(outA.slice().sort(), snapshot.slice().sort());

  const distinctPermutations = new Set(
    [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => content.shuffle(input, content.mulberry32(seed)).join(','))
  );
  assert.ok(distinctPermutations.size > 1);
});

test('buildMeetChallenge covers every animal once, alternates find/peek, and gives 3 unique choices with target', () => {
  const sortedExpected = EXPECTED_IDS.slice().sort();

  for (const seed of [1, 7, 42, 108, null]) {
    const rng = seed === null ? undefined : content.mulberry32(seed);
    const rounds = content.buildMeetChallenge(rng);

    assert.strictEqual(rounds.length, 6);
    assert.deepStrictEqual(
      rounds.map((r) => r.target).slice().sort(),
      sortedExpected
    );

    rounds.forEach((round, idx) => {
      const expectedType = idx % 2 === 0 ? 'find' : 'peek';
      assert.strictEqual(round.type, expectedType);

      if (round.type === 'find') {
        assert.ok(Array.isArray(round.choices));
        assert.strictEqual(round.choices.length, 3);
        assert.strictEqual(new Set(round.choices).size, 3);
        assert.ok(round.choices.includes(round.target));
        for (const id of round.choices) {
          assert.ok(content.getAnimal(id), `Unknown animal choice ${id}`);
        }
      } else {
        assert.strictEqual(round.choices, undefined);
      }
    });
  }
});

test('buildRescueRounds starts with a supported duck round, then 5 unique independent rounds', () => {
  const sortedExpected = EXPECTED_IDS.slice().sort();

  for (const seed of [1, 13, 42, 99, null]) {
    const rng = seed === null ? undefined : content.mulberry32(seed);
    const rounds = content.buildRescueRounds(rng);

    assert.strictEqual(rounds.length, 6);
    assert.deepStrictEqual(rounds[0], { target: 'duck', supported: true });

    const rest = rounds.slice(1);
    assert.strictEqual(rest.length, 5);
    assert.strictEqual(new Set(rest.map((r) => r.target)).size, 5);

    for (const round of rest) {
      assert.strictEqual(round.supported, false);
      assert.notStrictEqual(round.target, 'duck');
      assert.ok(content.getAnimal(round.target));
    }

    assert.deepStrictEqual(
      rounds.map((r) => r.target).slice().sort(),
      sortedExpected
    );
  }
});

test('assignHidingSpots and pick helpers use RNG deterministically', () => {
  const spots = ['s1', 's2', 's3', 's4', 's5', 's6'];
  const mapA = content.assignHidingSpots(spots, content.mulberry32(9));
  const mapB = content.assignHidingSpots(spots, content.mulberry32(9));

  assert.deepStrictEqual(mapA, mapB);
  assert.deepStrictEqual(Object.keys(mapA), spots);
  assert.deepStrictEqual(Object.values(mapA).sort(), EXPECTED_IDS.slice().sort());

  const item = content.pick(['alpha', 'beta', 'gamma'], content.mulberry32(9));
  assert.ok(['alpha', 'beta', 'gamma'].includes(item));
});

test('describePosition says "under the tree" or "next to" the nearest animal', () => {
  const tree = { x: 300, y: 130, w: 230, h: 287 };
  const pos = { cow: { x: 700, y: 560 }, duck: { x: 420, y: 500 }, sheep: { x: 900, y: 600 } };
  assert.strictEqual(content.describePosition('duck', pos, tree), "It's under the tree.");
  assert.strictEqual(content.describePosition('cow', pos, tree), "It's next to the sheep.");
  assert.strictEqual(content.describePosition('sheep', pos, null), "It's next to the cow.");
  assert.strictEqual(content.describePosition('pig', pos, tree), null);
  assert.strictEqual(content.describePosition('cow', { cow: { x: 700, y: 560 } }, null), null);
});

test('sizeSentence and FACTS use only unit language', () => {
  assert.strictEqual(content.sizeSentence(content.getAnimal('horse')), "It's big.");
  assert.strictEqual(content.sizeSentence(content.getAnimal('hen')), "It's small.");
  for (const a of content.ANIMALS) {
    const f = content.FACTS[a.id];
    assert.ok(f, a.id);
    if (f.colour) assert.match(f.colour, /^It's (black and white|white|black)\.$/);
  }
});

test('buildTalkingQuestions: levels 1-2 start with "What can you see?" and never repeat a kind twice in a row; level 3 describes then the farm', () => {
  const scene = { animals: ['cow', 'duck', 'sheep'], positions: { cow: { x: 700, y: 560 }, duck: { x: 420, y: 500 }, sheep: { x: 900, y: 600 } }, tree: { x: 300, y: 130, w: 230, h: 287 } };
  for (let seed = 1; seed < 30; seed++) {
    const qs = content.buildTalkingQuestions(scene, 2, content.mulberry32(seed));
    assert.strictEqual(qs.length, 6);
    assert.strictEqual(qs[0].kind, 'see');
    for (let i = 1; i < qs.length; i++) assert.notStrictEqual(qs[i].kind, qs[i - 1].kind);
    for (const q of qs) { assert.ok(q.model && q.prompt); assert.ok(scene.animals.includes(q.target)); }
  }
  const l3 = content.buildTalkingQuestions(scene, 3, content.mulberry32(5));
  assert.strictEqual(l3.length, 4);
  assert.ok(l3.slice(0, 3).every((q) => q.kind === 'describe' && q.model.startsWith('I can see a')));
  assert.strictEqual(l3[3].kind, 'farm');
  assert.ok(l3[3].model.startsWith('This is my farm.'));
});

test('"next to" only for animals that stand close together; "big eyes" only where the picture shows them', () => {
  const far = { cow: { x: 400, y: 560 }, sheep: { x: 1400, y: 560 } };
  assert.strictEqual(content.describePosition('cow', far, null), null);
  const near = { cow: { x: 700, y: 560 }, sheep: { x: 900, y: 600 } };
  assert.strictEqual(content.describePosition('cow', near, null), "It's next to the sheep.");
  const scene = { animals: ['hen', 'horse', 'pig'], positions: { hen: { x: 700, y: 560 }, horse: { x: 900, y: 560 }, pig: { x: 1100, y: 560 } }, tree: null };
  for (let seed = 1; seed < 20; seed++) {
    for (const lv of [1, 2, 3]) {
      for (const q of content.buildTalkingQuestions(scene, lv, content.mulberry32(seed))) {
        assert.ok(!/big eyes/.test(q.model), q.model);
        assert.ok(!/It's got/.test(q.model), q.model);
      }
    }
  }
  assert.strictEqual(content.PHRASES.findIt(content.getAnimal('duck')), 'Find the duck!');
});
