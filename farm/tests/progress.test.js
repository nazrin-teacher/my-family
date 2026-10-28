'use strict';

const test = require('node:test');
const assert = require('node:assert');
const content = require('../js/content.js');
const { createProgress, KEY, sanitize, memoryStorage } = require('../js/progress.js');

const DEFAULT_STATE = {
  version: 1,
  completed: {},
  speaking: {},
  settings: { mode: 'home', mic: true, wait: 'normal', reducedMotion: false }
};

test('falls back to in-memory storage when storage is missing or throws', () => {
  const throwingStorage = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
    removeItem() { throw new Error('SecurityError'); }
  };

  const p = createProgress(throwingStorage, content.MISSIONS);
  assert.strictEqual(p.isPersistent(), false);
  p.complete(1);
  p.addSpeaking(1);
  assert.strictEqual(p.isCompleted(1), true);
  assert.strictEqual(p.stars(), 1);
  assert.strictEqual(p.speakingCount(1), 1);

  const pNull = createProgress(null, content.MISSIONS);
  assert.strictEqual(pNull.isPersistent(), false);
  pNull.complete(2);
  assert.strictEqual(pNull.stars(), 1);

  // Storage that passes initial probe but later fails on save flips isPersistent() to false
  let failWrites = false;
  const base = memoryStorage();
  const flakyStorage = {
    getItem: (k) => base.getItem(k),
    setItem: (k, v) => {
      if (failWrites) throw new Error('QuotaExceededError');
      base.setItem(k, v);
    },
    removeItem: (k) => base.removeItem(k)
  };
  const pFlaky = createProgress(flakyStorage, content.MISSIONS);
  assert.strictEqual(pFlaky.isPersistent(), true);
  failWrites = true;
  pFlaky.complete(1);
  assert.strictEqual(pFlaky.isPersistent(), false);
  assert.strictEqual(pFlaky.isCompleted(1), true);
});

test('corrupt JSON in storage falls back to defaults', () => {
  const store = memoryStorage();
  store.setItem(KEY, '{bad json:::');

  const p = createProgress(store, content.MISSIONS);
  assert.strictEqual(p.isPersistent(), true);
  assert.deepStrictEqual(p.get(), DEFAULT_STATE);
});

test('complete, stars, and addSpeaking track counts and persist across reloads', () => {
  const store = memoryStorage();
  const p = createProgress(store, content.MISSIONS);

  assert.strictEqual(p.stars(), 0);
  assert.strictEqual(p.isCompleted(1), false);
  assert.strictEqual(p.speakingCount(), 0);
  assert.strictEqual(p.speakingCount(1), 0);

  p.complete(1);
  p.complete(1); // idempotent
  assert.strictEqual(p.isCompleted(1), true);
  assert.strictEqual(p.isCompleted('1'), true);
  assert.strictEqual(p.isCompleted(2), false);
  assert.strictEqual(p.stars(), 1);

  p.complete(2);
  assert.strictEqual(p.stars(), 2);

  p.addSpeaking(1);
  p.addSpeaking(1);
  p.addSpeaking(2);
  assert.strictEqual(p.speakingCount(1), 2);
  assert.strictEqual(p.speakingCount(2), 1);
  assert.strictEqual(p.speakingCount(3), 0);
  assert.strictEqual(p.speakingCount(), 3);

  const reloaded = createProgress(store, content.MISSIONS);
  assert.strictEqual(reloaded.stars(), 2);
  assert.strictEqual(reloaded.isCompleted(1), true);
  assert.strictEqual(reloaded.isCompleted(2), true);
  assert.strictEqual(reloaded.speakingCount(1), 2);
  assert.strictEqual(reloaded.speakingCount(), 3);
});

test('home mode unlocks ready missions sequentially while class mode unlocks all ready missions', () => {
  const pHome = createProgress(memoryStorage(), content.MISSIONS);
  assert.strictEqual(pHome.settings().mode, 'home');
  assert.strictEqual(pHome.isUnlocked(1), true);
  assert.strictEqual(pHome.isUnlocked(2), false);
  assert.strictEqual(pHome.isUnlocked(3), false); // ready, but mission 2 is not done yet
  assert.strictEqual(pHome.isUnlocked(5), false); // planned

  pHome.complete(1);
  assert.strictEqual(pHome.isUnlocked(1), true);
  assert.strictEqual(pHome.isUnlocked(2), true);
  assert.strictEqual(pHome.isUnlocked(3), false);
  pHome.complete(2);
  pHome.complete(3);
  assert.strictEqual(pHome.isUnlocked(4), true);
  assert.strictEqual(pHome.isUnlocked(5), false); // still planned

  const pClass = createProgress(memoryStorage(), content.MISSIONS);
  pClass.setSetting('mode', 'class');
  assert.strictEqual(pClass.isUnlocked(1), true);
  assert.strictEqual(pClass.isUnlocked(2), true);
  assert.strictEqual(pClass.isUnlocked(4), true); // every ready mission is open in class mode
  assert.strictEqual(pClass.isUnlocked(5), false); // planned stays locked even in class mode
  assert.strictEqual(pClass.isUnlocked(14), false);

  // Verify 3-step sequential chain with a custom fixture
  const customMissions = [
    { id: 1, status: 'ready' },
    { id: 2, status: 'ready' },
    { id: 3, status: 'ready' },
    { id: 4, status: 'planned' }
  ];
  const pSeq = createProgress(memoryStorage(), customMissions);
  assert.deepStrictEqual([1, 2, 3, 4].map((id) => pSeq.isUnlocked(id)), [true, false, false, false]);
  pSeq.complete(1);
  assert.deepStrictEqual([1, 2, 3, 4].map((id) => pSeq.isUnlocked(id)), [true, true, false, false]);
  pSeq.complete(2);
  assert.deepStrictEqual([1, 2, 3, 4].map((id) => pSeq.isUnlocked(id)), [true, true, true, false]);
});

test('current() returns the first unlocked incomplete ready mission or null when all ready are done', () => {
  const pHome = createProgress(memoryStorage(), content.MISSIONS);
  assert.strictEqual(pHome.current(), 1);
  pHome.complete(1);
  assert.strictEqual(pHome.current(), 2);
  pHome.complete(2);
  assert.strictEqual(pHome.current(), 3);
  pHome.complete(3);
  assert.strictEqual(pHome.current(), 4);
  pHome.complete(4);
  assert.strictEqual(pHome.current(), null);

  const pClass = createProgress(memoryStorage(), content.MISSIONS);
  pClass.setSetting('mode', 'class');
  pClass.complete(2);
  assert.strictEqual(pClass.current(), 1);
  [1, 3, 4].forEach((id) => pClass.complete(id));
  assert.strictEqual(pClass.current(), null);
});

test('reset() clears stars and speaking counts while keeping settings', () => {
  const store = memoryStorage();
  const p = createProgress(store, content.MISSIONS);

  p.setSetting('mode', 'class');
  p.setSetting('mic', true);
  p.setSetting('wait', 'long');
  p.setSetting('reducedMotion', true);
  p.complete(1);
  p.complete(2);
  p.addSpeaking(1);
  p.addSpeaking(2);

  p.reset();

  assert.strictEqual(p.stars(), 0);
  assert.strictEqual(p.isCompleted(1), false);
  assert.strictEqual(p.isCompleted(2), false);
  assert.strictEqual(p.speakingCount(), 0);
  assert.strictEqual(p.current(), 1);
  assert.deepStrictEqual(p.settings(), {
    mode: 'class',
    mic: true,
    wait: 'long',
    reducedMotion: true
  });

  const reloaded = createProgress(store, content.MISSIONS);
  assert.strictEqual(reloaded.stars(), 0);
  assert.strictEqual(reloaded.speakingCount(), 0);
  assert.deepStrictEqual(reloaded.settings(), {
    mode: 'class',
    mic: true,
    wait: 'long',
    reducedMotion: true
  });
});

test('sanitize() and setSetting() reject bad values and normalize speaking counts', () => {
  assert.deepStrictEqual(sanitize(null), DEFAULT_STATE);
  assert.deepStrictEqual(sanitize(undefined), DEFAULT_STATE);
  assert.deepStrictEqual(sanitize('invalid'), DEFAULT_STATE);
  assert.deepStrictEqual(sanitize(123), DEFAULT_STATE);
  assert.deepStrictEqual(sanitize([]), DEFAULT_STATE);
  assert.deepStrictEqual(sanitize({ version: 2, completed: { '1': true } }), DEFAULT_STATE);

  const cleaned = sanitize({
    version: 1,
    unexpected: 'ignored',
    completed: {
      '1': true,
      '2': false,
      '3': 'true',
      abc: true,
      '-1': true
    },
    speaking: {
      '1': 4.9,
      '2': 0,
      '3': -2,
      '4': NaN,
      '5': Infinity,
      '6': '3',
      abc: 2
    },
    settings: {
      mode: 'invalid-mode',
      mic: 'yes',
      wait: 'forever',
      reducedMotion: 1,
      extra: true
    }
  });

  assert.deepStrictEqual(cleaned, {
    version: 1,
    completed: { '1': true },
    speaking: { '1': 4, '2': 0 },
    settings: { mode: 'home', mic: true, wait: 'normal', reducedMotion: false }
  });

  const validCustom = sanitize({
    version: 1,
    completed: { '2': true },
    speaking: { '2': 5 },
    settings: { mode: 'class', mic: true, wait: 'short', reducedMotion: true }
  });
  assert.deepStrictEqual(validCustom, {
    version: 1,
    completed: { '2': true },
    speaking: { '2': 5 },
    settings: { mode: 'class', mic: true, wait: 'short', reducedMotion: true }
  });

  const p = createProgress(memoryStorage(), content.MISSIONS);
  p.setSetting('wait', 'long');
  p.setSetting('mode', 'bogus');
  p.setSetting('unknownKey', 'anything');
  assert.deepStrictEqual(p.settings(), {
    mode: 'home',
    mic: true,
    wait: 'long',
    reducedMotion: false
  });
});
