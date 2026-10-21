/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CharacterSheet } from "../domain/character-sheet";
import { exampleCharacter } from "../fixtures/example-character";
import {
  GuidedCharacterForm,
  normalizePointBuyScore,
} from "./guided-character-form";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Harness() {
  const [character, setCharacter] = useState<CharacterSheet>(exampleCharacter);
  return (
    <>
      <GuidedCharacterForm character={character} onChange={setCharacter} />
      <output data-testid="character-state">{JSON.stringify(character)}</output>
    </>
  );
}

function currentCharacter(): CharacterSheet {
  return JSON.parse(screen.getByTestId("character-state").textContent ?? "{}");
}

describe("GuidedCharacterForm", () => {
  it("renders labeled identity, ability, and combat controls from character state", () => {
    render(<Harness />);

    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Character name" })
        .value,
    ).toBe("Nyx Vesper");
    expect(
      screen.getByRole<HTMLInputElement>("spinbutton", {
        name: "Intelligence score",
      }).value,
    ).toBe("18");
    expect(
      screen.getByRole<HTMLInputElement>("spinbutton", { name: "Armor class" })
        .value,
    ).toBe("15");
    expect(screen.getByRole("group", { name: "Identity" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Abilities and saving throws" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Combat" })).toBeTruthy();
  });

  it("updates identity while preserving untouched character sections", () => {
    render(<Harness />);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Character name" }),
      { target: { value: "Seraphine Vale" } },
    );

    const character = currentCharacter();
    expect(character.identity?.characterName).toBe("Seraphine Vale");
    expect(character.spellcasting).toEqual(exampleCharacter.spellcasting);
  });

  it("updates manual ability and saving-throw values without deriving them", () => {
    render(<Harness />);

    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Intelligence score" }),
      { target: { value: "20" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Intelligence modifier" }),
      { target: { value: "5" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Intelligence saving throw bonus",
      }),
      { target: { value: "9" } },
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Intelligence saving throw proficient",
      }),
    );

    expect(currentCharacter().abilities?.intelligence).toEqual({
      score: 20,
      modifier: 5,
      savingThrow: { bonus: 9, proficient: false },
    });
  });

  it("preserves generated drafts across method switches without changing canonical scores", () => {
    render(<Harness />);

    const method = screen.getByRole("combobox", {
      name: "How would you like to determine your ability scores?",
    });
    fireEvent.change(method, { target: { value: "standard-array" } });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Assign score 15 to ability" }),
      { target: { value: "strength" } },
    );
    fireEvent.change(method, { target: { value: "point-buy" } });
    fireEvent.change(method, { target: { value: "standard-array" } });

    expect(
      screen.getByRole<HTMLSelectElement>("combobox", {
        name: "Assign score 15 to ability",
      }).value,
    ).toBe("strength");
    expect(currentCharacter().abilities?.strength?.score).toBe(
      exampleCharacter.abilities.strength.score,
    );
  });

  it("applies a complete standard array atomically while preserving modifiers and unrelated fields", () => {
    render(<Harness />);

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "How would you like to determine your ability scores?",
      }),
      { target: { value: "standard-array" } },
    );

    const assignments = [
      [15, "strength"],
      [14, "dexterity"],
      [13, "constitution"],
      [12, "intelligence"],
      [10, "wisdom"],
      [8, "charisma"],
    ] as const;
    for (const [score, ability] of assignments) {
      fireEvent.change(
        screen.getByRole("combobox", {
          name: `Assign score ${score} to ability`,
        }),
        { target: { value: ability } },
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "Apply scores" }));

    const character = currentCharacter();
    expect(character.abilities).toMatchObject({
      strength: { score: 15, modifier: exampleCharacter.abilities.strength.modifier },
      dexterity: { score: 14, modifier: exampleCharacter.abilities.dexterity.modifier },
      constitution: {
        score: 13,
        modifier: exampleCharacter.abilities.constitution.modifier,
      },
      intelligence: {
        score: 12,
        modifier: exampleCharacter.abilities.intelligence.modifier,
      },
      wisdom: { score: 10, modifier: exampleCharacter.abilities.wisdom.modifier },
      charisma: { score: 8, modifier: exampleCharacter.abilities.charisma.modifier },
    });
    expect(character.identity).toEqual(exampleCharacter.identity);
    expect(character.spellcasting).toEqual(exampleCharacter.spellcasting);
  });

  it("rejects point-buy changes beyond 27 points and cancel leaves scores unchanged", () => {
    render(<Harness />);

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "How would you like to determine your ability scores?",
      }),
      { target: { value: "point-buy" } },
    );
    for (const ability of ["Strength", "Dexterity", "Constitution"]) {
      fireEvent.change(
        screen.getByRole("spinbutton", { name: `${ability} point-buy score` }),
        { target: { value: "15" } },
      );
    }
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Intelligence point-buy score" }),
      { target: { value: "9" } },
    );

    expect(
      screen.getByRole<HTMLInputElement>("spinbutton", {
        name: "Intelligence point-buy score",
      }).value,
    ).toBe("8");
    expect(screen.getByText(/Points remaining:/).textContent).toContain("0");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(currentCharacter().abilities).toEqual(exampleCharacter.abilities);
  });

  it("rejects non-finite and fractional point-buy values at the generation boundary", () => {
    expect(normalizePointBuyScore(Number.NaN)).toBeUndefined();
    expect(normalizePointBuyScore(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(normalizePointBuyScore(Number.NEGATIVE_INFINITY)).toBeUndefined();
    expect(normalizePointBuyScore(9.5)).toBeUndefined();
    expect(normalizePointBuyScore(7)).toBe(8);
    expect(normalizePointBuyScore(16)).toBe(15);
    expect(normalizePointBuyScore(undefined)).toBe(8);
  });

  it("rejects invalid point-buy inputs while preserving the rejected value", () => {
    render(<Harness />);

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "How would you like to determine your ability scores?",
      }),
      { target: { value: "point-buy" } },
    );

    const strengthInput = screen.getByRole<HTMLInputElement>(
      "spinbutton",
      { name: "Strength point-buy score" },
    );
    fireEvent.change(strengthInput, { target: { value: "abc" } });
    expect(strengthInput.value).toBe("8");

    fireEvent.change(strengthInput, { target: { value: "9.5" } });
    expect(strengthInput.value).toBe("8");

    fireEvent.change(strengthInput, { target: { value: "100" } });
    expect(strengthInput.value).toBe("15");

    fireEvent.change(strengthInput, { target: { value: "" } });
    expect(currentCharacter().abilities).toEqual(exampleCharacter.abilities);
    expect(screen.getByText(/Points remaining:/).textContent).toContain("27");
  });

  it("assigns duplicate rolled totals by slot identity without reusing an ability", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    render(<Harness />);

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "How would you like to determine your ability scores?",
      }),
      { target: { value: "rolling" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Roll all six" }));

    const abilityKeys = [
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
    ] as const;
    fireEvent.change(
      screen.getByRole("combobox", { name: "Assign roll 1 to ability" }),
      { target: { value: abilityKeys[0] } },
    );
    expect(
      screen
        .getByRole<HTMLSelectElement>("combobox", {
          name: "Assign roll 2 to ability",
        })
        .querySelector<HTMLOptionElement>('option[value="strength"]')?.disabled,
    ).toBe(true);
    abilityKeys.slice(1).forEach((ability, offset) => {
      const index = offset + 1;
      fireEvent.change(
        screen.getByRole("combobox", {
          name: `Assign roll ${index + 1} to ability`,
        }),
        { target: { value: ability } },
      );
    });

    expect(screen.getAllByText(/Roll \d: 18/)).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Apply scores" }));
    for (const ability of abilityKeys) {
      expect(currentCharacter().abilities?.[ability]?.score).toBe(18);
    }
  });

  it("updates combat and death-save values", () => {
    render(<Harness />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Armor class" }), {
      target: { value: "17" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Current hit points" }),
      { target: { value: "41" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Death save successes" }),
      { target: { value: "2" } },
    );

    expect(currentCharacter().combat).toMatchObject({
      armorClass: 17,
      hitPoints: { current: 41 },
      deathSaves: { successes: 2 },
    });
  });

  it("updates a representative skill control and preserves unrelated state", () => {
    render(<Harness />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Arcana bonus" }), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Arcana proficient" }));

    expect(currentCharacter().skills?.arcana).toEqual({
      bonus: 9,
      proficient: false,
    });
    expect(currentCharacter().skills?.history).toEqual(exampleCharacter.skills.history);
    expect(currentCharacter().spellcasting).toEqual(exampleCharacter.spellcasting);
  });

  it("adds, edits, removes, and caps attacks at three PDF rows", () => {
    render(<Harness />);

    expect(screen.getAllByRole("group", { name: /Attack \d/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Add attack" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Attack 3 name" }),
      { target: { value: "Quarterstaff" } },
    );

    expect(currentCharacter().attacks).toHaveLength(3);
    expect(currentCharacter().attacks?.[2]?.name).toBe("Quarterstaff");
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Add attack" }).disabled,
    ).toBe(true);
    expect(
      screen.getByRole("status", { name: "Attack capacity" }).textContent,
    ).toContain("3 of 3 PDF attack rows used");

    fireEvent.click(screen.getByRole("button", { name: "Remove Dagger attack" }));
    expect(currentCharacter().attacks).toEqual([
      exampleCharacter.attacks[1],
      { name: "Quarterstaff" },
    ]);
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Add attack" }).disabled,
    ).toBe(false);
  });

  it("updates currency, inventory, proficiencies, and languages", () => {
    render(<Harness />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Gold pieces" }), {
      target: { value: "125" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Inventory item 1" }), {
      target: { value: "Silvered dagger" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add inventory item" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Inventory item 4" }), {
      target: { value: "Ink and quill" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Other proficiencies" }),
      { target: { value: "Daggers and calligrapher's supplies" } },
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Language 2" }), {
      target: { value: "Elvish" },
    });

    expect(currentCharacter().equipment).toMatchObject({
      currency: { gold: 125 },
      inventory: [
        "Silvered dagger",
        "Component pouch",
        "Scholar's pack",
        "Ink and quill",
      ],
      otherProficiencies: "Daggers and calligrapher's supplies",
      languages: ["Common", "Elvish", "Draconic"],
    });
    expect(currentCharacter().personality).toEqual(exampleCharacter.personality);
  });

  it("updates representative descriptive fields without cross-section data loss", () => {
    render(<Harness />);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Class features" }),
      { target: { value: "Arcane Recovery; Portent" } },
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Ideals" }), {
      target: { value: "Knowledge should be shared" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Height" }), {
      target: { value: "5 ft 9 in" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Character history" }), {
      target: { value: "Raised among lighthouse keepers." },
    });

    const character = currentCharacter();
    expect(character.features).toEqual({
      ...exampleCharacter.features,
      classFeatures: "Arcane Recovery; Portent",
    });
    expect(character.personality).toEqual({
      ...exampleCharacter.personality,
      ideals: "Knowledge should be shared",
    });
    expect(character.appearance).toEqual({ height: "5 ft 9 in" });
    expect(character.backstory).toEqual({
      ...exampleCharacter.backstory,
      history: "Raised among lighthouse keepers.",
    });
    expect(character.identity).toEqual(exampleCharacter.identity);
    expect(character.spellcasting).toEqual(exampleCharacter.spellcasting);
  });

  it("creates, edits, and removes a spell while preserving other character data", () => {
    render(<Harness />);

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

    expect(currentCharacter().spellcasting).toMatchObject({
      class: "Cleric",
      slots: { "2": { total: 3 } },
      spells: { "2": [{ name: "Misty Step", prepared: true }] },
    });
    expect(currentCharacter().identity).toEqual(exampleCharacter.identity);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Misty Step level 2 spell" }),
    );
    expect(currentCharacter().spellcasting?.spells?.["2"]).toEqual([]);
    expect(currentCharacter().spellcasting?.class).toBe("Cleric");
  });

  it("enforces each spell level's PDF row capacity", () => {
    render(<Harness />);

    const addLevelNine = screen.getByRole<HTMLButtonElement>("button", {
      name: "Add level 9 spell",
    });
    for (let index = 0; index < 7; index += 1) fireEvent.click(addLevelNine);

    expect(currentCharacter().spellcasting?.spells?.["9"]).toHaveLength(7);
    expect(addLevelNine.disabled).toBe(true);
    expect(
      screen.getByRole("status", { name: "Level 9 spell capacity" }).textContent,
    ).toContain("7 of 7 PDF spell rows used");
  });

  it("explains when expended spell slots exceed the supplied total", () => {
    render(<Harness />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Level 4 slot total" }), {
      target: { value: "2" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Level 4 slots expended" }),
      { target: { value: "3" } },
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Expended slots cannot exceed the level 4 total of 2.",
    );
    expect(
      screen.getByRole<HTMLInputElement>("spinbutton", {
        name: "Level 4 slots expended",
      }).getAttribute("aria-invalid"),
    ).toBe("true");
  });
});