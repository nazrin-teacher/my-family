/*
 * Artwork for The Enchanted Farm: original painted sprites (transparent WebP; the PNG copies were dropped to keep the site small)
 * in assets/img/sprites/ and painted backgrounds in assets/img/. No SVG.
 * Every function returns an HTML string; class names are the contract with css/styles.css.
 */
(function (root) {
  'use strict';

  var DIR = 'assets/img/sprites/';

  /* <img> that tries .webp, then an optional fallback sprite name. */
  function img(name, cls, fallback) {
    return '<img class="' + cls + '" src="' + DIR + name + '.webp" alt="" aria-hidden="true" draggable="false"' +
      (fallback ? ' data-fb="' + fallback + '"' : '') +
      ' onerror="EF.art.onImgError(this)">';
  }

  function onImgError(el) {
    var src = el.getAttribute('src') || '';
    var fb = el.getAttribute('data-fb');
    if (fb) { el.removeAttribute('data-fb'); el.setAttribute('src', DIR + fb + '.webp'); return; }
    el.classList.add('img-missing');
    if (root.console) root.console.warn('Missing image:', src);
  }

  function installDefs() { /* kept for API compatibility; nothing to install without SVG */ }

  /* Animals: one painted sprite each, facing left. */
  function animal(id, extraClass) {
    return '<span class="sprite-wrap animal-sprite animal-' + id + ' ' + (extraClass || '') + '">' + img(id, 'sprite') + '</span>';
  }

  /* Pip: all poses stacked; CSS shows the one that matches #pip.is-talking / is-happy / is-thinking / is-pointing. */
  var PIP_POSES = ['idle', 'talk', 'happy', 'think', 'point', 'wave'];
  function pip(extraClass) {
    var s = '<span class="sprite-wrap pip-sprite ' + (extraClass || '') + '">';
    PIP_POSES.forEach(function (p) { s += img('pip-' + p, 'sprite pose pose-' + p, p === 'idle' ? null : 'pip-idle'); });
    return s + '</span>';
  }

  /* Scenery pieces. Pieces with an "open" state carry both images; CSS swaps them (.barn-open, .gate-open). */
  var PIECES = {
    barn: ['barn', 'barn-open'], gate: ['gate', 'gate-open'],
    stable: ['stable'], henhouse: ['henhouse'], mud: ['mud'], field: ['field'], pond: ['pond'], bush: ['bush'],
    hay: ['hay'], tree: ['tree'], cart: ['cart'], flowers: ['flowers'], log: ['log'], tent: ['tent'],
    rainbow: ['rainbow'], trough: ['trough']
  };
  function piece(name, extraClass) {
    var files = PIECES[name] || [name];
    var s = '<span class="sprite-wrap piece piece-' + name + ' ' + (extraClass || '') + '">';
    files.forEach(function (f, i) { s += img(f, 'sprite' + (i === 0 ? ' state-closed' : ' state-open'), i === 0 ? null : files[0]); });
    return s + '</span>';
  }

  /* Background: CSS gradient base + painted image (webp → png). Dusk is the .magic-veil layer in CSS. */
  function landscape(opts) {
    var o = opts || {};
    var s = '<div class="landscape' + (o.dusk ? ' dusk' : '') + '" aria-hidden="true"></div>';
    if (o.paint) {
      // webp → optional fallback painting (paintFallback) → removed (gradient base stays).
      s += '<img class="bg-paint bg-' + o.paint + '" src="assets/img/bg-' + o.paint + '.webp" alt="" aria-hidden="true" draggable="false"' +
        (o.paintFallback ? ' data-fb="' + o.paintFallback + '"' : '') + ' onerror="EF.art.onBgError(this)">';
    }
    return s;
  }

  function onBgError(el) {
    var fb = el.getAttribute('data-fb');
    if (fb) { el.removeAttribute('data-fb'); el.setAttribute('src', 'assets/img/bg-' + fb + '.webp'); return; }
    el.remove();
  }

  /*
   * Load every image the game needs before play starts, so Pip never talks about a picture that is not
   * on screen yet. Resolves when all are loaded (or failed), or after maxMs at the latest.
   */
  var preloadPromise = null;
  function preload(maxMs) {
    if (preloadPromise) return preloadPromise;
    var names = [];
    PIP_POSES.forEach(function (p) { names.push(DIR + 'pip-' + p + '.webp'); });
    ['cow', 'horse', 'pig', 'hen', 'sheep', 'duck', 'lantern-off', 'lantern-on', 'lantern-done'].forEach(function (n) { names.push(DIR + n + '.webp'); });
    ['home', 'ear', 'bulb', 'mic', 'play', 'next', 'thumb', 'again', 'star', 'mouth', 'gear'].forEach(function (n) { names.push(DIR + 'icon-' + n + '.webp'); });
    Object.keys(PIECES).forEach(function (k) { PIECES[k].forEach(function (f) { names.push(DIR + f + '.webp'); }); });
    ['welcome', 'map', 'meadow', 'farm', 'littlefarm'].forEach(function (n) { names.push('assets/img/bg-' + n + '.webp'); });
    var loads = names.map(function (src) {
      return new Promise(function (resolve) {
        var im = new root.Image();
        im.onload = im.onerror = function () { resolve(); };
        im.src = src;
        if (im.decode) im.decode().then(resolve, resolve);
      });
    });
    preloadPromise = Promise.race([
      Promise.all(loads),
      new Promise(function (r) { setTimeout(r, maxMs || 8000); })
    ]);
    return preloadPromise;
  }

  var API = { preload: preload, onBgError: onBgError, installDefs: installDefs, animal: animal, pip: pip, piece: piece, landscape: landscape, PIECES: PIECES, onImgError: onImgError };
  root.EF = root.EF || {};
  root.EF.art = API;
})(this);
