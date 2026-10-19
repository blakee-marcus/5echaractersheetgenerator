# 5e Character Sheet Generator

A lightweight Next.js project for validating D&D 5e character data and generating a filled three-page PDF character sheet.

## Current workflow

Open [http://localhost:3000](http://localhost:3000) to edit the preloaded
example character JSON and choose **Generate PDF**. The browser submits the
JSON to the local API and downloads an editable three-page character sheet
without navigating away.

The application includes:

- runtime Zod validation at the PDF-generation boundary;
- basic integrity checks for quantities, death saves, and spell-slot usage;
- explicit mappings from character properties to fillable PDF fields;
- PDF-template inventory and mapping verification;
- PDF generation with unsupported-text and overflow detection;
- a 256 KiB request limit enforced before PDF generation;
- structured API and browser errors that preserve issue codes and JSON-pointer
  paths;
- a client-side JSON editor with a realistic example and downloadable PDF
  output.

The template lives at `assets/5E_CharacterSheet_Fillable.pdf`. Mapping and inspection notes live in `docs/`.

The generator validates supported structure and basic numeric integrity. It
does not calculate derived values or validate D&D gameplay legality. Accounts,
persistence, structured character-building forms, and ruleset automation are
outside the current scope.

## HTTP API

`POST /api/characters/generate` accepts an `application/json` request body and
passes the parsed value directly to the authoritative PDF-generation service.
Successful requests return an editable PDF with `Content-Type:
application/pdf`, attachment disposition, and `Cache-Control: no-store`.

Request bodies are limited to **262,144 bytes (256 KiB)**. Error responses use
this shape:

```json
{
  "error": {
    "code": "CHARACTER_GENERATION_FAILED",
    "message": "Character data failed structural validation",
    "issues": [
      {
        "code": "INVALID_CHARACTER_DATA",
        "path": "/abilities/charisma/score",
        "message": "..."
      }
    ]
  }
}
```

Status mapping:

- `400` malformed JSON;
- `413` request body over 256 KiB;
- `415` content type other than `application/json`;
- `422` structural, mapping-capacity, unsupported-text, or PDF-overflow issue;
- `500` unexpected internal failure with a generic client-facing message.

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

The test suite covers the schema, mapping, PDF service, HTTP route, example
fixture, and JSON-editor request/download behavior.

The production build can be exercised locally with:

```bash
npm run start
```
