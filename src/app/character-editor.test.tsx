/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exampleCharacter } from "../fixtures/example-character";
import { CharacterEditor } from "./character-editor";

const fetchMock = vi.fn<typeof fetch>();
const createObjectUrlMock = vi.fn(() => "blob:character-sheet");
const revokeObjectUrlMock = vi.fn();
const anchorClickMock = vi.fn();
const storageValues = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return storageValues.size;
  },
  clear: () => storageValues.clear(),
  getItem: (key) => storageValues.get(key) ?? null,
  key: (index) => Array.from(storageValues.keys())[index] ?? null,
  removeItem: (key) => storageValues.delete(key),
  setItem: (key, value) => storageValues.set(key, value),
};

beforeEach(() => {
  storageValues.clear();
  vi.stubGlobal("localStorage", localStorageMock);
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
  it("restores a valid local draft before autosave can replace it", async () => {
    const restoredCharacter = {
      ...exampleCharacter,
      identity: {
        ...exampleCharacter.identity,
        characterName: "Restored Sentinel",
      },
    };
    const savedDraft = JSON.stringify({
      version: 1,
      character: restoredCharacter,
      jsonDraft: JSON.stringify(restoredCharacter, null, 2),
      jsonDirty: false,
    });
    localStorage.setItem("nyx-character-forge:draft", savedDraft);

    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    await waitFor(() =>
      expect(
        screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
          .value,
      ).toBe("Restored Sentinel"),
    );
    expect(localStorage.getItem("nyx-character-forge:draft")).toBe(savedDraft);
    expect(screen.getByText("Saved in this browser")).toBeTruthy();
  });

  it("persists guided changes and restores them after remounting", async () => {
    const { unmount } = render(
      <CharacterEditor initialCharacter={exampleCharacter} />,
    );
    await screen.findByText("Not saved in this browser yet");

    fireEvent.change(screen.getByRole("textbox", { name: "Character name" }), {
      target: { value: "Persistent Sentinel" },
    });

    await screen.findByText("Saved in this browser");
    unmount();
    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    await waitFor(() =>
      expect(
        screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
          .value,
      ).toBe("Persistent Sentinel"),
    );
  });

  it("restores an unapplied malformed JSON draft without replacing canonical state", async () => {
    const { unmount } = render(
      <CharacterEditor initialCharacter={exampleCharacter} />,
    );
    await screen.findByText("Not saved in this browser yet");
    fireEvent.click(screen.getByRole("button", { name: "Advanced JSON" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Advanced character JSON" }),
      { target: { value: '{"identity":' } },
    );
    await screen.findByText("Saved in this browser");

    unmount();
    render(<CharacterEditor initialCharacter={exampleCharacter} />);
    await screen.findByText("Saved in this browser");
    fireEvent.click(screen.getByRole("button", { name: "Advanced JSON" }));
    expect(
      screen.getByRole<HTMLTextAreaElement>("textbox", {
        name: "Advanced character JSON",
      }).value,
    ).toBe('{"identity":');
    fireEvent.click(screen.getByRole("button", { name: "Guided editor" }));
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
        .value,
    ).toBe("Nyx Vesper");
  });

  it("persists applied Advanced JSON as canonical character data", async () => {
    const { unmount } = render(
      <CharacterEditor initialCharacter={exampleCharacter} />,
    );
    await screen.findByText("Not saved in this browser yet");
    fireEvent.click(screen.getByRole("button", { name: "Advanced JSON" }));
    const appliedCharacter = {
      ...exampleCharacter,
      identity: {
        ...exampleCharacter.identity,
        characterName: "Applied Persistence",
      },
    };
    fireEvent.change(
      screen.getByRole("textbox", { name: "Advanced character JSON" }),
      { target: { value: JSON.stringify(appliedCharacter) } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply JSON" }));
    await screen.findByText("Saved in this browser");

    unmount();
    render(<CharacterEditor initialCharacter={exampleCharacter} />);
    await screen.findByText("Saved in this browser");
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
        .value,
    ).toBe("Applied Persistence");
  });

  it("does not overwrite a malformed saved draft", async () => {
    localStorage.setItem("nyx-character-forge:draft", "not-json");

    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    await screen.findByText("Saved draft could not be restored");
    expect(localStorage.getItem("nyx-character-forge:draft")).toBe("not-json");
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
        .value,
    ).toBe("Nyx Vesper");
  });

  it("deliberately discards the saved draft and resets the editor", async () => {
    const restoredCharacter = {
      ...exampleCharacter,
      identity: {
        ...exampleCharacter.identity,
        characterName: "Draft To Discard",
      },
    };
    localStorage.setItem(
      "nyx-character-forge:draft",
      JSON.stringify({
        version: 1,
        character: restoredCharacter,
        jsonDraft: JSON.stringify(restoredCharacter, null, 2),
        jsonDirty: false,
      }),
    );
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<CharacterEditor initialCharacter={exampleCharacter} />);
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
          .value,
      ).toBe("Draft To Discard"),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Discard saved draft and reset editor",
      }),
    );

    expect(localStorage.getItem("nyx-character-forge:draft")).toBeNull();
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
        .value,
    ).toBe("Nyx Vesper");
    expect(screen.getByText("Saved draft discarded")).toBeTruthy();
  });

  it("rejects incompatible and schema-invalid saved drafts without overwriting them", async () => {
    const incompatibleDraft = JSON.stringify({
      version: 2,
      character: exampleCharacter,
      jsonDraft: JSON.stringify(exampleCharacter),
      jsonDirty: false,
    });
    localStorage.setItem("nyx-character-forge:draft", incompatibleDraft);
    const firstRender = render(
      <CharacterEditor initialCharacter={exampleCharacter} />,
    );
    await screen.findByText("Saved draft uses an incompatible version");
    expect(localStorage.getItem("nyx-character-forge:draft")).toBe(
      incompatibleDraft,
    );
    firstRender.unmount();

    const invalidDraft = JSON.stringify({
      version: 1,
      character: { abilities: { strength: { score: "eighteen" } } },
      jsonDraft: "invalid canonical data",
      jsonDirty: true,
    });
    localStorage.setItem("nyx-character-forge:draft", invalidDraft);
    render(<CharacterEditor initialCharacter={exampleCharacter} />);
    await screen.findByText("Saved draft could not be restored");
    expect(localStorage.getItem("nyx-character-forge:draft")).toBe(invalidDraft);
  });

  it("reports unavailable storage without crashing or claiming success", async () => {
    vi.spyOn(localStorageMock, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    await screen.findByText("Local saving is unavailable in this browser");
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
        .value,
    ).toBe("Nyx Vesper");
  });

  it("reports write failures and keeps the changed value in the current tab", async () => {
    render(<CharacterEditor initialCharacter={exampleCharacter} />);
    await screen.findByText("Not saved in this browser yet");
    vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    fireEvent.change(screen.getByRole("textbox", { name: "Character name" }), {
      target: { value: "Unsaved But Present" },
    });

    await screen.findByText(
      "Could not save locally. Changes remain in this tab only.",
    );
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
        .value,
    ).toBe("Unsaved But Present");
  });

  it("renders the production journal shell and live character summary", () => {
    render(<CharacterEditor initialCharacter={exampleCharacter} />);

    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByText("NYX", { selector: "span" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Character sections" })).toBeTruthy();

    const summary = screen.getByRole("complementary", {
      name: "Character summary",
    });
    expect(summary.textContent).toContain("Nyx Vesper");
    expect(summary.textContent).toContain("Wizard 9");
    expect(summary.textContent).toContain("32 / 48");
    expect(summary.textContent).toContain("Armor class");
  });

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
      screen.getByRole("combobox", {
        name: "How would you like to determine your ability scores?",
      }),
      { target: { value: "standard-array" } },
    );
    const generatedScores = [
      [15, "strength"],
      [14, "dexterity"],
      [13, "constitution"],
      [12, "intelligence"],
      [10, "wisdom"],
      [8, "charisma"],
    ] as const;
    for (const [score, ability] of generatedScores) {
      fireEvent.change(
        screen.getByRole("combobox", {
          name: `Assign score ${score} to ability`,
        }),
        { target: { value: ability } },
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "Apply scores" }));
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
    fireEvent.change(screen.getByRole("textbox", { name: "Spellcasting class" }), {
      target: { value: "Cleric" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Level 2 slot total" }), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add level 2 spell" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Level 2 spell 1 name" }), {
      target: { value: "Misty Step" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Level 2 spell 1 prepared" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate PDF" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = fetchMock.mock.calls[0]?.[1];
    const submitted = JSON.parse(String(request?.body));
    expect(submitted.identity.characterName).toBe("Seraphine Vale");
    expect(submitted.abilities).toMatchObject({
      strength: { score: 15 },
      dexterity: { score: 14 },
      constitution: { score: 13 },
      intelligence: { score: 12 },
      wisdom: { score: 10 },
      charisma: { score: 8 },
    });
    expect(submitted.combat.armorClass).toBe(17);
    expect(submitted.skills.arcana).toEqual({ bonus: 9, proficient: true });
    expect(submitted.attacks[2]).toEqual({ name: "Quarterstaff" });
    expect(submitted.equipment.currency.gold).toBe(125);
    expect(submitted.equipment.inventory[0]).toBe("Silvered dagger");
    expect(submitted.features.classFeatures).toBe("Portent");
    expect(submitted.personality.ideals).toBe("Truth before comfort");
    expect(submitted.appearance.height).toBe("5 ft 10 in");
    expect(submitted.backstory.history).toBe("Mapped from the guided editor");
    expect(submitted.spellcasting).toMatchObject({
      class: "Cleric",
      slots: { "2": { total: 3 } },
      spells: { "2": [{ name: "Misty Step", prepared: true }] },
    });
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
            spellcasting: {
              class: "Druid",
              ability: "WIS",
              spellSaveDc: 16,
              spellAttackBonus: 8,
              slots: { "2": { total: 3, expended: 1 } },
              spells: { "2": [{ name: "Moonbeam", prepared: true }] },
            },
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
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Spellcasting class" })
        .value,
    ).toBe("Druid");
    expect(
      screen.getByRole<HTMLInputElement>("spinbutton", { name: "Level 2 slot total" })
        .value,
    ).toBe("3");
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Level 2 spell 1 name" })
        .value,
    ).toBe("Moonbeam");
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", {
        name: "Level 2 spell 1 prepared",
      }).checked,
    ).toBe(true);
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