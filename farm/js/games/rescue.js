/*
 * Mission 2 – The Great Animal Rescue.
 * Round 1 (supported practice, duck): hiding place and home glow, Pip models the sentence.
 * Rounds 2–6 (independent, random order): find the named animal, say what you see,
 *   then drag (or tap, then tap the home) to take it home. Hints only on request or after a pause.
 * Each rescued animal changes the farm (its home lights up and comes alive).
 */
(function (root) {
  'use strict';
  var EF = root.EF;
  EF.games = EF.games || {};

  var HOME_LAYOUT = {
    barn:     { piece: 'barn',     x: 40,   y: 110, w: 250, spotX: 105, spotY: 190, aw: 140 },
    stable:   { piece: 'stable',   x: 310,  y: 150, w: 230, spotX: 85,  spotY: 70,  aw: 150 },
    henhouse: { piece: 'henhouse', x: 580,  y: 140, w: 190, spotX: 50,  spotY: 120, aw: 90 },
    mud:      { piece: 'mud',      x: 800,  y: 250, w: 250, spotX: 70,  spotY: 0,   aw: 120 },
    field:    { piece: 'field',    x: 1070, y: 200, w: 270, spotX: 80,  spotY: 20,  aw: 120 },
    pond:     { piece: 'pond',     x: 1330, y: 290, w: 250, spotX: 80,  spotY: 30,  aw: 100 }
  };
  var SPOTS = [
    { id: 's1', piece: 'bush',    x: 300,  y: 480, w: 200 },
    { id: 's2', piece: 'hay',     x: 520,  y: 470, w: 180 },
    { id: 's3', piece: 'cart',    x: 730,  y: 480, w: 210 },
    { id: 's4', piece: 'flowers', x: 960,  y: 500, w: 190 },
    { id: 's5', piece: 'log',     x: 1170, y: 520, w: 200 },
    { id: 's6', piece: 'bush',    x: 1390, y: 480, w: 190 }
  ];

  EF.games.rescue = function (run, api) {
    var C = EF.content, S = EF.stage, P = C.PHRASES, A = EF.art;
    var world = api.world();
    var stage = S.el().stage;

    api.bg().innerHTML = A.landscape({ noTrees: true, paint: 'farm' });
    stage.classList.add('rescue-dim');

    // Homes (drop targets; only active while taking an animal home)
    var homes = {};
    Object.keys(HOME_LAYOUT).forEach(function (hid) {
      var L = HOME_LAYOUT[hid];
      var b = S.h('button', 'home-target', A.piece(L.piece));
      b.type = 'button';
      b.disabled = true;
      b.setAttribute('aria-label', 'Home: ' + C.HOME_NAMES[hid]);
      b.dataset.home = hid;
      b.style.left = L.x + 'px'; b.style.top = L.y + 'px'; b.style.width = L.w + 'px';
      world.appendChild(b);
      homes[hid] = b;
    });

    // Hiding spots
    var assignment = C.assignHidingSpots(SPOTS.map(function (s) { return s.id; }));
    var spots = {};
    SPOTS.forEach(function (s) {
      var b = S.h('button', 'hide-spot');
      b.type = 'button';
      b.disabled = true;
      b.setAttribute('aria-label', 'Look here');
      b.innerHTML = '<span class="hider">' + A.animal(assignment[s.id], 'hidden-animal') + '</span>' + A.piece(s.piece);
      b.style.left = s.x + 'px'; b.style.top = s.y + 'px'; b.style.width = s.w + 'px';
      world.appendChild(b);
      spots[s.id] = { node: b, animal: assignment[s.id], empty: false, def: s };
    });
    function spotOf(animalId) {
      for (var k in spots) if (spots[k].animal === animalId && !spots[k].empty) return spots[k];
      return null;
    }

    var homeCount = 0;

    function glowOnce(node) { node.classList.remove('glow'); void node.offsetWidth; node.classList.add('glow'); }

    /* ---------- find ---------- */
    function findAnimal(target, supported) {
      var mine = spotOf(target.id);
      var open = Object.keys(spots).map(function (k) { return spots[k]; }).filter(function (s) { return !s.empty; });
      open.forEach(function (s) { s.node.disabled = false; s.node.classList.add('tappable'); });
      var idle = null;
      function hint() {
        glowOnce(mine.node);
        mine.node.classList.add('rustle');
        EF.audio.animalSound(target.id);
      }
      S.setHint(hint);
      if (supported) hint();

      function ask() {
        return run.say(P.canYouFind(target)).then(function () {
          return run.until(function (resolve) {
            if (!supported) idle = setTimeout(hint, 12000);
            open.forEach(function (s) { s.node.onclick = function () { resolve(s); }; });
            return function () { clearTimeout(idle); open.forEach(function (s) { s.node.onclick = null; }); };
          });
        }).then(function (s) {
          if (s === mine) return s;
          // Wrong place: the other animal peeks out and Pip names it (more listening input).
          var other = C.getAnimal(s.animal);
          s.node.classList.add('peek');
          EF.audio.animalSound(other.id);
          return run.say(P.thatsA(other))
            .then(function () { s.node.classList.remove('peek'); return ask(); });
        });
      }

      return ask().then(function (s) {
        open.forEach(function (o) { o.node.disabled = true; o.node.classList.remove('tappable', 'glow', 'rustle'); });
        S.setHint(null);
        s.empty = true;
        s.node.classList.add('found');
        EF.audio.sfx('whoosh');
        return s;
      });
    }

    /* ---------- take home (drag or tap-tap) ---------- */
    /* The found animal jumps out and stays visible, so the child can see it when Pip asks "What can you see?". */
    function showAnimal(target, spot) {
      var actor = S.h('button', 'actor rescue-actor', A.animal(target.id));
      actor.type = 'button';
      actor.tabIndex = -1;
      actor.setAttribute('aria-label', target.name);
      actor.style.left = (spot.def.x + spot.def.w / 2 - 90) + 'px';
      actor.style.top = (spot.def.y - 40) + 'px'; // in front of the hiding place; homes end above y 425
      actor.style.width = '180px';
      world.appendChild(actor);
      actor.classList.add('pop-in');
      return actor;
    }

    function takeHome(target, spot, supported, actor) {
      var L = HOME_LAYOUT[target.home];
      actor.tabIndex = 0;
      actor.setAttribute('aria-label', target.name + ' – take me home');
      var startX = parseFloat(actor.style.left), startY = parseFloat(actor.style.top);
      var wrongs = 0;

      function homeHint() { glowOnce(homes[target.home]); }
      S.setHint(homeHint);

      Object.keys(homes).forEach(function (k) { homes[k].disabled = false; homes[k].classList.add('droppable'); });

      var line = supported ? P.takeTo(target, C.HOME_NAMES[target.home]) : P.takeHome(target);
      return run.say(line).then(function () {
        if (supported) homeHint();
        actor.focus({ preventScroll: true });
        return run.until(function (resolve) {
          var selected = false;
          var drag = null;

          function homeAt(x, y) {
            for (var k in homes) {
              var n = homes[k];
              var l = parseFloat(n.style.left), t = parseFloat(n.style.top), w = n.offsetWidth, h = n.offsetHeight;
              if (x >= l - 20 && x <= l + w + 20 && y >= t - 20 && y <= t + h + 20) return k;
            }
            return null;
          }
          function hover(k) { Object.keys(homes).forEach(function (h) { homes[h].classList.toggle('hover', h === k); }); }

          function attempt(k) {
            hover(null);
            if (k === target.home) { resolve(k); return; }
            wrongs++;
            EF.audio.sfx('soft');
            actor.classList.add('back');
            actor.style.left = startX + 'px'; actor.style.top = startY + 'px';
            setTimeout(function () { actor.classList.remove('back'); }, 450);
            S.speak(P.notHere);
            if (wrongs >= 1) homeHint();
          }

          function down(e) {
            if (e.button !== undefined && e.button !== 0) return;
            suppressClick = false;
            var p = S.toStage(e.clientX, e.clientY);
            drag = { id: e.pointerId, ox: p.x - parseFloat(actor.style.left), oy: p.y - parseFloat(actor.style.top), sx: p.x, sy: p.y, moved: false };
            try { actor.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            actor.classList.add('dragging');
          }
          function move(e) {
            if (!drag || e.pointerId !== drag.id) return;
            var p = S.toStage(e.clientX, e.clientY);
            if (Math.abs(p.x - drag.sx) + Math.abs(p.y - drag.sy) > 12) drag.moved = true;
            if (!drag.moved) return;
            e.preventDefault();
            actor.style.left = (p.x - drag.ox) + 'px';
            actor.style.top = (p.y - drag.oy) + 'px';
            hover(homeAt(p.x, p.y));
          }
          function up(e) {
            if (!drag || e.pointerId !== drag.id) return;
            var p = S.toStage(e.clientX, e.clientY);
            var wasMoved = drag.moved;
            drag = null;
            actor.classList.remove('dragging');
            if (!wasMoved) return; // a tap: handled by click
            var k = homeAt(p.x, p.y);
            if (k) attempt(k);
            else { hover(null); actor.style.left = startX + 'px'; actor.style.top = startY + 'px'; }
          }
          function cancel() { drag = null; actor.classList.remove('dragging'); hover(null); actor.style.left = startX + 'px'; actor.style.top = startY + 'px'; }
          var suppressClick = false;
          function click() {
            if (suppressClick) { suppressClick = false; return; }
            selected = !selected;
            actor.classList.toggle('selected', selected);
            EF.audio.sfx('tap');
          }
          actor.addEventListener('pointerdown', down);
          actor.addEventListener('pointermove', move);
          actor.addEventListener('pointerup', function (e) { if (drag && drag.moved) suppressClick = true; up(e); });
          actor.addEventListener('pointercancel', cancel);
          actor.addEventListener('click', click);
          Object.keys(homes).forEach(function (k) {
            homes[k].onclick = function () {
              if (!selected) { glowOnce(actor); S.speak(P.takeHome(target)); return; }
              selected = false; actor.classList.remove('selected');
              attempt(k);
            };
          });
          return function () {
            actor.removeEventListener('pointerdown', down);
            actor.removeEventListener('pointermove', move);
            actor.removeEventListener('pointercancel', cancel);
            actor.removeEventListener('click', click);
            Object.keys(homes).forEach(function (k) { homes[k].onclick = null; homes[k].disabled = true; homes[k].classList.remove('droppable', 'hover', 'glow'); });
          };
        });
      }).then(function () {
        S.setHint(null);
        actor.remove();
        var home = homes[target.home];
        var resident = S.h('div', 'resident', A.animal(target.id, 'idle'));
        resident.style.left = (L.x + L.spotX) + 'px'; resident.style.top = (L.y + L.spotY) + 'px'; resident.style.width = L.aw + 'px';
        world.appendChild(resident);
        home.classList.add('restored');
        homeCount++;
        stage.style.setProperty('--rescued', String(homeCount / 6));
        S.pipMood('happy');
        EF.audio.sfx('success');
        return EF.audio.animalSound(target.id).then(function () { return run.say(C.pick(P.thankYou)); });
      });
    }

    function round(r) {
      var target = C.getAnimal(r.target);
      return findAnimal(target, r.supported)
        .then(function (spot) {
          var actor = showAnimal(target, spot);
          return EF.audio.animalSound(target.id)
            .then(function () { return S.speakTurn(run, { prompt: P.whatCanYouSee, model: C.canSee(target), supported: r.supported }); })
            .then(function () { return takeHome(target, spot, r.supported, actor); });
        });
    }

    function seq(list, fn) { return list.reduce(function (p, x) { return p.then(function () { return fn(x); }); }, Promise.resolve()); }

    return run.wait(300)
      .then(function () { return run.say(P.lostAnimals); })
      .then(function () { return seq(C.buildRescueRounds(), round); })
      .then(function () {
        stage.classList.remove('rescue-dim');
        stage.classList.add('lights-on');
        EF.audio.sfx('star');
        return run.say(P.allHome);
      })
      .then(function () {
        var any = C.pick(C.ANIMALS);
        return S.speakTurn(run, { prompt: P.whatCanYouSee, model: C.canSee(any), supported: false });
      })
      .then(function () {
        api.progress.complete(api.mission.id);
        S.setBubble(P.star);
        EF.audio.say(P.star);
        return S.reward(run, { title: 'Magic star!' });
      })
      .then(function (choice) {
        stage.classList.remove('lights-on');
        return choice;
      });
  };
})(this);
