# Phase 3 — Semantic-to-PDF mapping strategy

## Scope and boundary

Phase 3 produces a pure translation from a validated `CharacterSheet` to declarative text/checkbox updates. The mapper will not import `pdf-lib`, read files, load the template, mutate a PDF, expose an HTTP route, or calculate D&D rules.

The Phase 1 inventory (`docs/5e-character-sheet-fields.json`) is authoritative for field names and types. Visual relationships were verified against rendered pages because the numbered checkbox and spell-field names do not encode their positions reliably.

## Result semantics

`mapCharacterToPdfFields(character)` returns:

- `updates`: text and checkbox updates when the entire supplied character is representable.
- `issues`: actionable semantic-path errors when any supplied value cannot be represented.

If any error issue exists, `updates` is empty. This prevents a caller from generating a plausible-looking but partial sheet. Missing properties generate neither updates nor issues. Explicit `0`, `false`, and empty strings remain explicit updates.

## Formatting

- Scores, counts, HP, currency, XP, AC, speed, DCs, and slot values use ordinary decimal strings.
- Modifiers and bonuses use an explicit `+` only when positive; zero is `0` and negatives retain `-`.
- Arrays targeting multiline text fields preserve order and join entries with newlines.
- No values are derived. In particular, remaining hit dice, ability modifiers, skill bonuses, HP, and slot relationships are not calculated.

## Category strategy

| Semantic category | PDF strategy |
|---|---|
| Identity | Page-1 header fields; `characterName` also updates the text field `CharacterName 2` on page 2. Supplied inspiration and passive Perception map to their page-1 text fields. |
| Abilities | Six score fields, six modifier fields, six saving-throw bonus fields, and six visually matched proficiency checkboxes. |
| Skills | All 18 named bonus fields plus the checkbox immediately to the left of each skill row. |
| Combat | AC, initiative, speed, three HP fields, hit-die total/denomination, and two sequences of three death-save boxes. Supplied expended hit dice are rejected because the sheet has no non-derived destination. |
| Attacks | Three structured rows. Damage and type share the row's damage field. Notes from represented attacks share `AttacksSpellcasting`. |
| Equipment | Currency fields; ordered inventory lines in `Equipment`; proficiencies and languages share `ProficienciesLang` with deterministic section labels when both are present. |
| Personality | Four page-1 multiline fields. |
| Features | Class and racial text share page-1 `Features and Traits`; additional features use page-2 `Feat+Traits`. |
| Appearance/backstory | Physical header fields plus `Backstory`, `Allies`, `FactionName`, and `Treasure`. Appearance description is rejected because the visual region is an image-import button. |
| Spellcasting | Page-3 header fields; visually ordered row arrays for levels 0–9; preparation checkboxes for levels 1–9; total and expended slot fields for levels 1–9. |

## Verified finite capacities

| Level/category | Rows |
|---|---:|
| Attacks | 3 |
| Cantrips | 8 |
| Level 1 | 12 |
| Level 2 | 13 |
| Level 3 | 13 |
| Level 4 | 13 |
| Level 5 | 9 |
| Level 6 | 9 |
| Level 7 | 9 |
| Level 8 | 7 |
| Level 9 | 7 |

Each excess attack or spell produces `PDF_CAPACITY_EXCEEDED` at its semantic array index. Nothing is silently truncated.

## Visually resolved ambiguities

- `SlotsRemaining 19` through `SlotsRemaining 27` are visually labeled **SLOTS EXPENDED**, not remaining. The mapper uses them for supplied `expended` values.
- Death-save successes are `Check Box 12`, `13`, and `14`; failures are `15`, `16`, and `17`.
- Cantrip rows have no interactive preparation checkboxes. Supplying cantrip `prepared` state is unrepresentable.
- Spell field suffixes are not row numbers. Mapping follows page coordinates and visible level sections, not lexical field-name order.
- Saving-throw and skill checkbox numbers are nonsemantic; each was matched to its row by coordinates.
- `Race `, `DEXmod `, and several attack fields contain significant trailing spaces in their exact PDF names.

## Semantic limitations

The template has no distinct representation for:

- `combat.hitDice.expended` without calculating a remaining quantity.
- `appearance.description` as text; the visual area is an Acrobat image-import button.
- Spell-entry `notes`.
- Character portrait or faction-symbol image data; the PDF controls use Acrobat JavaScript `buttonImportIcon()` and image embedding is deferred.

Supplying an unrepresentable property produces `PDF_UNSUPPORTED_PROPERTY` and suppresses all updates.

## Inventory verification

The mapping module will export a pure inventory verifier. Automated tests pass the Phase 1 JSON inventory into it and require:

1. Every declared mapped field exists.
2. Every mapped field's type matches its update operation.
3. No PDF field has conflicting declarations.
4. Every semantic leaf is classified as mapped or intentionally unsupported.
5. Every inventory field is either mapped or listed in the unused-field registry with a reason.
6. Repeated character-name updates intentionally share one semantic source.

The full supported-character verification maps 332 of 334 inventory fields. The only intentionally unused fields are:

- `CHARACTER IMAGE` — deferred image-import button; image content is not part of the Phase 2 semantic contract.
- `Faction Symbol Image` — deferred image-import button; image content is not part of the Phase 2 semantic contract.

`CharacterName` and `CharacterName 2` are an intentional one-to-many mapping from `identity.characterName`, not a conflict. `Inspiration` and `Passive` are supported from supplied semantic values; the mapper does not calculate either value.
