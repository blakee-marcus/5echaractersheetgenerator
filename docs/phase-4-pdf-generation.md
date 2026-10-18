# Phase 4: PDF generation service

## Boundary

`generateCharacterSheet(character, options)` is a server-only service. It maps an existing `CharacterSheet`, loads a fresh copy of the repository-owned PDF template, applies the mapped updates, creates appearances, optionally flattens the form, and returns `Uint8Array` bytes. It does not implement HTTP, persistence, or frontend behavior.

## Errors

Generation fails without returning a document when:

- the mapper reports any issue (`PDF_MAPPING_FAILED` preserves each semantic path, code, and message);
- Helvetica cannot encode a value (`PDF_UNSUPPORTED_UNICODE`);
- text would exceed its PDF widget at the documented fixed size (`PDF_TEXT_OVERFLOW`).

PDF field names in generation-only errors use JSON Pointer escaping under `/pdfFields/`.

## Appearance and overflow policy

The initial compatible font is standard PDF Helvetica.

Field appearances use fixed sizes by role rather than automatic shrink-to-fit:

- 18pt: largest headline values;
- 14pt: ability modifiers;
- 12pt: spellcasting header values;
- 9pt: ordinary short fields and spell-slot counts;
- 8pt: narrative and attack fields;
- 7pt: skills and spell rows;
- 6pt: attack damage;
- 5pt: the template's unusually narrow saving-throw boxes.

Before PDF mutation, every text value is checked for Helvetica encodability. Before saving, single-line widths and multiline wrapped line counts are checked against the real widget dimensions. Content that does not fit is rejected explicitly; the service never substitutes, truncates, or silently shrinks user content.

After updates, `form.updateFieldAppearances(font)` creates appearance streams. Editable output retains all form controls. Flattened output first removes the two template-only Acrobat image-import buttons because `pdf-lib` cannot flatten those unsupported button widgets, then flattens the remaining populated fields.

## Template and request isolation

Every invocation reads `assets/5E_CharacterSheet_Fillable.pdf` with `node:fs/promises`, loads a new `PDFDocument`, and writes only returned in-memory bytes. The template is never overwritten, and document state cannot leak across calls.
