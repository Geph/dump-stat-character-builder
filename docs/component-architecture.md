# Component architecture — agent guide

Last reviewed: 2026-09-22.

How to keep UI modular and cheap to re-render as more classes arrive. The rule
underneath all of it: **content is data, mechanics are modifiers, UI renders what the
modifiers produced.** A new class should need zero new React code in the common case.

Placement basics live in [AGENTS.md](../AGENTS.md#placement-map) and
[repository-overview.md](./repository-overview.md). Modifier layers live in
[custom-modifiers.md](./custom-modifiers.md).

## Data flow the UI must respect

```text
Compendium rows + character picks
  → lib/character/compute-derived.ts   (aggregateCharacteristics → DerivedCharacter)
  → lib/character/sheet-actions.ts     (FeatureEffect walkers → action cards)
  → components/…                       (render; dispatch play-state changes)
```

- Compute `DerivedCharacter` **once** per character state at the top of the page
  client, memoized on its build inputs, and pass it (or slices of it) down.
- Components never call `aggregateCharacteristics()` or re-derive AC / HP / speed /
  save math. If a panel needs a number that is not on `DerivedCharacter`, add it in
  `lib/character/` and test it there.
- Action cards come from the collectors in `lib/character/`. A component filters and
  lays them out; it does not decide what a feature does.

## Generic surfaces, not class surfaces

Today no component branches on a class name. Keep it that way.

| Need | Do | Don't |
| --- | --- | --- |
| New resource on the sheet | `class_resources[]` row → existing trackers (`resource-uses-tracker.tsx`, `class-resource-static-display.tsx`) | A `<PsionPointsPanel>` |
| New action / menu | FeatureEffect → `sheet-actions-panel.tsx` renders it | A class-specific button |
| New sheet state (form, stance) | `new_toggles` + `requiresSheetToggle` → toggle banner / overlay | A local `useState` flag named after the class |
| New Compendium field for a modifier | A case in `characteristic-modifiers-editor.tsx` / `feature-effect-list.tsx` | A separate editor page |
| Play-state engine UI (Rampage Die, tokens) | One focused tracker component per engine (`rampage-die-tracker.tsx`, `illusion-tokens-panel.tsx`), fed by the engine module in `lib/character/` | Engine logic inside the component |

A component named after a class is a signal that a modifier or engine is missing.

## Size hotspots

These files are far past a reviewable size. Do not grow them.

| File | Lines | Hook calls |
| --- | --- | --- |
| `components/builder/builder-page-client.tsx` | ~8,000 | ~115 |
| `components/characters/character-sheet-client.tsx` | ~7,600 | ~200 |
| `components/characteristic-modifiers-editor.tsx` | ~4,900 | few (one big type switch) |
| `components/character-sheet/sheet-actions-panel.tsx` | ~3,900 | ~20 |
| `components/compendium/compendium-page-client.tsx` | ~2,800 | — |
| `components/compendium/feature-effect-list.tsx` | ~2,400 | — |

Rules when you touch one:

1. **New UI goes in a new file** beside the hotspot, imported by it. Pass props or use
   an existing context (`sheet-roll-context.tsx`, `sheet-roll-history-context.tsx`).
2. **New state logic goes in a hook** (`hooks/` for shared, or a `use-*.ts` next to the
   component) or a pure function in `lib/`. The page client wires hooks together.
3. **Extract when you edit, not in a drive-by.** If your change touches a self-contained
   region (a tab, an overlay, a picker step), moving that region into its own file in
   the same PR is fine. Refactoring unrelated regions is not (AGENTS.md: small diffs).
4. **Editors split by case.** `characteristic-modifiers-editor.tsx` is a big switch
   over modifier types. New types get their own small field component (pattern:
   `components/compendium/trigger-characteristic-editors.tsx`) rather than another
   inline block.
5. **Keep behavior identical when extracting.** Move code, keep props explicit, and
   run the existing tests plus a manual pass through the affected tab.

## Render efficiency

- Memoize derived values with `useMemo` on stable inputs; wrap handlers passed to
  lists with `useCallback`. The sheet re-renders on every roll and HP change.
- Keep high-frequency state (roll history, HP, toggles) close to where it is used or
  in a context, so a dice roll does not re-render the Compendium-sized Features tab.
- Heavy overlays and dialogs (level-up wizard, PDF export, detail overlays) should
  mount only when open. Use `next/dynamic` for large ones that are rarely opened.
- Lists of cards need stable `key`s (feature id / modifier instance id, not index).
- Do not compute per-card data inside `.map()` from the full character; precompute
  once, then look up.

## Reuse before you build

Check these before writing a new primitive:

- `components/ui/` — shadcn primitives (dialogs, popovers, tabs, selects).
- `components/character-sheet/` — trackers (uses, dice, slots, hit dice), roll buttons,
  `expandable-description.tsx`, `stat-explain-popover.tsx`, `feature-card-menu.tsx`.
- `components/compendium/` — `CardImageField`, linked-modifier editors, detail overlays.
- `hooks/` — `use-modifier-catalog`, `use-duplicate-compendium-item`,
  `use-picker-page-size`.

Match the surrounding component's naming, file layout, and comment density.

## Tests for UI changes

- Put logic you can unit test in `lib/` and test it with Vitest there. Components in
  this repo are mostly verified by the lib tests behind them plus a manual pass.
- For a visible change, run `pnpm dev` (port 3001) and click through the affected
  builder step or sheet tab. Say what you checked in the PR.
