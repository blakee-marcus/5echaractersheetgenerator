"use client";

import { useRef, useState, type FormEvent } from "react";

import { exampleCharacter } from "../fixtures/example-character";

const initialJson = JSON.stringify(exampleCharacter, null, 2);

interface ApiIssue {
  code: string;
  path: string;
  message: string;
}

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    issues?: ApiIssue[];
  };
}

interface ErrorState {
  status: number | null;
  code: string;
  message: string;
  issues: ApiIssue[];
}

export function CharacterJsonGenerator() {
  const [json, setJson] = useState(initialJson);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [success, setSuccess] = useState(false);
  const submissionInFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;

    let character: unknown;
    try {
      character = JSON.parse(json);
    } catch {
      setSuccess(false);
      setError({
        status: null,
        code: "MALFORMED_JSON",
        message: "JSON syntax error. Check the editor and try again.",
        issues: [],
      });
      return;
    }

    submissionInFlight.current = true;
    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/characters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(character),
      });

      if (!response.ok) {
        const payload = await readErrorPayload(response);
        setError({
          status: response.status,
          code: payload.error?.code ?? "REQUEST_FAILED",
          message:
            payload.error?.message ?? "The server could not generate the PDF.",
          issues: payload.error?.issues ?? [],
        });
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = attachmentFilename(response.headers);
        document.body.append(link);
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      setSuccess(true);
    } catch {
      setError({
        status: null,
        code: "NETWORK_ERROR",
        message: "The PDF request failed. Check the server and try again.",
        issues: [],
      });
    } finally {
      submissionInFlight.current = false;
      setIsGenerating(false);
    }
  }

  return (
    <section className="generator" aria-labelledby="generator-title">
      <div className="generator-heading">
        <p className="eyebrow">Try the complete workflow</p>
        <h2 id="generator-title">Generate a fillable character sheet</h2>
        <p>
          Edit the example data, then download a three-page PDF. Character rules
          are not automatically calculated or validated.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <label htmlFor="character-json">Character JSON</label>
        <p id="editor-help" className="field-help">
          The example is valid and editable. Errors include exact JSON paths
          when available.
        </p>
        <textarea
          id="character-json"
          name="character-json"
          aria-describedby="editor-help"
          aria-invalid={error !== null}
          spellCheck={false}
          value={json}
          onChange={(event) => setJson(event.target.value)}
        />
        <button type="submit" disabled={isGenerating}>
          {isGenerating ? "Generating…" : "Generate PDF"}
        </button>
      </form>

      {isGenerating ? (
        <p className="generator-message" role="status">
          Generating your PDF…
        </p>
      ) : null}

      {success ? (
        <p className="generator-message generator-success" role="status">
          PDF downloaded. Your JSON is ready for another edit.
        </p>
      ) : null}

      {error === null ? null : (
        <div className="generator-message generator-error" role="alert">
          <p>
            <strong>
              {error.status === null ? "JSON error" : `HTTP ${error.status}`} ·{" "}
              {error.code}
            </strong>
          </p>
          <p>{error.message}</p>
          {error.issues.length === 0 ? null : (
            <ul>
              {error.issues.map((issue, index) => (
                <li key={`${issue.path}-${issue.code}-${index}`}>
                  <code>{issue.code}</code> at <code>{issue.path}</code>: {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

async function readErrorPayload(response: Response): Promise<ApiErrorPayload> {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return {};
  }
}

function attachmentFilename(headers: Headers): string {
  const disposition = headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([A-Za-z0-9._-]+\.pdf)"/u);
  return match?.[1] ?? "character-sheet.pdf";
}
