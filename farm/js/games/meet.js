/*
 * Mission 1 – Meet the Animals.
 * Part A (guided, fixed order): each animal walks in → LISTEN "What can you see?" → THINK →
 *   model "I can see a cow." → SAY → ACT (touch it: sound) → SPEAK AGAIN without the model.
 * Part B (challenge, random order): "find" rounds (touch the named animal among three, then say it)
 *   alternate with "peek" rounds (name a half-hidden animal, then reveal it).
 */
(function (root) {
  'use strict';
  var EF = root.EF;
  EF.games = EF.games || {};

  EF.games.meet = function (run, api) {
    var C = EF.content, S = EF.stage, P = C.PHRASES, A = EF.art;
    var world = api.world();
    var reduce = function () { return document.documentElement.classList.contains('reduce-motion'); };

    api.bg().innerHTML = A.landscape({ paint: 'meadow' });
    api.pieceAt('flowers', 60, 560, 220);
    api.pieceAt('flowers', 1330, 600, 200);

    // Parade: one slot per animal, filled as the child meets them (visible progress).
    var parade = S.h('div', 'parade');
    parade.setAttribute('aria-hidden', 'true');
    var slots = {};
    C.ANIMALS.forEach(function (a) {
      var s = S.h('div', 'slot', A.animal(a.id, 'silhouette'));
      slots[a.id] = s;
      parade.appendChild(s);
    });
    world.appendChild(parade);

    function seq(list, fn) {
      return list.reduce(function (p, item, i) { return p.then(function () { return fn(item, i); }); }, Promise.resolve());
    }

    function makeActor(id, x, y, w) {
      var a = C.getAnimal(id);
      var b = S.h('button', 'actor', A.animal(id));
      b.type = 'button';
      b.setAttribute('aria-label', a.name);
      b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.width = w + 'px';
      b.tabIndex = -1;
      world.appendChild(b);
      return b;
    }

    function moveTo(node, x, y, ms) {
      node.style.transitionDuration = (reduce() ? 0 : ms) + 'ms';
      node.style.left = x + 'px'; node.style.top = y + 'px';
      return run.wait(reduce() ? 50 : ms);
    }

    function happy(node, id) {
      node.classList.remove('happy'); void node.offsetWidth; node.classList.add('happy');
      return EF.audio.animalSound(id);
    }

    /* Wait for the child to touch one of the given buttons. */
    function waitTap(nodes) {
      nodes.forEach(function (n) { n.tabIndex = 0; n.classList.add('tappable'); });
      if (nodes[0]) nodes[0].focus({ preventScroll: true });
      return run.until(function (resolve) {
        nodes.forEach(function (n) { n.onclick = function () { resolve(n); }; });
        return function () { nodes.forEach(function (n) { n.onclick = null; }); };
      }).then(function (n) { return n; });
    }
    function done(nodes) { nodes.forEach(function (n) { n.tabIndex = -1; n.classList.remove('tappable', 'glow'); }); }

    /* ---------- Part A ---------- */
    function meetOne(a, i) {
      var actor = makeActor(a.id, 1700, 215, 400);
      actor.classList.add('walking');
      return run.wait(30)
        .then(function () { return moveTo(actor, 640, 215, 1600); })
        .then(function () {
          actor.classList.remove('walking');
          return i === 0 ? run.say(P.lookAnimals) : run.say('Look!');
        })
        // LISTEN → THINK → SAY (supported)
        .then(function () { return S.speakTurn(run, { prompt: P.whatCanYouSee, model: C.canSee(a), supported: true }); })
        // ACT
        .then(function () {
          S.setHint(function () { actor.classList.add('glow'); S.speak(P.touchIt(a)); });
          return run.say(P.touchIt(a));
        })
        .then(function () { return waitTap([actor]); })
        .then(function () {
          done([actor]); S.setHint(null);
          return happy(actor, a.id);
        })
        .then(function () { return run.say(P.says(a)); })
        // SPEAK AGAIN (independent; model only on the hint button)
        .then(function () { return S.speakTurn(run, { prompt: P.whatCanYouSee, model: C.canSee(a), supported: false }); })
        .then(function () {
          actor.classList.add('walking');
          // Stage units (offset* is unaffected by the stage's scale/rotation transform).
          var slot = slots[a.id];
          actor.style.width = '190px';
          return moveTo(actor, parade.offsetLeft + slot.offsetLeft - 40, parade.offsetTop + slot.offsetTop - 40, 900);
        })
        .then(function () {
          actor.remove();
          slots[a.id].innerHTML = A.animal(a.id);
          slots[a.id].classList.add('filled');
          EF.audio.sfx('pop');
        });
    }

    /* ---------- Part B ---------- */
    function findRound(round) {
      var target = C.getAnimal(round.target);
      var xs = [250, 620, 990];
      var actors = round.choices.map(function (id, k) { return makeActor(id, xs[k], 270, 330); });
      var wrong = 0;
      var targetNode = actors[round.choices.indexOf(round.target)];
      S.setHint(function () { targetNode.classList.add('glow'); S.speak(P.findIt(target)); });
      actors.forEach(function (n) { n.classList.add('pop-in'); });

      function ask() {
        return run.say(P.findIt(target)).then(function () { return waitTap(actors); }).then(function (n) {
          var id = round.choices[actors.indexOf(n)];
          if (id === round.target) return null;
          wrong++;
          EF.audio.sfx('soft');
          return happy(n, id)
            .then(function () { return run.say(P.thatsA(C.getAnimal(id))); })
            .then(function () { if (wrong >= 2) targetNode.classList.add('glow'); return ask(); });
        });
      }

      return ask().then(function () {
        done(actors); S.setHint(null);
        S.pipMood('happy');
        EF.audio.sfx('success');
        actors.forEach(function (n) { if (n !== targetNode) n.classList.add('fade-out'); });
        return happy(targetNode, round.target);
      })
        .then(function () { return S.speakTurn(run, { prompt: P.whatCanYouSee, model: C.canSee(target), supported: false }); })
        .then(function () { actors.forEach(function (n) { n.remove(); }); });
    }

    function peekRound(round) {
      var target = C.getAnimal(round.target);
      var hide = S.h('div', 'peek-wrap');
      hide.innerHTML = '<div class="peeker">' + A.animal(target.id, 'peeking') + '</div><button type="button" class="peek-bush" aria-label="Look behind the bush">' + A.piece('bush') + '</button>';
      hide.style.left = '520px'; hide.style.top = '200px';
      world.appendChild(hide);
      var bush = hide.querySelector('.peek-bush');
      var peeker = hide.querySelector('.peeker');
      EF.audio.animalSound(target.id);
      return run.wait(900)
        .then(function () { return S.speakTurn(run, { prompt: P.whoIsIt, model: C.canSee(target), supported: false }); })
        .then(function () {
          S.setHint(function () { bush.classList.add('glow'); });
          return run.say('Touch the bush!');
        })
        .then(function () { return waitTap([bush]); })
        .then(function () {
          done([bush]); S.setHint(null);
          peeker.classList.add('revealed');
          EF.audio.sfx('whoosh');
          return run.wait(500);
        })
        .then(function () { return EF.audio.animalSound(target.id); })
        .then(function () { return run.say(P.itsA(target) + ' ' + C.canSee(target)); })
        .then(function () { return run.wait(400); })
        .then(function () { hide.remove(); });
    }

    function finale() {
      var row = C.ANIMALS.map(function (a, k) { return makeActor(a.id, 230 + k * 200, 300, 220); });
      row.forEach(function (n, k) { n.classList.add('dance'); n.style.animationDelay = (k * 0.12) + 's'; });
      EF.audio.sfx('success');
      return run.say(P.lookAnimals)
        .then(function () { return run.say(C.pick(P.thankYou)); })
        .then(function () {
          api.progress.complete(api.mission.id);
          S.setBubble(P.star);
          EF.audio.say(P.star);
          return S.reward(run, { title: 'Magic star!' });
        });
    }

    return run.wait(300)
      .then(function () { return seq(C.ANIMALS, meetOne); })
      .then(function () { return run.say("Now, let's play a game!"); })
      .then(function () {
        return seq(C.buildMeetChallenge(), function (round) { return round.type === 'find' ? findRound(round) : peekRound(round); });
      })
      .then(finale);
  };
})(this);
