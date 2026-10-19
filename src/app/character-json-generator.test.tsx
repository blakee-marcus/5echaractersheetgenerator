/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterJsonGenerator } from "./character-json-generator";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CharacterJsonGenerator", () => {
  it("renders realistic example JSON in a labeled editor", () => {
    render(<CharacterJsonGenerator />);

    const editor = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Character JSON",
    });
    expect(editor.value).toContain('"Nyx Vesper"');
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Generate PDF" })
        .disabled,
    ).toBe(false);
  });

  it("reports malformed local JSON without making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CharacterJsonGenerator />);

    fireEvent.change(screen.getByRole("textbox", { name: "Character JSON" }), {
      target: { value: '{"identity":' },
    });
    await user.click(screen.getByRole("button", { name: "Generate PDF" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "JSON syntax error. Check the editor and try again.",
    );
  });

  it("submits parsed JSON once and renders structured API issues", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          error: {
            code: "CHARACTER_GENERATION_FAILED",
            message: "Character data failed structural validation",
            issues: [
              {
                code: "INVALID_CHARACTER_DATA",
                path: "/abilities/charisma/score",
                message: "Expected number, received string",
              },
            ],
          },
        },
        { status: 422 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CharacterJsonGenerator />);
    const source = '{"abilities":{"charisma":{"score":"18"}}}';

    fireEvent.change(screen.getByRole("textbox", { name: "Character JSON" }), {
      target: { value: source },
    });
    await user.click(screen.getByRole("button", { name: "Generate PDF" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      abilities: { charisma: { score: "18" } },
    });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("HTTP 422");
    expect(alert.textContent).toContain("INVALID_CHARACTER_DATA");
    expect(alert.textContent).toContain("/abilities/charisma/score");
    expect(alert.textContent).toContain("Expected number, received string");
    expect(
      screen.getByRole<HTMLTextAreaElement>("textbox", {
        name: "Character JSON",
      }).value,
    ).toBe(source);
  });

  it("downloads a successful PDF without clearing the editor", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="character-sheet.pdf"',
        },
      }),
    );
    const createObjectURL = vi.fn().mockReturnValue("blob:character-sheet");
    const revokeObjectURL = vi.fn();
    let downloadedFilename = "";
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download;
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const user = userEvent.setup();
    render(<CharacterJsonGenerator />);
    const source = '{"identity":{"characterName":"Browser Hero"}}';

    fireEvent.change(screen.getByRole("textbox", { name: "Character JSON" }), {
      target: { value: source },
    });
    await user.click(screen.getByRole("button", { name: "Generate PDF" }));

    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "PDF downloaded. Your JSON is ready for another edit.",
    );
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(downloadedFilename).toBe("character-sheet.pdf");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:character-sheet");
    expect(
      screen.getByRole<HTMLTextAreaElement>("textbox", {
        name: "Character JSON",
      }).value,
    ).toBe(source);
  });

  it("guards against duplicate submission while generation is in flight", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:pending"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<CharacterJsonGenerator />);
    const button = screen.getByRole<HTMLButtonElement>("button", {
      name: "Generate PDF",
    });

    await user.click(button);
    await user.click(button);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toBe(
      "Generating your PDF…",
    );

    resolveResponse(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }),
    );
    await waitFor(() => expect(button.disabled).toBe(false));
  });
});
