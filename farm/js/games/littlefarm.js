/*
 * Mission 3 – My Little Farm.
 * The child builds a personal farm: LISTEN (pick the named animal from the tray) → ACT (put it anywhere
 * on the farm, by dragging or tap-then-tap) → SPEAK about the farm they made:
 *   "What can you see?" / "Where is the duck?" (next to / under, computed from the child's own layout) /
 *   "Is it big or small?" / "This is my farm."
 * The layout is saved on this device (positions only) and reused by Mission 4.
 */
(function (root) {
  'use strict';
  var EF = root.EF;
  EF.games = EF.games || {};

  var FARM_KEY = 'enchanted-farm:myfarm:v1';
  var AREA = { x: 280, y: 120, w: 1290, h: 540 };      // where animals may stand (feet point)
  var TREE = { x: 300, y: 130, w: 230, h: 287 };       // fixed tree, used for "under the tree"
  var ORDER = ['cow', 'duck', 'horse', 'sheep', 'pig', 'hen'];

  function saveFarm(positions) {
    try { root.localStorage.setItem(FARM_KEY, JSON.stringify({ v: 1, positions: positions, tree: TREE })); } catch (e) { /* ignore */ }
  }
  function loadFarm() {
    try {
      var d = JSON.parse(root.localStorage.getItem(FARM_KEY));
      if (d && d.v === 1 && d.positions && typeof d.positions === 'object') return d;
    } catch (e) { /* ignore */ }
    return null;
  }
  EF.myFarm = { load: loadFarm, KEY: FARM_KEY };

  EF.games.littlefarm = function (run, api) {
    var C = EF.content, S = EF.stage, P = C.PHRASES, A = EF.art;
    var world = api.world();
    var positions = {};
    var placed = {};

    api.bg().innerHTML = A.landscape({ paint: 'littlefarm', paintFallback: 'meadow' });
    api.pieceAt('tree', TREE.x, TREE.y, TREE.w, 'farm-tree');
    api.pieceAt('barn', 1020, 150, 220, 'back');
    api.pieceAt('pond', 1220, 470, 300, 'back');

    // The farm area is one big touch target ("put it here").
    var area = S.h('button', 'farm-area');
    area.type = 'button';
    area.disabled = true;
    area.setAttribute('aria-label', 'Put the animal here');
    area.style.left = AREA.x + 'px'; area.style.top = AREA.y + 'px';
    area.style.width = AREA.w + 'px'; area.style.height = AREA.h + 'px';
    world.appendChild(area);

    // Sticker tray
    var tray = S.h('div', 'sticker-tray');
    var stickers = {};
    ORDER.forEach(function (id) {
      var b = S.h('button', 'sticker', A.animal(id));
      b.type = 'button';
      b.setAttribute('aria-label', C.getAnimal(id).name);
      b.disabled = true;
      stickers[id] = b;
      tray.appendChild(b);
    });
    world.appendChild(tray);

    function widthOf(id) { return C.getAnimal(id).size === 'big' ? 210 : 150; }
    function clampFeet(x, y) {
      return { x: Math.max(AREA.x + 60, Math.min(AREA.x + AREA.w - 60, x)), y: Math.max(AREA.y + 120, Math.min(AREA.y + AREA.h, y)) };
    }
    /* Never let an animal cover another one (the child must be able to touch every animal later). */
    function overlaps(id, p) {
      return Object.keys(positions).some(function (k) {
        if (k === id) return false;
        var q = positions[k];
        return Math.abs(q.x - p.x) < (widthOf(k) + widthOf(id)) / 2 * 0.75 && Math.abs(q.y - p.y) < 110;
      });
    }
    function freeFeet(id, p) {
      var start = clampFeet(p.x, p.y);
      if (!overlaps(id, start)) return start;
      for (var r = 1; r <= 8; r++) {
        for (var k = 0; k < 8; k++) {
          var ang = k * Math.PI / 4;
          var c = clampFeet(start.x + Math.cos(ang) * r * 70, start.y + Math.sin(ang) * r * 45);
          if (!overlaps(id, c)) return c;
        }
      }
      return start;
    }
    function setFeet(node, id, p) {
      var w = widthOf(id), h = w / 1.1;
      node.style.width = w + 'px';
      node.style.left = (p.x - w / 2) + 'px';
      node.style.top = (p.y - h * 0.95) + 'px';
      node.style.zIndex = String(10 + Math.round(p.y / 10)); // nearer animals in front
    }

    /* LISTEN: pick the named animal from the tray. */
    function pickFromTray(a) {
      var open = ORDER.filter(function (id) { return !placed[id]; });
      open.forEach(function (id) { stickers[id].disabled = false; stickers[id].classList.add('tappable'); });
      S.setHint(function () { stickers[a.id].classList.add('glow'); S.speak(P.touchIt(a)); });
      function ask() {
        return run.until(function (resolve) {
          open.forEach(function (id) { stickers[id].onclick = function () { resolve(id); }; });
          return function () { open.forEach(function (id) { stickers[id].onclick = null; }); };
        }).then(function (id) {
          if (id === a.id) return id;
          EF.audio.animalSound(id);
          return run.say(P.thatsA(C.getAnimal(id))).then(function () { return run.say(P.findIt(a)); }).then(ask);
        });
      }
      return ask().then(function () {
        open.forEach(function (id) { stickers[id].disabled = true; stickers[id].classList.remove('tappable', 'glow'); });
        S.setHint(null);
      });
    }

    /* ACT: put it on the farm – drag it, or touch the place. */
    function putOnFarm(a) {
      var st = stickers[a.id];
      var actor = S.h('button', 'actor farm-actor', A.animal(a.id));
      actor.type = 'button';
      actor.setAttribute('aria-label', a.name + ' – drag me onto the farm');
      var tl = { x: tray.offsetLeft + st.offsetLeft, y: tray.offsetTop + st.offsetTop };
      var start = { x: tl.x + st.offsetWidth / 2, y: tl.y + st.offsetHeight * 0.9 };
      setFeet(actor, a.id, start);
      actor.style.zIndex = '60';
      world.appendChild(actor);
      st.classList.add('used');
      actor.classList.add('pop-in', 'selected');
      area.disabled = false;
      area.classList.add('droppable');
      S.setHint(function () { area.classList.remove('glow'); void area.offsetWidth; area.classList.add('glow'); });

      return run.say('Put the ' + a.name + ' on your farm!').then(function () {
        return run.until(function (resolve) {
          var drag = null;
          function inArea(p) { return p.x >= AREA.x && p.x <= AREA.x + AREA.w && p.y >= AREA.y && p.y <= AREA.y + AREA.h + 120; }
          function down(e) {
            if (e.button !== undefined && e.button !== 0) return;
            var p = S.toStage(e.clientX, e.clientY);
            drag = { id: e.pointerId, ox: p.x - parseFloat(actor.style.left), oy: p.y - parseFloat(actor.style.top), moved: false, sx: p.x, sy: p.y };
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
          }
          function up(e) {
            if (!drag || e.pointerId !== drag.id) return;
            actor.classList.remove('dragging');
            var moved = drag.moved;
            drag = null;
            if (!moved) return;
            var w = actor.offsetWidth, h = actor.offsetHeight;
            var feet = { x: parseFloat(actor.style.left) + w / 2, y: parseFloat(actor.style.top) + h * 0.95 };
            if (inArea(feet)) resolve(freeFeet(a.id, feet));
            else setFeet(actor, a.id, start);
          }
          function tapArea(e) {
            var p = S.toStage(e.clientX, e.clientY);
            if (!e.clientX && !e.clientY) p = { x: AREA.x + AREA.w / 2, y: AREA.y + AREA.h * 0.75 }; // keyboard
            resolve(freeFeet(a.id, p));
          }
          actor.addEventListener('pointerdown', down);
          actor.addEventListener('pointermove', move);
          actor.addEventListener('pointerup', up);
          actor.addEventListener('pointercancel', function () { drag = null; actor.classList.remove('dragging'); setFeet(actor, a.id, start); });
          area.addEventListener('click', tapArea);
          return function () {
            actor.removeEventListener('pointerdown', down);
            actor.removeEventListener('pointermove', move);
            actor.removeEventListener('pointerup', up);
            area.removeEventListener('click', tapArea);
          };
        });
      }).then(function (feet) {
        area.disabled = true;
        area.classList.remove('droppable', 'glow');
        S.setHint(null);
        actor.classList.remove('selected', 'farm-actor');
        actor.classList.add('placed', 'back');
        actor.tabIndex = -1;
        actor.setAttribute('aria-label', a.name);
        setFeet(actor, a.id, feet);
        positions[a.id] = feet;
        placed[a.id] = actor;
        st.hidden = true;
        EF.audio.sfx('pop');
        return EF.audio.animalSound(a.id);
      });
    }

    /* "Where is the duck?" – the child first touches it (listening), then says where it is. */
    /* Ask "Where is …?" only about an animal that really is under the tree or next to another one. */
    function whereIs(prefer, supported) {
      var cands = [prefer].concat(ORDER.filter(function (k) { return k !== prefer && placed[k]; }));
      var id = cands.filter(function (k) { return placed[k] && C.describePosition(k, positions, TREE); })[0];
      if (!id) return Promise.resolve();
      var a = C.getAnimal(id);
      var nodes = Object.keys(placed).map(function (k) { return placed[k]; });
      nodes.forEach(function (n) { n.tabIndex = 0; n.classList.add('tappable'); });
      S.setHint(function () { placed[id].classList.add('glow'); });
      function ask() {
        return run.say(P.touchIt(a)).then(function () {
          return run.until(function (resolve) {
            nodes.forEach(function (n) { n.onclick = function () { resolve(n); }; });
            return function () { nodes.forEach(function (n) { n.onclick = null; }); };
          });
        }).then(function (n) {
          if (n === placed[id]) return null;
          var other = Object.keys(placed).filter(function (k) { return placed[k] === n; })[0];
          EF.audio.animalSound(other);
          return run.say(P.thatsA(C.getAnimal(other))).then(ask);
        });
      }
      return ask().then(function () {
        nodes.forEach(function (n) { n.tabIndex = -1; n.classList.remove('tappable', 'glow'); });
        S.setHint(null);
        placed[id].classList.add('glow');
        return S.speakTurn(run, { prompt: P.whereIs(a), model: C.describePosition(id, positions, TREE), supported: supported });
      }).then(function () { placed[id].classList.remove('glow'); });
    }

    function bigOrSmall(id, supported) {
      var a = C.getAnimal(id);
      placed[id].classList.add('glow');
      return S.speakTurn(run, { prompt: 'Look at the ' + a.name + '. Is it big or small?', model: C.sizeSentence(a), supported: supported })
        .then(function () { placed[id].classList.remove('glow'); });
    }

    function addAnimal(id) {
      var a = C.getAnimal(id);
      return pickFromTray(a).then(function () { return putOnFarm(a); });
    }

    return run.wait(300)
      .then(function () { return run.say('This is your little farm! Let’s put the animals on it.'); })
      .then(function () { return run.say(P.findIt(C.getAnimal('cow'))); })
      .then(function () { return addAnimal('cow'); })
      .then(function () { return run.say(P.findIt(C.getAnimal('duck'))); })
      .then(function () { return addAnimal('duck'); })
      .then(function () { return S.speakTurn(run, { prompt: P.whatCanYouSee, model: C.canSee(C.getAnimal('duck')), supported: true }); })
      .then(function () { return run.say(P.findIt(C.getAnimal('horse'))); })
      .then(function () { return addAnimal('horse'); })
      .then(function () { return run.say(P.findIt(C.getAnimal('sheep'))); })
      .then(function () { return addAnimal('sheep'); })
      .then(function () { return whereIs('duck', true); })
      .then(function () { return run.say(P.findIt(C.getAnimal('pig'))); })
      .then(function () { return addAnimal('pig'); })
      .then(function () { return run.say(P.findIt(C.getAnimal('hen'))); })
      .then(function () { return addAnimal('hen'); })
      .then(function () { return bigOrSmall('horse', true); })
      .then(function () { return bigOrSmall('hen', false); })
      .then(function () { return whereIs('sheep', false); })
      .then(function () {
        saveFarm(positions);
        tray.hidden = true;
        Object.keys(placed).forEach(function (k, i) { placed[k].classList.add('dance'); placed[k].style.animationDelay = (i * 0.12) + 's'; });
        EF.audio.sfx('success');
        return S.speakTurn(run, { prompt: 'Look at your farm! Say: This is my farm.', model: 'This is my farm.', supported: true });
      })
      .then(function () { return S.speakTurn(run, { prompt: P.whatCanYouSee, model: C.canSee(C.getAnimal(C.pick(ORDER))), supported: false }); })
      .then(function () {
        api.progress.complete(api.mission.id);
        S.setBubble(P.star);
        EF.audio.say(P.star);
        return S.reward(run, { title: 'My little farm!' });
      });
  };
})(this);
