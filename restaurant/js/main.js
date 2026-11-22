/*
 * App shell: welcome screen, restaurant map, grown-ups panel and mission routing.
 * Missions register themselves in EF.games[gameKey] = function (run, api) -> Promise<'again'|'map'>.
 */
(function (root) {
  'use strict';
  var EF = root.EF;
  EF.games = EF.games || {};
  var C = EF.content, S = EF.stage, A = EF.art;
  var progress, run = null, screenName = '';

  /* Map: twelve plates on the restaurant floor (two rows of six). */
  var PLATES = {};
  for (var pi = 0; pi < 12; pi++) PLATES[pi + 1] = [330 + (pi % 6) * 190, pi < 6 ? 560 : 760];

  function world() { return S.el().world; }
  function bg() { return S.el().bg; }
  function place(node, x, y, w, extra) {
    node.style.left = x + 'px'; node.style.top = y + 'px';
    if (w) node.style.width = w + 'px';
    if (extra) node.classList.add.apply(node.classList, extra.split(' '));
    world().appendChild(node);
    return node;
  }
  /* Back to the units menu of the class website (the restaurant lives in its restaurant/ folder). */
  function unitsLink() {
    var a = S.h('a', 'units-link', '<span aria-hidden="true">◀</span> Units');
    a.href = '../';
    a.setAttribute('aria-label', 'Back to all units');
    world().appendChild(a);
    return a;
  }

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
    bg().innerHTML = A.landscape({ paint: 'hall' });
    unitsLink();
    S.setHud({ home: false, stars: progress.stars() > 0 });
    S.setPipVisible(false);
    ['pasta', 'applepie', 'juice'].forEach(function (f, i) { place(S.h('div', 'deco welcome-food', A.food(f)), [210, 1180, 1370][i], [600, 640, 560][i], [200, 190, 120][i]); });
    var title = place(S.h('div', 'title-block', "<h1>Momo's Little Restaurant</h1><p>A yummy English speaking adventure</p>"), 300, 70, 1000);
    title.setAttribute('role', 'presentation');
    var momo = place(S.h('div', 'welcome-pip', A.pip('waving')), 960, 400, 300);
    momo.setAttribute('aria-hidden', 'true');
    var play = place(S.iconButton('play', 'play-big', 'Play'), 640, 560, 200);
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
      play.onclick = function () { EF.audio.unlock(); play.classList.add('pressed'); ready.then(function () { resolve(); }); };
      return function () {};
    })
      .then(function () {
        EF.audio.unlock(); EF.audio.sfx('sparkle');
        play.disabled = true; momo.classList.add('hop');
        S.setPipVisible(true); momo.hidden = true;
        var back = progress.stars() > 0;
        return r.say(back ? C.PHRASES.hello : C.PHRASES.welcome)
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
    bg().innerHTML = A.landscape({ paint: 'hall' });
    unitsLink();
    S.setHud({ home: false, stars: true });
    S.setPipVisible(true);
    var current = progress.current();
    var currentBtn = null;
    C.MISSIONS.forEach(function (m) {
      var p = PLATES[m.id];
      var unlocked = progress.isUnlocked(m.id);
      var done = progress.isCompleted(m.id);
      var b = S.h('button', 'plate-btn ' + (done ? 'is-done' : unlocked ? 'is-open' : 'is-locked'));
      b.type = 'button';
      b.innerHTML = '<span class="plate-glow" aria-hidden="true"></span>' + A.food('plate', 'plate-base') + (done ? A.food(m.food, 'plate-food') + '<span class="lantern-star">' + S.ICONS.star + '</span>' : '') +
        '<span class="lantern-num">' + m.id + '</span>';
      if (m.id === current) { b.classList.add('is-current'); currentBtn = b; }
      if (m.id === justDone) b.classList.add('just-lit');
      b.setAttribute('aria-label', 'Mission ' + m.id + ': ' + m.title + (done ? ' (done)' : unlocked ? '' : ' (locked)'));
      b.style.left = (p[0] - 80) + 'px'; b.style.top = (p[1] - 80) + 'px';
      b.onclick = function () {
        if (unlocked) { EF.audio.sfx('pop'); go('mission', m.id); return; }
        EF.audio.sfx('soft');
        S.speak(C.PHRASES.mapLocked);
        if (currentBtn) { currentBtn.classList.remove('wiggle'); void currentBtn.offsetWidth; currentBtn.classList.add('wiggle'); }
      };
      world().appendChild(b);
    });
    var line = current === null ? C.PHRASES.allDone : justDone ? C.PHRASES.star : C.PHRASES.mapChoose;
    S.setReplay(function () { S.speak(line); });
    if (currentBtn) setTimeout(function () { currentBtn.focus({ preventScroll: true }); }, 60);
    return r.wait(400).then(function () { return r.say(line); });
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
    var api = { mission: m, progress: progress, place: place, world: world, bg: bg };
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
    document.getElementById('gu-test-voice').onclick = function () { EF.audio.unlock(); EF.audio.say('What do you want? I want apple pie, please.'); };
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
