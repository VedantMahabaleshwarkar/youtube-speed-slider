# Plan Comparison: YouTube Speed Extension Slider-to-Buttons Redesign

## The Three Plans

| Label | File | Distinguishing trait |
|-------|------|---------------------|
| **Plan A** | `replace_slider_with_buttons_b7488b14.plan.md` | Most architecturally thorough |
| **Plan B** | `speed_button_ui_redesign_5c4d3fcf.plan.md` | Most concise and readable |
| **Plan C** | `speed_button_ui_redesign_afca160b.plan.md` | Most concrete code examples |

All three share the same high-level goal: replace the slider with a `[-] [speed] [+]` button row, remove drag/RAF complexity, fix vertical alignment, and add long-press-to-reset.

---

## Critical Comparison

### 1. Center Label Click Direction

| | Plan A | Plan B | Plan C |
|-|--------|--------|--------|
| **Cycle direction** | Reverse (backward) | Forward (unchanged) | Forward (unchanged) |

Plan A specifies reverse traversal, noting it was "as requested." Plans B and C keep the current forward cycle. **If the user asked for reverse cycling, Plans B and C are wrong here.** This is a requirements issue, not a technical one -- but it's the single biggest behavioral divergence between the plans.

### 2. Long-Press Implementation

| | Plan A | Plan B | Plan C |
|-|--------|--------|--------|
| **Event API** | `pointerdown`/`pointerup`/`pointercancel` | `mousedown`/`mouseup` | `mousedown`/`mouseup`/`mouseleave` |
| **Timer** | ~400ms | 500ms | 400ms |
| **Edge case: drag-away** | Handled via `pointercancel` | Not handled | Handled via `mouseleave` |

**Plan A is technically superior here.** Pointer events unify mouse and touch input, making the extension work on touch-capable devices (Surface, Chromebooks, tablets). Plan C partially compensates by adding `mouseleave`, but still misses touch. Plan B handles neither edge case.

### 3. Vertical Alignment Fix

| | Plan A | Plan B | Plan C |
|-|--------|--------|--------|
| **Root cause identified?** | Vaguely | Yes, clearly | Yes, clearly |
| **Fix** | `height: 100%` or 48px fallback | `display: flex` + `align-self: center` | Remove `height: 36px`, add `align-self: center` + `height: 100%` |

**Plan B provides the best diagnosis**: `.ytp-right-controls` is a flex container, so `vertical-align: middle` has no effect on flex items. Plans B and C both arrive at `align-self: center` as the fix. Plan A is vaguest, and its "48px fallback" is an arbitrary magic number.

**Plan C's fix is most complete**: it removes both the ineffective `vertical-align: middle` AND the hardcoded `height: 36px`, replacing with `height: 100%` to match YouTube's native `.ytp-button` elements.

### 4. Polling Overlap Bug

| | Plan A | Plan B | Plan C |
|-|--------|--------|--------|
| **Addressed?** | Yes | No | No |

**This is Plan A's unique and most important contribution.** The current code attaches `startPolling` to both `yt-navigate-finish` and `yt-page-data-updated`. If both fire in quick succession (common during YouTube SPA navigation), two independent polling intervals run simultaneously with no guard. Plan A correctly identifies this and prescribes a module-level interval ID or in-flight flag. Plans B and C completely miss this real bug.

### 5. ratechange Handler

| | Plan A | Plan B | Plan C |
|-|--------|--------|--------|
| **Approach** | Cache per-container refs | `document.querySelector('.ytp-speed-label')` | "Simplify" (no specifics) |

**Plan A is correct, Plan B has a bug.** Plan B's simplified handler uses `document.querySelector('.ytp-speed-label')` which only finds the first matching element -- a problem if YouTube has multiple players on screen (e.g., miniplayer + main player). Plan A's approach of caching refs per container avoids this. Plan C doesn't provide enough detail to evaluate.

### 6. HTML Semantics

| | Plan A | Plan B | Plan C |
|-|--------|--------|--------|
| **Element type** | Unspecified | Unspecified | `<button>` elements |

**Plan C is correct.** Using `<button>` elements for the +/- controls is semantically proper and provides built-in keyboard accessibility. Plans A and B don't specify, which likely means `<div>` elements by default -- missing easy accessibility wins.

### 7. Code Concreteness

| | Plan A | Plan B | Plan C |
|-|--------|--------|--------|
| **Code examples** | None | ratechange snippet | Full long-press logic, DOM structure |
| **Line references** | No | No | Yes (specific lines to remove) |

**Plan C is most implementable.** It provides copy-pasteable code for the long-press logic and references specific line numbers in the current source. Plan A is the most abstract. Plan B falls in between.

### 8. Scope and Completeness

| | Plan A | Plan B | Plan C |
|-|--------|--------|--------|
| **Manifest update** | Yes | No | Yes |
| **README update** | Yes | No | No |
| **Verification plan** | Detailed (functional, alignment, performance) | None | Brief (todo item only) |
| **Performance analysis** | Narrative + polling fix | Clean table format | Bullet list |

Plan A has the broadest scope. Plan B is narrowly focused on the two source files. Plan C covers the middle ground.

### 9. Minor Issues in Each Plan

**Plan A:**
- File paths point to a worktree (`~/.cursor/worktrees/...`) -- not portable.
- 5 implementation steps for a 2-file change is over-structured.

**Plan B:**
- `ratechange` snippet has the multi-player bug noted above.
- No mention of suppressing click after long-press -- the timer fires but nothing prevents the `click` event from also cycling the speed.

**Plan C:**
- `SPEEDS[0]` for reset assumes the first element is `1x`. This is fragile; a hardcoded `1` is safer.
- Uses `mousedown`/`mouseup` instead of pointer events -- no touch support.

---

## Verdict

**No single plan is correct on its own.**

| Aspect | Winner |
|--------|--------|
| Behavioral requirements (cycle direction) | Plan A (if reverse was requested) |
| Alignment root cause + fix | Plan B diagnosis + Plan C fix |
| Long-press event API | Plan A (pointer events) |
| Polling overlap bug | Plan A (only one to identify it) |
| ratechange correctness | Plan A (cached refs) |
| HTML semantics | Plan C (`<button>` elements) |
| Code concreteness | Plan C |
| Verification rigor | Plan A |
| Performance documentation | Plan B (table format) |

---

## Synthesized Plan

Below is a merged plan that takes the best elements from each.

---

# YouTube Speed Control: Slider to Buttons Redesign

## Goal

Replace the slider UI with a compact `[-] [Nx] [+]` button row, fix vertical alignment, eliminate drag/RAF overhead, and fix the polling overlap bug.

## New UI

```
.ytp-speed-area
  <button class="ytp-speed-btn ytp-speed-dec">  −  </button>
  <div class="ytp-speed-label">                 1.5x </div>
  <button class="ytp-speed-btn ytp-speed-inc">  +   </button>
```

Use `<button>` elements for +/- (semantic HTML, keyboard-accessible). Keep the label as a `<div>` since it has overloaded behavior (click-to-cycle + long-press-to-reset).

## Interaction Design

- **Decrease button (-)**: Steps down one index in `SPEEDS`, clamped at index 0 (no-op at minimum).
- **Increase button (+)**: Steps up one index in `SPEEDS`, clamped at last index (no-op at maximum).
- **Speed label click**: Cycles through speeds. Direction (forward or reverse) per user preference -- confirm before implementing.
- **Speed label long-press (400ms)**: Resets to `1x`. Implementation uses **pointer events** for mouse+touch compatibility:

```javascript
let pressTimer = null;
let longPressTriggered = false;

label.addEventListener('pointerdown', (e) => {
  longPressTriggered = false;
  pressTimer = setTimeout(() => {
    longPressTriggered = true;
    video.playbackRate = 1;  // Hardcoded, not SPEEDS[0]
  }, 400);
});

label.addEventListener('pointerup', () => clearTimeout(pressTimer));
label.addEventListener('pointercancel', () => clearTimeout(pressTimer));

label.addEventListener('click', (e) => {
  e.stopPropagation();
  if (longPressTriggered) return;  // Suppress click after long-press
  // cycle logic here
});
```

## Changes to `content.js`

### Remove entirely:
- `isDragging`, `activeSlider`, `dragCache`, `rafId` state variables (lines 3-7)
- Global `mouseup` listener (lines 10-18)
- Global `mousemove` listener (lines 21-32)
- `applySpeedUpdate()` function (lines 35-44)
- All slider/panel/track/progress/handle DOM creation (lines 89-111)
- Slider `mousedown` handler (lines 121-140)
- `dragCache` initialization hack (lines 147-150)

### Add:
- `<button>` elements for decrease and increase
- Click handlers using index-based stepping with clamping
- Long-press logic on label using pointer events (see code above)
- Helper: `getCurrentSpeedIndex(video)` with fallback for non-listed rates

### Modify:
- **ratechange handler**: Simplify to label-text-only update. Cache the label ref per container (do NOT use `document.querySelector` which breaks with multiple players):

```javascript
video.addEventListener('ratechange', () => {
  label.textContent = video.playbackRate + 'x';
});
```

The closure already captures the correct `label` for each container, so no DOM query is needed.

- **Polling guard**: Prevent overlapping polling intervals by storing the interval ID at module scope and clearing it before starting a new one:

```javascript
let pollingIntervalId = null;

function startPolling() {
  if (resilientInit()) return;
  if (pollingIntervalId) clearInterval(pollingIntervalId);

  let attempts = 0;
  pollingIntervalId = setInterval(() => {
    attempts++;
    if (resilientInit() || attempts > 20) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
  }, 500);
}
```

## Changes to `styles.css`

### Remove:
- All slider rules: `.ytp-speed-panel`, `.ytp-speed-slider`, `.ytp-speed-slider-track`, `.ytp-speed-slider-progress`, `.ytp-speed-slider-handle`
- `.ytp-speed-area:hover .ytp-speed-panel` rule
- `.ytp-speed-area:hover .ytp-speed-button` rule

### Modify `.ytp-speed-area`:
- Change `display: inline-flex` to `display: flex`
- Remove `vertical-align: middle` (no effect in flex context -- this is the root cause of the alignment bug)
- Remove `height: 36px`
- Add `align-self: center` and `height: 100%` to match YouTube's native `.ytp-button` pattern
- Add `gap: 2px` for spacing between buttons

### Add `.ytp-speed-btn`:
- `display: flex; align-items: center; justify-content: center`
- Size: `28px x 28px`, `border-radius: 50%`
- Background: transparent, border: none
- Hover: `background: rgba(255,255,255,0.2)`
- Active: `transform: scale(0.9)` for tactile feedback
- Color and font matching `.ytp-speed-label`
- `cursor: pointer; touch-action: manipulation` (prevents double-tap zoom on mobile)

## Changes to `manifest.json`

- Update `name` to `"YouTube Speed Control"`
- Update `description` to reflect button-based UI

## Performance Impact

| Removed | Impact |
|---------|--------|
| 2 global event listeners (`mousemove`, `mouseup`) | No per-pixel event firing during any mouse movement on page |
| `requestAnimationFrame` loop | No render-cycle overhead |
| `dragCache` / `getBoundingClientRect()` on drag start | No layout thrashing |
| Drag state machine (`isDragging`, `activeSlider`, etc.) | Simpler code, fewer branches |
| **Fixed: overlapping polling intervals** | No duplicate timers from SPA navigation events |

Remaining listeners per player: `click` on 3 elements + `pointerdown`/`pointerup`/`pointercancel` on label + `ratechange` on video. All scoped locally.

## Verification Checklist

### Functional
- [ ] Decrease button steps speed down; no-op at 1x
- [ ] Increase button steps speed up; no-op at 2x
- [ ] Label click cycles through all speeds and wraps
- [ ] Long-press (400ms) resets to 1x
- [ ] Short tap does NOT reset (only cycles)
- [ ] External speed changes (YouTube native menu, keyboard shortcuts) update label

### Alignment
- [ ] Control is vertically centered with neighboring YouTube controls in normal mode
- [ ] Same in fullscreen mode
- [ ] No layout shift on hover or interaction

### Performance / Stability
- [ ] No accumulating timers after repeated `yt-navigate-finish` / `yt-page-data-updated` events
- [ ] No orphaned event listeners after SPA navigation
- [ ] Responsive interaction during rapid page transitions
