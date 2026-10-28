# The Enchanted Farm

**The Enchanted Farm** is a story-driven, animated English speaking adventure built for **6-year-old Turkish EFL learners** (*Ready Steady – Unit 3: Farm Animals*).

Guided by **Pip** the baby chick, children become **Farm Explorers** on a 14-lesson quest to restore the magical lights and bring the farm animals home before the Great Farm Festival. Every speaking turn follows a gentle **Listen → Think → Say** rhythm designed for real spoken sentences rather than silent multiple-choice clicking.

The same website works in two environments:

- **Classroom (interactive whiteboard):** Choral speaking prompts (*"Everybody, together!"*), longer thinking/speaking pauses, and immediate access to every playable mission.
- **Home (phone, tablet, or computer):** Sequential mission unlocking so children can play through the adventure step by step with optional parent support.

Zero build step, zero external runtime dependencies — pure HTML, CSS, painted backgrounds and illustrated WebP sprites, recorded voice clips for Pip (natural voice, one file per sentence in `assets/audio/`, listed in `js/voice.js`), Web Audio sound effects, and browser Text-to-Speech only as a fallback.

On the class website it lives in the `farm/` folder and opens from **Unit 3 – Farm Animals**; the **◀ Units** button on the welcome screen and the map goes back to the units menu.

---

## Running Locally

### Option 1: Open directly from disk (no server)
Double-click `enchanted-farm/index.html` to open it in Chrome, Edge, or Safari.
- All scenes, animations, TTS voice, synthesised sound effects, and progress saving work directly from `file://`.
- *(Note: browsers block microphone access on `file://` pages; use Option 2 if you want the optional voice-playback button.)*

### Option 2: Run a local HTTP server (enables optional microphone)
From inside the `enchanted-farm/` directory, run:

```bash
python3 -m http.server 8000
```

Then open:
- **Home mode:** <http://localhost:8000/>
- **Classroom mode:** <http://localhost:8000/?mode=class>

### Running Automated Tests
Requires **Node.js 18+** (`npm test` lists the three test files, so it also works on Node 22) (uses the built-in `node:test` and `node:assert` modules — no `npm install` needed):

```bash
cd enchanted-farm
npm test
```

---

## Deploying to GitHub Pages

All asset and script URLs in `index.html` are relative, so the site works cleanly at a root domain or under a repository subpath (`https://<user>.github.io/<repo>/`). Because GitHub Pages serves over **HTTPS**, the optional self-listen microphone feature works automatically.

1. Push the contents of `enchanted-farm/` to the root of a GitHub repository on the `main` branch (or place it in `/docs` or deploy the `enchanted-farm` folder via GitHub Actions `actions/upload-pages-artifact`).
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Select branch **`main`** and folder **`/ (root)`**, then click **Save**.
5. Wait ~1 minute for deployment to finish. Share:
   - **Parent / Home link:** `https://<username>.github.io/<repo>/` (or `?mode=home`)
   - **Teacher / Classroom link:** `https://<username>.github.io/<repo>/?mode=class`

---

## Teacher Link (`?mode=class`) & Grown-Ups Panel

### URL Mode Switch
Appending `?mode=class` to the URL switches that device/browser into **Classroom mode** and saves the choice locally:
- **All `'ready'` missions unlock immediately** on the farm map so teachers can open any lesson out of order.
- **Longer wait times** (+1.5 seconds added to both thinking and speaking windows).
- **Group speaking cues:** in practice turns Pip invites the whole class with *"Everybody, together!"*.
- **One child at a time:** in the independent turns Pip calls one child by name (*"Asya – Your turn!"*), taking the names from the class website's **Settings → Names** list on the same device (children marked absent today are skipped; everyone gets a turn before anyone gets a second). Without a class list the turns stay choral.
- **No microphone button:** smart boards have no microphone, so the record button appears only in Home mode.

Appending `?mode=home` switches the browser back to sequential **Home mode**.

### Grown-Ups Settings Dialog
Teachers and parents can open the **Grown-ups** dialog at any time by **pressing and holding the gear icon** in the corner for **1.2 seconds** (or focusing it with `Tab` and pressing `Enter` / `Space`). From there you can:
- Switch between **Home** and **Classroom** mode.
- Change thinking/speaking wait time (**Short**, **Normal**, **Long**).
- Enable the optional **microphone self-listen button**.
- Enable **Less movement** (calmer animations; also respects OS `prefers-reduced-motion`).
- Test the browser's built-in English voice and view local star & adult-confirmed speaking counts.
- **Start the adventure again** (clears completed missions and speaking counts while keeping adult settings).

---

## How to Add a Mission

1. **Register mission metadata in `js/content.js`:**
   - Find the mission entry in `MISSIONS` (IDs `1`–`14`), change `status: 'planned'` to `status: 'ready'`, and add `game: '<name>'` (for example `status: 'ready', game: 'singing'`).
   - Put any new phrases in `PHRASES` and any pure round-generation helpers in `js/content.js` (exported on `API` so you can unit-test them in `tests/`).

2. **Create `js/games/<name>.js` and register `EF.games.<name>`:**
   Each game is a classic `<script>` IIFE that registers `EF.games['<name>'] = function (run, api) { ... }` returning a `Promise` that resolves to `'again'` or `'map'` (returned by `EF.stage.reward`):

   ```js
   (function (root) {
     'use strict';
     var EF = root.EF;
     EF.games = EF.games || {};

     EF.games.singing = function (run, api) {
       var C = EF.content, S = EF.stage, P = C.PHRASES, A = EF.art;
       api.bg().innerHTML = A.landscape({});
       api.pieceAt('barn', 620, 220, 340);

       return run.wait(300)
         .then(function () { return run.say(P.lookAnimals); })
         .then(function () {
           return S.speakTurn(run, {
             prompt: 'Where is the horse?',
             model: "It's next to the cow.",
             supported: true
           });
         })
         .then(function () {
           api.progress.complete(api.mission.id);
           S.setBubble(P.star);
           EF.audio.say(P.star);
           return S.reward(run, { title: 'Magic star!' });
         });
     };
   })(this);
   ```

3. **Include the script in `index.html`:**
   Add `<script src="js/games/<name>.js"></script>` **after** `js/stage.js` and **before** `js/main.js`.

4. **Run `npm test`** to verify syntax, script references, and content/progress rules.

---

## How to Add Recorded Audio

By default, Pip speaks using the browser's built-in English Text-to-Speech (`speechSynthesis`) and plays Web Audio synthesised sound effects and cartoon animal sounds. You can drop in real voice-actor lines and licensed animal recordings incrementally without changing game logic:

1. Place audio files (e.g. `.mp3` or `.ogg`) in a folder such as `enchanted-farm/assets/audio/`.
2. Map exact spoken strings in `EF.audio.VOICE_FILES` and animal IDs (`cow`, `horse`, `pig`, `hen`, `sheep`, `duck`) in `EF.audio.SOUND_FILES` (either inside `js/audio.js` or in a small script loaded right after `js/audio.js`):

   ```js
   // Spoken Pip lines (key must match the exact string passed to run.say / EF.audio.say)
   EF.audio.VOICE_FILES['What can you see?'] = 'assets/audio/what-can-you-see.mp3';
   EF.audio.VOICE_FILES['I can see a cow.'] = 'assets/audio/i-can-see-a-cow.mp3';

   // Animal sounds (key is the animal id from js/content.js)
   EF.audio.SOUND_FILES.cow = 'assets/audio/cow.mp3';
   EF.audio.SOUND_FILES.duck = 'assets/audio/duck.mp3';
   ```

3. Any unmapped phrase — or any file that is missing or fails to load — **automatically falls back** to browser TTS or Web Audio synthesis.

---

## Privacy Notes

- **Zero personal data collection:** No accounts, logins, child names, photos, analytics, cookies, ads, or external network requests.
- **Local-only progress:** Only completed mission IDs, adult-confirmed speaking turn counts, and Grown-ups settings are saved in `localStorage` (`enchanted-farm:v1`) on the current device. If storage is blocked (e.g. private browsing), the app falls back to in-memory session storage. Classroom progress never transfers to or from home devices.
- **No cloud speech recognition:** The website does **not** listen to, score, or upload children's speech. A teacher or parent confirms speaking locally by tapping **"We said it!"** (thumbs up).
- **Ephemeral microphone playback (off by default):** When a grown-up enables the microphone option, recordings are held solely as an in-memory `Blob` URL inside the current browser tab so the child can hear their own voice back, and are revoked (`URL.revokeObjectURL`) as soon as that speaking turn closes. Nothing is saved or transmitted.

---

## Known Limitations

- **All 14 missions are playable.** 1–4 (`meet`, `rescue`, `littlefarm`, `talkingfarm`) and 5–14 in `js/games/more.js`: Counting Meadow (seven, eight, nine), Rainbow Farm (colours), Little Farm Speaker (week 1 review), Big and Small, On the Farm (story), Story Detective, My Favourite Animal, Caring for Animals, The Mystery Barn, The Great Farm Festival (Farm Explorer certificate).
- **Mission 4, level 3 has fading support:** first Pip says each sentence and the children repeat it (picture cards show what each sentence is about), then Pip only starts the sentences ("I can see a…"), and at the end only the picture cards remain.
- **The brush picture** in Caring for Animals is a simple drawing made for this release; it is less detailed than the painted pictures.
- **New sentences need a recording:** a line without a recording in `js/voice.js` is spoken by the browser's TTS voice (it may sound different).
- **Browser TTS voice variation (fallback only):** Built-in English `speechSynthesis` voices depend on the operating system and browser (Chrome, Edge, and Safari generally provide clear UK/US English voices). If a device has no English TTS voice installed, the Grown-ups dialog displays a warning and Pip's lines remain visible in the speech bubble so an adult can read them aloud; adding `VOICE_FILES` recordings eliminates device differences.
- **Synthesised animal sounds by default:** Until real audio files are registered in `EF.audio.SOUND_FILES`, animal sounds use lightweight Web Audio approximations.
- **Microphone requires HTTPS or `localhost`:** Modern browsers disable `navigator.mediaDevices.getUserMedia` on `file://` URLs. Serve via `python3 -m http.server` locally or host on HTTPS (e.g. GitHub Pages) to use the optional microphone button.
- **Human-confirmed speaking rather than automated speech grading:** Browser speech-to-text APIs frequently misrecognise 6-year-old EFL learners and often stream audio to cloud servers, so speaking turns intentionally rely on adult confirmation (*"We said it!"*) or gentle progression (**Next**).
- **Per-device state:** Clearing browser site data resets local stars and settings, and progress does not sync across separate devices.
