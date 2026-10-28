/*
 * Class names for individual speaking turns (Classroom mode only).
 * The names come from the My Family site on the same address (its Settings → Names list);
 * children marked absent today are skipped, and everybody gets one turn before anyone gets a second.
 * Nothing is sent anywhere; without a class list the farm simply keeps choral turns.
 */
(function (root) {
  'use strict';
  var SITE_KEY = 'myfamily-teacher', TURN_KEY = 'enchanted-farm:turns';
  function today() { return new Date().toISOString().slice(0, 10); }
  function read(k) { try { return JSON.parse(root.localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function list() {
    var s = read(SITE_KEY);
    if (!s || !s.names) return [];
    var cls = s.cls || 'class';
    var all = Array.isArray(s.names[cls]) ? s.names[cls].filter(function (n) { return typeof n === 'string' && n.trim(); }) : [];
    var a = s.absent && s.absent[cls];
    var absent = a && a.date === today() && Array.isArray(a.list) ? a.list : [];
    return all.filter(function (n) { return absent.indexOf(n) < 0; });
  }
  function next() {
    var all = list();
    if (!all.length) return null;
    var d = read(TURN_KEY) || {};
    var done = (Array.isArray(d.done) ? d.done : []).filter(function (n) { return all.indexOf(n) >= 0; });
    var pool = all.filter(function (n) { return done.indexOf(n) < 0; });
    if (!pool.length) { done = []; pool = all.slice(); }
    var n = pool[Math.floor(Math.random() * pool.length)];
    done.push(n);
    try { root.localStorage.setItem(TURN_KEY, JSON.stringify({ done: done })); } catch (e) { /* ignore */ }
    return n;
  }
  root.EF = root.EF || {};
  root.EF.names = { list: list, next: next };
})(this);
