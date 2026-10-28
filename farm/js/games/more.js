/*
 * Missions 5–14 of The Enchanted Farm. Every round follows the same rhythm as Missions 1–4:
 * LISTEN (Pip) → ACT (touch) → SPEAK (S.speakTurn: the class first, then one child by name).
 * Small helpers at the top are shared by all missions; the review missions (7, 14) reuse the round
 * functions of the other missions.
 */
(function (root) {
  'use strict';
  var EF = root.EF;
  EF.games = EF.games || {};

  /* ---------- shared helpers ---------- */
  function C() { return EF.content; }
  function S() { return EF.stage; }
  function A() { return EF.art; }
  function seq(list, fn) { return list.reduce(function (p, x, i) { return p.then(function () { return fn(x, i); }); }, Promise.resolve()); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function reduce() { return document.documentElement.classList.contains('reduce-motion'); }

  function actor(api, id, x, y, w, cls) {
    var b = S().h('button', 'actor' + (cls ? ' ' + cls : ''), A().animal(id));
    b.type = 'button';
    b.tabIndex = -1;
    b.setAttribute('aria-label', C().getAnimal(id).name);
    b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.width = w + 'px';
    api.world().appendChild(b);
    return b;
  }
  /* Feet point → actor box (animal sprites are about 1.1 : 1). */
  function actorAtFeet(api, id, fx, fy, w, cls) { return actor(api, id, fx - w / 2, fy - (w / 1.1) * 0.95, w, cls); }
  function waitTap(run, nodes) {
    nodes.forEach(function (n) { n.tabIndex = 0; n.disabled = false; n.classList.add('tappable'); });
    return run.until(function (resolve) {
      nodes.forEach(function (n) { n.onclick = function () { resolve(n); }; });
      return function () { nodes.forEach(function (n) { n.onclick = null; }); };
    });
  }
  function untap(nodes) { nodes.forEach(function (n) { n.tabIndex = -1; n.classList.remove('tappable', 'glow'); }); }
  function bounce(node) { node.classList.remove('happy'); void node.offsetWidth; node.classList.add('happy'); }
  function glow(node) { node.classList.remove('glow'); void node.offsetWidth; node.classList.add('glow'); }
  function finish(run, api, title) {
    var P = C().PHRASES;
    api.progress.complete(api.mission.id);
    S().setBubble(P.star);
    EF.audio.say(P.star);
    return S().reward(run, { title: title || 'Magic star!' });
  }
  function clearItems(api) { Array.prototype.slice.call(api.world().querySelectorAll('.m-item')).forEach(function (n) { n.remove(); }); }
  function moveTo(run, node, x, y, ms) {
    node.style.transitionDuration = (reduce() ? 0 : ms) + 'ms';
    node.style.left = x + 'px'; node.style.top = y + 'px';
    return run.wait(reduce() ? 50 : ms);
  }

  /* Spread n feet points over an area without overlap (rows with a little jitter). */
  function spread(n, box, w) {
    var cols = Math.min(n, Math.max(3, Math.ceil(n / 2))), rows = Math.ceil(n / cols), pts = [];
    for (var i = 0; i < n; i++) {
      var r = Math.floor(i / cols), c = i % cols, inRow = r === rows - 1 ? n - r * cols : cols;
      var gx = box.w / inRow, gy = rows > 1 ? box.h / (rows - 1) : 0;
      pts.push({ x: Math.round(box.x + gx * (c + 0.5) + (Math.random() - 0.5) * gx * 0.25), y: Math.round(box.y + gy * r + (Math.random() - 0.5) * 18) });
    }
    return pts;
  }

  /* ======================= Mission 5 – Counting Meadow ======================= */
  /* "count": the child touches every animal (numbers appear, Pip counts), then says "Eight ducks."
     "give":  more animals than needed; "Touch seven hens!" – the child stops at the right number. */
  function countRound(run, api, r) {
    var a = C().getAnimal(r.id), n = r.n, total = r.type === 'give' ? Math.min(12, n + 3) : n;
    var w = a.size === 'big' ? 140 : 125;
    var pts = spread(total, { x: 330, y: 330, w: 1180, h: 280 }, w);
    var nodes = pts.map(function (p) {
      var b = actorAtFeet(api, a.id, p.x, p.y, w, 'm-item pop-in count-actor');
      b.style.zIndex = String(10 + Math.round(p.y / 10));
      return b;
    });
    var counted = 0, badgeFor = function (node, k) {
      var s = S().h('span', 'count-badge', String(k));
      node.appendChild(s);
    };
    var line = r.type === 'give' ? 'Touch ' + C().NUMBERS[n] + ' ' + a.plural + '!' : "How many " + a.plural + "? Let's count!";
    S().setHint(function () {
      var left = nodes.filter(function (x) { return !x.classList.contains('counted'); });
      if (left[0]) glow(left[0]);
    });
    return run.say(line).then(function () {
      return run.until(function (resolve) {
        nodes.forEach(function (node) {
          node.tabIndex = 0; node.classList.add('tappable');
          node.onclick = function () {
            if (node.classList.contains('counted') || counted >= n) return;
            counted++;
            node.classList.add('counted'); node.classList.remove('tappable', 'glow');
            badgeFor(node, counted);
            bounce(node);
            EF.audio.say(cap(C().NUMBERS[counted]) + '!');
            if (counted >= n) setTimeout(function () { resolve(); }, 650);
          };
        });
        return function () { nodes.forEach(function (x) { x.onclick = null; x.classList.remove('tappable'); }); };
      });
    }).then(function () {
      S().setHint(null);
      nodes.forEach(function (x) { if (!x.classList.contains('counted')) x.classList.add('fade-out'); });
      EF.audio.sfx('success');
      return run.say(C().countSentence(n, a));
    }).then(function () {
      return S().speakTurn(run, { prompt: 'How many ' + a.plural + '?', model: C().countSentence(n, a), supported: !!r.supported });
    }).then(function () { clearItems(api); });
  }

  EF.games.counting = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'meadow' });
    api.pieceAt('flowers', 60, 560, 200);
    var ids = C().shuffle(['duck', 'hen', 'sheep', 'pig']);
    var ns = C().shuffle([7, 8, 9]);
    var rounds = [
      { type: 'count', n: 7, id: ids[0], supported: true },
      { type: 'give', n: ns[0], id: ids[1] },
      { type: 'count', n: ns[1], id: ids[2] },
      { type: 'give', n: ns[2], id: ids[3] },
      { type: 'count', n: 9, id: ids[0] }
    ];
    return run.wait(300)
      .then(function () { return run.say("Let's count the animals!"); })
      .then(function () { return seq(rounds, function (r) { return countRound(run, api, r); }); })
      .then(function () { return finish(run, api, 'Super counting!'); });
  };

  /* ======================= Mission 6 – Rainbow Farm ======================= */
  var POTS = [
    { c: 'black', css: 'background:#262626' },
    { c: 'white', css: 'background:#ffffff' },
    { c: 'black and white', css: 'background:linear-gradient(90deg,#262626 0 50%,#ffffff 50%)' },
    { c: 'pink', css: 'background:#ff8fb3' },
    { c: 'brown', css: 'background:#8b5a2b' }
  ];
  function makePots(api) {
    var row = S().h('div', 'paint-row m-item');
    var pots = POTS.map(function (p) {
      var b = S().h('button', 'paint-pot', '<span class="paint" style="' + p.css + '"></span>');
      b.type = 'button';
      b.setAttribute('aria-label', p.c);
      b.dataset.c = p.c;
      b.disabled = true;
      row.appendChild(b);
      return b;
    });
    api.world().appendChild(row);
    return pots;
  }
  /* The animal has lost its colour: say the colour, then paint it with the right pot. */
  function colourRound(run, api, id, supported, pots, x, y, w) {
    var a = C().getAnimal(id), col = C().COLOURS[id];
    var node = actor(api, id, x == null ? 630 : x, y == null ? 240 : y, w || 340, 'm-item pop-in colourless');
    return S().speakTurn(run, { prompt: 'What colour is the ' + a.name + '?', model: C().colourSentence(a), supported: supported })
      .then(function () {
        var good = pots.filter(function (p) { return p.dataset.c === col; })[0];
        S().setHint(function () { glow(good); S().speak(C().colourSentence(a)); });
        function ask() {
          return run.say('Paint the ' + a.name + '!').then(function () { return waitTap(run, pots); }).then(function (p) {
            if (p === good) return null;
            EF.audio.sfx('soft');
            p.classList.add('wrong-pot'); setTimeout(function () { p.classList.remove('wrong-pot'); }, 500);
            return run.say('Not this colour! Try again!').then(ask);
          });
        }
        return ask();
      })
      .then(function () {
        untap(pots); pots.forEach(function (p) { p.disabled = true; });
        S().setHint(null);
        node.classList.remove('colourless'); node.classList.add('painted');
        EF.audio.sfx('sparkle');
        bounce(node);
        return EF.audio.animalSound(id).then(function () { return run.say(C().colourSentence(a)); });
      })
      .then(function () { return node; });
  }

  EF.games.rainbow = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'farm' });
    var stage = S().el().stage;
    stage.classList.add('rescue-dim');
    var pots = makePots(api);
    var order = ['sheep'].concat(C().shuffle(['cow', 'duck', 'pig', 'horse', 'hen']));
    var done = [];
    return run.wait(300)
      .then(function () { return run.say('Oh no! The animals have no colour! Can you help?'); })
      .then(function () {
        return seq(order, function (id, i) {
          return colourRound(run, api, id, i === 0, pots).then(function (node) {
            node.classList.remove('pop-in');
            node.style.width = '86px';
            return moveTo(run, node, 1010 + done.length * 92, 600, 700).then(function () { done.push(node); });
          });
        });
      })
      .then(function () {
        stage.classList.remove('rescue-dim'); stage.classList.add('lights-on');
        api.pieceAt('rainbow', 560, 30, 480, 'bloom m-item');
        done.forEach(function (n, k) { n.classList.add('dance'); n.style.animationDelay = (k * 0.12) + 's'; });
        EF.audio.sfx('star');
        return run.say('Look! A rainbow! The farm has colours again!');
      })
      .then(function () { return finish(run, api, 'Rainbow Farm!'); });
  };

  /* ======================= Mission 8 – Big and Small ======================= */
  EF.games.bigsmall = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'meadow' });
    var world = api.world();
    function box(cls, x, y, w, h, label) {
      var b = S().h('button', 'size-box ' + cls + ' m-keep');
      b.type = 'button'; b.disabled = true;
      b.setAttribute('aria-label', label);
      b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.width = w + 'px'; b.style.height = h + 'px';
      world.appendChild(b);
      return b;
    }
    var bigBox = box('box-big', 330, 360, 420, 300, 'Big box');
    var smallBox = box('box-small', 1080, 470, 230, 190, 'Small box');
    var inBig = 0, inSmall = 0;
    var order = C().shuffle(C().ANIMALS.map(function (a) { return a.id; }));
    // Start with one big and one small animal, so the first two show the difference.
    var first = order.filter(function (id) { return C().getAnimal(id).size === 'big'; })[0];
    var second = order.filter(function (id) { return C().getAnimal(id).size === 'small'; })[0];
    order = [first, second].concat(order.filter(function (id) { return id !== first && id !== second; }));

    function round(id, i) {
      var a = C().getAnimal(id), f = C().FACTS[id], big = a.size === 'big';
      var node = actor(api, id, 820, 120, big ? 280 : 190, 'm-item pop-in');
      var right = big ? bigBox : smallBox;
      return S().speakTurn(run, { prompt: 'Look at the ' + a.name + '. Is it big or small?', model: C().sizeSentence(a), supported: i < 2 })
        .then(function () {
          S().setHint(function () { glow(right); });
          function ask() {
            return run.say('Big box or small box? Touch it!').then(function () { return waitTap(run, [bigBox, smallBox]); }).then(function (b) {
              if (b === right) return null;
              EF.audio.sfx('soft');
              return run.say('Hmm, not here. Try again!').then(ask);
            });
          }
          return ask();
        })
        .then(function () {
          untap([bigBox, smallBox]); bigBox.disabled = smallBox.disabled = true; S().setHint(null);
          EF.audio.sfx('pop');
          var k = big ? inBig++ : inSmall++;
          node.classList.remove('pop-in');
          node.style.width = big ? '150px' : '90px';
          var tx = big ? 360 + k * 130 : 1100 + k * 70, ty = big ? 450 : 540;
          return moveTo(run, node, tx, ty, 700);
        })
        .then(function () {
          node.classList.add('in-box');
          if (i % 2 === 1) return null;
          if (f.legs) return S().speakTurn(run, { prompt: 'Look at the ' + a.name + '. How many legs?', model: 'It has got four legs.', supported: false });
          if (f.eyes) return S().speakTurn(run, { prompt: 'Look at the ' + a.name + '. Look at its eyes!', model: 'It has got big eyes.', supported: false });
          return null;
        });
    }
    return run.wait(300)
      .then(function () { return run.say('Big animals in the big box. Small animals in the small box!'); })
      .then(function () { return seq(order, round); })
      .then(function () { EF.audio.sfx('success'); return run.say('Well done! Big and small!'); })
      .then(function () { return finish(run, api, 'Big and small!'); });
  };

  /* ======================= Mission 9 – On the Farm (story) ======================= */
  var TREE = { x: 300, y: 130, w: 230, h: 287 };
  var STORY = [
    { lines: ['Look! This is the farm.', 'I can see a cow.'], touch: 'cow',
      set: function (api) { api.pieceAt('barn', 980, 120, 330, 'm-item'); return { cow: actorAtFeet(api, 'cow', 820, 560, 300, 'm-item pop-in') }; } },
    { lines: ['Where is the duck?', "It's under the tree."], touch: 'duck', speak: { prompt: 'Where is the duck?', model: "It's under the tree." },
      set: function (api) { api.pieceAt('tree', TREE.x, TREE.y, TREE.w, 'm-item farm-tree'); return { duck: actorAtFeet(api, 'duck', 420, 470, 170, 'm-item pop-in'), sheep: actorAtFeet(api, 'sheep', 1150, 560, 200, 'm-item pop-in') }; } },
    { lines: ['The pig is next to the horse.'], touch: 'pig', speak: { prompt: 'Where is the pig?', model: "It's next to the horse." },
      set: function (api) { return { horse: actorAtFeet(api, 'horse', 760, 560, 300, 'm-item pop-in'), pig: actorAtFeet(api, 'pig', 1010, 580, 200, 'm-item pop-in') }; } },
    { lines: ['Look! Hens!'], count: { id: 'hen', n: 7 } },
    { lines: ['The sheep is white.', 'The cow is black and white.'], touch: 'sheep', speak: { prompt: 'What colour is the sheep?', model: "It's white." },
      set: function (api) { return { sheep: actorAtFeet(api, 'sheep', 620, 560, 260, 'm-item pop-in'), cow: actorAtFeet(api, 'cow', 1000, 560, 300, 'm-item pop-in') }; } },
    { lines: ['The animals are happy.', 'Thank you, animals!'], finale: true }
  ];
  EF.games.story = function (run, api) {
    function page(pg, i) {
      clearItems(api);
      api.bg().innerHTML = A().landscape({ paint: i % 2 ? 'farm' : 'meadow' });
      var nodes = pg.set ? pg.set(api) : {};
      var flow = run.wait(400).then(function () { return seq(pg.lines, function (l) { return run.say(l); }); });
      if (pg.count) {
        var a = C().getAnimal(pg.count.id);
        var pts = spread(pg.count.n, { x: 380, y: 360, w: 1080, h: 240 }, 120);
        var hens = pts.map(function (p) { return actorAtFeet(api, a.id, p.x, p.y, 120, 'm-item pop-in count-actor'); });
        flow = flow.then(function () { return run.say("How many hens? Let's count!"); }).then(function () {
          return seq(hens, function (h, k) {
            h.appendChild(S().h('span', 'count-badge', String(k + 1))); bounce(h);
            return run.say(cap(C().NUMBERS[k + 1]) + '!');
          });
        }).then(function () { return run.say(C().countSentence(pg.count.n, a)); })
          .then(function () { return S().speakTurn(run, { prompt: 'How many hens?', model: C().countSentence(pg.count.n, a), supported: true }); });
      }
      if (pg.touch) {
        flow = flow.then(function () {
          var t = nodes[pg.touch], all = Object.keys(nodes).map(function (k) { return nodes[k]; });
          S().setHint(function () { glow(t); });
          function ask() {
            return run.say(C().PHRASES.touchIt(C().getAnimal(pg.touch))).then(function () { return waitTap(run, all); }).then(function (n) {
              if (n === t) return null;
              var other = Object.keys(nodes).filter(function (k) { return nodes[k] === n; })[0];
              EF.audio.animalSound(other);
              return run.say(C().PHRASES.thatsA(C().getAnimal(other))).then(ask);
            });
          }
          return ask().then(function () { untap(all); S().setHint(null); bounce(t); return EF.audio.animalSound(pg.touch); });
        });
      }
      if (pg.speak) flow = flow.then(function () { return S().speakTurn(run, { prompt: pg.speak.prompt, model: pg.speak.model, supported: true }); });
      if (pg.finale) {
        flow = run.wait(300).then(function () {
          var row = C().ANIMALS.map(function (a, k) { return actor(api, a.id, 230 + k * 200, 300, 210, 'm-item dance'); });
          row.forEach(function (n, k) { n.style.animationDelay = (k * 0.12) + 's'; });
          EF.audio.sfx('success');
          return seq(pg.lines, function (l) { return run.say(l); });
        });
      }
      return flow.then(function () { EF.audio.sfx('whoosh'); });
    }
    return run.wait(300)
      .then(function () { return run.say('Listen to my story! On the farm.'); })
      .then(function () { return seq(STORY, page); })
      .then(function () { return finish(run, api, 'The end!'); });
  };

  /* ======================= Mission 10 – Story Detective ======================= */
  /* Small picture cards drawn from the story; Pip says a story sentence, the child finds the card and says it. */
  var CARDS = [
    { s: 'I can see a cow.', items: [['barn', 'piece', 52, 8, 44], ['cow', 'animal', 18, 34, 46]] },
    { s: 'The duck is under the tree.', items: [['tree', 'piece', 22, 2, 44], ['duck', 'animal', 30, 52, 26], ['sheep', 'animal', 70, 52, 26]] },
    { s: 'The pig is next to the horse.', items: [['horse', 'animal', 18, 30, 44], ['pig', 'animal', 58, 46, 32]] },
    { s: 'Seven hens.', hens: 7 },
    { s: 'The sheep is white.', items: [['sheep', 'animal', 30, 30, 44]] }
  ];
  function cardHTML(c) {
    var s = '<span class="pcard-bg"></span>';
    if (c.hens) {
      for (var i = 0; i < c.hens; i++) s += '<span class="pcard-item" style="left:' + (6 + (i % 4) * 22) + '%;top:' + (i < 4 ? 24 : 56) + '%;width:20%">' + A().animal('hen') + '</span>';
      return s;
    }
    c.items.forEach(function (it) {
      s += '<span class="pcard-item" style="left:' + it[2] + '%;top:' + it[3] + '%;width:' + it[4] + '%">' + (it[1] === 'piece' ? A().piece(it[0]) : A().animal(it[0])) + '</span>';
    });
    return s;
  }
  EF.games.detective = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'meadow' });
    var order = C().shuffle(CARDS.slice());
    var found = [];
    function round(card) {
      var others = C().shuffle(CARDS.filter(function (c) { return c !== card; })).slice(0, 2);
      var shown = C().shuffle([card].concat(others));
      var xs = [330, 720, 1110];
      var nodes = shown.map(function (c, k) {
        var b = S().h('button', 'pcard m-item pop-in', cardHTML(c));
        b.type = 'button';
        b.setAttribute('aria-label', c.s);
        b.style.left = xs[k] + 'px'; b.style.top = '200px';
        api.world().appendChild(b);
        return b;
      });
      var good = nodes[shown.indexOf(card)];
      S().setHint(function () { glow(good); S().speak(card.s); });
      function ask() {
        return run.say(card.s).then(function () { return run.say('Find the picture!'); }).then(function () { return waitTap(run, nodes); }).then(function (n) {
          if (n === good) return null;
          EF.audio.sfx('soft');
          return run.say('Hmm, not this one. Listen again!').then(ask);
        });
      }
      return ask().then(function () {
        untap(nodes); S().setHint(null);
        nodes.forEach(function (n) { if (n !== good) n.classList.add('fade-out'); });
        good.classList.add('picked');
        EF.audio.sfx('success');
        return S().speakTurn(run, { repeat: true, model: card.s });
      }).then(function () { found.push(card); clearItems(api); });
    }
    return run.wait(300)
      .then(function () { return run.say('Story detective! Listen and find the picture.'); })
      .then(function () { return seq(order, round); })
      .then(function () { return finish(run, api, 'Story detective!'); });
  };

  /* ======================= Mission 11 – My Favourite Animal ======================= */
  EF.games.favourite = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'meadow' });
    var ids = C().ANIMALS.map(function (a) { return a.id; });
    var cards = ids.map(function (id, k) {
      var b = actor(api, id, 300 + (k % 3) * 330, k < 3 ? 140 : 400, 230, 'm-item pop-in fav-card');
      return b;
    });
    var chosen;
    return run.wait(300)
      .then(function () { return run.say('Choose your favourite animal!'); })
      .then(function () { return waitTap(run, cards); })
      .then(function (b) {
        untap(cards);
        chosen = ids[cards.indexOf(b)];
        cards.forEach(function (c) { if (c !== b) c.classList.add('fade-out'); });
        EF.audio.animalSound(chosen);
        var frame = S().h('div', 'fav-frame m-item');
        api.world().appendChild(frame);
        b.classList.remove('pop-in', 'fav-card');
        b.style.zIndex = '12';
        return moveTo(run, b, 640, 210, 700);
      })
      .then(function () {
        var a = C().getAnimal(chosen), f = C().FACTS[chosen];
        var qs = [
          { prompt: C().PHRASES.whatCanYouSee, model: C().canSee(a), supported: true },
          { prompt: 'What colour is it?', model: C().colourSentence(a) },
          { prompt: 'Is it big or small?', model: C().sizeSentence(a) }
        ];
        if (f.legs) qs.push({ prompt: 'How many legs?', model: 'It has got four legs.' });
        else if (f.eyes) qs.push({ prompt: 'Look at its eyes!', model: 'It has got big eyes.' });
        var all = qs.map(function (q) { return q.model; }).join(' ');
        qs.push({ prompt: 'Tell me about your animal!', model: all });
        return seq(qs, function (q) { return S().speakTurn(run, { prompt: q.prompt, model: q.model, supported: !!q.supported }); });
      })
      .then(function () { EF.audio.sfx('success'); return run.say('What a beautiful picture!'); })
      .then(function () { return finish(run, api, 'My favourite animal!'); });
  };

  /* ======================= Mission 12 – Caring for Animals ======================= */
  EF.games.caring = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'farm' });
    var world = api.world();
    var CARE = C().CARE;
    function tool(kind, x) {
      var html = kind === 'heart' ? '<span class="care-heart"></span>' : A().piece(kind);
      var b = S().h('button', 'care-tool tool-' + kind + ' m-keep', html);
      b.type = 'button'; b.disabled = true;
      b.setAttribute('aria-label', kind === 'hay' ? 'Food' : kind === 'brush' ? 'Brush' : 'Love');
      b.style.left = x + 'px';
      world.appendChild(b);
      return b;
    }
    var tools = { feed: tool('hay', 470), brush: tool('brush', 720), kind: tool('heart', 970) };
    var list = [tools.feed, tools.brush, tools.kind];
    var ids = C().shuffle(C().ANIMALS.map(function (a) { return a.id; }));
    var acts = ['feed', 'brush', 'kind', 'feed', 'brush', 'kind'];
    var practised = {};
    function round(id, i) {
      var a = C().getAnimal(id), act = acts[i], care = CARE[act];
      var node = actor(api, id, 640, 250, a.size === 'big' ? 320 : 240, 'm-item pop-in sad');
      S().setHint(function () { glow(tools[act]); });
      function ask() {
        return run.say(care.say(a)).then(function () { return waitTap(run, list); }).then(function (b) {
          if (b === tools[act]) return null;
          EF.audio.sfx('soft');
          return run.say('Hmm, not this one. Try again!').then(ask);
        });
      }
      return ask().then(function () {
        untap(list); list.forEach(function (b) { b.disabled = true; }); S().setHint(null);
        var fx = S().h('span', 'care-fx care-fx-' + act + ' m-item');
        fx.style.left = (parseFloat(node.style.left) + parseFloat(node.style.width) / 2 - 60) + 'px';
        fx.style.top = (parseFloat(node.style.top) + 40) + 'px';
        world.appendChild(fx);
        node.classList.remove('sad'); node.classList.add('cared');
        bounce(node);
        EF.audio.sfx('sparkle');
        return EF.audio.animalSound(id);
      }).then(function () { return run.say(C().pick(C().PHRASES.thankYou)); })
        .then(function () {
          var first = !practised[act]; practised[act] = true;
          return S().speakTurn(run, { prompt: 'What do you do?', model: care.model, supported: first });
        })
        .then(function () { clearItems(api); });
    }
    return run.wait(300)
      .then(function () { return run.say('The animals are sad. Let’s help them!'); })
      .then(function () { return seq(ids, round); })
      .then(function () { EF.audio.sfx('success'); return run.say('Happy animals! Thank you!'); })
      .then(function () { return finish(run, api, 'Happy animals!'); });
  };

  /* ======================= Mission 13 – The Mystery Barn ======================= */
  var SPOTS13 = { hen: { x: 420, y: 470 }, duck: { x: 1240, y: 600 }, sheep: { x: 1420, y: 600 }, cow: { x: 760, y: 640 }, horse: { x: 1000, y: 640 }, pig: { x: 1250, y: 400 } };
  EF.games.mystery = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'farm' });
    api.pieceAt('tree', TREE.x, TREE.y, TREE.w, 'farm-tree');
    var barnWrap = S().h('button', 'mystery-barn', A().piece('barn'));
    barnWrap.type = 'button'; barnWrap.disabled = true;
    barnWrap.setAttribute('aria-label', 'Open the barn');
    api.world().appendChild(barnWrap);
    var order = C().shuffle(C().ANIMALS.map(function (a) { return a.id; }));
    var positions = {};
    var placed = {};
    function round(id, i) {
      var a = C().getAnimal(id);
      barnWrap.classList.remove('barn-open');
      return run.wait(400)
        .then(function () { return EF.audio.animalSound(id); })
        .then(function () { return run.wait(250); })
        .then(function () { return EF.audio.animalSound(id); })
        .then(function () { return S().speakTurn(run, { prompt: 'Listen! Who is in the barn?', model: C().PHRASES.itsA(a), supported: i === 0 }); })
        .then(function () {
          S().setHint(function () { glow(barnWrap); });
          return run.say('Open the doors!').then(function () { return waitTap(run, [barnWrap]); });
        })
        .then(function () {
          untap([barnWrap]); barnWrap.disabled = true; S().setHint(null);
          barnWrap.classList.add('barn-open');
          EF.audio.sfx('whoosh');
          var node = actorAtFeet(api, id, 800, 520, a.size === 'big' ? 230 : 170, 'pop-in');
          placed[id] = node;
          return run.say(C().PHRASES.itsA(a) + ' ' + C().canSee(a)).then(function () {
            var p = SPOTS13[id];
            positions[id] = p;
            node.classList.remove('pop-in'); node.classList.add('walking');
            var w = parseFloat(node.style.width);
            node.style.zIndex = String(10 + Math.round(p.y / 10));
            return moveTo(run, node, p.x - w / 2, p.y - (w / 1.1) * 0.95, 1100);
          }).then(function () { node.classList.remove('walking'); });
        });
    }
    function whereRound(id) {
      var a = C().getAnimal(id), model = C().describePosition(id, positions, TREE);
      if (!model) return null;
      glow(placed[id]);
      return S().speakTurn(run, { prompt: C().PHRASES.whereIs(a), model: model, supported: false }).then(function () { placed[id].classList.remove('glow'); });
    }
    return run.wait(300)
      .then(function () { return run.say('Somebody is in the mystery barn! Listen!'); })
      .then(function () { return seq(order, round); })
      .then(function () { barnWrap.classList.remove('barn-open'); return run.say('All the animals are out! Look!'); })
      .then(function () { return whereRound('hen'); })
      .then(function () { return whereRound('duck'); })
      .then(function () { return finish(run, api, 'Mystery solved!'); });
  };

  /* ======================= Mission 7 – Little Farm Speaker (week 1 review) ======================= */
  function peekReview(run, api) {
    var id = C().pick(C().ANIMALS).id, a = C().getAnimal(id);
    var hide = S().h('div', 'peek-wrap m-item');
    hide.innerHTML = '<div class="peeker">' + A().animal(id, 'peeking') + '</div><button type="button" class="peek-bush" aria-label="Look behind the bush">' + A().piece('bush') + '</button>';
    hide.style.left = '520px'; hide.style.top = '200px';
    api.world().appendChild(hide);
    var bush = hide.querySelector('.peek-bush'), peeker = hide.querySelector('.peeker');
    EF.audio.animalSound(id);
    return run.wait(900)
      .then(function () { return S().speakTurn(run, { prompt: C().PHRASES.whoIsIt, model: C().canSee(a), supported: false }); })
      .then(function () { S().setHint(function () { glow(bush); }); return run.say('Touch the bush!'); })
      .then(function () { return waitTap(run, [bush]); })
      .then(function () { untap([bush]); S().setHint(null); peeker.classList.add('revealed'); EF.audio.sfx('whoosh'); return run.wait(500); })
      .then(function () { return run.say(C().PHRASES.itsA(a)); })
      .then(function () { clearItems(api); });
  }
  function whereReview(run, api) {
    api.pieceAt('tree', TREE.x, TREE.y, TREE.w, 'm-item farm-tree');
    var ids = C().shuffle(C().ANIMALS.map(function (a) { return a.id; })).slice(0, 3);
    var feet = [{ x: 430, y: 480 }, { x: 900, y: 600 }, { x: 1120, y: 600 }];
    var positions = {}, nodes = {};
    ids.forEach(function (id, k) { positions[id] = feet[k]; nodes[id] = actorAtFeet(api, id, feet[k].x, feet[k].y, C().getAnimal(id).size === 'big' ? 230 : 165, 'm-item pop-in'); });
    var id = ids[0], a = C().getAnimal(id);
    glow(nodes[id]);
    return S().speakTurn(run, { prompt: C().PHRASES.whereIs(a), model: C().describePosition(id, positions, TREE), supported: false })
      .then(function () {
        var id2 = ids[1];
        nodes[id].classList.remove('glow'); glow(nodes[id2]);
        return S().speakTurn(run, { prompt: C().PHRASES.whereIs(C().getAnimal(id2)), model: C().describePosition(id2, positions, TREE), supported: false });
      })
      .then(function () { clearItems(api); });
  }
  EF.games.review = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'meadow' });
    var pots;
    var smalls = C().shuffle(['duck', 'hen', 'sheep', 'pig']);
    return run.wait(300)
      .then(function () { return run.say("Let's play! Show me what you know!"); })
      .then(function () { return peekReview(run, api); })
      .then(function () { return countRound(run, api, { type: 'count', n: C().pick([7, 8, 9]), id: smalls[0] }); })
      .then(function () { pots = makePots(api); return colourRound(run, api, C().pick(['cow', 'sheep', 'duck']), false, pots); })
      .then(function () { clearItems(api); return whereReview(run, api); })
      .then(function () { return countRound(run, api, { type: 'give', n: C().pick([7, 8, 9]), id: smalls[1] }); })
      .then(function () { return finish(run, api, 'Little Farm Speaker!'); });
  };

  /* ======================= Mission 14 – The Great Farm Festival ======================= */
  EF.games.festival = function (run, api) {
    var stage = S().el().stage;
    api.bg().innerHTML = A().landscape({ paint: 'welcome' });
    function decor() {
      api.pieceAt('tent', 190, 150, 260, 'back m-item');
      api.pieceAt('rainbow', 1190, 170, 330, 'bloom m-item');
    }
    decor();
    var row = [];
    var smalls = C().shuffle(['duck', 'hen', 'sheep', 'pig']);
    function parade() {
      return seq(C().ANIMALS, function (a, k) {
        var n = actor(api, a.id, 1700, 520, 170, 'walking m-item parade-actor');
        row.push(n);
        return run.wait(30).then(function () { return moveTo(run, n, 240 + k * 190, 470, 900); }).then(function () {
          n.classList.remove('walking'); n.classList.add('dance'); n.style.animationDelay = (k * 0.1) + 's';
          return run.say(C().canSee(a));
        });
      });
    }
    return run.wait(300)
      .then(function () { stage.classList.add('lights-on'); return run.say('Welcome to the Great Farm Festival!'); })
      .then(parade)
      .then(function () { return S().speakTurn(run, { prompt: C().PHRASES.whatCanYouSee, model: C().canSee(C().pick(C().ANIMALS)), supported: false }); })
      .then(function () { clearItems(api); row = []; return countRound(run, api, { type: 'count', n: C().pick([7, 8, 9]), id: smalls[0] }); })
      .then(function () { var pots = makePots(api); return colourRound(run, api, C().pick(['cow', 'pig', 'sheep', 'horse']), false, pots); })
      .then(function () {
        clearItems(api);
        var id = C().pick(C().ANIMALS).id, a = C().getAnimal(id);
        var n = actor(api, id, 640, 160, a.size === 'big' ? 320 : 230, 'm-item pop-in');
        return S().speakTurn(run, { prompt: 'Look at the ' + a.name + '. Is it big or small?', model: C().sizeSentence(a), supported: false }).then(function () { n.remove(); });
      })
      .then(function () { return whereReview(run, api); })
      .then(function () {
        // Farm Explorer certificate
        clearItems(api); decor();
        var cert = S().h('div', 'certificate m-item', '<div class="cert-star">' + S().ICONS.star + '</div><div class="cert-title">Farm Explorer</div><div class="cert-pip">' + A().pip() + '</div>');
        api.world().appendChild(cert);
        C().ANIMALS.forEach(function (a, k) { var n = actor(api, a.id, 200 + k * 205, 600, 150, 'm-item dance'); n.style.animationDelay = (k * 0.1) + 's'; });
        EF.audio.sfx('star');
        return run.say('Congratulations! You are a Farm Explorer!');
      })
      .then(function () { return run.say('The lights are back! Thank you, Farm Explorer!'); })
      .then(function () { return finish(run, api, 'Farm Explorer!'); });
  };

  EF.more = { spread: spread, countRound: countRound, colourRound: colourRound };
})(this);
