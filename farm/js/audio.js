/*
 * Audio: Pip's voice (prerecorded file if listed in VOICE_FILES, otherwise browser text-to-speech),
 * synthesised sound effects and animal sounds (WebAudio), and browser audio unlock.
 * To use real recordings later, add entries such as VOICE_FILES['What can you see?'] = 'assets/audio/what-can-you-see.mp3'
 * and SOUND_FILES.cow = 'assets/audio/cow.mp3'. Missing files fall back to TTS / synth automatically.
 */
(function (root) {
  'use strict';

  var VOICE_FILES = {};
  var SOUND_FILES = {};
  /* Recorded sentences (natural voice): key = sentence in lower case without punctuation → file. Filled by js/voice.js. */
  var VOICE_KEYS = {};
  function akey(s) { return String(s).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function sents(t) { return (String(t).match(/[^.!?]+[.!?]*/g) || []).map(function (s) { return s.trim(); }).filter(Boolean); }
  var seq = 0; // increases on every new line / stop, so an older line never ends the newer one

  var ctx = null;
  var voice = null;
  var listeners = [];
  var hasTTS = typeof root.speechSynthesis !== 'undefined' && typeof root.SpeechSynthesisUtterance !== 'undefined';
  var current = null; // { cancel }

  var PREFERRED = [/Google UK English Female/i, /Microsoft (Sonia|Libby|Maisie).*Natural/i, /Microsoft (Aria|Jenny|Ana).*Natural/i,
    /Serena|Kate|Stephanie|Martha/i, /Samantha/i, /Karen|Moira|Tessa/i, /Google US English/i, /Daniel/i];

  function pickVoice() {
    if (!hasTTS) return null;
    var list = root.speechSynthesis.getVoices().filter(function (v) { return /^en[-_]/i.test(v.lang) || v.lang === 'en'; });
    if (!list.length) return null;
    for (var i = 0; i < PREFERRED.length; i++) {
      for (var j = 0; j < list.length; j++) if (PREFERRED[i].test(list[j].name)) return list[j];
    }
    var gb = list.filter(function (v) { return /en[-_]GB/i.test(v.lang); });
    return gb[0] || list[0];
  }
  if (hasTTS) {
    voice = pickVoice();
    if (root.speechSynthesis.addEventListener) root.speechSynthesis.addEventListener('voiceschanged', function () { voice = pickVoice(); });
  }

  function emit(type, text) { listeners.forEach(function (fn) { try { fn(type, text); } catch (e) { /* ignore */ } }); }

  function getCtx() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }

  /* Must be called from a user gesture (the big Play button). */
  function unlock() {
    var c = getCtx();
    if (c && c.state === 'suspended') c.resume();
    if (c) { var b = c.createBuffer(1, 1, 22050); var s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); }
    if (hasTTS) { var u = new root.SpeechSynthesisUtterance(' '); u.volume = 0; root.speechSynthesis.speak(u); }
  }

  function stop() {
    seq++;
    if (current) { current.cancel(); current = null; }
    if (hasTTS) root.speechSynthesis.cancel();
    emit('end', '');
  }

  function playFile(url) {
    return new Promise(function (resolve, reject) {
      var a = new root.Audio(url);
      var done = false;
      function fin(ok) { if (done) return; done = true; ok ? resolve() : reject(new Error('audio file failed')); }
      a.onended = function () { fin(true); };
      a.onerror = function () { fin(false); };
      current = { cancel: function () { a.pause(); fin(true); } };
      var p = a.play();
      if (p && p.catch) p.catch(function () { fin(false); });
    });
  }

  function tts(text, opts) {
    return new Promise(function (resolve) {
      if (!hasTTS) { setTimeout(resolve, 600 + text.length * 55); return; }
      var u = new root.SpeechSynthesisUtterance(text);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-GB';
      u.rate = (opts && opts.rate) || 0.86;
      u.pitch = (opts && opts.pitch) || 1.25;
      var done = false;
      // onend is not fired reliably on every browser, so a timeout always finishes the line.
      var timer = setTimeout(fin, 2500 + text.length * 110);
      function fin() { if (done) return; done = true; clearTimeout(timer); resolve(); }
      u.onend = fin; u.onerror = fin;
      current = { cancel: fin };
      root.speechSynthesis.cancel();
      root.speechSynthesis.speak(u);
    });
  }

  /* Recorded clips for every sentence of the line, in order; null if any sentence has no recording. */
  function clipsFor(text) {
    if (VOICE_FILES[text]) return [VOICE_FILES[text]];
    var parts = sents(text);
    if (!parts.length) return null;
    var files = parts.map(function (s) { return VOICE_FILES[s] || VOICE_KEYS[akey(s)]; });
    return files.every(Boolean) ? files : null;
  }
  function playClips(files, my) {
    var i = 0;
    return new Promise(function (resolve, reject) {
      (function next() {
        if (my !== seq || i >= files.length) { resolve(); return; }
        playFile(files[i++]).then(next, reject);
      })();
    });
  }

  /* Pip speaks. Resolves when the line is finished (or cancelled). */
  function say(text, opts) {
    stop();
    var my = seq;
    emit('start', text);
    var files = clipsFor(text);
    var p = files ? playClips(files, my).catch(function () { return my === seq ? tts(text, opts) : null; }) : tts(text, opts);
    return p.then(function () { if (my === seq) emit('end', text); });
  }

  /* A child's name (Turkish names) with a Turkish device voice when there is one. */
  function sayName(name) {
    stop();
    var my = seq;
    return new Promise(function (resolve) {
      if (!hasTTS) { setTimeout(resolve, 900); return; }
      var u = new root.SpeechSynthesisUtterance(name);
      var tr = root.speechSynthesis.getVoices().filter(function (v) { return /^tr/i.test(v.lang); })[0];
      if (tr) u.voice = tr;
      u.lang = 'tr-TR'; u.rate = 0.9;
      var done = false, timer = setTimeout(fin, 2500 + name.length * 120);
      function fin() { if (done) return; done = true; clearTimeout(timer); resolve(); }
      u.onend = fin; u.onerror = fin;
      current = { cancel: fin };
      root.speechSynthesis.cancel();
      root.speechSynthesis.speak(u);
    }).then(function () { return my === seq; });
  }

  /* ---------- synthesised effects ---------- */

  function tone(c, o) {
    var t = c.currentTime + (o.delay || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    var f = c.createBiquadFilter();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    if (o.vib) {
      var lfo = c.createOscillator(); var lg = c.createGain();
      lfo.frequency.value = o.vib; lg.gain.value = o.vibDepth || 12;
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + o.dur);
    }
    f.type = 'lowpass'; f.frequency.value = o.cut || 4000; f.Q.value = o.q || 1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.25, t + (o.att || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(f); f.connect(g); g.connect(c.destination);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }

  var SFX = {
    pop: [{ f0: 380, f1: 900, dur: 0.12, vol: 0.2 }],
    tap: [{ f0: 660, dur: 0.08, vol: 0.12, type: 'triangle' }],
    sparkle: [{ f0: 1320, dur: 0.18, vol: 0.12 }, { f0: 1760, dur: 0.18, vol: 0.1, delay: 0.08 }, { f0: 2350, dur: 0.3, vol: 0.08, delay: 0.16 }],
    success: [{ f0: 523, dur: 0.16, vol: 0.18, type: 'triangle' }, { f0: 659, dur: 0.16, vol: 0.18, type: 'triangle', delay: 0.12 }, { f0: 784, dur: 0.32, vol: 0.18, type: 'triangle', delay: 0.24 }],
    soft: [{ f0: 300, f1: 220, dur: 0.2, vol: 0.12, type: 'triangle' }],
    whoosh: [{ f0: 200, f1: 900, dur: 0.3, vol: 0.08, type: 'sawtooth', cut: 1200 }],
    star: [{ f0: 784, dur: 0.2, vol: 0.15 }, { f0: 988, dur: 0.2, vol: 0.15, delay: 0.15 }, { f0: 1175, dur: 0.2, vol: 0.15, delay: 0.3 }, { f0: 1568, dur: 0.5, vol: 0.15, delay: 0.45 }]
  };

  /* Cartoon approximations; replace with licensed recordings via SOUND_FILES for best quality. */
  var ANIMAL_SYNTH = {
    cow: [{ type: 'sawtooth', f0: 150, f1: 110, dur: 1.1, vol: 0.3, att: 0.15, cut: 700, q: 4, vib: 5, vibDepth: 4 }],
    horse: [{ type: 'sawtooth', f0: 900, f1: 500, dur: 0.9, vol: 0.18, cut: 2500, vib: 18, vibDepth: 70 }],
    pig: [{ type: 'square', f0: 180, f1: 130, dur: 0.22, vol: 0.2, cut: 900, q: 6 }, { type: 'square', f0: 190, f1: 140, dur: 0.22, vol: 0.2, cut: 900, q: 6, delay: 0.3 }],
    hen: [{ type: 'square', f0: 700, f1: 500, dur: 0.1, vol: 0.12, cut: 2000 }, { type: 'square', f0: 720, f1: 520, dur: 0.1, vol: 0.12, cut: 2000, delay: 0.16 }, { type: 'square', f0: 900, f1: 600, dur: 0.22, vol: 0.12, cut: 2000, delay: 0.32 }],
    sheep: [{ type: 'sawtooth', f0: 420, f1: 380, dur: 0.9, vol: 0.18, cut: 1500, q: 3, vib: 9, vibDepth: 25, att: 0.06 }],
    duck: [{ type: 'sawtooth', f0: 500, f1: 380, dur: 0.18, vol: 0.18, cut: 1300, q: 8 }, { type: 'sawtooth', f0: 520, f1: 390, dur: 0.18, vol: 0.18, cut: 1300, q: 8, delay: 0.25 }]
  };

  function playList(list) {
    var c = getCtx();
    if (!c) return Promise.resolve();
    if (c.state === 'suspended') c.resume();
    var end = 0;
    list.forEach(function (o) { tone(c, o); end = Math.max(end, (o.delay || 0) + o.dur); });
    return new Promise(function (r) { setTimeout(r, end * 1000 + 80); });
  }

  function sfx(name) { return SFX[name] ? playList(SFX[name]) : Promise.resolve(); }

  function animalSound(id) {
    if (SOUND_FILES[id]) return playFile(SOUND_FILES[id]).catch(function () { return playList(ANIMAL_SYNTH[id] || []); });
    return playList(ANIMAL_SYNTH[id] || []);
  }

  root.EF = root.EF || {};
  root.EF.audio = {
    VOICE_FILES: VOICE_FILES, SOUND_FILES: SOUND_FILES, VOICE_KEYS: VOICE_KEYS, akey: akey, sents: sents, clipsFor: clipsFor,
    unlock: unlock, say: say, sayName: sayName, stop: stop, sfx: sfx, animalSound: animalSound,
    onSpeech: function (fn) { listeners.push(fn); },
    hasTTS: function () { return hasTTS; },
    voiceName: function () { return Object.keys(VOICE_KEYS).length ? 'recorded natural voice' + (voice ? ' (device voice for extra lines: ' + voice.name + ')' : '') : voice ? voice.name + ' (' + voice.lang + ')' : (hasTTS ? 'default voice' : 'none'); },
    hasEnglishVoice: function () { return !!voice || Object.keys(VOICE_KEYS).length > 0; }
  };
})(this);
