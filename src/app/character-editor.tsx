"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  characterSheetSchema,
  type CharacterSheet,
} from "../domain/character-sheet";
import {
  applyJsonDraft,
  type CharacterChange,
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

const DRAFT_STORAGE_KEY = "nyx-character-forge:draft";
const DRAFT_STORAGE_VERSION = 1;

interface StoredCharacterDraft {
  version: typeof DRAFT_STORAGE_VERSION;
  character: CharacterSheet;
  jsonDraft: string;
  jsonDirty: boolean;
}

type DraftLoadResult =
  | { kind: "none" }
  | { kind: "loaded"; draft: StoredCharacterDraft }
  | { kind: "incompatible" }
  | { kind: "invalid" }
  | { kind: "unavailable" };

function loadStoredDraft(): DraftLoadResult {
  let rawDraft: string | null;
  try {
    rawDraft = globalThis.localStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return { kind: "unavailable" };
  }
  if (rawDraft === null) return { kind: "none" };

  let storedDraft: Partial<StoredCharacterDraft>;
  try {
    storedDraft = JSON.parse(rawDraft) as Partial<StoredCharacterDraft>;
  } catch {
    return { kind: "invalid" };
  }
  if (storedDraft.version !== DRAFT_STORAGE_VERSION) {
    return { kind: "incompatible" };
  }
  if (
    typeof storedDraft.jsonDraft !== "string" ||
    typeof storedDraft.jsonDirty !== "boolean"
  ) {
    return { kind: "invalid" };
  }

  const parsedCharacter = characterSheetSchema.safeParse(storedDraft.character);
  if (!parsedCharacter.success) return { kind: "invalid" };

  return {
    kind: "loaded",
    draft: {
      version: DRAFT_STORAGE_VERSION,
      character: parsedCharacter.data,
      jsonDraft: storedDraft.jsonDraft,
      jsonDirty: storedDraft.jsonDirty,
    },
  };
}

const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-sans text-sm font-extrabold text-white shadow-[0_6px_16px_rgb(118_37_31/0.18)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-sans text-sm font-bold text-[var(--foreground)] shadow-sm transition hover:border-[var(--accent)] hover:bg-[var(--parchment)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]";

export function CharacterEditor({ initialCharacter }: CharacterEditorProps) {
  const [character, setCharacter] = useState<CharacterSheet>(initialCharacter);
  const [mode, setMode] = useState<EditorMode>("guided");
  const [jsonDraft, setJsonDraft] = useState(() => formatCharacter(initialCharacter));
  const [jsonDirty, setJsonDirty] = useState(false);
  const [issues, setIssues] = useState<EditorIssue[]>([]);
  const [status, setStatus] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState(
    "Checking this browser for a saved draft…",
  );
  const [saveRevision, setSaveRevision] = useState(0);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const persistenceReadyRef = useRef(false);
  const persistenceBlockedRef = useRef(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const result = loadStoredDraft();
      if (result.kind === "none") {
        persistenceReadyRef.current = true;
        setPersistenceStatus("Not saved in this browser yet");
      } else if (result.kind === "loaded") {
        setCharacter(result.draft.character);
        setJsonDraft(result.draft.jsonDraft);
        setJsonDirty(result.draft.jsonDirty);
        persistenceReadyRef.current = true;
        setPersistenceStatus("Saved in this browser");
      } else {
        persistenceBlockedRef.current = true;
        setPersistenceStatus(
          result.kind === "incompatible"
            ? "Saved draft uses an incompatible version"
            : result.kind === "unavailable"
              ? "Local saving is unavailable in this browser"
              : "Saved draft could not be restored",
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      saveRevision === 0 ||
      !persistenceReadyRef.current ||
      persistenceBlockedRef.current
    ) {
      return;
    }

    let active = true;
    const storedDraft: StoredCharacterDraft = {
      version: DRAFT_STORAGE_VERSION,
      character,
      jsonDraft,
      jsonDirty,
    };
    try {
      globalThis.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(storedDraft),
      );
      queueMicrotask(() => {
        if (active) setPersistenceStatus("Saved in this browser");
      });
    } catch {
      queueMicrotask(() => {
        if (active) {
          setPersistenceStatus(
            "Could not save locally. Changes remain in this tab only.",
          );
        }
      });
    }
    return () => {
      active = false;
    };
  }, [character, jsonDirty, jsonDraft, saveRevision]);

  useEffect(() => {
    if (issues.length > 0) errorSummaryRef.current?.focus();
  }, [issues]);

  const queuePersistence = useCallback(() => {
    if (persistenceBlockedRef.current) return;
    setPersistenceStatus("Saving to this browser…");
    setSaveRevision((revision) => revision + 1);
  }, []);

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

  const updateCharacter = useCallback(
    (change: CharacterChange) => {
      setCharacter((current) => {
        const next = typeof change === "function" ? change(current) : change;
        if (!jsonDirty) setJsonDraft(formatCharacter(next));
        return next;
      });
      queuePersistence();
      setIssues([]);
      setStatus("");
    },
    [jsonDirty, queuePersistence],
  );

  function handleJsonChange(value: string) {
    setJsonDraft(value);
    setJsonDirty(true);
    queuePersistence();
    setIssues([]);
    setStatus("");
  }

  function discardSavedDraft() {
    const confirmed = globalThis.confirm(
      "Discard the draft saved in this browser and reset the editor? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      globalThis.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      setPersistenceStatus(
        "Could not discard the saved draft. It may return after refresh.",
      );
      return;
    }

    persistenceBlockedRef.current = false;
    persistenceReadyRef.current = true;
    setSaveRevision(0);
    setCharacter(initialCharacter);
    setJsonDraft(formatCharacter(initialCharacter));
    setJsonDirty(false);
    setMode("guided");
    setIssues([]);
    setStatus("");
    setDraftNotice("");
    setPersistenceStatus("Saved draft discarded");
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
    queuePersistence();
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
    <>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--foreground)] focus:px-4 focus:py-2 focus:font-sans focus:text-[var(--background)]"
        href="#character-editor-content"
      >
        Skip to character editor
      </a>

      <header className="border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur" role="banner">
        <div className="mx-auto flex min-h-20 w-full max-w-[96rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center border border-[var(--gold)] bg-[var(--accent)] font-display text-sm font-bold tracking-[0.16em] text-white shadow-sm" aria-hidden="true">
              NYX
            </span>
            <div>
              <p className="font-display text-sm font-bold tracking-[0.08em]">Nyx Character Forge</p>
              <p className="font-sans text-xs text-[var(--muted)]">Fifth-edition character journal</p>
            </div>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <p
              className="max-w-52 font-sans text-right text-xs font-bold text-[var(--moss)]"
              role="status"
            >
              {persistenceStatus}
            </p>
            <button
              className="inline-flex min-h-11 items-center px-2 font-sans text-xs font-bold text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              type="button"
              aria-label="Discard saved draft and reset editor"
              onClick={discardSavedDraft}
            >
              Reset local draft
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto min-w-0 w-full max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="border-b border-[var(--border)] pb-6" aria-labelledby="editor-title">
        <p className="font-sans text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--accent)]">
          Guided creation · Chapter one
        </p>
        <h1 id="editor-title" className="mt-2 max-w-none font-display text-3xl font-semibold leading-tight sm:text-5xl">
          Shape a character worth remembering
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-7 text-[var(--muted)]">
          Start by choosing your race, then your class, and work through each chapter to export a
          three-page editable character sheet. Rules calculations remain in your hands.
        </p>
      </section>

      <div className="sticky top-0 z-20 -mx-4 mt-6 border-y border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 shadow-[0_8px_24px_rgb(36_30_26/0.08)] backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-3">
        <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap" aria-label="Editor mode">
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
            className={`${primaryButton} col-span-2 w-full sm:ml-auto sm:w-auto`}
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
    </>
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