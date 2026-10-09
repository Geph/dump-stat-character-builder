# Component architecture — agent guide

Last reviewed: 2026-10-09.

Sheet action tiles show the name (at most two lines), compact cost/use counts and
attack statistics. Trigger sentences and bonus explanations belong in the action
overlay, not the button. The same `SheetActionsPanel` policy covers Combat and
non-combat actions; spell names also cap at two lines with full names in their
overlays. Icons resolve from explicit assignments, attack/class defaults, then
the action-group fallback, independent of which characters already exist.

`SpellDetailOverlay` uses a narrow (20rem maximum) container with full 2:3 portrait
artwork; reduce card width rather than cropping art to make room for rules text.
Concentration belongs in the header; avoid repeated slot and
concentration footer notes. Keep resource/Metamagic costs and casting warnings.
Spell pins add shortcuts to Abilities & Skills → Non-Combat Actions, grouped by
casting time; they do not remove spells from the Combat spell list.

`signature-abilities.tsx` owns the Favorite Abilities panel with two portrait shortcuts above Combat saves, the
spell/action destination menus, and drag targets. `SignatureAbilitiesProvider`
persists only typed action/spell/weapon IDs in per-character local storage. Unconfigured
sheets default to the first resource-backed action; explicit empty slots stay empty.
Cards reuse the spell selector or request the existing `SheetActionsPanel` overlay
in its owning scope, then acknowledge the request so later renders cannot reopen it.
The mobile section links include `sheet-signatures`. In visual mode, art resolves
from a per-character favorite image override, then the spell/custom ability/weapon,
then the primary class for slot 1 or its subclass for slot 2. Compact mode uses icons.
The favorite menu opens `FavoriteImagePicker` for uploads, URLs, and existing art;
overrides use typed target IDs and report local-storage failures. Weapon favorites
use hand + equipment ID and open the shared `WeaponAttackCard` with the original
roll, resource, and modifier props. Main/off-hand attacks remain distinct.
No mechanics are copied
into shortcut state. Pure selection/payload rules live in `lib/character/signature-abilities.ts`.

The name-font picker lives beside Character Name on the builder’s final details step.
It updates the draft appearance through `withNameFont`; the sheet only renders the saved font.

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
| `components/builder/builder-page-client.tsx` | ~8,100 | ~130 |
| `components/characters/character-sheet-client.tsx` | ~7,700 | ~210 |
| `components/characteristic-modifiers-editor.tsx` | ~5,000 | few (one big type switch) |
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

- `components/character-sheet/sheet-equipped-weapons-panel.tsx` keeps title/range
  and roll controls in a wrapping header, with full-width properties, mastery,
  feat badges, and optional controls beneath it. Preserve all badge overlays.
- `components/character-sheet/sheet-spells-panel.tsx` owns the combat spell list.
  Level groups flow into columns based on panel width; spell tiles have a 44px
  minimum height, wrap full names, and retain concentration and granted markers.
  Selection delegates to the existing spell overlay in the page client.
- `sheet-standard-action-buttons.tsx` maps standard combat action IDs to decorative
  Lucide icons. Keep visible action names and the existing action-use behavior.

- `components/ui/` — shadcn primitives (dialogs, popovers, tabs, selects).
- `components/character-sheet/` — trackers (uses, dice, slots, hit dice), roll buttons,
  `expandable-description.tsx`, `stat-explain-popover.tsx`, `feature-card-menu.tsx`.
- `components/character-sheet/action-group-columns.tsx` — combat group board with
  measured, automatically balanced columns. `use-action-group-measurements.ts`
  observes card content and container width; `packActionGroups` in
  `lib/character/action-group-layout.ts` puts unpinned groups in the shorter column
  and starts weapons on the left. Below 600px of board width it uses one column.
  Full-width headers drag to stable drop markers; the move menu supports keyboard
  and touch operation. Order and explicit column placements persist per character
  and scope in `localStorage`; **Auto arrange** clears both. Do not persist measured
  heights or rebalance during drag by inserting space-taking placeholders.
  `action-entry-heading.tsx` and `action-group-theme.tsx` provide the icon tiles and
  shared economy colors. Keep rules, counters, and action activation in the existing
  sheet collectors and action cards; this board changes presentation only.
- `components/character-sheet/companion-hp-pools.tsx` — per-copy HP / rename /
  conditions rows under one grouped companion stat block.
- `components/character-sheet/post-roll-boost-chips.tsx` — spend-after-the-roll die
  chips on `D20RollButton` (fed by `sheet-roll-context.tsx`).
- `components/compendium/` — `CardImageField`, linked-modifier editors, detail overlays,
  `creature-action-editor.tsx` (structured creature attacks).
- `hooks/` — `use-modifier-catalog`, `use-duplicate-compendium-item`,
  `use-picker-page-size`.

Match the surrounding component's naming, file layout, and comment density.

## Tests for UI changes

Weapon badges are collected by `buildWeaponSheetContext` in
`lib/compendium/weapon-sheet-context.ts` after weapon eligibility checks.
`groupFeatWeaponBadges` in `feat-weapon-badges.ts` groups eligible modifiers by their
feat source ID: one badge named for the feat, with the full imported description
in its information overlay. If the description is absent, retain the individual
effect labels and details in the overlay. Do not truncate rules into badge text,
or add feat-name branches to React. `ConditionInfoTip` scrolls long descriptions.
Legacy custom-target weapon phrases are interpreted for badge placement only;
this does not change attack or damage math. Use `weapon_sheet_badge` for pure
reminders (such as Skulker); preset badge synchronization updates older imports.

- Put logic you can unit test in `lib/` and test it with Vitest there. Components in
  this repo are mostly verified by the lib tests behind them plus a manual pass.
- For a visible change, run `pnpm dev` (port 3001) and click through the affected
  builder step or sheet tab. Say what you checked in the PR.

Random detail generation delegates names to lib/builder/random-character-name.ts. Original syllable pools vary by normalized species name, with Genasi elemental variants; unknown or missing species select from all styles. Keep naming data out of builder React. Random details preserve an existing character name.
