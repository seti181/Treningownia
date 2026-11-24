# Rehab module (left shoulder)

The original purpose of the app. The clinical source of truth is the owner's plan document (Polish, private Claude doc): https://claude.ai/artifact/1szy4nNPxGoVVRGnDQ9Mgd. Doses, session lengths, gates and pain rules in the app must match it. Claude Code can't edit the document, so when a number changes, tell the owner exactly what to change there.

Keep three places consistent: the sessions in `src/plan.js`, the exercise cards in `src/core.js` (`EX[].dose`, `load`, `cues`) and the plan document. Don't change clinical content (doses, progressions, gates, pain rules, exercise choice) unless the owner asks.

## Phases

Nominal lengths in **training days**: F1 7, F2 21, F3 21, F4 21, then F5 (maintenance, open-ended).

- **Training days, not calendar days.** `phaseDay(state, date)` = `dayOffset` + the number of days with a logged session between `phaseStart` and `date`. Phase 1 doses and the gate alert use it, so a break never pushes the owner onto harder doses.
- **Break.** `breakInfo()` raises "Ostatni trening… X dni temu" after 3 or more days without training, with three choices: continue, start over, or go back a phase.
- **Gates.** The owner moves up a phase through the gate checklist (`GATES`, in the Postęp tab) or by hand on the Rehabilitacja barku page (Więcej). When the training day reaches the phase length, an alert appears; "Zostaję jeszcze tydzień" snoozes it for 7 days, and "Wróć" goes back a phase and restarts its day count. The gates are self-reported checkboxes.
- **Plan actions** mutate the state, then `commit()`:
  - `actAdvance` (through the gates; logs a `phase` event with `via: 'gate'`) and `actBack`.
  - `actRestart(state, date, wipe, now)`: phase 1 from `date`. With `wipe` it clears history and points and sets a new `epoch`, but keeps the weight entries and goal.
  - `actSetStage(state, phase, day, today, rung)`: set by hand; earns no points.
- **Practice mode.** Before `start` the app shows day-1 sessions and logs nothing.

## Week pattern (`dayPlan(date, state)`)

| Phase | Sessions | Length |
|---|---|---|
| F1 | every day: `rano` "Rano" and `wieczor` "Po pracy" (adds a half-way push-up hold and the armpit stretch); Saturday shows an easy-climbing note | about 16 and 19 min |
| F2 | strength `sila` on Mon/Wed/Fri, light day `lekki` otherwise; Tuesday swim note, Saturday climb note | about 48 min, light day 10 min |
| F3 | same pattern as F2 | about 56 min |
| F4 | ladder session `drabinka` on Mon/Thu, `lekki` otherwise | about 36 min |
| F5 | maintenance on Mon/Thu, `lekki` otherwise | about 19 min |

tests/test-plan.js checks this table; update both together.

## F1 dose by training day

Rest between holds 10 s, gap between exercises 15 s. The shoulder-blade setting exercise is 6 × 10 s. The supported active hang is 5 sets with 20 s rest.

| Days | Isometrics (5 directions) | Effort | Hang hold | Scale reading | Push-up hold |
|---|---|---|---|---|---|
| 0–1 | 6 × 10 s | about 30% | 10 s | 45–50 kg | 3 × 20 s |
| 2–3 | 5 × 15 s | 40–50% | 15 s | about 42 kg | 3 × 20 s |
| 4–5 | 4 × 20 s | 50–60% | 20 s | about 38 kg | 3 × 25 s |
| 6+ | 3 × 30 s | 50–70% | 20 s | about 33 kg | 3 × 30 s |

The scale is a bathroom scale under the feet: its reading is the weight left on the legs. The readings and loads assume 65 kg body weight.

## Morning check and pain

- **Morning check** (asked when yesterday has a logged session):
  - Green: no change.
  - Yellow: in F1, yesterday's dose at about 30% effort; in F2 and later, one set fewer on every reps exercise.
  - Red: only the light session ("Dziś lżej"), with no climbing or swim notes.
- **Pain after a session** (0–10):
  - 0–3: green.
  - 4–5: yellow, "same level, lighter".
  - 6+: red, "drop the exercise and step back; sharp pain, clicking or tingling means see a physio".

## F4 ladder

Rungs: active hang 5 × 15 s, full scapular pull-ups 3 × 6–8, negatives 3 × 3–5, band-assisted pull-ups 3 × 5, pull-ups 3 × 3–5. All on rings.

- Pain ≤ 2 adds 1 to `rungGreen`; at 2 the rung goes up (max 5) and the counter resets.
- Pain 3: no change. Pain 4–5: counter back to 0. Pain ≥ 6: counter 0 and down a rung (min 1).
- The update is computed from the rung state when the session started, so changing the pain answer doesn't apply it twice.
- A rung increase is logged as an event keyed to the session, so its +30 points come once. The rung can also be set by hand on the Rehabilitacja barku page.

## Points (`progress(state, today)`)

Computed from the log every time; nothing is stored.

- Sessions: rano and wieczór 10, lekki 6, siła 20, drabinka 25. A partial session earns half. +2 when pain is rated (any value, so honest answers are never penalised).
- +2 per morning check. Streak milestones at 3/7/14/21/30/45/60/90 days: +10/25/50/75/100/125/150/200. +15 for a comeback after 5+ days off.
- New phase through the gates: +50/+100/+150/+200, once per phase. New ladder rung: +30. Manual stage changes earn nothing.
- Grades (`GRADES`): 4a 0, 4b 30, 4c 70, 5a 120, 5b 180, 5c 250, 6a 330, 6a+ 450, 6b 600, 6b+ 780, 6c 990, 6c+ 1250, 7a 1700, then 7a+ to 8a. A consistent run reaches about 5c after F1, 6b+ after F2, 6c+ after F3, and 7a during F4.
- 17 badges (`BADGES`), each with the date it was earned.
- Weight entries earn no points.

## Sessions and the player

- A session is `{ id, label, short, title, gap, blocks[], ladder? }`. Block kinds: `hold` `{ sets, hold, rest }`, `reps` `{ sets, reps: '12–15', rest, side? }`, `time` `{ dur }`. `singleSession(exId)` builds a one-exercise session for "Ćwicz z zegarem" in the atlas (not logged, no points).
- `steps(session)` produces `prep` (10 s, then `gap`) → `work` / `rest` … → `done`.
- Duration estimates (`seconds`, `repSec`): about 4 s per rep, clamped to 20–75 s per set; walks count as 40 s; exercises done one side at a time count double.
- Timing is based on `Date.now()`, with pause and resume. If a step overruns, the extra time carries into the next one (up to 15 s). Leaving the page pauses; coming back within 15 s carries on, after that it waits for "Wznów".
- Step labels: `prep` "Przygotuj się" (cues and the next exercise), `hold` "Trzymaj" (countdown), `time`/`reps` "Ćwicz" (reps show a target and a "Seria zrobiona" button), `rest` "Przerwa" (animation dimmed).
- Controls: Back (restarts the step after 3 s, otherwise the previous step), Main (pause, or "Seria zrobiona"), Next, "+15 s" during prep and rest, "Pomiń to ćwiczenie". Keyboard: Space/Enter main, ← → back and next, Esc opens the exit sheet ("Wróć do treningu" / "Zakończ i oceń ból" / "Wyjdź bez zapisu").
- Sound: WebAudio triangle tones started on the first tap; 3-2-1 ticks before prep, rest and long holds end; start, end and finish tones; Polish speech only when a `pl` voice exists. Modes: voice, beeps, silent (set in Więcej → Ustawienia, saved under `treningownia-dzwiek`). Vibration where supported.
- Screen: asks for a wake lock; when refused (likely inside the claude.ai iframe) it shows a tip to extend the phone's auto-lock.
- End screen: points earned (breakdown, level-up, new badges), pain 0–10 and an optional note. The session is logged as soon as it ends; pain and note are added after. Redoing a session already done that day earns nothing new.
- Accessibility: the player is `role=dialog` and the rest of the page is `inert` while it's open; an `aria-live` region announces each step; with `prefers-reduced-motion` the animations show still frames.

## Animation engine (`src/core.js`)

- **World frame** is the person's own body frame: x = the person's LEFT, y = up, z = forward. Units roughly cm. Body sizes in `L`, line widths in `W`.
- **Pose:** `STAND` plus overrides through `P({...})`:
  - `root` (pelvis position), `pitch`/`roll`/`yaw` in degrees (`T = rY(rX(rZ(v, roll), pitch), yaw)`), `head` direction, `scap.l/.r = [elevation, protraction]`.
  - Limbs `lA rA lL rL`: FK directions `{a: upper, b: lower}` or 2-bone IK `{ik: [x, y, z], pole: [x, y, z]}`. Feet are `lF`/`rF`.
  - `mix()` interpolates poses: slerp for directions, lerp for positions.
- **Exercise fields:** `id, ph (0–4), name, dose, load, cues[], view?, cam {az, el}, props[], seq[], rep?, floor?, shadow?, path?`. Each `seq` step is `{p: pose, m: move seconds, h: hold seconds, eff, glow, badge, mbadge, cut}`.
- **Props:** `box` (`layer: 'mid'` sorts it with the body), `scale`, `bar`, `band`, `cable`, `pulley`, `hbar`, `towel`, `db`, `scap`, `arrow`, `glow`, `rings` (`{x, y: ring height, z, vis: visible strap length}`; straps run out of the frame upwards).
- **Equipment rule:** the rehab was planned for rings (the owner also has a door-frame pull-up bar, but the rehab stays on rings unless the owner asks), so every hanging and pulling exercise is drawn on rings: the supported hangs (rings low, scale under the feet), `kolka-z-nogami` (feet-assisted ring pull-up, 35 → 15 kg on the scale; it replaced the lat pulldown), `australijskie` (ring row) and the whole F4 ladder (rings high). `wallBar()` is no longer used.
- **Rendering:** orthographic camera, depth-sorted SVG strings. Body parts are tapered capsules (`capsule()`, radii in `RAD`) with a halo outline in the stage colour (`.halo`) so overlaps stay readable. Far-side limbs get class `far`; the left arm gets class `L` (accent red). Floor and shadow are radial gradients (`#fl-uid`, `#sh-uid`) applied through inline `style="fill:url(#…)"`. A dashed trail shows the left hand's path over the loop (`handPath`, cached; `path: false` turns it off). A gentle breathing motion runs all the time (3.8 s period). About 0.2 ms per frame.
- `render(ex, t, uid, {full: true})` returns `{svg, badge}` (the badge is an HTML overlay). `view(ex)` gives a 4:3 viewBox from sampled bounds; `stillTime(ex)` the representative frame.
- **Check visually** after any pose or camera change: `npm run sheet -- id1,id2`, open `shots/sheet0.svg` in a browser, and look for limbs hidden behind props, unreadable rotations and badges cut off.

## Known gaps

- Ladder rung 1 holds are fixed at 5 × 15 s, while the plan document says to build from 10 to 30 s.
- "Zrób jeszcze raz" overwrites that session's log entry.
- F2 and F3 sessions run 48–56 min. Trim them only if the owner asks.
- Loads and scale readings assume 65 kg; they could follow the logged body weight (docs/roadmap.md).
