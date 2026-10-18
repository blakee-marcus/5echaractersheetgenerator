# Phase 2 — Semantic character data contract

## Status

Phase 2 acceptance criteria are satisfied. The semantic model is independent of the PDF template, layout, widgets, and row capacity. No API route, PDF mapping, PDF generation, storage, authentication, or D&D calculation logic was added.

## Canonical schema

The canonical runtime contract is:

`src/domain/character-sheet.ts`

It exports:

- `characterSheetSchema` — strict Zod runtime schema.
- `CharacterSheet` — TypeScript type inferred with `z.infer<typeof characterSheetSchema>`.

There is no manually duplicated TypeScript interface.

## Supported structure

All top-level sections and all nested character values are optional. Parsing `{}` returns `{}` without adding defaults.

- `identity`: character name, class/level, race, background, alignment, player name, and experience points.
- `inspiration`: supplied boolean inspiration state.
- `passivePerception`: supplied passive Perception value; never derived from skills.
- `proficiencyBonus`: supplied proficiency bonus as a top-level numeric value.
- `abilities`: all six named abilities; each can contain score, modifier, and a saving throw with supplied bonus and proficiency flag.
- `skills`: all 18 named 2014 skills; each can contain supplied bonus and proficiency flag.
- `combat`: armor class, initiative, speed, hit points, hit dice, and death saves.
- `attacks`: unbounded array of attack entries.
- `equipment`: five currency denominations, unbounded inventory, other proficiencies, and languages.
- `personality`: traits, ideals, bonds, and flaws.
- `features`: class features, racial traits, and additional features.
- `appearance`: age, height, weight, eyes, skin, hair, and description.
- `backstory`: history, allies, organizations, and treasure.
- `spellcasting`: class, ability, save DC, attack bonus, cantrips and level 1–9 spells, level 1–9 slots, total slots, and expended slots.

## Validation behavior

- Every object boundary is strict; unknown properties are rejected instead of stripped.
- Repeated attacks, inventory entries, languages, and spells are arrays.
- Discrete numeric fields use finite integers.
- Proficiency and spell preparation values are booleans.
- Text and dice notation remain strings.
- Spell collections accept levels `0` through `9`.
- Spell slots accept levels `1` through `9`; cantrips do not have slots.
- Basic data-integrity constraints reject negative currency, current HP, temporary HP, and spell-slot values. Death-save counts are limited to `0` through `3`, and expended spell slots cannot exceed a supplied total. Broader D&D gameplay relationships remain outside this structural schema.
- No defaults are supplied and no omitted values are synthesized.

## PDF independence

The semantic arrays deliberately have no PDF-derived maximum length. A character with 20 attacks or 50 first-level spells validates successfully. Phase 3 must compare semantic data with template capacity and return explicit overflow/unsupported-data information rather than truncating values.

The model and its tests do not import `pdf-lib`, refer to AcroForm field names, read the template, or perform PDF operations.

## Modeling decisions for review

1. **Integer numeric values:** Ability values, bonuses, XP, and unrestricted combat numbers are finite integers. Currency, current and temporary HP, death saves, and spell-slot values additionally enforce their basic integrity ranges.
2. **Physical attributes are strings:** Age, height, and weight allow entries such as `120 years`, `5 ft 8 in`, or `145 lb` without coupling the model to units.
3. **Hit dice are structured:** `total` and `expended` are numbers; `denomination` is a string such as `d8`.
4. **Damage is text:** `damage` remains a string so dice expressions and modifiers are preserved; `damageType` is separate text.
5. **Page-2 narrative fields are text:** Backstory, allies, organizations, treasure, and appearance description remain template-independent narrative values.
6. **Feature categories stay distinct:** Class, racial, and additional features are separate semantic fields instead of one PDF-oriented block.
7. **Spell entries are partial:** Name, prepared status, and notes are individually optional to support partially completed characters.
8. **No coercion:** Numeric strings such as `"16"` are rejected rather than coerced to numbers.
9. **Draft and finalized entries:** The default schema preserves partial attack and spell entries. `finalizedCharacterSheetSchema` requires a nonblank name for every attack and spell entry.

## Dependencies and test runner

- Runtime: `zod@4.6.7`
- Development: `vitest@4.1.12`
- `npm test` runs the test suite.

Vitest 4.1.12 is compatible with the project's existing `@types/node` 20 declaration. The incompatible Vitest 5 peer requirement was not forced.

## Automated tests

`src/domain/character-sheet.test.ts` verifies:

1. A fully populated character across every supported category.
2. The expected partial-character example.
3. An empty character with no inserted defaults.
4. Invalid scalar types with precise nested paths.
5. Fractional values rejected for discrete numeric fields.
6. Unknown top-level and nested properties.
7. Malformed attack and spell structures.
8. Unsupported spell and slot level keys.
9. Character arrays exceeding this PDF's row capacity remain valid at the semantic layer.
10. Supplied inspiration and passive Perception values are accepted without defaults or calculations.

## Acceptance checklist

- [x] Zod is the canonical runtime schema.
- [x] `CharacterSheet` is inferred with `z.infer`.
- [x] Fully populated, partial, and empty characters validate.
- [x] Invalid types, unknown properties, and malformed nested structures fail predictably.
- [x] All six abilities and all 18 skills are represented.
- [x] Combat, attacks, equipment, personality, features, appearance, backstory, and spellcasting are represented.
- [x] Spells and slots distinguish spell level, total slots, and expended slots.
- [x] No PDF capacity limits are embedded in the model.
- [x] No D&D calculations are performed.
- [x] No PDF mapping, generation, or API code was introduced.
