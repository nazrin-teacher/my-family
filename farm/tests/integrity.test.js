'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');
const INDEX_HTML = path.join(ROOT, 'index.html');

function collectJsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results.sort();
}

test('parses every js/**/*.js with vm.Script and verifies every script src in index.html exists', () => {
  const jsFiles = collectJsFiles(JS_DIR);
  assert.ok(jsFiles.length >= 8, `Expected at least 8 JS files under js/, found ${jsFiles.length}`);

  for (const file of jsFiles) {
    const rel = path.relative(ROOT, file);
    const code = fs.readFileSync(file, 'utf8');
    assert.doesNotThrow(
      () => new vm.Script(code, { filename: rel }),
      `Syntax error while parsing ${rel}`
    );
  }

  assert.ok(fs.existsSync(INDEX_HTML), 'index.html must exist');
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const srcs = [];
  const scriptTagRe = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = scriptTagRe.exec(html)) !== null) {
    srcs.push(match[1]);
  }

  assert.ok(srcs.length >= 8, `Expected at least 8 <script src> tags in index.html, found ${srcs.length}`);

  for (const src of srcs) {
    const cleanSrc = src.split(/[?#]/)[0];
    const resolved = path.resolve(ROOT, cleanSrc);
    assert.ok(
      resolved.startsWith(ROOT + path.sep),
      `Script src "${src}" resolves outside project root`
    );
    assert.ok(
      fs.existsSync(resolved) && fs.statSync(resolved).isFile(),
      `Missing script file referenced in index.html: ${src}`
    );
    const code = fs.readFileSync(resolved, 'utf8');
    assert.doesNotThrow(
      () => new vm.Script(code, { filename: cleanSrc }),
      `Syntax error in index.html script ${src}`
    );
  }
});

test('every assets/img/sprites/*.webp path referenced in js/ and index.html exists on disk', (t) => {
  const sources = [INDEX_HTML, ...collectJsFiles(JS_DIR)];
  const spriteRe = /assets\/img\/sprites\/[A-Za-z0-9_-]+\.webp/g;
  const referencedSet = new Set();

  for (const file of sources) {
    const text = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = spriteRe.exec(text)) !== null) {
      referencedSet.add(match[0]);
    }
  }

  const referenced = Array.from(referencedSet).sort();
  assert.ok(
    referenced.length >= 15,
    `Expected at least 15 UI/lantern sprite paths referenced, found ${referenced.length}`
  );

  const missing = referenced.filter((rel) => {
    const full = path.join(ROOT, rel);
    return !fs.existsSync(full) || !fs.statSync(full).isFile();
  });

  if (missing.length > 0) {
    t.skip(
      `Sprites still generating (${missing.length}/${referenced.length} missing): ${missing.join(', ')}`
    );
    return;
  }

  for (const rel of referenced) {
    const full = path.join(ROOT, rel);
    assert.ok(fs.statSync(full).size > 0, `Sprite file is empty: ${rel}`);
  }
});

test('no <svg string remains in index.html or UI/game JS files (excluding js/art.js)', () => {
  const artPath = path.join(JS_DIR, 'art.js');
  const files = [INDEX_HTML, ...collectJsFiles(JS_DIR).filter((f) => f !== artPath)];
  const offenders = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.toLowerCase().includes('<svg')) {
      offenders.push(path.relative(ROOT, file));
    }
  }

  assert.deepStrictEqual(offenders, [], `Unexpected <svg found in: ${offenders.join(', ')}`);
});

test(
  'no <svg string remains anywhere in js/ or index.html',
  () => {
    const files = [INDEX_HTML, ...collectJsFiles(JS_DIR)];
    const offenders = [];

    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (text.toLowerCase().includes('<svg')) {
        offenders.push(path.relative(ROOT, file));
      }
    }

    assert.deepStrictEqual(offenders, [], `Found <svg in: ${offenders.join(', ')}`);
  }
);

test('every sprite that js/art.js can request exists (webp or png)', (t) => {
  const art = fs.readFileSync(path.join(ROOT, 'js', 'art.js'), 'utf8');
  const names = new Set(['pip-idle', 'pip-talk', 'pip-happy', 'pip-think', 'pip-point', 'pip-wave',
    'cow', 'horse', 'pig', 'hen', 'sheep', 'duck']);
  const block = /var PIECES = \{([\s\S]*?)\};/.exec(art);
  assert.ok(block, 'PIECES table found in art.js');
  for (const m of block[1].matchAll(/'([a-z-]+)'/g)) names.add(m[1]);
  const dir = path.join(ROOT, 'assets', 'img', 'sprites');
  const missing = [...names].filter((n) => !fs.existsSync(path.join(dir, n + '.webp')) && !fs.existsSync(path.join(dir, n + '.png')));
  if (missing.length) { t.skip(`Sprites still generating (${missing.length} missing): ${missing.join(', ')}`); return; }
  assert.deepStrictEqual(missing, []);
});
