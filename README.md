# 5e Character Sheet Generator

A lightweight Next.js project for validating D&D 5e character data and generating a filled three-page PDF character sheet.

## Current scope

The repository currently contains the generation engine rather than an end-user form:

- runtime Zod validation at the PDF-generation boundary;
- basic integrity checks for quantities, death saves, and spell-slot usage;
- explicit mappings from character properties to fillable PDF fields;
- PDF-template inventory and mapping verification;
- PDF generation with unsupported-text and overflow detection;
- a server-rendered static project landing page with no application-side client components.

The template lives at `assets/5E_CharacterSheet_Fillable.pdf`. Mapping and inspection notes live in `docs/`.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm test
npm run lint
npm run build
```

The production build can be exercised locally with:

```bash
npm run start
```
