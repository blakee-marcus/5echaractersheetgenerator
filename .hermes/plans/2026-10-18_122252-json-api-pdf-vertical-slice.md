# JSON → API → PDF Vertical Slice Implementation Plan

> **For Hermes:** Execute this plan task-by-task. Do not advance past a gate until its verification passes. Repository publication actions—including commits and pushes—require Blake's explicit approval.

**Goal:** Let a new user open `http://localhost:3000`, edit realistic example character JSON, submit it through a real HTTP endpoint, and download a valid editable three-page character-sheet PDF.

**Architecture:** The browser owns editing, submission, error presentation, and download initiation. A Node.js Next.js App Router endpoint owns request-size enforcement, JSON parsing, error translation, and the PDF response. The existing `generateCharacterSheet(input: unknown)` service remains the single authoritative validation and PDF-generation boundary; the frontend and route must not duplicate its schema, mapping, or business rules.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, `pdf-lib`, Vitest, ESLint.

---

## Current baseline

- [x] Fillable three-page PDF template inspected and stored under `assets/`.
- [x] Strict semantic character schema implemented.
- [x] Basic numeric-integrity checks implemented.
- [x] Semantic-to-PDF mapping implemented with capacity and unsupported-property errors.
- [x] Runtime validation enforced at the public generation-service boundary.
- [x] Editable and flattened PDF generation supported.
- [x] Structured generation issues expose error codes and JSON-pointer paths.
- [x] Existing suite passes: 52 tests.
- [x] ESLint passes.
- [ ] Existing implementation secured as an approved Git baseline.
- [ ] HTTP generation endpoint implemented.
- [ ] Browser JSON editor and PDF download implemented.
- [ ] HTTP integration coverage implemented.
- [ ] Complete browser workflow exercised.

## Non-goals for this milestone

Do not add:

- a structured character-builder form;
- automatic ability, skill, proficiency, HP, or spell calculations;
- D&D gameplay-legality validation;
- 2014/2024 ruleset content or policy;
- authentication, accounts, persistence, or a database;
- portrait or faction-symbol image embedding;
- a second frontend validation schema;
- automatic PDF flattening by default.

---

## Milestone gate 0 — Secure the current baseline

### Task 0.1: Audit the baseline candidate

**Objective:** Confirm the current uncommitted implementation is safe and reproducible before any new feature work.

**Inspect:**

- `.gitignore`
- `README.md`
- `AGENTS.md`
- `assets/`
- `docs/`
- `scripts/`
- `src/`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`

**Checks:**

1. Run `git status --short` and review every modified/untracked path.
2. Run `git diff --check`.
3. Confirm no `.env`, credentials, generated PDFs, `.next/`, test output, editor state, or OS metadata would be included.
4. Confirm `assets/5E_CharacterSheet_Fillable.pdf` is the intended source template.
5. Run `npm test`; expected: all 52 existing tests pass.
6. Run `npm run lint`; expected: exit 0.
7. Stop the dev server if needed, run `npm run build`, then restore `npm run dev`; expected: production build passes and `localhost:3000` returns HTTP 200.

### Task 0.2: Establish the Git baseline

**Objective:** Commit the verified engine as a stable recovery point before the vertical slice.

**Approval gate:** Present the exact staged diff/stat and obtain Blake's explicit approval before committing.

**Suggested commit:**

```text
feat: establish validated PDF generation engine
```

**Completion criteria:**

- The intended implementation, template, tests, and documentation are committed.
- No secret or generated artifact is committed.
- `git status --short` is clean immediately after the commit.
- Do not push unless Blake separately approves the push.

---

## Milestone gate 1 — HTTP generation contract

### Task 1.1: Define route-level response contracts through tests

**Objective:** Specify the public HTTP behavior before implementing the route.

**Create:**

- `src/app/api/characters/generate/route.test.ts`

**Test cases:**

1. Valid character JSON returns `200`.
2. Success response has `Content-Type: application/pdf`.
3. Success response has attachment `Content-Disposition` with a safe filename.
4. Returned bytes open with `PDFDocument.load()` and contain three pages.
5. Malformed JSON returns `400` with a stable machine-readable error.
6. Structurally invalid character data returns `422` and preserves every existing issue's `code`, `path`, and `message`.
7. Mapping capacity/unsupported-property failures return `422` with original issue details.
8. Oversized requests are rejected with `413` before PDF generation.
9. Unexpected failures return `500` without leaking stack traces, local paths, or internal exception details.
10. Editable output remains the default.
11. If a flatten option is exposed, only an explicit supported request value enables it.

**Run:**

```bash
npm test -- --run src/app/api/characters/generate/route.test.ts
```

**Expected before implementation:** focused tests fail for the missing route.

### Task 1.2: Implement `POST /api/characters/generate`

**Objective:** Expose the existing generation service without duplicating validation or mapping logic.

**Create:**

- `src/app/api/characters/generate/route.ts`

**Requirements:**

- Export `runtime = "nodejs"`.
- Accept JSON only.
- Enforce a documented request-size limit before expensive generation work.
- Parse the request body once.
- Pass untrusted parsed data directly to `generateCharacterSheet`.
- Preserve editable output by default.
- Translate `PdfGenerationError` to `422` with structured issues.
- Translate malformed JSON to `400`.
- Translate oversized bodies to `413`.
- Translate unknown failures to a generic `500` response and keep internal details server-side.
- Return generated bytes with:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="..."`
  - `Cache-Control: no-store`
- Do not import or run `characterSheetSchema` separately in the route.

**Verification:**

```bash
npm test -- --run src/app/api/characters/generate/route.test.ts
npm test
npm run lint
```

**Gate:** Do not start the UI until focused route tests and the full existing suite pass.

---

## Milestone gate 2 — Usable JSON editor

### Task 2.1: Add a realistic example-character fixture

**Objective:** Give first-time users a valid, useful starting point instead of an empty editor.

**Create:**

- `src/fixtures/example-character.ts`

**Requirements:**

- Cover representative identity, abilities, skills, combat, one or more attacks, equipment, personality/features, and spells.
- Stay within every known PDF capacity.
- Use Helvetica-compatible text.
- Pass `characterSheetSchema` and the real generation path.
- Avoid derived claims that imply gameplay-rules validation.

**Test:**

- Add a focused fixture test or reuse it in route integration tests to prove generation succeeds and produces a three-page PDF.

### Task 2.2: Build the client-side JSON generation panel

**Objective:** Let users edit JSON and submit it without leaving the landing page.

**Likely files:**

- Modify: `src/app/page.tsx`
- Create: `src/app/character-json-generator.tsx`
- Modify: `src/app/globals.css`

**Requirements:**

- Keep the page shell server-rendered where practical; isolate interactivity in a client component.
- Preload formatted example JSON.
- Provide an accessible labeled editor.
- Provide a clear Generate PDF button.
- Disable duplicate submission while a request is in flight.
- Show progress without replacing the editor.
- Catch local `JSON.parse` syntax errors only for fast feedback; do not duplicate character validation.
- Submit JSON to `/api/characters/generate`.
- On success, download the PDF through an object URL without navigating away.
- Revoke each object URL after use.
- Derive or sanitize the download filename safely, or accept the server filename.
- On API failure, display the HTTP status plus each returned `code`, `path`, and `message`.
- Preserve the user's JSON after success or failure.
- Do not auto-flatten the document.

### Task 2.3: Add frontend behavior tests

**Objective:** Verify request, error display, and download behavior independently of manual testing.

**Test cases:**

1. Example JSON is present on initial render.
2. Malformed local JSON is rejected without a network request.
3. Generate submits the parsed JSON once.
4. Structured API issues render without losing paths or codes.
5. Successful PDF response triggers a download and preserves editor content.
6. Submit is guarded during an in-flight request.

**Dependency rule:** Prefer the project's existing tools. If DOM/component testing requires a new dependency, justify it and keep the addition minimal.

---

## Milestone gate 3 — Full-path verification

### Task 3.1: Run the complete automated suite

Run:

```bash
npm test
npm run lint
npm run build
```

Expected:

- all service, mapping, schema, route, and UI tests pass;
- ESLint exits 0;
- production build exits 0.

### Task 3.2: Exercise the real browser workflow

**Objective:** Prove the user outcome—not merely the components.

**Procedure:**

1. Start a clean server on `localhost:3000`.
2. Open the application in a browser.
3. Confirm the realistic example JSON is visible.
4. Modify at least one identity value and one mapped numeric value.
5. Generate the PDF.
6. Confirm the browser downloads it without navigating away.
7. Open the downloaded PDF.
8. Confirm it contains three pages.
9. Confirm the edited values appear in the expected fields.
10. Confirm the form remains editable by default.
11. Submit malformed JSON and confirm syntax feedback.
12. Submit structurally invalid JSON and confirm the API's code/path/message are shown.
13. Submit an overflow case and confirm it is visible rather than truncated.
14. Check browser console and server output for unexpected errors.

**Evidence to preserve:**

- exact commands and test totals;
- HTTP statuses for success and each failure class;
- generated PDF path in scratch storage;
- page count and representative field values from reopening the downloaded PDF;
- any remaining browser-console or accessibility issue.

### Task 3.3: Update project documentation

**Modify:**

- `README.md`
- Add a phase/milestone document under `docs/` if implementation details warrant it.

**Document:**

- how to run the app;
- JSON → API → PDF workflow;
- endpoint request and response behavior;
- request-size limit;
- structured error shape and status mapping;
- editable-by-default behavior;
- explicit non-goals and current rules-validation limitation;
- exact verification commands.

---

## Definition of done

This milestone is complete only when all boxes below are checked:

- [ ] Existing 52-test engine baseline is committed with Blake's approval.
- [ ] `POST /api/characters/generate` exists on the Node.js runtime.
- [ ] Incoming body size is capped before PDF generation.
- [ ] The route calls the existing generation service as the authoritative validation boundary.
- [ ] Success returns a downloadable editable PDF with correct headers.
- [ ] Malformed JSON, invalid character data, mapping overflow, oversized input, and unexpected failures have distinct tested responses.
- [ ] Existing issue codes and JSON-pointer paths reach the browser unchanged.
- [ ] The landing page contains a realistic preloaded example character.
- [ ] Users can edit JSON, generate, and download without navigating away.
- [ ] The downloaded file reopens as a valid three-page PDF with edited values.
- [ ] Automated tests cover the HTTP endpoint, not only direct service calls.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass.
- [ ] The real browser workflow is exercised successfully.
- [ ] README accurately describes what is implemented and what remains out of scope.

## Later roadmap—do not pull forward

### P2: Structured character form

Build identity, abilities, skills, combat, equipment, and spell inputs backed by the same contract and endpoint. Avoid replacing the JSON path until parity is proven.

### P3: Ruleset and automatic calculations

Choose the supported ruleset and content policy first. Implement a separate rules validator/calculation layer only after the complete generation workflow is stable.

## Primary risks and controls

| Risk | Control |
|---|---|
| Frontend and service validation drift | Keep `generateCharacterSheet(input: unknown)` authoritative; no duplicate frontend schema |
| Large request exhausts generation resources | Enforce a tested byte limit before calling the generator |
| Silent truncation | Preserve existing mapping and overflow issues through API and UI |
| Raw internal errors leak | Generic 500 response; internal logging only |
| Browser download leaks memory | Revoke object URLs after download |
| Invalid filename/header construction | Use a fixed or strictly sanitized attachment filename |
| Feature creep into a full editor | Hold structured forms, rules, auth, and persistence behind later milestones |
| Unrecoverable uncommitted baseline | Audit and commit only after explicit diff review and Blake approval |
