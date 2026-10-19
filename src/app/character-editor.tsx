"use client";

import { useEffect, useRef, useState } from "react";

import type { CharacterSheet } from "../domain/character-sheet";
import {
  applyJsonDraft,
  type EditorIssue,
} from "./character-editor-state";
import { GuidedCharacterForm } from "./guided-character-form";

interface CharacterEditorProps {
  initialCharacter: CharacterSheet;
}

interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    issues?: EditorIssue[];
  };
}

type EditorMode = "guided" | "json";

const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent)] px-5 py-2.5 font-sans text-sm font-extrabold text-white shadow-sm transition hover:bg-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-sans text-sm font-bold text-[var(--foreground)] transition hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]";

export function CharacterEditor({ initialCharacter }: CharacterEditorProps) {
  const [character, setCharacter] = useState<CharacterSheet>(initialCharacter);
  const [mode, setMode] = useState<EditorMode>("guided");
  const [jsonDraft, setJsonDraft] = useState(() => formatCharacter(initialCharacter));
  const [jsonDirty, setJsonDirty] = useState(false);
  const [issues, setIssues] = useState<EditorIssue[]>([]);
  const [status, setStatus] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (issues.length > 0) errorSummaryRef.current?.focus();
  }, [issues]);

  function changeMode(nextMode: EditorMode) {
    if (nextMode === "json" && !jsonDirty) {
      setJsonDraft(formatCharacter(character));
    }
    if (nextMode === "guided" && jsonDirty) {
      setDraftNotice(
        "Your unapplied JSON draft is preserved. Guided fields show the last applied character.",
      );
    } else {
      setDraftNotice("");
    }
    setMode(nextMode);
    setIssues([]);
  }

  function updateCharacter(nextCharacter: CharacterSheet) {
    setCharacter(nextCharacter);
    if (!jsonDirty) setJsonDraft(formatCharacter(nextCharacter));
    setIssues([]);
    setStatus("");
  }

  function handleJsonChange(value: string) {
    setJsonDraft(value);
    setJsonDirty(true);
    setIssues([]);
    setStatus("");
  }

  function applyDraft(): CharacterSheet | undefined {
    const result = applyJsonDraft(character, jsonDraft);
    if (!result.success) {
      setIssues(result.issues);
      setStatus("");
      return undefined;
    }

    setCharacter(result.character);
    setJsonDraft(formatCharacter(result.character));
    setJsonDirty(false);
    setIssues([]);
    setDraftNotice("");
    setStatus("JSON applied to the character.");
    return result.character;
  }

  async function generatePdf() {
    let submission = character;
    if (mode === "json" && jsonDirty) {
      const applied = applyDraft();
      if (!applied) return;
      submission = applied;
    }

    setIsGenerating(true);
    setIssues([]);
    setStatus("Generating PDF…");

    try {
      const response = await fetch("/api/characters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        const payload = await readApiError(response);
        setIssues(
          payload.error.issues?.length
            ? payload.error.issues
            : [
                {
                  code: payload.error.code,
                  path: "/",
                  message: payload.error.message,
                },
              ],
        );
        setStatus("");
        return;
      }

      const pdf = await response.blob();
      downloadPdf(pdf, fileNameFor(submission));
      setStatus("PDF downloaded successfully.");
    } catch {
      setIssues([
        {
          code: "NETWORK_ERROR",
          path: "/",
          message: "Could not reach the PDF generator. Try again.",
        },
      ]);
      setStatus("");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--foreground)] focus:px-4 focus:py-2 focus:text-[var(--background)]"
        href="#character-editor-content"
      >
        Skip to character editor
      </a>

      <header className="border-b border-[var(--border)] pb-6">
        <p className="font-sans text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--accent)]">
          Guided editor · Example character
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
          Character Builder
        </h1>
        <p className="mt-3 max-w-3xl font-sans text-base leading-7 text-[var(--muted)]">
          Edit explicit sheet values, then generate the same three-page editable
          PDF. This editor does not calculate D&amp;D rules for you.
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 mt-6 border-y border-[var(--border)] bg-[var(--background)]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:px-3">
        <div className="flex flex-wrap items-center gap-2" aria-label="Editor mode">
          <button
            className={mode === "guided" ? primaryButton : secondaryButton}
            type="button"
            aria-pressed={mode === "guided"}
            onClick={() => changeMode("guided")}
          >
            Guided editor
          </button>
          <button
            className={mode === "json" ? primaryButton : secondaryButton}
            type="button"
            aria-pressed={mode === "json"}
            onClick={() => changeMode("json")}
          >
            Advanced JSON
          </button>
          <button
            className={`${primaryButton} sm:ml-auto`}
            type="button"
            disabled={isGenerating}
            onClick={generatePdf}
          >
            {isGenerating ? "Generating…" : "Generate PDF"}
          </button>
        </div>
      </div>

      <div id="character-editor-content" className="mt-6">
        {draftNotice ? (
          <p
            className="mb-6 rounded-md border border-[var(--accent)] bg-[var(--surface)] px-4 py-3 font-sans text-sm"
            role="status"
          >
            {draftNotice}
          </p>
        ) : null}

        {issues.length > 0 ? (
          <div
            ref={errorSummaryRef}
            className="mb-6 rounded-lg border-2 border-[var(--accent)] bg-[var(--surface)] p-4 outline-none focus:ring-2 focus:ring-[var(--focus)]"
            role="alert"
            tabIndex={-1}
          >
            <h2 className="font-sans text-lg font-extrabold">
              Fix these issues before generating
            </h2>
            <ul className="mt-2 space-y-2 font-sans text-sm">
              {issues.map((issue, index) => (
                <li key={`${issue.path}-${issue.code}-${index}`}>
                  <code>{issue.path}</code>: {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {mode === "guided" ? (
          <GuidedCharacterForm character={character} onChange={updateCharacter} />
        ) : (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
            <h2 className="font-sans text-xl font-extrabold">Advanced JSON</h2>
            <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[var(--muted)]">
              Edit the complete character contract directly. Apply the draft to
              update guided fields. Generate PDF also validates and applies a
              valid pending draft before submitting it.
            </p>
            <label
              className="mt-5 block font-sans text-sm font-bold"
              htmlFor="advanced-character-json"
            >
              Advanced character JSON
            </label>
            <textarea
              className="mt-2 min-h-[34rem] w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-4 font-mono text-sm leading-6 text-[var(--foreground)] outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/30"
              id="advanced-character-json"
              spellCheck={false}
              value={jsonDraft}
              onChange={(event) => handleJsonChange(event.target.value)}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className={secondaryButton} type="button" onClick={applyDraft}>
                Apply JSON
              </button>
              {jsonDirty ? (
                <span className="font-sans text-sm text-[var(--muted)]">
                  Draft not yet applied
                </span>
              ) : null}
            </div>
          </section>
        )}
      </div>

      <p className="mt-6 min-h-6 font-sans text-sm font-bold" aria-live="polite">
        {status}
      </p>
    </main>
  );
}

function formatCharacter(character: CharacterSheet): string {
  return JSON.stringify(character, null, 2);
}

async function readApiError(response: Response): Promise<ApiErrorPayload> {
  try {
    const payload = (await response.json()) as Partial<ApiErrorPayload>;
    if (payload.error?.code && payload.error.message) {
      return payload as ApiErrorPayload;
    }
  } catch {
    // Fall through to a stable generic error.
  }

  return {
    error: {
      code: "GENERATION_FAILED",
      message: "The PDF generator returned an unreadable error.",
    },
  };
}

function downloadPdf(pdf: Blob, filename: string) {
  const url = URL.createObjectURL(pdf);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function fileNameFor(character: CharacterSheet): string {
  const rawName = character.identity?.characterName?.trim() || "character";
  const safeName = rawName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${safeName || "character"}-sheet.pdf`;
}
