/*
 * Local progress for one device. Nothing leaves the browser.
 * Stores only: completed mission ids, number of adult-confirmed speaking turns,
 * and settings. No names, photos or audio.
 */
(function (root) {
  'use strict';

  var KEY = 'enchanted-farm:v1';

  function defaults() {
    return {
      version: 1,
      completed: {},          // { "1": true }
      speaking: {},           // { "1": 4 } adult-confirmed speaking turns per mission
      settings: { mode: 'home', mic: true, wait: 'normal', reducedMotion: false }
    };
  }

  function memoryStorage() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; }
    };
  }

  function sanitize(raw) {
    var d = defaults();
    if (!raw || typeof raw !== 'object' || raw.version !== 1) return d;
    if (raw.completed && typeof raw.completed === 'object') {
      Object.keys(raw.completed).forEach(function (k) { if (raw.completed[k] === true && /^\d+$/.test(k)) d.completed[k] = true; });
    }
    if (raw.speaking && typeof raw.speaking === 'object') {
      Object.keys(raw.speaking).forEach(function (k) {
        var n = raw.speaking[k];
        if (/^\d+$/.test(k) && typeof n === 'number' && n >= 0 && isFinite(n)) d.speaking[k] = Math.floor(n);
      });
    }
    var s = raw.settings || {};
    if (s.mode === 'home' || s.mode === 'class') d.settings.mode = s.mode;
    if (typeof s.mic === 'boolean') d.settings.mic = s.mic;
    if (s.wait === 'short' || s.wait === 'normal' || s.wait === 'long') d.settings.wait = s.wait;
    if (typeof s.reducedMotion === 'boolean') d.settings.reducedMotion = s.reducedMotion;
    return d;
  }

  function createProgress(storage, missions) {
    var store = storage;
    var persistent = true;
    try {
      if (!store) throw new Error('no storage');
      var probe = KEY + ':probe';
      store.setItem(probe, '1');
      store.removeItem(probe);
    } catch (e) {
      store = memoryStorage();
      persistent = false;
    }

    var state;
    try { state = sanitize(JSON.parse(store.getItem(KEY))); } catch (e) { state = defaults(); }

    function save() {
      try { store.setItem(KEY, JSON.stringify(state)); } catch (e) { persistent = false; }
    }

    function ready() { return (missions || []).filter(function (m) { return m.status === 'ready'; }); }

    return {
      isPersistent: function () { return persistent; },
      get: function () { return JSON.parse(JSON.stringify(state)); },
      settings: function () { return Object.assign({}, state.settings); },
      setSetting: function (name, value) {
        var next = sanitize({ version: 1, completed: state.completed, speaking: state.speaking, settings: Object.assign({}, state.settings, (function () { var o = {}; o[name] = value; return o; })()) });
        state.settings = next.settings;
        save();
      },
      isCompleted: function (id) { return state.completed[String(id)] === true; },
      complete: function (id) { state.completed[String(id)] = true; save(); },
      stars: function () { return Object.keys(state.completed).length; },
      addSpeaking: function (id) { var k = String(id); state.speaking[k] = (state.speaking[k] || 0) + 1; save(); },
      speakingCount: function (id) {
        if (id === undefined) return Object.keys(state.speaking).reduce(function (s, k) { return s + state.speaking[k]; }, 0);
        return state.speaking[String(id)] || 0;
      },
      /* Home mode: ready missions unlock in order. Classroom mode: teacher may open any ready mission. */
      isUnlocked: function (id) {
        var list = ready();
        var idx = -1;
        for (var i = 0; i < list.length; i++) if (list[i].id === id) idx = i;
        if (idx === -1) return false;
        if (state.settings.mode === 'class' || idx === 0) return true;
        return state.completed[String(list[idx - 1].id)] === true;
      },
      /* The mission the map should point at: first unlocked, not completed ready mission. */
      current: function () {
        var list = ready();
        for (var i = 0; i < list.length; i++) {
          if (!state.completed[String(list[i].id)] && this.isUnlocked(list[i].id)) return list[i].id;
        }
        return null;
      },
      /* Restart the adventure: clears progress but keeps the adult's settings. */
      reset: function () { var s = state.settings; state = defaults(); state.settings = s; save(); }
    };
  }

  var API = { createProgress: createProgress, KEY: KEY, sanitize: sanitize, memoryStorage: memoryStorage };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.EF = root.EF || {}; root.EF.progress = API; }
})(this);
