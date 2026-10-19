/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { CharacterSheet } from "../domain/character-sheet";
import { exampleCharacter } from "../fixtures/example-character";
import { GuidedCharacterForm } from "./guided-character-form";

afterEach(cleanup);

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
});