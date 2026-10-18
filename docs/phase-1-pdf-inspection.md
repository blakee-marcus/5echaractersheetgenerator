# Phase 1 — Repository and PDF template inspection

## Status

Phase 1 acceptance criteria are satisfied. This phase did not add an API route, character contract, semantic mapping, or generation service.

## Repository findings

- Framework: Next.js 16.4.0, React 19.3.0, App Router under `src/app`, TypeScript in strict mode.
- Package manager: npm (`package-lock.json`).
- PDF library: `pdf-lib` 1.17.1 is installed.
- Existing application code is the create-next-app landing page plus metadata and global styling.
- No API routes exist.
- No character-sheet generation code, semantic model, field mapping, tests, or PDF template existed in the repository before this phase.
- The working tree already contained unrelated modified and untracked scaffold files; they were preserved.

## Repository-owned template

The supplied original template is now stored read-only by convention at:

`assets/5E_CharacterSheet_Fillable.pdf`

Template identity:

- SHA-256: `8e7b282db42af119c46fef696b15e7430cb1e93bd09a478780623ca1a1908a48`
- Size: 355,826 bytes
- PDF version: 1.7
- Pages: 3
- Page size: 612 × 792 points on every page

The original attachment and repository copy have the same hash. Baseline generation did not modify the template.

## Form field inventory

The authoritative generated inventory is:

`docs/5e-character-sheet-fields.json`

It records every field's exact PDF name, `pdf-lib` field type, page association, widget count, and widget rectangle. It also records text-field multiline/file/password metadata and the template hash.

Summary:

| Type | Count |
|---|---:|
| Text | 210 |
| Checkbox | 122 |
| Push button | 2 |
| **Total fields** | **334** |
| Total widgets | 336 |

Page distribution:

| Page | Text | Checkbox | Button | Total fields |
|---|---:|---:|---:|---:|
| 1 | 76 | 30 | 0 | 106 |
| 2 | 12 | 0 | 2 | 14 |
| 3 | 122 | 92 | 0 | 214 |

All 334 fields were associated with a page successfully. Twelve text fields are multiline. No text field declares a maximum length in the PDF metadata.

## Unusual and unsupported fields

Two page-2 push buttons are image-import controls:

- `Faction Symbol Image` — one widget
- `CHARACTER IMAGE` — three widgets sharing the same page and rectangle

Both use Acrobat JavaScript with `event.target.buttonImportIcon()`. They are not ordinary text fields or checkboxes and must not be sent through the planned text/checkbox mapping. Portrait and organization-symbol image embedding remain explicitly deferred for v1, so the mapping layer must identify these fields as unsupported rather than silently ignore or mutate them.

## Baseline fill test

The repeatable verification scripts are:

- `scripts/inspect-pdf-template.mjs`
- `scripts/verify-pdf-template-baseline.mjs`

Executed command:

```bash
node scripts/verify-pdf-template-baseline.mjs \
  assets/5E_CharacterSheet_Fillable.pdf \
  /tmp-or-scratch/5E_CharacterSheet_Phase1_Baseline.pdf
```

Observed result:

- Loaded successfully with `PDFDocument.load()`.
- Located `CharacterName` as a text field.
- Set its value to `Phase 1 Baseline`.
- Updated field appearances with embedded Helvetica.
- Saved and reopened a valid PDF 1.7 document.
- Preserved all 3 pages and all 334 form fields.
- Re-read `CharacterName` as `Phase 1 Baseline`.
- Rendered page 1 and visually confirmed the value appears in the intended Character Name area without clipping or corruption.

Generated baseline size: 604,933 bytes. The generated PDF is a disposable scratch artifact and is not stored in the repository.

## PDF limitations discovered

1. The two image buttons require Acrobat-specific JavaScript behavior and are outside v1's semantic field operations.
2. `CHARACTER IMAGE` has three widgets for one logical field, so widget count cannot be assumed to equal field count.
3. The template provides no text-field maximum lengths; capacity limits must be defined from visual verification and mapping rules rather than trusting PDF metadata.
4. Checkbox names and visual positions must be mapped from this inventory and page geometry. Their numbering must not be inferred from semantic order.
5. Updating appearances materially increases output size; later generation tests must verify editable and flattened output visually.

## Acceptance criteria

- [x] Repository, dependencies, project structure, and existing routes inspected.
- [x] Existing generation code checked; none exists.
- [x] `pdf-lib` installation verified.
- [x] Original template located and copied into the repository.
- [x] Template loaded successfully with `pdf-lib`.
- [x] Every form field enumerated with exact name, type, page, and rectangle.
- [x] Unusual image-import buttons identified explicitly.
- [x] Baseline text-field population saved, reopened, structurally verified, and visually inspected.
- [x] Original template remained unchanged.

## Next phase

Phase 2 should define and validate the semantic `CharacterSheet` data contract without reading this PDF or implementing D&D rules calculations.
