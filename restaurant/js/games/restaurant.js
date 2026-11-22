/*
 * The twelve missions of Momo's Little Restaurant. Same rhythm as the farm:
 * LISTEN (Momo) → ACT (touch) → SPEAK (S.speakTurn: the class first, then one child by name in Classroom mode).
 * Stage is 1600 × 900. Momo stands bottom-left with the speech bubble; the speaking panel sits bottom-centre,
 * so playable things stay above y ≈ 640 while a speaking turn is open.
 */
(function (root) {
  'use strict';
  var EF = root.EF;
  EF.games = EF.games || {};

  function C() { return EF.content; }
  function S() { return EF.stage; }
  function A() { return EF.art; }
  function P() { return EF.content.PHRASES; }
  function seq(list, fn) { return list.reduce(function (p, x, i) { return p.then(function () { return fn(x, i); }); }, Promise.resolve()); }
  function reduce() { return document.documentElement.classList.contains('reduce-motion'); }

  /* ---------- building blocks ---------- */
  function foodBtn(api, id, x, y, w, cls) {
    var b = S().h('button', 'actor food-actor m-item' + (cls ? ' ' + cls : ''), A().food(id));
    b.type = 'button'; b.tabIndex = -1;
    var f = C().getFood(id);
    b.setAttribute('aria-label', f ? f.word : id);
    b.dataset.id = id;
    b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.width = w + 'px';
    api.world().appendChild(b);
    return b;
  }
  /* Customer standing by the table: x = left, bottom = feet line. Height ≈ 3.06 × width. */
  function customer(api, id, x, bottom, w, cls) {
    var d = S().h('div', 'actor customer m-item' + (cls ? ' ' + cls : ''), A().person(id));
    d.style.left = x + 'px'; d.style.top = (bottom - w * 3.06) + 'px'; d.style.width = w + 'px';
    api.world().appendChild(d);
    return d;
  }
  /* Thought bubble with food pictures next to a customer. */
  function thought(api, ids, x, y) {
    var t = S().h('div', 'thought m-item pop-in');
    ids.forEach(function (id) { t.insertAdjacentHTML('beforeend', '<span class="thought-food">' + A().food(id) + '</span>'); });
    t.style.left = x + 'px'; t.style.top = y + 'px';
    api.world().appendChild(t);
    return t;
  }
  function waitTap(run, nodes) {
    nodes.forEach(function (n) { n.tabIndex = 0; n.disabled = false; n.classList.add('tappable'); });
    return run.until(function (resolve) {
      nodes.forEach(function (n) { n.onclick = function () { resolve(n); }; });
      return function () { nodes.forEach(function (n) { n.onclick = null; }); };
    });
  }
  function untap(nodes) { nodes.forEach(function (n) { n.tabIndex = -1; n.classList.remove('tappable', 'glow'); }); }
  function bounce(n) { n.classList.remove('happy'); void n.offsetWidth; n.classList.add('happy'); }
  function glow(n) { n.classList.remove('glow'); void n.offsetWidth; n.classList.add('glow'); }
  function clearItems(api) { Array.prototype.slice.call(api.world().querySelectorAll('.m-item')).forEach(function (n) { n.remove(); }); }
  function moveTo(run, node, x, y, ms, w) {
    node.style.transitionDuration = (reduce() ? 0 : ms) + 'ms';
    node.style.left = x + 'px'; node.style.top = y + 'px';
    if (w) node.style.width = w + 'px';
    return run.wait(reduce() ? 50 : ms);
  }
  function finish(run, api, title) {
    api.progress.complete(api.mission.id);
    S().pipMood('happy');
    S().setBubble(P().star);
    EF.audio.say(P().star);
    return S().reward(run, { title: title || 'Golden star!' });
  }
  /* Ask until the right node is touched. wrongLine(node) may return a sentence for a wrong choice. */
  function askTouch(run, line, nodes, good, wrongLine) {
    S().setHint(function () { glow(good); });
    function ask() {
      return run.say(line).then(function () { return waitTap(run, nodes); }).then(function (n) {
        if (n === good) return null;
        EF.audio.sfx('soft');
        n.classList.remove('wrong'); void n.offsetWidth; n.classList.add('wrong');
        return run.say((wrongLine && wrongLine(n)) || P().notHere).then(ask);
      });
    }
    return ask().then(function () { untap(nodes); S().setHint(null); bounce(good); EF.audio.sfx('pop'); return good; });
  }
  function customerSays(run, who, text) { return run.say(text, { voice: C().getCustomer(who).voice }); }
  function taste(run, line) {
    S().pipMood('tasting');
    EF.audio.sfx('sparkle');
    return run.wait(900).then(function () { return run.say(line); }).then(function () { S().pipMood(null); });
  }

  /* ======================= 1 – Meet the Menu ======================= */
  EF.games.menu = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'table' });
    var ids = C().FOODS.map(function (f) { return f.id; });
    var spots = [[330, 170], [560, 170], [790, 170], [1020, 170], [1250, 170], [445, 400], [675, 400], [905, 400], [1135, 400]];
    var nodes = {};
    function intro(id, i) {
      var n = foodBtn(api, id, spots[i][0], spots[i][1], 200, 'pop-in');
      nodes[id] = n;
      return run.wait(250).then(function () { bounce(n); return S().speakTurn(run, { repeat: true, model: C().wordSentence(id) }); });
    }
    function touchRound(id) {
      var others = C().shuffle(ids.filter(function (x) { return x !== id; })).slice(0, 2);
      var shown = C().shuffle([id].concat(others));
      var list = shown.map(function (x, k) { return foodBtn(api, x, 420 + k * 330, 230, 250, 'pop-in'); });
      var good = list[shown.indexOf(id)];
      return askTouch(run, C().touchSentence(id), list, good, function (n) { return "That's " + C().getFood(n.dataset.id).word.toLowerCase().replace(/^a slice of cake$/, 'cake') + '. ' + P().notHere; })
        .then(function () { return run.say(C().wordSentence(id)); })
        .then(function () { clearItems(api); });
    }
    function peekRound(id) {
      var n = foodBtn(api, id, 640, 190, 320, 'pop-in');
      n.querySelector('.sprite-wrap').classList.add('silhouette');
      return S().speakTurn(run, { prompt: "What's this?", model: C().wordSentence(id), supported: false })
        .then(function () { n.querySelector('.sprite-wrap').classList.remove('silhouette'); bounce(n); EF.audio.sfx('sparkle'); return run.say(C().wordSentence(id)); })
        .then(function () { clearItems(api); });
    }
    var mix = C().shuffle(ids);
    return run.wait(300)
      .then(function () { return run.say("Look at my menu! Listen and say."); })
      .then(function () { return seq(ids, intro); })
      .then(function () { return run.wait(400); })
      .then(function () { clearItems(api); return run.say("Now let's play!"); })
      .then(function () { return seq(mix.slice(0, 6), function (id, i) { return i % 2 === 0 ? touchRound(id) : peekRound(id); }); })
      .then(function () { return finish(run, api, 'Yummy menu!'); });
  };

  /* ======================= 2 – Hungry Customers ======================= */
  function orderScene(api, who, food) {
    var c = customer(api, who, 1250, 640, 150, 'pop-in');
    var t = thought(api, food, 870, 150);
    return { c: c, t: t };
  }
  EF.games.hungry = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'table' });
    var extra = C().shuffle(['grandma', 'grandpa', 'aunt', 'uncle']).slice(0, 2).map(function (w) {
      var f = C().shuffle(C().FOODS.map(function (x) { return x.id; })).slice(0, 1);
      return { who: w, food: f };
    });
    var orders = C().BOOK_ORDERS.concat(extra);
    function round(o, i) {
      var cu = C().getCustomer(o.who);
      var sc = orderScene(api, o.who, o.food);
      var want = C().wantSentence(o.food);
      return run.say('Look! ' + cu.name + ' is hungry!')
        .then(function () { return S().speakTurn(run, { prompt: P().whatDoYouWant, model: want, supported: i < 2 }); })
        .then(function () { return customerSays(run, o.who, want); })
        .then(function () {
          sc.t.remove();
          var plates = o.food.map(function (id, k) { return foodBtn(api, id, 700 + k * 230, 120, 210, 'pop-in'); });
          EF.audio.sfx('pop');
          return run.say(P().hereYouAre).then(function () {
            return seq(plates, function (p, k) { return moveTo(run, p, 960 + k * 150, 400, 600, 170); });
          });
        })
        .then(function () { bounce(sc.c); return customerSays(run, o.who, P().thankYou); })
        .then(function () { return run.wait(300); })
        .then(function () { clearItems(api); });
    }
    return run.wait(300)
      .then(function () { return run.say('The restaurant is open! Customers are coming!'); })
      .then(function () { return seq(orders, round); })
      .then(function () { return finish(run, api, 'Happy customers!'); });
  };

  /* ======================= 3 – Here You Are! ======================= */
  EF.games.serve = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'kitchen' });
    var all = C().FOODS.map(function (f) { return f.id; });
    var people = C().shuffle(C().CUSTOMERS.map(function (c) { return c.id; })).slice(0, 5);
    function round(who, i) {
      var target = all[(i * 4 + Math.floor(Math.random() * 9)) % 9];
      var counter = C().shuffle([target].concat(C().shuffle(all.filter(function (x) { return x !== target; })).slice(0, 3)));
      var c = customer(api, who, 1330, 640, 150, 'pop-in');
      var items = counter.map(function (id, k) { return foodBtn(api, id, 330 + k * 230, 300, 200, 'pop-in'); });
      var good = items[counter.indexOf(target)];
      var want = C().wantSentence([target]);
      S().setReplay(function () { customerSays(run, who, want); });
      return run.wait(300)
        .then(function () { return customerSays(run, who, want); })
        .then(function () { return askTouch(run, 'Touch it!', items, good, function () { return 'Listen again!'; }); })
        .then(function () {
          items.forEach(function (n) { if (n !== good) n.classList.add('fade-out'); });
          return moveTo(run, good, 1150, 380, 700, 170);
        })
        .then(function () {
          // First rounds: the class is the waiter ("Here you are."). Later rounds swap: Momo serves, the class says "Thank you!".
          if (i % 2 === 0) {
            return S().speakTurn(run, { prompt: 'What do you say?', model: P().hereYouAre, supported: i === 0 })
              .then(function () { bounce(c); return customerSays(run, who, P().thankYou); });
          }
          return run.say(P().hereYouAre).then(function () {
            return S().speakTurn(run, { prompt: 'What do you say?', model: P().thankYou, supported: i === 1 });
          });
        })
        .then(function () { S().setReplay(null); clearItems(api); });
    }
    return run.wait(300)
      .then(function () { return run.say('You are the waiter! Listen and serve the food.'); })
      .then(function () { return seq(people, round); })
      .then(function () { return finish(run, api, 'Super waiter!'); });
  };

  /* ======================= 4 – Eat or Drink? ======================= */
  EF.games.eatdrink = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'table' });
    var eats = C().FOODS.filter(function (f) { return f.kind === 'eat'; }).map(function (f) { return f.id; });
    var drinks = ['water', 'juice'];
    var rounds = ['eat', 'drink', 'eat', 'drink', 'eat', 'drink'];
    function round(kind, i) {
      var choice = kind === 'eat' ? C().shuffle(eats).slice(0, 3) : drinks.slice();
      var prompt = kind === 'eat' ? P().whatToEat : P().whatToDrink;
      var xs = choice.length === 3 ? [400, 720, 1040] : [560, 900];
      var items = choice.map(function (id, k) { return foodBtn(api, id, xs[k], 220, 240, 'pop-in'); });
      var picked;
      return run.say(prompt)
        .then(function () { return run.say('Choose!'); })
        .then(function () { return waitTap(run, items); })
        .then(function (n) {
          untap(items); picked = n.dataset.id;
          items.forEach(function (x) { if (x !== n) x.classList.add('fade-out'); });
          bounce(n); EF.audio.sfx('pop');
          return S().speakTurn(run, { prompt: prompt, model: C().wantSentence([picked]), supported: i < 2 });
        })
        .then(function () { return run.say(P().hereYouAre); })
        .then(function () { return S().speakTurn(run, { prompt: 'What do you say?', model: P().thankYou, supported: i === 0 }); })
        .then(function () { clearItems(api); });
    }
    return run.wait(300)
      .then(function () { return run.say('Food or a drink? You choose!'); })
      .then(function () { return seq(rounds, round); })
      .then(function () { return finish(run, api, 'Eat and drink!'); });
  };

  /* ======================= 5 – Yummy! ======================= */
  EF.games.yummy = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'table' });
    var first = ['cake', 'pasta'];
    var rest = C().shuffle(['juice', 'chicken', 'applepie', 'fish', 'salad', 'rice']).slice(0, 4);
    function round(id, i) {
      var n = foodBtn(api, id, 620, 200, 330, 'pop-in');
      var line = C().tasteSentence(id);
      return run.say('Let me taste the ' + C().getFood(id).word.toLowerCase().replace('a slice of cake', 'cake') + '!')
        .then(function () { return taste(run, 'Mmm!'); })
        .then(function () { bounce(n); return S().speakTurn(run, { prompt: 'How is it?', model: line, supported: i < 2 }); })
        .then(function () { clearItems(api); });
    }
    return run.wait(300)
      .then(function () { return run.say("I'm hungry! Let's taste the food!"); })
      .then(function () { return seq(first.concat(rest), round); })
      .then(function () { return finish(run, api, 'Yummy!'); });
  };

  /* ======================= 6 – Count with Momo (10, 11, 12) ======================= */
  function spread(n, box) {
    var cols = 6, rows = Math.ceil(n / cols), pts = [];
    for (var i = 0; i < n; i++) {
      var r = Math.floor(i / cols), c = i % cols, inRow = r === rows - 1 ? n - r * cols : cols;
      var gx = box.w / inRow;
      pts.push({ x: Math.round(box.x + gx * (c + 0.5)), y: Math.round(box.y + (rows > 1 ? r * box.h / (rows - 1) : 0)) });
    }
    return pts;
  }
  function countRound(run, api, r) {
    var n = r.n, total = r.type === 'give' ? Math.min(12, n + 2) : n;
    var w = 120;
    var pts = spread(total, { x: 340, y: 190, w: 1060, h: 230 });
    var nodes = pts.map(function (p) { return foodBtn(api, 'apple', p.x - w / 2, p.y, w, 'pop-in count-actor'); });
    var counted = 0;
    var line = r.type === 'give' ? 'Put ' + C().NUMBERS[n] + ' apples on the tray! Touch ' + C().NUMBERS[n] + ' apples!' : "How many apples? Let's count!";
    var tray = r.type === 'give' ? S().h('div', 'deco tray-deco m-item', A().food('tray')) : null;
    if (tray) { tray.style.left = '1180px'; tray.style.top = '470px'; tray.style.width = '300px'; api.world().appendChild(tray); }
    S().setHint(function () { var left = nodes.filter(function (x) { return !x.classList.contains('counted'); }); if (left[0]) glow(left[0]); });
    return run.say(line).then(function () {
      return run.until(function (resolve) {
        nodes.forEach(function (node) {
          node.tabIndex = 0; node.classList.add('tappable');
          node.onclick = function () {
            if (node.classList.contains('counted') || counted >= n) return;
            counted++;
            node.classList.add('counted'); node.classList.remove('tappable', 'glow');
            node.appendChild(S().h('span', 'count-badge', String(counted)));
            bounce(node);
            EF.audio.say(C().cap(C().NUMBERS[counted]) + '!');
            if (counted >= n) setTimeout(resolve, 700);
          };
        });
        return function () { nodes.forEach(function (x) { x.onclick = null; x.classList.remove('tappable'); }); };
      });
    }).then(function () {
      S().setHint(null);
      nodes.forEach(function (x) { if (!x.classList.contains('counted')) x.classList.add('fade-out'); });
      EF.audio.sfx('success');
      return run.say(C().countSentence(n, 'apples'));
    }).then(function () {
      return S().speakTurn(run, { prompt: 'How many apples?', model: C().countSentence(n, 'apples'), supported: !!r.supported });
    }).then(function () { clearItems(api); });
  }
  EF.games.counting = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'kitchen' });
    var ns = C().shuffle([10, 11, 12]);
    var rounds = [{ type: 'count', n: 10, supported: true }, { type: 'count', n: 11, supported: true }, { type: 'count', n: 12, supported: true },
      { type: 'give', n: ns[0] }, { type: 'count', n: ns[1] }, { type: 'give', n: ns[2] }];
    return run.wait(300)
      .then(function () { return run.say("Let's count the apples for the apple pie!"); })
      .then(function () { return seq(rounds, function (r) { return countRound(run, api, r); }); })
      .then(function () { return finish(run, api, 'Super counting!'); });
  };

  /* ======================= 7 – What's Missing? ======================= */
  EF.games.missing = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'table' });
    var sizes = [4, 4, 5, 5, 6];
    function round(k, i) {
      var ids = C().shuffle(C().FOODS.map(function (f) { return f.id; })).slice(0, k);
      var gap = 1150 / k;
      var nodes = ids.map(function (id, j) { return foodBtn(api, id, 330 + j * gap + (gap - 180) / 2, 250, 180, 'pop-in'); });
      var gone = Math.floor(Math.random() * k);
      var cloth = S().h('div', 'cloth m-item');
      return run.say('Look!')
        .then(function () { return seq(ids, function (id, j) { bounce(nodes[j]); return run.say(C().wordSentence(id)); }); })
        .then(function () { return run.say('Close your eyes!'); })
        .then(function () { api.world().appendChild(cloth); EF.audio.sfx('whoosh'); return run.wait(1800); })
        .then(function () { nodes[gone].style.visibility = 'hidden'; cloth.classList.add('off'); EF.audio.sfx('whoosh'); return run.wait(700); })
        .then(function () { cloth.remove(); return S().speakTurn(run, { prompt: "Open your eyes! What's missing?", model: C().missingSentence(ids[gone]), supported: i === 0 }); })
        .then(function () { nodes[gone].style.visibility = ''; bounce(nodes[gone]); EF.audio.sfx('sparkle'); return run.say(C().wordSentence(ids[gone])); })
        .then(function () { clearItems(api); });
    }
    return run.wait(300)
      .then(function () { return run.say("Something is missing! Let's play."); })
      .then(function () { return seq(sizes, round); })
      .then(function () { return finish(run, api, 'Great memory!'); });
  };

  /* ======================= 8 – Memory Game ======================= */
  EF.games.memory = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'table' });
    var ids = C().shuffle(C().FOODS.map(function (f) { return f.id; })).slice(0, 6);
    var deck = C().shuffle(ids.concat(ids));
    var cards = deck.map(function (id, k) {
      var b = S().h('button', 'mcard m-item', '<span class="mcard-back"></span><span class="mcard-face">' + A().food(id) + '</span>');
      b.type = 'button'; b.dataset.id = id;
      b.setAttribute('aria-label', 'Card');
      b.style.left = (340 + (k % 6) * 190) + 'px'; b.style.top = (120 + Math.floor(k / 6) * 230) + 'px';
      api.world().appendChild(b);
      return b;
    });
    var found = 0;
    function turn() {
      var open = [];
      return run.until(function (resolve) {
        cards.forEach(function (c) {
          c.onclick = function () {
            if (c.classList.contains('open') || c.classList.contains('done') || open.length >= 2) return;
            c.classList.add('open'); EF.audio.sfx('tap');
            open.push(c);
            EF.audio.say(C().wordSentence(c.dataset.id));
            if (open.length === 2) setTimeout(function () { resolve(open); }, 1200);
          };
        });
        return function () { cards.forEach(function (c) { c.onclick = null; }); };
      }).then(function (pair) {
        if (pair[0].dataset.id === pair[1].dataset.id) {
          pair.forEach(function (c) { c.classList.add('done'); });
          found++;
          EF.audio.sfx('success');
          return S().speakTurn(run, { repeat: true, model: C().wordSentence(pair[0].dataset.id) });
        }
        EF.audio.sfx('soft');
        return run.wait(400).then(function () { pair.forEach(function (c) { c.classList.remove('open'); }); });
      }).then(function () { return found < ids.length ? turn() : null; });
    }
    return run.wait(300)
      .then(function () { return run.say('Find two the same! Say the word!'); })
      .then(turn)
      .then(function () { return finish(run, api, 'Memory star!'); });
  };

  /* ======================= 9 – Table Manners ======================= */
  var MANNERS = [
    { who: 'brother', rude: 'Water!', polite: 'Water, please!' },
    { who: 'sister', rude: 'Orange juice!', polite: 'Orange juice, please!' },
    { who: 'dad', rude: 'Rice!', polite: 'Rice, please!' },
    { who: 'mum', thanks: true }
  ];
  EF.games.manners = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'table' });
    function round(m, i) {
      var other = C().shuffle(C().CUSTOMERS.map(function (c) { return c.id; }).filter(function (x) { return x !== m.who; }))[0];
      var left = Math.random() < 0.5;
      var politeWho = m.who, rudeWho = other;
      var pos = left ? [420, 960] : [960, 420];
      var good = customer(api, politeWho, pos[0], 620, 140, 'pop-in pick-customer');
      var bad = customer(api, rudeWho, pos[1], 620, 140, 'pop-in pick-customer');
      [good, bad].forEach(function (n) { n.setAttribute('role', 'button'); });
      var flow = Promise.resolve();
      if (m.thanks) {
        flow = run.say('Here you are! Listen!')
          .then(function () { glow(good); return customerSays(run, politeWho, 'Thank you!'); })
          .then(function () { good.classList.remove('glow'); glow(bad); S().setBubble('…'); return run.wait(1600); })
          .then(function () { bad.classList.remove('glow'); });
      } else {
        flow = run.say('Listen!')
          .then(function () { glow(bad); return customerSays(run, rudeWho, m.rude); })
          .then(function () { bad.classList.remove('glow'); glow(good); return customerSays(run, politeWho, m.polite); })
          .then(function () { good.classList.remove('glow'); });
      }
      return flow
        .then(function () { return askTouch(run, 'Who is polite? Touch!', [good, bad], good, function () { return 'Hmm. Listen again!'; }); })
        .then(function () { EF.audio.sfx('success'); bad.classList.add('fade-out'); return run.say('Yes! Good manners!'); })
        .then(function () { return S().speakTurn(run, { repeat: true, model: m.thanks ? 'Thank you!' : m.polite }); })
        .then(function () { clearItems(api); });
    }
    return run.wait(300)
      .then(function () { return run.say('We use table manners! We say please and thank you.'); })
      .then(function () { return seq(MANNERS, round); })
      .then(function () { return S().speakTurn(run, { repeat: true, model: 'We use table manners!' }); })
      .then(function () { return finish(run, api, 'Good manners!'); });
  };

  /* ======================= 10 – The Little Red Hen ======================= */
  var FARM = '../farm/assets/img/';
  function farmAnimal(api, id, x, y, w, cls) {
    var d = S().h('button', 'actor m-item' + (cls ? ' ' + cls : ''), '<span class="sprite-wrap animal-sprite"><img class="sprite" src="' + FARM + 'sprites/' + id + '.webp" alt="" draggable="false"></span>');
    d.type = 'button'; d.tabIndex = -1;
    d.setAttribute('aria-label', id);
    d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.width = w + 'px';
    api.world().appendChild(d);
    d.onclick = function () { bounce(d); EF.audio.animalSound(id); };
    return d;
  }
  var HEN_PAGES = [
    { lines: ['This is the Little Red Hen.', 'She finds some wheat.'], prop: 'wheat' },
    { ask: 'Who will help me plant the wheat?', no: true, prop: 'wheat' },
    { lines: ['Then I will do it myself!'], prop: 'wheat', hen: true },
    { ask: 'Who will help me cut the wheat?', no: true, prop: 'wheat' },
    { ask: 'Who will help me bake the bread?', no: true, prop: 'bread' },
    { ask: 'Who will help me eat the bread?', yes: true, prop: 'bread' },
    { lines: ['No! You did not help me.', 'I will eat it myself!'], prop: 'bread', hen: true, end: true }
  ];
  EF.games.redhen = function (run, api) {
    var bgs = ['farm', 'meadow'];
    function page(pg, i) {
      clearItems(api);
      api.bg().innerHTML = '<div class="landscape rest-base"></div><img class="bg-paint" src="' + FARM + 'bg-' + bgs[i % 2] + '.webp" alt="" draggable="false">';
      var hen = farmAnimal(api, 'hen', 360, 330, 220, 'pop-in red-hen');
      var friends = [['duck', 930, 400, 190], ['pig', 1130, 380, 230], ['cow', 1330, 300, 260]].map(function (f) {
        return farmAnimal(api, f[0], f[1], f[2], f[3], 'pop-in');
      });
      var prop = foodBtn(api, pg.prop, 620, 420, 180, 'pop-in story-prop');
      var flow = run.wait(400);
      if (pg.lines) flow = flow.then(function () { if (pg.hen) glow(hen); return seq(pg.lines, function (l) { return run.say(l, pg.hen ? { voice: 'woman' } : null); }); });
      if (pg.ask) {
        var say = pg.no ? 'Not I!' : 'I will!';
        flow = flow.then(function () { glow(hen); return run.say('Listen to the Little Red Hen!'); })
          .then(function () { return run.say(pg.ask, { voice: 'woman' }); })
          .then(function () {
            hen.classList.remove('glow');
            return seq(friends, function (f, k) { glow(f); bounce(f); return run.say(say, { voice: k === 1 ? 'man' : 'woman' }).then(function () { f.classList.remove('glow'); }); });
          })
          .then(function () { return S().speakTurn(run, { repeat: true, model: say }); });
      }
      if (pg.end) flow = flow.then(function () { return run.say('We help our friends!'); }).then(function () { return S().speakTurn(run, { repeat: true, model: 'We help our friends!' }); });
      return flow.then(function () { void prop; EF.audio.sfx('whoosh'); });
    }
    return run.wait(300)
      .then(function () { return run.say('Story time! The Little Red Hen.'); })
      .then(function () { return seq(HEN_PAGES, page); })
      .then(function () { return finish(run, api, 'The end!'); });
  };

  /* ======================= 11 – My Favourite Food ======================= */
  EF.games.favourite = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'hall' });
    var ids = C().FOODS.map(function (f) { return f.id; });
    var tally = {};
    var cls = api.progress.settings().mode === 'class';
    var turns = cls ? 5 : 2;
    function board() {
      var items = ids.map(function (id, k) { return foodBtn(api, id, 330 + (k % 5) * 230, k < 5 ? 130 : 350, 190, 'pop-in fav-food'); });
      return items;
    }
    function chart() {
      var old = api.world().querySelector('.fav-chart'); if (old) old.remove();
      var box = S().h('div', 'fav-chart m-keep');
      ids.forEach(function (id) { if (!tally[id]) return; box.insertAdjacentHTML('beforeend', '<span class="fav-col"><span class="fav-bar" style="height:' + (tally[id] * 26) + 'px"></span><span class="fav-ic">' + A().food(id) + '</span></span>'); });
      api.world().appendChild(box);
    }
    function round(i) {
      var drink = i === turns - 1;
      var items = board();
      var pool = items.filter(function (n) { return drink ? C().getFood(n.dataset.id).kind === 'drink' : C().getFood(n.dataset.id).kind === 'eat'; });
      items.forEach(function (n) { if (pool.indexOf(n) < 0) n.classList.add('faded'); });
      var prompt = drink ? P().favDrink : P().favFood;
      var id;
      return run.say(prompt)
        .then(function () { return run.say('Touch your favourite!'); })
        .then(function () { return waitTap(run, pool); })
        .then(function (n) {
          untap(pool); id = n.dataset.id;
          items.forEach(function (x) { if (x !== n) x.classList.add('fade-out'); });
          bounce(n); EF.audio.sfx('pop');
          return S().speakTurn(run, { prompt: prompt, model: C().favSentence(id), supported: i === 0 });
        })
        .then(function () { tally[id] = (tally[id] || 0) + 1; chart(); clearItems(api); });
    }
    var list = []; for (var i = 0; i < turns; i++) list.push(i);
    return run.wait(300)
      .then(function () { return run.say("My favourite food is pasta! What's your favourite food?"); })
      .then(function () { return seq(list, function (k) { return round(k); }); })
      .then(function () { return run.say('Look! Our favourite food!'); })
      .then(function () { return finish(run, api, 'My favourite food!'); });
  };

  /* ======================= 12 – Restaurant Party ======================= */
  EF.games.party = function (run, api) {
    api.bg().innerHTML = A().landscape({ paint: 'table' });
    var guests = C().shuffle(C().CUSTOMERS.map(function (c) { return c.id; })).slice(0, 3);
    var eats = C().FOODS.filter(function (f) { return f.kind === 'eat'; }).map(function (f) { return f.id; });
    function serveStep(who, kind) {
      var options = kind === 'eat' ? C().shuffle(eats).slice(0, 3) : ['water', 'juice'];
      var want = C().pick(options);
      var t = thought(api, [want], 870, 150);
      var prompt = kind === 'eat' ? P().whatToEat : P().whatToDrink;
      return run.say(prompt)
        .then(function () { return S().speakTurn(run, { prompt: prompt, model: C().wantSentence([want]), supported: false }); })
        .then(function () {
          t.remove();
          var xs = options.length === 3 ? [360, 600, 840] : [480, 760];
          var items = options.map(function (id, k) { return foodBtn(api, id, xs[k], 180, 200, 'pop-in'); });
          var good = items[options.indexOf(want)];
          return askTouch(run, 'Serve it! Touch it!', items, good).then(function () {
            items.forEach(function (n) { if (n !== good) n.remove(); });
            return moveTo(run, good, 1080, 380, 600, 150);
          });
        })
        .then(function () { return S().speakTurn(run, { prompt: 'What do you say?', model: P().hereYouAre, supported: false }); })
        .then(function () { return customerSays(run, who, P().thankYou); })
        .then(function () { return want; });
    }
    function guest(who) {
      var c = customer(api, who, 1280, 640, 150, 'pop-in');
      var food;
      return run.say('Hello, ' + C().getCustomer(who).name + '!')
        .then(function () { return serveStep(who, 'eat'); })
        .then(function (f) { food = f; return serveStep(who, 'drink'); })
        .then(function () { bounce(c); return customerSays(run, who, 'Mmm! ' + C().tasteSentence(food)); })
        .then(function () { return run.wait(300); })
        .then(function () { clearItems(api); });
    }
    function certificate() {
      api.bg().innerHTML = A().landscape({ paint: 'cert' });
      var cert = S().h('div', 'rest-cert m-item', '<div class="cert-star">' + S().ICONS.star + '</div><div class="cert-title">Little Chef</div><div class="cert-sub">Momo\'s Little Restaurant</div>');
      api.world().appendChild(cert);
      S().pipMood('happy');
      EF.audio.sfx('star');
      return run.say('Congratulations! You are a Little Chef!');
    }
    return run.wait(300)
      .then(function () { return run.say("It's party time! Our friends are coming to the restaurant!"); })
      .then(function () { return seq(guests, guest); })
      .then(certificate)
      .then(function () { return run.say('Thank you for helping me, Little Chef!'); })
      .then(function () { return finish(run, api, 'Little Chef!'); });
  };
})(this);
