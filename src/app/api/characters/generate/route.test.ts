import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

import { createPostHandler, MAX_REQUEST_BYTES, POST } from "./route";

describe("POST /api/characters/generate", () => {
  it("returns an editable three-page PDF attachment for valid character JSON", async () => {
    const request = new Request("http://localhost/api/characters/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: { characterName: "API Character" } }),
    });

    const response = await POST(request);
    const pdf = await PDFDocument.load(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="character-sheet.pdf"',
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(pdf.getPageCount()).toBe(3);
    expect(pdf.getForm().getFields()).toHaveLength(334);
    expect(pdf.getForm().getTextField("CharacterName").getText()).toBe(
      "API Character",
    );
  });

  it("rejects non-JSON request bodies", async () => {
    const response = await POST(
      new Request("http://localhost/api/characters/generate", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Content-Type must be application/json",
      },
    });
  });

  it("returns a stable 400 response for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/characters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"identity":',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "MALFORMED_JSON",
        message: "Request body must contain valid JSON",
      },
    });
  });

  it("preserves structural validation issue details in a 422 response", async () => {
    const response = await POST(
      new Request("http://localhost/api/characters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abilities: { charisma: { score: "18" } } }),
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CHARACTER_GENERATION_FAILED",
        message: "Character data failed structural validation",
        issues: [
          {
            code: "INVALID_CHARACTER_DATA",
            path: "/abilities/charisma/score",
            message: expect.any(String),
          },
        ],
      },
    });
  });

  it("preserves mapping capacity issue details in a 422 response", async () => {
    const response = await POST(
      new Request("http://localhost/api/characters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attacks: [{ name: "1" }, { name: "2" }, { name: "3" }, { name: "4" }],
        }),
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "CHARACTER_GENERATION_FAILED",
        message: "Character cannot be represented by the PDF template",
        issues: [
          {
            path: "/attacks/3",
            code: "PDF_CAPACITY_EXCEEDED",
            message: "Attack exceeds the 3 available PDF rows",
          },
        ],
      },
    });
  });

  it("rejects oversized bodies before calling the PDF generator", async () => {
    const generator = vi.fn();
    const handler = createPostHandler(generator);
    const response = await handler(
      new Request("http://localhost/api/characters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "x".repeat(MAX_REQUEST_BYTES) }),
      }),
    );

    expect(response.status).toBe(413);
    expect(generator).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "REQUEST_TOO_LARGE",
        message: `Request body exceeds the ${MAX_REQUEST_BYTES}-byte limit`,
      },
    });
  });

  it("returns a generic 500 without leaking unexpected error details", async () => {
    const internalMessage = "secret failure at /Users/example/private/file.pdf";
    const generator = vi.fn().mockRejectedValue(new Error(internalMessage));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await createPostHandler(generator)(
      new Request("http://localhost/api/characters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    const payload = await response.text();

    expect(response.status).toBe(500);
    expect(payload).not.toContain(internalMessage);
    expect(JSON.parse(payload)).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to generate the character sheet",
      },
    });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
