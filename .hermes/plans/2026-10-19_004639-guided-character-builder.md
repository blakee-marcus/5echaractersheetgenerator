# Guided Character Builder Implementation Plan

> **For Hermes:** Execute this plan incrementally with TDD. Keep the existing API and PDF service authoritative, verify each delivery gate, and do not push or deploy without Blake's approval.

**Goal:** Let users edit a complete character through standard form controls while preserving the advanced JSON workflow and generating the same editable three-page PDF.

**Architecture:** A single client-side `CharacterEditor` owns one canonical `CharacterSheet` value. Guided sections update that value directly; the advanced JSON editor maintains an explicit draft that only replaces canonical state after parsing through the existing `characterSheetSchema`. Both modes submit the canonical value to the existing `/api/characters/generate` route, so no PDF mapping, validation contract, or business rule is duplicated.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, Tailwind CSS 4 through `@tailwindcss/postcss`, Vitest, Testing Library, `pdf-lib`.

---

## Current context

- P1 is complete and committed at `288e7e05daf3ae8c32c7f4c40330de4a21d8b109`.
- The production browser path has been exercised for malformed JSON, schema failures, PDF capacity failures, successful download, and reopened PDF values.
- `generateCharacterSheet(input: unknown)` remains the authoritative runtime validation and PDF-generation boundary.
- `characterSheetSchema` and its inferred `CharacterSheet` type are the only supported character contract.
- P2 is a sheet editor, not a rules engine. Every score, modifier, saving throw, skill bonus, and combat value remains explicitly user supplied.

## State and component boundaries

- `src/app/character-editor.tsx`: state owner, mode switching, JSON draft lifecycle, API submission, download, top-level feedback.
- `src/app/guided-character-form.tsx`: guided section composition and accessible field controls.
- `src/app/guided-character-details.tsx`: skills, repeatable attacks, equipment, currency, and language sections.
- `src/app/character-form-controls.tsx`: shared labeled form primitives and focus styling.
- `src/app/character-editor-state.ts`: immutable update helpers, numeric parsing, schema-backed JSON application, and field-path utilities.
- `src/app/editor-feedback.tsx`: API and schema issue rendering plus focusable error summary.
- `src/domain/character-sheet.ts`: existing schema/type only; no parallel form schema.
- `src/app/api/characters/generate/route.ts`: unchanged generation endpoint.

The canonical model is always a valid `CharacterSheet`. An edited JSON string is a separate draft until the user chooses **Apply JSON** and the existing schema accepts it. Switching away from an invalid or unapplied JSON draft preserves it and clearly states that guided controls still reflect the last applied character.

---

## Gate 1 — Editor foundation and first vertical slice

### Task 1.1: Add Tailwind CSS 4 using the supported Next.js pipeline

**Files:**
- Create: `postcss.config.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/app/globals.css`

**Steps:**
1. Install `tailwindcss` and `@tailwindcss/postcss` as development dependencies.
2. Configure the PostCSS plugin exactly as documented by installed Next.js 16.
3. Add `@import "tailwindcss"` to the global stylesheet.
4. Preserve only genuinely global resets, theme variables, skip-link behavior, and shared document typography in CSS; use Tailwind utilities for the new editor.
5. Run `npm run build` and confirm Tailwind classes are emitted.

### Task 1.2: Define state transitions through tests

**Files:**
- Create: `src/app/character-editor-state.test.ts`
- Create: `src/app/character-editor-state.ts`

**Behaviors:**
- Updating identity, ability, saving-throw, and combat paths preserves untouched data.
- Empty numeric controls remove optional values rather than producing `NaN`.
- `0` and negative modifiers remain valid explicit values.
- Valid JSON applies through `characterSheetSchema` and becomes canonical state.
- Malformed or schema-invalid JSON does not change canonical state.
- Unapplied JSON drafts remain preserved across mode changes.

**Verification:**

```bash
npm test -- --run src/app/character-editor-state.test.ts
```

### Task 1.3: Build identity, abilities, and combat controls

**Files:**
- Create: `src/app/guided-character-form.test.tsx`
- Create: `src/app/guided-character-form.tsx`

**Identity fields:** character name, class and level, species/race, background, alignment, player name, experience points, inspiration, proficiency bonus, passive perception.

**Ability fields:** all six scores, modifiers, saving-throw bonuses, and saving-throw proficiency flags. Do not derive modifiers or bonuses.

**Combat fields:** armor class, initiative, speed, maximum/current/temporary HP, hit-die total and denomination, death-save successes and failures. Do not expose `hitDice.expended` because the existing PDF mapper rejects it.

**Requirements:**
- Native labels and controls.
- Numeric inputs with explicit helper text where values are not calculated.
- Grouped `fieldset`/`legend` semantics.
- Responsive Tailwind-first layout.
- No hidden mutation of unrelated fields.

### Task 1.4: Add safe guided ↔ JSON synchronization

**Files:**
- Create: `src/app/character-editor.test.tsx`
- Create: `src/app/character-editor.tsx`
- Remove after parity: `src/app/character-json-generator.tsx`
- Migrate/replace: `src/app/character-json-generator.test.tsx`
- Modify: `src/app/page.tsx`

**Requirements:**
- Guided mode is the default.
- Advanced JSON remains discoverable and accessible.
- Guided changes update canonical state and synchronized JSON when no draft is pending.
- JSON edits become a draft and require explicit application.
- Invalid drafts remain visible and never overwrite the canonical model.
- Switching to guided mode with an unapplied draft displays a preservation notice.
- Generation always submits canonical state through the existing API.
- Existing download, progress, duplicate-submit guard, issue rendering, and object-URL cleanup remain intact.

### Task 1.5: Verify the identity → abilities → combat → PDF path

**Automated checks:**

```bash
npm test
npm run lint
npm run build
```

**Browser checks:**
1. Load the production build in Chrome.
2. Edit character name, one ability score, its manual modifier, armor class, and current HP using guided controls.
3. Generate and download without viewing JSON.
4. Confirm URL does not change and success feedback appears.
5. Reopen the PDF and verify the edited values and 334 editable fields.
6. Switch to JSON, introduce malformed and schema-invalid drafts, verify canonical guided values remain unchanged, correct/apply the draft, and verify synchronization.
7. Exercise keyboard-only mode switching, field navigation, generation, and error summary.

**Gate:** Do not begin attacks/equipment until this browser path passes.

---

## Gate 2 — Skills, attacks, and equipment

### Task 2.1: Add skill and saving-throw editing

Create controls for every existing skill bonus/proficiency pair. Keep all values manual. Test field-path preservation and checkbox behavior.

### Task 2.2: Add repeatable attacks with hard capacity

Expose at most three attack rows because `ATTACK_ROWS` has three PDF rows. Disable or hide add after three entries, announce the limit, and preserve structured API overflow handling for JSON users.

### Task 2.3: Add equipment and currency

Support currency, inventory lines, proficiencies, and languages using the existing arrays/strings. Define reversible line-based editing and test preservation of untouched fields.

**Gate:** Guided attacks/equipment generate and reopen correctly; JSON parity remains green.

### Gate 2 completion — 2026-10-19

- All 18 explicit skill bonus/proficiency pairs are editable without calculation.
- Attacks support add/edit/remove, expose the three-row PDF limit before submission, and continue to surface overflow from Advanced JSON.
- Currency, inventory, other proficiencies, and languages use the existing schema representations.
- Canonical guided state and Advanced JSON round-trip without section-level models.
- Chrome verification passed at desktop and 390 CSS pixels with keyboard traversal, no document overflow, API-backed download, and no console errors.
- The downloaded three-page PDF was reopened with `pdf-lib`; edited Arcana, attack, currency, inventory, proficiency, and language fields matched the guided values.
- Automated gate: 83 tests passed; ESLint and the production build passed.

---

## Gate 3 — Features, roleplay, and background

Add personality, features, appearance, and backstory fields. Do not expose `appearance.description` because the PDF mapper rejects it. Add overflow-aware feedback and browser verification for representative narrative fields.

### Gate 3 completion — 2026-10-19

- Features, personality, appearance, and backstory are integrated into the guided editor using the canonical `CharacterSheet` state.
- Advanced JSON and guided editing preserve all four sections bidirectionally without duplicate personality/backstory controls.
- Representative values reach their existing PDF fields; `appearance.description` remains Advanced-JSON-only and produces the mapper's explicit unsupported-property error.
- Chrome verification passed at desktop and 390 CSS pixels, including API-backed PDF download and reopened field-value checks.
- The test suite was consolidated around distinct behavior and failure modes rather than field count.
- Automated gate: 84 tests passed; ESLint, TypeScript, and the production build passed.

---

## Gate 4 — Spellcasting

Add spellcasting class, ability, save DC, attack bonus, slot totals/expended counts, and repeatable spells by level. Use capacity metadata derived from the existing mapper rather than a second handwritten limit table. Do not expose cantrip preparedness or per-spell notes where the mapper reports unsupported properties.

---

## Gate 5 — Error navigation and accessibility refinement

- Map API JSON-pointer paths back to guided control IDs.
- Focus a summary heading after failed generation without erasing values.
- Link each issue to the matching field when available.
- Verify complete keyboard operation, visible focus, 320 CSS-pixel reflow, status announcements, and accessible names.
- Keep claims limited to tested WCAG 2.2 AA-oriented behavior; do not claim full conformance without the complete manual review.

---

## Files likely to change across P2

- `postcss.config.mjs`
- `package.json`
- `package-lock.json`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/app/character-editor.tsx`
- `src/app/character-editor.test.tsx`
- `src/app/character-editor-state.ts`
- `src/app/character-editor-state.test.ts`
- `src/app/guided-character-form.tsx`
- `src/app/guided-character-form.test.tsx`
- `src/app/editor-feedback.tsx`
- `README.md`
- this plan

The schema, mapper, PDF service, and API route should remain unchanged unless a failing regression test proves an actual contract defect.

## Risks and controls

- **State drift:** one canonical `CharacterSheet`; JSON is explicitly a draft until applied.
- **Validation duplication:** reuse `characterSheetSchema`; do not recreate constraints in the form.
- **Rules-engine creep:** keep modifiers, bonuses, HP, proficiency, and slots manual.
- **Silent data loss:** immutable path updates preserve untouched fields; dirty JSON drafts survive mode switches.
- **PDF mismatch:** do not expose mapper-rejected properties; surface capacity and overflow errors unchanged.
- **Styling churn:** Tailwind-first applies to new UI; do not rewrite the PDF engine or unrelated code.
- **Accessibility regression:** native controls, fieldsets, keyboard tests, focusable summaries, and live status feedback.

## P2 definition of done

- A user can complete all supported character-sheet sections without touching JSON.
- The advanced JSON workflow remains backward-compatible.
- Guided and JSON editing preserve the same canonical data without silent loss.
- All explicit values flow through the existing API and PDF service.
- The downloaded PDF reopens with expected values and remains editable.
- Tests, lint, production build, and complete browser verification pass.
- No authentication, persistence, compendium, ruleset automation, automatic calculations, AI generation, push, or deployment is introduced.