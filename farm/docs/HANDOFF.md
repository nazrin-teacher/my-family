# Enchanted Farm – team handoff (first release)

Static site, no build, no dependencies. Classic `<script>` files (not ES modules) so `index.html` also works when opened directly from disk.
Load order: `content.js → progress.js → art.js → audio.js → stage.js → games/*.js → main.js`.

| File | Owner | Purpose |
|---|---|---|
| `js/content.js` | Lead | All educational content (animals, phrases, 14 missions) + pure helpers. Node-testable (`module.exports`). |
| `js/progress.js` | Lead | localStorage progress, settings, unlock rules. Node-testable. |
| `js/art.js` | Lead | Original SVG: Pip, 6 animals, scenery pieces, landscape. |
| `js/audio.js` | Lead | TTS voice, WebAudio sfx + synthesised animal sounds, audio unlock, optional recorded files. |
| `js/stage.js` | Lead | 1600×900 stage scaling, Pip + bubble, HUD, abortable runner, speaking turn, reward overlay. |
| `js/main.js` | Lead | Welcome, map, mission routing, grown-ups dialog. |
| `js/games/meet.js`, `js/games/rescue.js` | Lead | Mission 1 and 2. |
| `css/styles.css` | **Developer** | All styling and animation (does not exist yet). |
| `assets/img/*` | **Developer** | Optional painted backgrounds (see below). |
| `package.json`, `tests/*`, `README.md` | **Implementer 2** | Tests and setup/deploy docs. |

## Stage contract (for styles.css)
- `#stage.stage` is exactly `width:1600px;height:900px; position:fixed; left:50%; top:50%; transform-origin:center`. JS sets `transform: translate(-50%,-50%) scale(s)` — CSS must not set `transform` on `#stage`.
- `body` fills the viewport (no scroll, `overscroll-behavior:none`, `touch-action:manipulation`), background matches the sky/grass so letterboxing looks intentional.
- `.layer` = absolute, inset 0. `#bg` holds the `<svg class="landscape">` (fill 100%). `#world` holds game objects.
- Everything JS places in `#world` (`.deco`, `.actor`, `.lantern`, `.home-target`, `.hide-spot`, `.resident`, `.peek-wrap`, `.parade`, `.title-block`, `.welcome-pip`, `.play-big`, `.restart-small`, `.map-path`) is `position:absolute`; JS sets `left/top/width` in stage px. Inner `<svg>` should be `width:100%; height:auto; display:block`.
- Screen classes on `#stage`: `.screen-welcome`, `.screen-map`, `.screen-mission`; extra: `.rescue-dim` (scene slightly dark/dusky), `.lights-on` (bright, sparkles), CSS vars `--magic` (0–1, map brightness; low = dusk) and `--rescued` (0–1).
- `.magic-veil`: full-stage dusk overlay; opacity should follow `calc(.45 * (1 - var(--magic, 1)))` on the map, `.rescue-dim` → visible, `.lights-on` → 0.

### Pip and bubble
- `#pip-dock.pip-dock` bottom-left (≈ left 10px, bottom 0, Pip ≈ 250px wide). `.pip-right`, `.pip-center` variants exist (rarely used).
- `#pip.pip` contains `svg.pip-svg`; states on `#pip`: `.is-talking` (animate `.pip-beak-low` open/close), `.is-happy` (hop), `.is-thinking` (tilt), `.is-pointing` (wing `.pip-wing-r` raised). Idle: gentle bob, `.pip-eyes` blink. Click on Pip repeats the last line (cursor pointer).
- `#bubble` is now a direct child of `#stage` (not inside `.pip-dock`), so position it in stage coordinates.
- Portrait phones: JS rotates the whole stage 90° (`html.is-portrait`), so the stage is never tiny; `.rotate-hint` is no longer needed (keep it `display:none`).
- `.actor` transition should include `width` as well as `left, top`.
- `#bubble.bubble` speech bubble to the right of Pip (≈ left 240px, bottom 190px, max-width 760px, font ≈ 40px, rounded, white, tail pointing to Pip). `.thinking` shows `.dots > i` animated dots. On `.screen-map` put the bubble top-centre (≈ top 20px, centred) so it doesn't cover lanterns.

### HUD
- `.hud` top bar: `.hud-left` (home button) top-left, `.hud-right` (replay, hint, stars) top-right. Note `#grownups-open` sits OUTSIDE the stage, fixed top-right of the viewport, small, low-contrast (adult control, press-and-hold 1.2 s; `.holding` animates `.hold-ring`). Make sure it doesn't overlap the stars on common screens (put it bottom-right of the viewport instead if easier).
- `.icon-btn`: round, ≥ 110px in stage units (≈ 48px on a phone), big chunky "toy" look, inner svg uses `currentColor`. Variants: `.b-home`, `.b-replay`/`.b-ear`, `.b-hint` (yellow bulb; `.nudge` = short attention bounce), `.b-mic` (`.recording` red pulse, `.denied` greyed), `.b-playmine`, `.b-thumb` (green, larger, with `.btn-cap` label under it), `.b-next` (`.nudge` pulse), `.big`. `[hidden]` must always win (`display:none !important`).
- `.btn-cap`: small caption under an icon (for adults), ≈ 24px.
- `.hud-stars`: star icon + `#star-count` number, pill shape.

### Speaking panel `#speak-panel.speak-panel`
- Bottom centre (≈ left 300px, right 300px, bottom 16px), frosted card. Contains `.speak-ring` (120px svg: `.ring-bg` track, `.ring-fg` stroke that animates from full to empty over `animation-duration` set inline; use `stroke-dasharray: 340; stroke-dashoffset` keyframes) with `.speak-mouth` icon pulsing in the middle, and `.speak-row` of icon buttons. `.done` = ring finished (calm state).

### Overlay `#overlay.overlay.reward`
- Full stage dim; `.reward-card` centred with big spinning/glowing `.reward-star`, `.reward-title` (≈ 70px), `.reward-row` of two `.big` buttons. `.confetti` spans fall from the top (positions set inline). Keep it short and calm (no endless flashing).

### Objects
- `.actor` (button, animal svg, no default button styling). `.walking` (legs `.a-leg.l1/.l3` vs `.l2/.l4` swing, body bob), `.happy` (one jump + squash), `.tappable` (pointer + soft halo), `.glow` (strong golden glow — the hint), `.pop-in`, `.fade-out`, `.dance` (looping bounce, `animation-delay` set inline), `.selected` (lifted + outline), `.dragging` (scale 1.08, no transition), `.back` (transition left/top .4s when returning). `.actor` must have `transition: left, top` with `transition-duration` set inline by JS; `.dragging` disables it.
- Animal parts for idle life: `.a-tail` sway, `.a-head` small nod, `.a-eye` blink (use `transform-box: fill-box; transform-origin: center`).
- `svg.silhouette`: dark translucent silhouette (e.g. `filter: brightness(0) opacity(.25)`). `svg.idle`: idle animation only.
- `.parade` top centre (≈ top 20px, centred, 6 `.slot`s ≈ 110px each, rounded "frames" on a wooden shelf); `.slot.filled` pops.
- `.peek-wrap` (≈ 560px wide): `.peeker` animal sits behind `.peek-bush` (bush over it), only its top ~25% visible and wiggling; `.peeker.revealed` jumps up fully above the bush. `.peek-bush` is a button.
- `.hide-spot` (button): contains `.hider` (animal svg absolutely positioned behind the prop, hidden) and the prop piece. `.tappable` gentle hover/press, `.glow`, `.rustle` (prop shakes), `.peek` (animal rises half out for a second), `.found` (animal gone; prop relaxes), `:disabled` = no pointer, but still fully visible (not greyed!).
- `.home-target` (button with piece svg): `:disabled` looks normal (no grey), `.droppable` subtle dashed glow ring, `.hover` strong highlight, `.glow` golden, `.restored` = home comes alive (sparkle burst, brighter colours; `.piece-barn .lit`, `.piece-pond .ripple` animate).
- `.resident`: small animal living at its home (idle animation).
- `.deco` pieces; modifiers: `.back` (slightly smaller/softer), `.gate-glow`, `.gate-open` (`.gate-doors` fade/slide), `.barn-open` (`.door-l` rotate/slide left, `.door-r` right), `.barn-closed`, `.pond-alive` (`.ripple` animates, `.lily` bob), `.bloom` (grow in), `.faded` (opacity .35), `.sleepy` (desaturated), `.swim` (bob), `.critter`, `.peek-l`, `.peek-r`.
- `.lantern` (button 96×120): `.l-glass` and `.l-glow` fill by state — `.is-locked` dark glass + `.zzz` floating, no glow; `.is-open` warm glass; `.is-current` warm + pulsing `.l-glow` + bounce; `.is-done` golden + `.lantern-star`; `.just-lit` one-time light-up burst; `.wiggle` one-time shake. `.lantern-num` small number badge under it.
- `.map-path svg path`: wide dotted sandy path (stroke ≈ 26px, `stroke-dasharray`, round caps), behind lanterns.
- Welcome: `.title-block h1` big magical title (≈ 110px, glowing, rounded display font stack e.g. "Baloo 2", "Fredoka", "Comic Sans MS", system-ui), `.title-block p` subtitle. `.play-big` huge round glowing play button (200px) with `.btn-cap`; `.pressed`. `.welcome-pip` (`.hop`). `.restart-small` small pill top-left.
- Landscape svg: `.clouds .cloud` drift slowly, `.sway` grass sway, `.twinkle` stars twinkle.

### Global
- `html.reduce-motion` and `@media (prefers-reduced-motion: reduce)`: stop loops, keep only short fades.
- `html.mode-class`: optionally even bigger bubble text.
- `html.is-portrait .rotate-hint`: show a small, non-blocking corner hint (rotating phone icon) — do not block the game.
- `.loading`, `.error-box` (centred card, fixed, above stage), `.noscript`, `.sr-only`.
- `dialog.grownups`: normal readable responsive adult UI (max-width 640px, system font, 16–18px), `.warn` amber note, `.danger` red button, `.gu-actions`.
- Focus: visible `:focus-visible` ring on all buttons (thick, yellow/blue).

## Optional painted backgrounds (Developer)
If you generate images, save them as `assets/img/bg-map.png`, `assets/img/bg-meadow.png`, `assets/img/bg-farm.png` (1600×900, landscape only — sky, hills, grass; **no buildings, animals or characters** because those are SVG objects placed on top). Tell the Lead; the Lead wires them in with the SVG landscape as fallback. Keep the style consistent with the SVG characters (soft 3D-ish, warm, saturated, rounded).
