/*
 * Mission 4 – My Talking Farm. Three levels, chosen by the child (no reading needed: 1, 2 or 3 stars):
 *   Level 1 "Speak with Pip"        – Pip models every answer, the child repeats (supported).
 *   Level 2 "Help Pip"              – the child answers first; the model is only on the hint button.
 *   Level 3 "Little Farm Speaker"   – the child describes animals and the farm alone (longer answers).
 * Scenes change (random animals and places). The first scene reuses the child's own farm from Mission 3
 * when it exists on this device.
 */
(function (root) {
  'use strict';
  var EF = root.EF;
  EF.games = EF.games || {};

  var TREE = { x: 300, y: 130, w: 230, h: 287 };
  var SLOTS = [
    { x: 420, y: 500 },   // under the tree
    { x: 720, y: 560 }, { x: 960, y: 520 }, { x: 1200, y: 600 }, { x: 860, y: 640 }, { x: 1380, y: 520 }
  ];
  var LEVELS = [
    { n: 1, name: 'Speak with Pip', say: 'Speak with Pip! Listen and say.' },
    { n: 2, name: 'Help Pip', say: 'Help Pip! Answer the questions.' },
    { n: 3, name: 'Little Farm Speaker', say: 'Little Farm Speaker! Tell me about the farm.' }
  ];

  EF.games.talkingfarm = function (run, api) {
    var C = EF.content, S = EF.stage, A = EF.art;
    var world = api.world();
    var stage = S.el().stage;

    function clearScene() {
      Array.prototype.slice.call(world.querySelectorAll('.scene-item')).forEach(function (n) { n.remove(); });
    }

    /* ---------- level choice ---------- */
    function chooseLevel() {
      api.bg().innerHTML = A.landscape({ paint: 'meadow' });
      var box = S.h('div', 'level-choice scene-item');
      LEVELS.forEach(function (L) {
        var b = S.h('button', 'level-btn level-' + L.n);
        b.type = 'button';
        b.setAttribute('aria-label', 'Level ' + L.n + ': ' + L.name);
        var stars = '';
        for (var i = 0; i < L.n; i++) stars += S.ICONS.star;
        b.innerHTML = '<span class="level-stars">' + stars + '</span><span class="level-pip">' + A.pip() + '</span><span class="btn-cap">' + L.name + '</span>';
        box.appendChild(b);
      });
      world.appendChild(box);
      var btns = Array.prototype.slice.call(box.querySelectorAll('.level-btn'));
      setTimeout(function () { if (btns[0]) btns[0].focus({ preventScroll: true }); }, 60);
      S.setReplay(function () { S.speak('One star: speak with Pip. Two stars: help Pip. Three stars: little farm speaker.'); });
      return run.say('Choose a game! One, two or three stars.')
        .then(function () {
          return run.until(function (resolve) {
            btns.forEach(function (b, i) { b.onclick = function () { resolve(LEVELS[i]); }; });
            return function () { btns.forEach(function (b) { b.onclick = null; }); };
          });
        })
        .then(function (L) { EF.audio.sfx('pop'); box.remove(); return L; });
    }

    /* ---------- scenes ---------- */
    function makeScene(i) {
      var saved = i === 0 && EF.myFarm && EF.myFarm.load();
      var ids, positions = {};
      if (saved) {
        ids = C.shuffle(Object.keys(saved.positions).filter(function (k) { return C.getAnimal(k); })).slice(0, 3);
        ids.forEach(function (id) { positions[id] = saved.positions[id]; });
      }
      if (!ids || ids.length < 3) {
        ids = C.shuffle(C.ANIMALS.map(function (a) { return a.id; })).slice(0, 3);
        var slots = C.shuffle(SLOTS.slice(1)).slice(0, 2);
        slots.unshift(Math.random() < 0.6 ? SLOTS[0] : C.shuffle(SLOTS.slice(1)).filter(function (s) { return slots.indexOf(s) < 0; })[0]);
        positions = {};
        ids.forEach(function (id, k) { positions[id] = { x: slots[k].x, y: slots[k].y }; });
      }
      return { animals: ids, positions: positions, tree: TREE, own: !!saved };
    }

    function drawScene(scene, i) {
      clearScene();
      api.bg().innerHTML = A.landscape({ paint: i % 2 === 0 ? 'meadow' : 'farm' });
      api.pieceAt('tree', TREE.x, TREE.y, TREE.w, 'scene-item farm-tree');
      var nodes = {};
      scene.animals.forEach(function (id) {
        var a = C.getAnimal(id), p = scene.positions[id];
        var w = a.size === 'big' ? 230 : 165, h = w / 1.1;
        var b = S.h('button', 'actor scene-item talk-animal pop-in', A.animal(id));
        b.type = 'button';
        b.setAttribute('aria-label', a.name);
        b.style.width = w + 'px';
        b.style.left = (p.x - w / 2) + 'px';
        b.style.top = (p.y - h * 0.95) + 'px';
        b.style.zIndex = String(10 + Math.round(p.y / 10));
        // Touching an animal plays its sound (free exploration, never wrong).
        b.onclick = function () { b.classList.remove('happy'); void b.offsetWidth; b.classList.add('happy'); EF.audio.animalSound(id); };
        world.appendChild(b);
        nodes[id] = b;
      });
      return nodes;
    }

    function ask(level, q, nodes) {
      var target = q.target && nodes[q.target];
      Object.keys(nodes).forEach(function (k) { nodes[k].classList.toggle('dim', !!target && nodes[k] !== target); });
      if (target) target.classList.add('glow');
      return S.speakTurn(run, { prompt: q.prompt, model: q.model, supported: level.n === 1 })
        .then(function () {
          if (target) target.classList.remove('glow');
          Object.keys(nodes).forEach(function (k) { nodes[k].classList.remove('dim'); });
        });
    }

    function playLevel(level) {
      var perScene = level.n === 3 ? 3 : 4;
      var scenes = [0, 1];
      return run.say(level.say).then(function () {
        return scenes.reduce(function (p, i) {
          return p.then(function () {
            var scene = makeScene(i);
            var nodes = drawScene(scene, i);
            var all = C.buildTalkingQuestions(scene, level.n);
            // Level 3: describe two animals, then the whole farm.
            var qs = level.n === 3 ? all.slice(0, 2).concat([all[all.length - 1]]) : all.slice(0, perScene);
            return run.wait(500)
              .then(function () { return run.say(i === 0 && scene.own ? 'Look! It is your farm!' : C.PHRASES.lookAnimals); })
              .then(function () {
                return qs.reduce(function (pp, q) { return pp.then(function () { return ask(level, q, nodes); }); }, Promise.resolve());
              });
          });
        }, Promise.resolve());
      });
    }

    return run.wait(300)
      .then(function () { return run.say('Welcome to my talking farm! Let’s talk about the animals.'); })
      .then(chooseLevel)
      .then(function (level) {
        return playLevel(level).then(function () {
          stage.classList.add('lights-on');
          api.progress.complete(api.mission.id);
          S.setBubble(C.PHRASES.star);
          EF.audio.say(C.PHRASES.star);
          return S.reward(run, { title: level.name + '!' });
        });
      });
  };
})(this);
