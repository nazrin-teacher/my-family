/*
 * Artwork for Momo's Little Restaurant: painted sprites (transparent WebP, made in Canva) in assets/img/sprites/,
 * painted backgrounds in assets/img/, and the family characters of Unit 2 (../assets/c_<id>.webp).
 * Every function returns an HTML string; class names are the contract with css/styles.css.
 * Chef Momo uses the same stacked-pose system as Pip in the farm (CSS classes .pip / .pip-sprite / .pose-*).
 */
(function (root) {
  'use strict';
  var DIR = 'assets/img/sprites/';

  function img(src, cls) {
    return '<img class="' + cls + '" src="' + src + '" alt="" aria-hidden="true" draggable="false" onerror="EF.art.onImgError(this)">';
  }
  function onImgError(el) { el.classList.add('img-missing'); if (root.console) root.console.warn('Missing image:', el.getAttribute('src')); }
  function installDefs() {}

  /* Food, drinks and props (plate, tray, apple, wheat, bread). */
  function food(id, extraClass) {
    return '<span class="sprite-wrap food-sprite food-' + id + ' ' + (extraClass || '') + '">' + img(DIR + id + '.webp', 'sprite') + '</span>';
  }
  /* Farm animals for the Little Red Hen story. */
  function animal(id, extraClass) {
    return '<span class="sprite-wrap animal-sprite animal-' + id + ' ' + (extraClass || '') + '">' + img(DIR + id + '.webp', 'sprite') + '</span>';
  }
  /* Family characters from Unit 2. */
  function person(id, extraClass) {
    return '<span class="sprite-wrap person-sprite person-' + id + ' ' + (extraClass || '') + '">' + img('../assets/c_' + id + '.webp', 'sprite') + '</span>';
  }

  var POSES = ['idle', 'talk', 'happy', 'think', 'point', 'wave', 'taste'];
  function pip(extraClass) {
    var s = '<span class="sprite-wrap pip-sprite momo-sprite ' + (extraClass || '') + '">';
    POSES.forEach(function (p) { s += img(DIR + 'momo-' + p + '.webp', 'sprite pose pose-' + p); });
    return s + '</span>';
  }

  function landscape(opts) {
    var o = opts || {};
    var s = '<div class="landscape rest-base" aria-hidden="true"></div>';
    if (o.paint) s += '<img class="bg-paint bg-' + o.paint + '" src="assets/img/bg-' + o.paint + '.webp" alt="" aria-hidden="true" draggable="false" onerror="this.remove()">';
    return s;
  }

  var SPRITES = ['pasta', 'rice', 'fish', 'chicken', 'salad', 'applepie', 'cake', 'water', 'juice', 'plate', 'tray', 'apple', 'wheat', 'bread', 'hen', 'duck', 'pig'];
  var preloadPromise = null;
  function preload(maxMs) {
    if (preloadPromise) return preloadPromise;
    var names = [];
    POSES.forEach(function (p) { names.push(DIR + 'momo-' + p + '.webp'); });
    SPRITES.forEach(function (n) { names.push(DIR + n + '.webp'); });
    ['home', 'ear', 'bulb', 'mic', 'play', 'next', 'thumb', 'again', 'star', 'mouth', 'gear'].forEach(function (n) { names.push(DIR + 'icon-' + n + '.webp'); });
    ['hall', 'kitchen', 'table', 'cert'].forEach(function (n) { names.push('assets/img/bg-' + n + '.webp'); });
    ['mum', 'dad', 'sister', 'brother', 'grandma', 'grandpa', 'aunt', 'uncle'].forEach(function (n) { names.push('../assets/c_' + n + '.webp'); });
    var loads = names.map(function (src) {
      return new Promise(function (resolve) { var im = new root.Image(); im.onload = im.onerror = function () { resolve(); }; im.src = src; });
    });
    preloadPromise = Promise.race([Promise.all(loads), new Promise(function (r) { setTimeout(r, maxMs || 8000); })]);
    return preloadPromise;
  }

  root.EF = root.EF || {};
  root.EF.art = { preload: preload, installDefs: installDefs, food: food, animal: animal, person: person, pip: pip, landscape: landscape, onImgError: onImgError, POSES: POSES };
})(this);
