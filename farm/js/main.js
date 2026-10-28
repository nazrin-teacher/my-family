/*
 * App shell: welcome screen, adventure map, grown-ups panel and mission routing.
 * Missions register themselves in EF.games[gameKey] = function (run, api) -> Promise<'again'|'map'>.
 */
(function (root) {
  'use strict';
  var EF = root.EF;
  EF.games = EF.games || {};
  var C = EF.content, S = EF.stage, A = EF.art;
  var progress, run = null, screenName = '';

  /* Map layout in stage units (1600x900). Week 1 along the front path, week 2 along the back path. */
  var LANTERNS = {
    1: [360, 800], 2: [545, 760], 3: [730, 800], 4: [915, 760], 5: [1100, 800], 6: [1285, 760], 7: [1470, 800],
    8: [1470, 590], 9: [1285, 550], 10: [1100, 590], 11: [915, 550], 12: [730, 590], 13: [545, 550], 14: [360, 590]
  };

  function world() { return S.el().world; }
  function bg() { return S.el().bg; }
  function place(node, x, y, w, extra) {
    node.style.left = x + 'px'; node.style.top = y + 'px';
    if (w) node.style.width = w + 'px';
    if (extra) node.classList.add.apply(node.classList, extra.split(' '));
    world().appendChild(node);
    return node;
  }
  /* Back to the units menu of the class website (the farm lives in its farm/ folder). */
  function unitsLink() {
    var a = S.h('a', 'units-link', '<span aria-hidden="true">◀</span> Units');
    a.href = '../';
    a.setAttribute('aria-label', 'Back to all units');
    world().appendChild(a);
    return a;
  }
  function pieceAt(name, x, y, w, cls) { return place(S.h('div', 'deco', A.piece(name)), x, y, w, cls); }
  function animalAt(id, x, y, w, cls) { return place(S.h('div', 'deco critter', A.animal(id, 'idle')), x, y, w, cls); }

  function go(name, arg) {
    if (run) run.abort();
    S.closePanel(); S.hideOverlay(); S.setBubble('');
    world().innerHTML = '';
    bg().innerHTML = '';
    S.setMission(null);
    var stage = S.el().stage;
    stage.className = 'stage screen-' + name;
    stage.style.removeProperty('--rescued');
    screenName = name;
    run = S.createRunner();
    var fn = name === 'welcome' ? welcome : name === 'map' ? map : mission;
    Promise.resolve().then(function () { return fn(run, arg); }).catch(function (err) {
      if (err === S.ABORT) return;
      showError(err);
    });
  }

  function showError(err) {
    if (root.console) root.console.error(err);
    var box = document.getElementById('error-box');
    box.hidden = false;
    box.querySelector('[data-msg]').textContent = 'Something went wrong. Please go back to the map and try again.';
  }

  /* ---------- welcome ---------- */
  function welcome(r) {
    bg().innerHTML = A.landscape({ dusk: true, paint: 'welcome' });
    unitsLink();
    S.setHud({ home: false, stars: progress.stars() > 0 });
    S.setPipVisible(false);
    pieceAt('gate', 630, 300, 340, 'gate-glow');
    animalAt('cow', 200, 540, 260, 'peek-l');
    animalAt('sheep', 1160, 560, 220, 'peek-r');
    animalAt('duck', 1380, 640, 150, 'peek-r');
    var title = place(S.h('div', 'title-block', '<h1>The Enchanted Farm</h1><p>A magical English speaking adventure</p>'), 400, 70, 800);
    title.setAttribute('role', 'presentation');
    var pip = place(S.h('div', 'welcome-pip', A.pip('waving')), 1000, 470, 230);
    pip.setAttribute('aria-hidden', 'true');
    var play = place(S.iconButton('play', 'play-big', 'Play'), 700, 600, 200);
    play.insertAdjacentHTML('beforeend', '<span class="btn-cap">Play</span>');
    setTimeout(function () { play.focus(); }, 60);

    if (progress.stars() > 0) {
      var restart = place(S.iconButton('again', 'restart-small', 'Start the adventure again'), 40, 130, 0);
      restart.insertAdjacentHTML('beforeend', '<span class="btn-cap">Start again</span>');
      restart.style.width = '';
      restart.onclick = function () { askRestart(); };
    }

    var ready = A.preload(8000);
    return r.until(function (resolve) {
      play.onclick = function () {
        // Wait (briefly) until all pictures are loaded so nothing appears after Pip mentions it.
        EF.audio.unlock(); // must run inside the tap itself (iOS/Safari)
        play.classList.add('pressed');
        ready.then(function () { resolve(); });
      };
      return function () {};
    })
      .then(function () {
        EF.audio.unlock();
        EF.audio.sfx('sparkle');
        play.disabled = true;
        play.classList.add('pressed');
        pip.classList.add('hop');
        S.setPipVisible(true);
        pip.hidden = true;
        var back = progress.stars() > 0;
        return r.say(back ? 'Hello again, Farm Explorer!' : C.PHRASES.welcome)
          .then(function () { return back ? null : r.say(C.PHRASES.story); })
          .then(function () { return r.say(C.PHRASES.letsGo, { rate: 1 }); });
      })
      .then(function () { go('map'); });
  }

  function askRestart() {
    if (root.confirm('Start the whole adventure again on this device? Stars and opened places will be cleared.')) {
      progress.reset();
      go('welcome');
    }
  }

  /* ---------- map ---------- */
  function map(r, justDone) {
    var done1 = progress.isCompleted(1), done2 = progress.isCompleted(2);
    var stars = progress.stars();
    bg().innerHTML = A.landscape({ dusk: stars === 0, paint: 'map' });
    unitsLink();
    var stage = S.el().stage;
    stage.style.setProperty('--magic', String(Math.min(1, stars / 4)));
    S.setHud({ home: false, stars: true });
    S.setPipVisible(true);

    // Landmarks
    pieceAt('tent', 190, 300, 260, progress.isCompleted(14) ? 'lit' : 'sleepy');
    pieceAt('barn', 560, 250, 300, (done1 ? 'barn-open' : 'barn-closed') + (progress.isCompleted(3) ? ' barn-lit' : ''));
    pieceAt('rainbow', 900, 330, 240, progress.isCompleted(4) ? 'bloom' : 'faded');
    pieceAt('hay', 1180, 420, 130);
    pieceAt('tree', 1300, 230, 220);
    pieceAt('trough', 840, 470, 150);
    pieceAt('mud', 410, 470, 170);
    pieceAt('gate', 170, 610, 230, done1 ? 'gate-open' : '');
    pieceAt('pond', 1090, 640, 330, done2 ? 'pond-alive' : '');
    if (done2) {
      ['flowers', 'flowers', 'flowers'].forEach(function (f, i) { pieceAt(f, [700, 1000, 1400][i], [680, 470, 470][i], 130, 'bloom'); });
    }

    // Animals: appear in the meadow after mission 1, go home after mission 2.
    if (done2) {
      animalAt('cow', 640, 420, 130); animalAt('horse', 770, 410, 130);
      animalAt('pig', 450, 470, 110); animalAt('sheep', 1000, 500, 100);
      animalAt('hen', 1220, 460, 80); animalAt('duck', 1200, 660, 90, 'swim');
    } else if (done1) {
      animalAt('cow', 610, 650, 120); animalAt('horse', 790, 640, 120); animalAt('pig', 980, 670, 100);
      animalAt('hen', 1300, 660, 70); animalAt('sheep', 1360, 640, 95); animalAt('duck', 1200, 690, 70);
    }

    // Path (sandy stepping-stone dots between consecutive lanterns)
    var path = S.h('div', 'map-path');
    path.setAttribute('aria-hidden', 'true');
    for (var i = 1; i < 14; i++) {
      var x1 = LANTERNS[i][0], y1 = LANTERNS[i][1] + 40;
      var x2 = LANTERNS[i + 1][0], y2 = LANTERNS[i + 1][1] + 40;
      var steps = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 38));
      for (var k = (i === 1 ? 0 : 1); k <= steps; k++) {
        var t = k / steps;
        var dot = S.h('span', 'map-dot');
        dot.style.left = Math.round(x1 + (x2 - x1) * t) + 'px';
        dot.style.top = Math.round(y1 + (y2 - y1) * t) + 'px';
        path.appendChild(dot);
      }
    }
    world().appendChild(path);

    // Lanterns
    var current = progress.current();
    var currentBtn = null;
    C.MISSIONS.forEach(function (m) {
      var p = LANTERNS[m.id];
      var ready = m.status === 'ready';
      var unlocked = ready && progress.isUnlocked(m.id);
      var done = progress.isCompleted(m.id);
      var lState = done ? 'done' : unlocked ? 'on' : 'off';
      var b = S.h('button', 'lantern');
      b.type = 'button';
      b.innerHTML = lanternSVG(lState) + '<span class="lantern-num">' + m.id + '</span>' + (done ? '<span class="lantern-star">' + S.ICONS.star + '</span>' : '') + (!unlocked ? '<span class="zzz" aria-hidden="true">z z</span>' : '');
      b.classList.add(done ? 'is-done' : unlocked ? 'is-open' : 'is-locked');
      if (m.id === current) { b.classList.add('is-current'); currentBtn = b; }
      if (m.id === justDone) b.classList.add('just-lit');
      b.setAttribute('aria-label', 'Mission ' + m.id + ': ' + m.title + (done ? ' (done)' : unlocked ? '' : ready ? ' (locked)' : ' (coming soon)'));
      b.style.left = (p[0] - 48) + 'px'; b.style.top = (p[1] - 60) + 'px';
      b.onclick = function () {
        if (unlocked) { EF.audio.sfx('pop'); go('mission', m.id); return; }
        EF.audio.sfx('soft');
        S.speak(C.PHRASES.mapLocked);
        if (currentBtn) { currentBtn.classList.remove('wiggle'); void currentBtn.offsetWidth; currentBtn.classList.add('wiggle'); }
      };
      world().appendChild(b);
    });

    var line = current === null && done2 ? 'You helped all the animals! More adventures are coming soon.' :
      justDone ? C.PHRASES.star : C.PHRASES.mapChoose;
    S.setReplay(function () { S.speak(line); });
    if (currentBtn) setTimeout(function () { currentBtn.focus({ preventScroll: true }); }, 60);
    return r.wait(400).then(function () { return r.say(line); });
  }

  var LANTERN_SPRITES = {
    off: 'assets/img/sprites/lantern-off.webp',
    on: 'assets/img/sprites/lantern-on.webp',
    done: 'assets/img/sprites/lantern-done.webp'
  };

  function lanternSVG(state) {
    var src = LANTERN_SPRITES[state] || LANTERN_SPRITES.off;
    return '<span class="l-glow" aria-hidden="true"></span>' +
      '<img class="lantern-img" src="' + src + '" alt="" draggable="false">';
  }

  /* ---------- mission host ---------- */
  function mission(r, id) {
    var m = C.getMission(id);
    var game = m && EF.games[m.game];
    if (!m || m.status !== 'ready' || !game) { go('map'); return null; }
    S.setMission(id);
    S.setHud({ home: true, stars: true });
    S.setPipVisible(true);
    S.homeButton().onclick = function () { EF.audio.sfx('tap'); go('map'); };
    var api = { mission: m, progress: progress, place: place, pieceAt: pieceAt, animalAt: animalAt, world: world, bg: bg };
    return Promise.resolve(game(r, api)).then(function (choice) {
      if (choice === 'again') go('mission', id);
      else go('map', id);
    });
  }

  /* ---------- grown-ups panel ---------- */
  function initGrownUps() {
    var dlg = document.getElementById('grownups');
    var open = document.getElementById('grownups-open');
    var holdTimer = null;
    // Press and hold so that young children do not open it by accident.
    function startHold(e) {
      e.preventDefault();
      open.classList.add('holding');
      holdTimer = setTimeout(function () { open.classList.remove('holding'); showPanel(); }, 1200);
    }
    function cancelHold() { clearTimeout(holdTimer); open.classList.remove('holding'); }
    open.addEventListener('pointerdown', startHold);
    open.addEventListener('pointerup', cancelHold);
    open.addEventListener('pointerleave', cancelHold);
    open.addEventListener('pointercancel', cancelHold);
    open.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPanel(); } });
    open.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    function showPanel() {
      refresh();
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    }
    function refresh() {
      var s = progress.settings();
      dlg.querySelectorAll('[data-setting]').forEach(function (inp) {
        var name = inp.getAttribute('data-setting');
        if (inp.type === 'checkbox') inp.checked = !!s[name];
        else if (inp.type === 'radio') inp.checked = inp.value === s[name];
      });
      document.getElementById('gu-stars').textContent = String(progress.stars());
      document.getElementById('gu-speaking').textContent = String(progress.speakingCount());
      document.getElementById('gu-voice').textContent = EF.audio.voiceName();
      document.getElementById('gu-voice-warn').hidden = EF.audio.hasEnglishVoice();
      document.getElementById('gu-storage-warn').hidden = progress.isPersistent();
      var micOk = root.navigator.mediaDevices && root.navigator.mediaDevices.getUserMedia && typeof root.MediaRecorder !== 'undefined';
      document.getElementById('gu-mic-warn').hidden = !!micOk;
    }
    dlg.addEventListener('change', function (e) {
      var inp = e.target;
      var name = inp.getAttribute && inp.getAttribute('data-setting');
      if (!name) return;
      progress.setSetting(name, inp.type === 'checkbox' ? inp.checked : inp.value);
      applySettings();
      if (name === 'mode' && screenName === 'map') go('map');
    });
    document.getElementById('gu-test-voice').onclick = function () { EF.audio.unlock(); EF.audio.say('What can you see? I can see a cow.'); };
    document.getElementById('gu-restart').onclick = function () {
      if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
      askRestart();
    };
    document.getElementById('gu-close').onclick = function () { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
  }

  function applySettings() {
    var s = progress.settings();
    var reduce = s.reducedMotion || (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    document.documentElement.classList.toggle('reduce-motion', !!reduce);
    document.documentElement.classList.toggle('mode-class', s.mode === 'class');
  }

  function start() {
    var storage = null;
    try { storage = root.localStorage; } catch (e) { storage = null; }
    progress = EF.progress.createProgress(storage, C.MISSIONS);
    // ?mode=class (teacher link) or ?mode=home switches the mode on this device.
    var m = /[?&]mode=(class|home)\b/.exec(root.location.search);
    if (m) progress.setSetting('mode', m[1]);
    A.installDefs(document);
    S.init(progress);
    applySettings();
    initGrownUps();
    document.getElementById('error-map').onclick = function () { document.getElementById('error-box').hidden = true; go('map'); };
    document.getElementById('loading').hidden = true;
    // Direct links for teachers and testing: ?screen=map, ?screen=mission-1, ?screen=mission-2.
    // Audio starts after the first touch on the page (browsers block sound before that).
    var sc = /[?&]screen=(map|mission-(\d+))\b/.exec(root.location.search);
    if (sc) {
      document.addEventListener('pointerdown', function unlockOnce() { EF.audio.unlock(); document.removeEventListener('pointerdown', unlockOnce); });
      A.preload(8000).then(function () { if (sc[2]) go('mission', parseInt(sc[2], 10)); else go('map'); });
    } else go('welcome');
  }

  EF.app = { go: go, start: start };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(this);
