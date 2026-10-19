/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exampleCharacter } from "../fixtures/example-character";
import { CharacterEditor } from "./character-editor";

const fetchMock = vi.fn<typeof fetch>();
const createObjectUrlMock = vi.fn(() => "blob:character-sheet");
const revokeObjectUrlMock = vi.fn();
const anchorClickMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  createObjectUrlMock.mockReset();
  createObjectUrlMock.mockReturnValue("blob:character-sheet");
  revokeObjectUrlMock.mockReset();
  anchorClickMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("URL", {
    createObjectURL: createObjectUrlMock,
    revokeObjectURL: revokeObjectUrlMock,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    anchorClickMock,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CharacterEditor", () => {
  it("generates and downloads a PDF from guided changes across P2 sections", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
    } as Response);
    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Character name" }), {
      target: { value: "Seraphine Vale" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Intelligence score" }),
      { target: { value: "20" } },
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "Armor class" }), {
      target: { value: "17" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Arcana bonus" }), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add attack" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Attack 3 name" }), {
      target: { value: "Quarterstaff" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Gold pieces" }), {
      target: { value: "125" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Inventory item 1" }), {
      target: { value: "Silvered dagger" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Class features" }), {
      target: { value: "Portent" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Ideals" }), {
      target: { value: "Truth before comfort" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Height" }), {
      target: { value: "5 ft 10 in" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Character history" }), {
      target: { value: "Mapped from the guided editor" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate PDF" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = fetchMock.mock.calls[0]?.[1];
    const submitted = JSON.parse(String(request?.body));
    expect(submitted.identity.characterName).toBe("Seraphine Vale");
    expect(submitted.abilities.intelligence.score).toBe(20);
    expect(submitted.combat.armorClass).toBe(17);
    expect(submitted.skills.arcana).toEqual({ bonus: 9, proficient: true });
    expect(submitted.attacks[2]).toEqual({ name: "Quarterstaff" });
    expect(submitted.equipment.currency.gold).toBe(125);
    expect(submitted.equipment.inventory[0]).toBe("Silvered dagger");
    expect(submitted.features.classFeatures).toBe("Portent");
    expect(submitted.personality.ideals).toBe("Truth before comfort");
    expect(submitted.appearance.height).toBe("5 ft 10 in");
    expect(submitted.backstory.history).toBe("Mapped from the guided editor");
    expect(submitted.spellcasting).toEqual(exampleCharacter.spellcasting);
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:character-sheet");
    expect(
      await screen.findByText("PDF downloaded successfully."),
    ).toBeTruthy();
  });

  it("preserves an unapplied malformed JSON draft when switching modes", () => {
    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    fireEvent.click(screen.getByRole("button", { name: "Advanced JSON" }));
    const editor = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Advanced character JSON",
    });
    fireEvent.change(editor, { target: { value: '{"identity":' } });
    fireEvent.click(screen.getByRole("button", { name: "Guided editor" }));

    expect(
      screen.getByText(
        "Your unapplied JSON draft is preserved. Guided fields show the last applied character.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
        .value,
    ).toBe("Nyx Vesper");

    fireEvent.click(screen.getByRole("button", { name: "Advanced JSON" }));
    expect(
      screen.getByRole<HTMLTextAreaElement>("textbox", {
        name: "Advanced character JSON",
      }).value,
    ).toBe('{"identity":');
  });

  it("rejects invalid JSON without changing canonical guided state and focuses the summary", async () => {
    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    fireEvent.click(screen.getByRole("button", { name: "Advanced JSON" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Advanced character JSON" }),
      {
        target: {
          value: JSON.stringify({
            abilities: { strength: { score: "eighteen" } },
          }),
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply JSON" }));

    const summary = await screen.findByRole("alert");
    expect(summary.textContent).toContain("/abilities/strength/score");
    await waitFor(() => expect(document.activeElement).toBe(summary));

    fireEvent.click(screen.getByRole("button", { name: "Guided editor" }));
    expect(
      screen.getByRole<HTMLInputElement>("spinbutton", {
        name: "Strength score",
      }).value,
    ).toBe("8");
  });

  it("applies valid JSON and reflects it in guided controls", () => {
    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    fireEvent.click(screen.getByRole("button", { name: "Advanced JSON" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Advanced character JSON" }),
      {
        target: {
          value: JSON.stringify({
            identity: { characterName: "Applied JSON" },
            combat: { armorClass: 18 },
            skills: { stealth: { bonus: 12, proficient: true } },
            attacks: [{ name: "JSON Blade", attackBonus: 7 }],
            equipment: {
              currency: { gold: 99 },
              inventory: ["JSON pack"],
              languages: ["Elvish"],
            },
            features: { classFeatures: "JSON Portent" },
            personality: { ideals: "JSON truth" },
            appearance: { eyes: "JSON violet" },
            backstory: { history: "JSON history" },
          }),
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply JSON" }));
    fireEvent.click(screen.getByRole("button", { name: "Guided editor" }));

    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
        .value,
    ).toBe("Applied JSON");
    expect(
      screen.getByRole<HTMLInputElement>("spinbutton", { name: "Armor class" })
        .value,
    ).toBe("18");
    expect(
      screen.getByRole<HTMLInputElement>("spinbutton", { name: "Stealth bonus" })
        .value,
    ).toBe("12");
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", {
        name: "Stealth proficient",
      }).checked,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Attack 1 name" })
        .value,
    ).toBe("JSON Blade");
    expect(
      screen.getByRole<HTMLInputElement>("spinbutton", { name: "Gold pieces" })
        .value,
    ).toBe("99");
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Inventory item 1" })
        .value,
    ).toBe("JSON pack");
    expect(
      screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Class features" })
        .value,
    ).toBe("JSON Portent");
    expect(
      screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Ideals" }).value,
    ).toBe("JSON truth");
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Eyes" }).value,
    ).toBe("JSON violet");
    expect(
      screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Character history" })
        .value,
    ).toBe("JSON history");
  });

  it("renders structured API capacity errors without starting a download", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          code: "PDF_CAPACITY_EXCEEDED",
          message: "Character data exceeds PDF capacity.",
          issues: [
            {
              code: "PDF_CAPACITY_EXCEEDED",
              path: "/attacks",
              message: "attacks has 4 entries; the PDF supports at most 3.",
            },
          ],
        },
      }),
    } as Response);
    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    fireEvent.click(screen.getByRole("button", { name: "Generate PDF" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "attacks has 4 entries; the PDF supports at most 3.",
    );
    expect(anchorClickMock).not.toHaveBeenCalled();
  });

  it("prevents duplicate submissions while PDF generation is pending", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );
    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    const generateButton = screen.getByRole("button", { name: "Generate PDF" });
    fireEvent.click(generateButton);

    const pendingButton = screen.getByRole<HTMLButtonElement>("button", {
      name: "Generating…",
    });
    expect(pendingButton.disabled).toBe(true);
    fireEvent.click(pendingButton);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveResponse?.({
      ok: true,
      blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
    } as Response);
    expect(await screen.findByText("PDF downloaded successfully.")).toBeTruthy();
  });

  it("reports network failures without discarding guided values", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Character name" }), {
      target: { value: "Still Here" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate PDF" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not reach the PDF generator. Try again.",
    );
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
        .value,
    ).toBe("Still Here");
  });
});