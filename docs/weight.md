# Weight module

Added in November 2026. It is deliberately separate from the rehab plan: no points or badges, neutral wording (signed kilograms, "bez zmian"), and a history wipe keeps it.

## Where it shows

- **Dziś:** a "Waga dziś" row above the sessions: an input with "Zapisz" when today has no entry, or the value with "Zmień" when it has one, plus a "Wykres" link to the Waga page.
- **Waga page** (Więcej → Waga, or `#waga`), in this order:
  1. The same "Waga dziś" row.
  2. The range switch (30 dni / 90 dni / Wszystko), one row above everything it scopes.
  3. The chart card: the 7-day average as the headline, the change over the range, the distance to the goal, the readout row and the chart.
  4. "Pomiary": the range's entries, newest first, 7 rows and then "Pokaż wszystkie". Deleting asks "Usunąć?" inside the row. A form under the table adds or corrects any past day; its date defaults to the latest earlier day with no entry.
  5. "Cel": optional goal, shown as a dashed line on the chart.

## Data (`src/plan.js`)

- `state.weight` holds one entry per day: `{ kg, at }`. Deleting writes a marker `{ del: true, at }` instead of removing the key, so the entry doesn't come back from another device. `weightGoal` (kg or null) and `weightGoalAt` (ms) hold the goal.
- `parseKg(text)` accepts "66,4", "66.4", "66" and "66,4 kg", from 25 to 300 kg, and rejects typos like "664" or "6,64".
- `setWeight`, `delWeight`, `setGoal(state, kg | null, now)`, `weightOn(state, day)`, `weightGapDay(state, today)`.
- `weightEntries(state)`: sorted `[{ d, kg }]`.
- `weightTrend(entries)`: for each entry, the mean of the entries in the 7 calendar days ending on it (`kg` rounded to 0.1, `raw` unrounded).
- `weightStats(state, today)`: latest entry, current average, min, max, goal, today's value.
- `weightWindow(state, today, days)` (`days` 0 means everything):
  - the entries in the range, each with its average;
  - `prev`: the entry just before the range (at most 14 days earlier), so the line enters from the left edge;
  - `delta`: how much the average moved from the reference point (`prev`, or the first entry in the range) to the latest one;
  - `exact`: true when the reference really sits at the start of the range; it chooses between the labels "w 30 dni" and "od 14 paź";
  - the axis starts no earlier than the first entry and spans at least a week.

## Chart (`weightChart()` in `src/views.js`)

- Returns `{ svg, pts, W, H, win }`, drawn in real pixels for the measured container width so text and strokes don't scale with the screen. trainer.js mounts it after every render of the tab (`mountChart`) and again when the width changes (`fitChart`).
- Marks: gray dots (`--wt-dot`) are the measurements and stay in the background. The only coloured mark is the 2px line of the 7-day average (`--wt`), with an end dot and its value. The line breaks where entries are more than 14 days apart.
- Goal: a dashed line labelled "cel 64,0", drawn only when it lies near the data; otherwise a note says the goal is higher or lower.
- Axes: the y-axis doesn't start at zero (it's a line chart); round ticks inside the data range, at least 2 kg tall. The x-axis is calendar time, with ticks counted back from today.
- Readout: the row above the chart is both the legend and the readout. By default it shows the latest entry. Pointing at the chart (mouse, finger, or arrow keys when the chart has focus) snaps to the nearest entry, draws a crosshair and shows that entry's values. After a touch, the point stays until the next tap outside. Every value is also in the table.
- Colours: `--wt` is `#2C66CC` in light mode and `#5B8FEF` in dark. Both were checked for lightness, chroma and at least 3:1 contrast against the card surface. Don't use the traffic-light colours here: weight going up or down is neither good nor bad.

## Forms (`src/trainer.js`)

- No native submit: buttons are `type="button"` with `data-act="w-submit"`, Enter is handled on `keydown`, and the `submit` event is only a third route. That keeps saving working the same everywhere, including inside a sandboxed frame.
- Drafts live in `ui`: `wToday, wEdit, wErr, wRange, wAll, wDel, wDate, wKg, wGoal`. The caret position is restored after a render.
- An invalid value shows an inline message under the field (`role="alert"`, `aria-invalid`) and keeps the typed text. The error clears on the first keystroke without a re-render, so the phone keyboard stays open.

## Sync

`mergeWeight()` runs in every merge, including when the plan's `epoch` differs: for each day the later `at` wins (deletion markers included), and the goal follows the later `weightGoalAt`. A history wipe on one device therefore never removes weight entries. tests/test-sync.js covers entries and the goal from another device, a deletion from another device, a stale remote, and a wipe elsewhere.

## Ideas

See docs/roadmap.md: weekly summary, and loads that follow the logged body weight instead of the fixed 65 kg.
