/*
 * Stage: a fixed 1600x900 game box scaled to fit any screen (phone, tablet, whiteboard).
 * Provides Pip + speech bubble, the HUD (home / replay / hint), an abortable "runner"
 * for scripted flows, the reusable speaking turn (LISTEN → THINK → SAY), and the reward overlay.
 */
(function (root) {
  'use strict';
  var EF = root.EF;
  var W = 1600, H = 900;
  var ABORT = { aborted: true };

  var el = {};
  var state = { scale: 1, replay: null, hint: null, lastLine: '', progress: null, missionId: null };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var ICONS = {
    home: '<img class="icon-img" src="assets/img/sprites/icon-home.webp" alt="" draggable="false">',
    ear: '<img class="icon-img" src="assets/img/sprites/icon-ear.webp" alt="" draggable="false">',
    bulb: '<img class="icon-img" src="assets/img/sprites/icon-bulb.webp" alt="" draggable="false">',
    mic: '<img class="icon-img" src="assets/img/sprites/icon-mic.webp" alt="" draggable="false">',
    play: '<img class="icon-img" src="assets/img/sprites/icon-play.webp" alt="" draggable="false">',
    next: '<img class="icon-img" src="assets/img/sprites/icon-next.webp" alt="" draggable="false">',
    thumb: '<img class="icon-img" src="assets/img/sprites/icon-thumb.webp" alt="" draggable="false">',
    again: '<img class="icon-img" src="assets/img/sprites/icon-again.webp" alt="" draggable="false">',
    star: '<img class="icon-img" src="assets/img/sprites/icon-star.webp" alt="" draggable="false">',
    mouth: '<img class="icon-img" src="assets/img/sprites/icon-mouth.webp" alt="" draggable="false">'
  };

  function iconButton(name, cls, label) {
    var b = h('button', 'icon-btn ' + (cls || ''), ICONS[name]);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    return b;
  }

  /* ---------- runner: abortable async flow for one screen ---------- */
  function createRunner() {
    var aborted = false;
    var cleanups = [];
    function track(fn) { cleanups.push(fn); return fn; }
    function guard(p) {
      return new Promise(function (resolve, reject) {
        if (aborted) { reject(ABORT); return; }
        var off = track(function () { reject(ABORT); });
        p.then(function (v) {
          var i = cleanups.indexOf(off); if (i >= 0) cleanups.splice(i, 1);
          if (aborted) reject(ABORT); else resolve(v);
        }, reject);
      });
    }
    return {
      wait: function (ms) {
        return guard(new Promise(function (r) { var t = setTimeout(r, ms); track(function () { clearTimeout(t); }); }));
      },
      say: function (text, opts) { return guard(speak(text, opts)); },
      /* setup(resolve) attaches listeners and returns a cleanup function. */
      until: function (setup) {
        var cleanup = null;
        var p = new Promise(function (resolve) { cleanup = setup(resolve); });
        if (cleanup) track(cleanup);
        return guard(p).then(function (v) { if (cleanup) cleanup(); return v; });
      },
      guard: guard,
      abort: function () {
        aborted = true;
        EF.audio.stop();
        var list = cleanups.slice(); cleanups = [];
        list.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
      },
      isAborted: function () { return aborted; }
    };
  }

  /* ---------- Pip and the speech bubble ---------- */
  function speak(text, opts) {
    state.lastLine = text;
    setBubble(text);
    return EF.audio.say(text, opts);
  }

  function setBubble(text, mode) {
    el.bubble.classList.remove('thinking');
    if (mode === 'thinking') {
      el.bubble.classList.add('thinking');
      el.bubbleText.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    } else {
      el.bubbleText.textContent = text || '';
    }
    el.bubble.hidden = !text && mode !== 'thinking';
  }

  function pipMood(mood) {
    el.pip.classList.remove('is-happy', 'is-thinking', 'is-pointing', 'is-sad');
    if (mood) el.pip.classList.add('is-' + mood);
    if (mood === 'happy') setTimeout(function () { el.pip.classList.remove('is-happy'); }, 1300);
  }

  function setPipVisible(v, pos) {
    el.pipDock.hidden = !v;
    el.pipDock.classList.toggle('pip-right', pos === 'right');
    el.pipDock.classList.toggle('pip-center', pos === 'center');
  }

  /* ---------- HUD ---------- */
  function setHud(opts) {
    var o = opts || {};
    el.homeBtn.hidden = !o.home;
    el.replayBtn.hidden = !o.replay;
    el.hintBtn.hidden = true;
    state.hint = null;
    state.replay = null;
    el.stars.hidden = !o.stars;
    updateStars();
  }
  function setReplay(fn) { state.replay = fn; el.replayBtn.hidden = false; }
  function setHint(fn) {
    state.hint = fn;
    el.hintBtn.hidden = !fn;
    if (fn) { el.hintBtn.classList.remove('nudge'); void el.hintBtn.offsetWidth; el.hintBtn.classList.add('nudge'); }
  }
  function updateStars() {
    if (!state.progress) return;
    el.starCount.textContent = String(state.progress.stars());
  }

  /* ---------- timings ---------- */
  function timings() {
    var s = state.progress ? state.progress.settings() : { wait: 'normal', mode: 'home' };
    var base = { short: [1800, 5000], normal: [3000, 7000], long: [5000, 10000] }[s.wait] || [3000, 7000];
    var extra = s.mode === 'class' ? 1500 : 0;
    return { think: base[0] + extra, say: base[1] + extra };
  }

  /* ---------- speaking turn ---------- */
  var recorder = null;

  function speakTurn(run, opts) {
    var o = opts || {};
    var t = timings();
    var cls = state.progress && state.progress.settings().mode === 'class';
    var result = { confirmed: false, usedHint: !!o.supported };

    function modelLine() { return run.say(o.model); }

    return Promise.resolve()
      .then(function () { pipMood(null); return run.say(o.prompt); })
      .then(function () {
        if (o.supported) {
          pipMood('thinking'); setBubble('', 'thinking');
          return run.wait(Math.round(t.think * 0.6))
            .then(function () { pipMood('pointing'); return modelLine(); })
            .then(function () { return run.say(cls ? EF.content.PHRASES.everybody : EF.content.PHRASES.yourTurn, { rate: 0.95 }); });
        }
        // Independent: wait time first; the model is only offered on the hint button.
        pipMood('thinking'); setBubble('', 'thinking');
        return run.wait(t.think);
      })
      .then(function () {
        // Classroom: after the choral practice, the independent turns go to one child at a time (name from the class list).
        var child = !o.supported && cls && EF.names ? EF.names.next() : null;
        result.child = child;
        if (!child) return null;
        pipMood('pointing');
        setBubble(child + ' – ' + EF.content.PHRASES.yourTurn);
        return run.guard(EF.audio.sayName(child)).then(function () { return run.say(EF.content.PHRASES.yourTurn, { rate: 0.95 }); });
      })
      .then(function () {
        pipMood('pointing');
        if (!o.supported) setBubble(o.prompt);
        return openPanel(run, o, t, result);
      })
      .then(function (how) {
        closePanel();
        pipMood(null);
        if (how === 'confirm') {
          result.confirmed = true;
          if (state.progress && state.missionId) state.progress.addSpeaking(state.missionId);
          pipMood('happy');
          EF.audio.sfx('sparkle');
          return run.say(EF.content.pick(EF.content.PHRASES.praise)).then(function () { return result; });
        }
        return result;
      }, function (err) { closePanel(); throw err; });
  }

  function openPanel(run, o, t, result) {
    var panel = el.speak;
    panel.innerHTML = '';
    panel.hidden = false;
    var ring = h('div', 'speak-ring', '<span class="speak-ring-fill" style="animation-duration:' + t.say + 'ms"></span><span class="speak-mouth">' + ICONS.mouth + '</span>');
    ring.setAttribute('aria-hidden', 'true');
    var row = h('div', 'speak-row');
    if (result.child) {
      var chip = h('div', 'speak-child');
      chip.textContent = result.child;
      panel.appendChild(chip);
    }
    var replay = iconButton('ear', 'b-ear', 'Hear the question again');
    var hint = iconButton('bulb', 'b-hint', 'Hear the answer (hint)');
    var thumb = iconButton('thumb', 'b-thumb', 'We said it! (grown-up confirms the child spoke)');
    var next = iconButton('next', 'b-next', 'Next');
    thumb.insertAdjacentHTML('beforeend', '<span class="btn-cap">We said it!</span>');
    next.hidden = true;
    row.appendChild(replay);
    row.appendChild(hint);

    var mic = null, playMine = null, blobUrl = null;
    // Smart boards have no microphone: the record button exists only in Home mode (and only if a grown-up has not turned it off).
    var micAllowed = state.progress && state.progress.settings().mode === 'home' && state.progress.settings().mic &&
      root.navigator && root.navigator.mediaDevices && root.navigator.mediaDevices.getUserMedia && typeof root.MediaRecorder !== 'undefined';
    if (micAllowed) {
      mic = iconButton('mic', 'b-mic', 'Record my voice (stays on this device)');
      playMine = iconButton('play', 'b-playmine', 'Listen to my voice');
      playMine.hidden = true;
      row.appendChild(mic);
      row.appendChild(playMine);
    }
    row.appendChild(thumb);
    row.appendChild(next);
    panel.appendChild(ring);
    panel.appendChild(row);
    panel.classList.remove('done');

    var open = true;
    return run.until(function (resolve) {
      var timer = setTimeout(function () {
        panel.classList.add('done');
        next.hidden = false;
        next.classList.add('nudge');
      }, t.say);
      replay.onclick = function () { EF.audio.sfx('tap'); speak(o.prompt); };
      if (result.child) { var chipEl = panel.querySelector('.speak-child'); if (chipEl) chipEl.onclick = function () { EF.audio.sayName(result.child); }; }
      hint.onclick = function () { result.usedHint = true; EF.audio.sfx('tap'); speak(o.model); };
      thumb.onclick = function () { resolve('confirm'); };
      next.onclick = function () { EF.audio.sfx('tap'); resolve('next'); };
      if (mic) {
        mic.onclick = function () {
          if (recorder) { recorder.stop(); return; }
          startRecording(mic, function (url) {
            // A recording that finishes after the turn has closed is deleted at once and never played.
            if (!open) { URL.revokeObjectURL(url); return; }
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            blobUrl = url;
            playMine.hidden = false;
            new root.Audio(url).play().catch(function () { /* ignore */ });
          });
        };
        playMine.onclick = function () { if (blobUrl) new root.Audio(blobUrl).play().catch(function () { /* ignore */ }); };
      }
      return function () {
        open = false;
        clearTimeout(timer);
        if (recorder) { try { recorder.stop(); } catch (e) { /* ignore */ } }
        if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
      };
    });
  }

  /* Local-only recording: kept in memory as a blob URL, never uploaded, discarded when the turn ends. */
  function startRecording(btn, onDone) {
    root.navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var chunks = [];
      var rec = new root.MediaRecorder(stream);
      recorder = rec;
      btn.classList.add('recording');
      var limit = setTimeout(function () { if (rec.state !== 'inactive') rec.stop(); }, 5000);
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        clearTimeout(limit);
        stream.getTracks().forEach(function (tr) { tr.stop(); });
        btn.classList.remove('recording');
        recorder = null;
        if (chunks.length) onDone(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })));
      };
      rec.start();
    }).catch(function () {
      btn.classList.add('denied');
      btn.disabled = true;
      btn.setAttribute('aria-label', 'Microphone not available');
    });
  }

  function closePanel() { el.speak.hidden = true; el.speak.innerHTML = ''; }

  /* ---------- reward overlay ---------- */
  function reward(run, opts) {
    var ov = el.overlay;
    ov.innerHTML = '';
    ov.hidden = false;
    ov.className = 'overlay reward';
    var card = h('div', 'reward-card');
    card.innerHTML = '<div class="reward-star">' + ICONS.star + '</div><div class="reward-title">' + (opts.title || 'Magic star!') + '</div>';
    var row = h('div', 'reward-row');
    var again = iconButton('again', 'b-again big', 'Play again');
    var map = iconButton('home', 'b-map big', 'Back to the farm map');
    again.insertAdjacentHTML('beforeend', '<span class="btn-cap">Again</span>');
    map.insertAdjacentHTML('beforeend', '<span class="btn-cap">Farm map</span>');
    row.appendChild(again); row.appendChild(map);
    card.appendChild(row);
    ov.appendChild(card);
    for (var i = 0; i < 14; i++) {
      var s = h('span', 'confetti');
      s.style.left = (5 + i * 6.7) + '%';
      s.style.animationDelay = (i % 5) * 0.15 + 's';
      s.style.background = ['#FFD84A', '#FF7FA8', '#7BD45A', '#4BB8E8', '#FF9F43'][i % 5];
      ov.appendChild(s);
    }
    EF.audio.sfx('star');
    updateStars();
    setTimeout(function () { map.focus(); }, 50);
    return run.until(function (resolve) {
      again.onclick = function () { resolve('again'); };
      map.onclick = function () { resolve('map'); };
      return function () {};
    }).then(function (v) { hideOverlay(); return v; }, function (e) { hideOverlay(); throw e; });
  }
  function hideOverlay() { el.overlay.hidden = true; el.overlay.innerHTML = ''; el.overlay.className = 'overlay'; }

  /* ---------- layout ---------- */
  function fit() {
    var vw = root.innerWidth, vh = root.innerHeight;
    // Portrait phones: turn the landscape stage by 90° so it fills the screen and buttons stay large.
    // Only phones (narrow side < 600px); tablets in portrait are large enough without turning.
    var rotated = vh > vw * 1.15 && vw < 600;
    var s = rotated ? Math.min(vh / W, vw / H) : Math.min(vw / W, vh / H);
    state.scale = s;
    state.rotated = rotated;
    el.stage.style.transform = 'translate(-50%, -50%)' + (rotated ? ' rotate(90deg)' : '') + ' scale(' + s + ')';
    document.documentElement.classList.toggle('is-portrait', rotated);
  }

  /* Screen point → stage coordinates (works for the rotated portrait stage too). */
  function toStage(clientX, clientY) {
    var r = el.stage.getBoundingClientRect();
    var dx = (clientX - (r.left + r.width / 2)) / state.scale;
    var dy = (clientY - (r.top + r.height / 2)) / state.scale;
    if (state.rotated) return { x: dy + W / 2, y: -dx + H / 2 };
    return { x: dx + W / 2, y: dy + H / 2 };
  }

  function init(progress) {
    state.progress = progress;
    el.stage = $('#stage');
    el.bg = $('#bg');
    el.world = $('#world');
    el.pipDock = $('#pip-dock');
    el.pip = $('#pip');
    el.pip.innerHTML = EF.art.pip();
    el.bubble = $('#bubble');
    el.bubbleText = $('#bubble-text');
    el.speak = $('#speak-panel');
    el.overlay = $('#overlay');
    el.stars = $('#hud-stars');
    el.starCount = $('#star-count');
    el.stars.insertAdjacentHTML('afterbegin', ICONS.star);

    var hud = $('#hud-left');
    el.homeBtn = iconButton('home', 'b-home', 'Farm map');
    el.replayBtn = iconButton('ear', 'b-replay', 'Hear Pip again');
    el.hintBtn = iconButton('bulb', 'b-hint', 'Hint');
    hud.appendChild(el.homeBtn);
    var hudR = $('#hud-right');
    hudR.insertBefore(el.hintBtn, hudR.firstChild);
    hudR.insertBefore(el.replayBtn, hudR.firstChild);
    el.replayBtn.onclick = function () { EF.audio.sfx('tap'); if (state.replay) state.replay(); else if (state.lastLine) speak(state.lastLine); };
    el.hintBtn.onclick = function () { EF.audio.sfx('tap'); if (state.hint) state.hint(); };

    EF.audio.onSpeech(function (type) { el.pip.classList.toggle('is-talking', type === 'start'); });
    el.pip.addEventListener('click', function () { if (state.lastLine) speak(state.lastLine); });

    root.addEventListener('resize', fit);
    root.addEventListener('orientationchange', fit);
    fit();
  }

  EF.stage = {
    W: W, H: H, ABORT: ABORT, ICONS: ICONS,
    init: init, createRunner: createRunner, speak: speak, setBubble: setBubble, pipMood: pipMood, setPipVisible: setPipVisible,
    setHud: setHud, setReplay: setReplay, setHint: setHint, updateStars: updateStars, speakTurn: speakTurn, reward: reward,
    hideOverlay: hideOverlay, closePanel: closePanel, toStage: toStage, iconButton: iconButton, h: h, timings: timings,
    el: function () { return el; },
    setMission: function (id) { state.missionId = id; },
    homeButton: function () { return el.homeBtn; }
  };
})(this);
