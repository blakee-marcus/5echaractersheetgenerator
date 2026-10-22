/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CharacterSheet } from "../domain/character-sheet";
import { exampleCharacter } from "../fixtures/example-character";
import { RaceSelection } from "./race-selection-section";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Harness() {
  const [character, setCharacter] = useState<CharacterSheet>(exampleCharacter);
  return (
    <>
      <RaceSelection character={character} onChange={setCharacter} />
      <output data-testid="character-state">{JSON.stringify(character)}</output>
    </>
  );
}

function currentCharacter(): CharacterSheet {
  return JSON.parse(screen.getByTestId("character-state").textContent ?? "{}");
}

describe("RaceSelection", () => {
  it("renders the catalog of official races", () => {
    render(<Harness />);

    expect(screen.getByRole("heading", { name: "Choose Your Race" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Choose/ })).toHaveLength(9);
  });

  it("previews a race without changing the canonical character", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Elf" }));

    expect(screen.getByRole("heading", { name: "Elf" })).toBeTruthy();
    expect(currentCharacter().identity?.race).toBe(exampleCharacter.identity?.race);
  });

  it("applies a race to identity, languages, racial traits, and speed when empty", () => {
    function BlankHarness() {
      const [character, setCharacter] = useState<CharacterSheet>({
        identity: { race: undefined },
        features: {},
        equipment: {},
        combat: {},
      } as unknown as CharacterSheet);
      return (
        <>
          <RaceSelection character={character} onChange={setCharacter} />
          <output data-testid="character-state">{JSON.stringify(character)}</output>
        </>
      );
    }
    render(<BlankHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Dwarf" }));
    fireEvent.click(document.querySelector(`input[name="subrace"][value="hill-dwarf"]`)!);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Hill Dwarf" }));

    const character = currentCharacter();
    expect(character.identity?.race).toBe("Hill Dwarf");
    expect(character.features?.racialTraits).toContain("Dwarven Resilience");
    expect(character.features?.racialTraits).toContain("Dwarven Toughness");
    expect(character.equipment?.languages).toEqual(
      expect.arrayContaining(["Common", "Dwarvish"]),
    );
    expect(character.combat?.speed).toBe(25);
  });

  it("applies a race with a subrace and includes subrace traits", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Elf" }));
    fireEvent.click(document.querySelector(`input[name="subrace"][value="wood-elf"]`)!);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Wood Elf" }));

    const character = currentCharacter();
    expect(character.identity?.race).toBe("Wood Elf");
    expect(character.features?.racialTraits).toContain("Mask of the Wild");
    expect(character.combat?.speed).toBe(30);
  });

  it("does not overwrite a manually set speed when applying a race", () => {
    const characterWithSpeed: CharacterSheet = {
      ...exampleCharacter,
      combat: { ...exampleCharacter.combat, speed: 40 },
    };
    function SpeedHarness() {
      const [character, setCharacter] = useState(characterWithSpeed);
      return (
        <>
          <RaceSelection character={character} onChange={setCharacter} />
          <output data-testid="character-state">{JSON.stringify(character)}</output>
        </>
      );
    }

    render(<SpeedHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Human" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Human" }));

    expect(currentCharacter().combat?.speed).toBe(40);
  });

  it("replaces a previous race without duplicating racial traits or languages", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Dwarf" }));
    fireEvent.click(document.querySelector(`input[name="subrace"][value="hill-dwarf"]`)!);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Hill Dwarf" }));
    const afterDwarf = currentCharacter();
    expect(afterDwarf.identity?.race).toBe("Hill Dwarf");
    expect(afterDwarf.equipment?.languages).toEqual(
      expect.arrayContaining(["Dwarvish"]),
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose Elf" }));
    fireEvent.click(document.querySelector(`input[name="subrace"][value="high-elf"]`)!);
    fireEvent.click(screen.getByRole("button", { name: "Confirm High Elf" }));
    const afterElf = currentCharacter();
    expect(afterElf.identity?.race).toBe("High Elf");
    expect(afterElf.features?.racialTraits).not.toContain("Dwarven Resilience");
    expect(afterElf.features?.racialTraits).toContain("Keen Senses");
    // Languages are additive; a previously granted language is not stripped
    // when switching races, protecting user-authored entries.
    expect(afterElf.equipment?.languages).toEqual(
      expect.arrayContaining(["Dwarvish", "Elvish"]),
    );
  });

  it("does not duplicate racial traits when reapplying the same race", () => {
    function BlankHarness() {
      const [character, setCharacter] = useState<CharacterSheet>({
        identity: { race: undefined },
        features: {},
        equipment: {},
        combat: {},
      } as unknown as CharacterSheet);
      return (
        <>
          <RaceSelection character={character} onChange={setCharacter} />
          <output data-testid="character-state">{JSON.stringify(character)}</output>
        </>
      );
    }
    render(<BlankHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Dwarf" }));
    fireEvent.click(document.querySelector(`input[name="subrace"][value="hill-dwarf"]`)!);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Hill Dwarf" }));
    const first = currentCharacter();
    const firstCount = (first.features?.racialTraits?.match(/Dwarven Resilience/g) ?? []).length;
    expect(firstCount).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Choose Dwarf" }));
    fireEvent.click(document.querySelector(`input[name="subrace"][value="hill-dwarf"]`)!);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Hill Dwarf" }));
    const second = currentCharacter();
    const secondCount = (second.features?.racialTraits?.match(/Dwarven Resilience/g) ?? []).length;
    expect(secondCount).toBe(1);
  });

  it("preserves manually entered languages when switching races", () => {
    function CustomLanguageHarness() {
      const [character, setCharacter] = useState<CharacterSheet>({
        identity: { race: undefined },
        features: {},
        equipment: { languages: ["Common", "Dwarvish", "Abyssal"] },
        combat: {},
      } as unknown as CharacterSheet);
      return (
        <>
          <RaceSelection character={character} onChange={setCharacter} />
          <output data-testid="character-state">{JSON.stringify(character)}</output>
        </>
      );
    }
    render(<CustomLanguageHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Dwarf" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Dwarf" }));
    expect(currentCharacter().equipment?.languages).toEqual(
      expect.arrayContaining(["Common", "Dwarvish", "Abyssal"]),
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose Elf" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Elf" }));
    expect(currentCharacter().equipment?.languages).toEqual(
      expect.arrayContaining(["Common", "Dwarvish", "Abyssal", "Elvish"]),
    );
  });

  it("preserves custom race values entered in Identity and does not crash", () => {
    const customCharacter: CharacterSheet = {
      ...exampleCharacter,
      identity: { ...exampleCharacter.identity, race: "Aarakocra" },
    };
    function CustomHarness() {
      const [character, setCharacter] = useState(customCharacter);
      return (
        <>
          <RaceSelection character={character} onChange={setCharacter} />
          <output data-testid="character-state">{JSON.stringify(character)}</output>
        </>
      );
    }

    render(<CustomHarness />);

    expect(screen.getByText("Your race:")).toBeDefined();
    expect(screen.getByText("Aarakocra")).toBeDefined();
    expect(currentCharacter().identity?.race).toBe("Aarakocra");
  });

  it("calls onRaceSelected when a race is selected or applied", () => {
    const onRaceSelected = vi.fn();
    function CallbackHarness() {
      const [character, setCharacter] = useState<CharacterSheet>(exampleCharacter);
      return (
        <>
          <RaceSelection
            character={character}
            onChange={setCharacter}
            onRaceSelected={onRaceSelected}
          />
        </>
      );
    }

    render(<CallbackHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Halfling" }));
    expect(onRaceSelected).toHaveBeenCalledWith("halfling");

    fireEvent.click(document.querySelector(`input[name="subrace"][value="stout"]`)!);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Stout Halfling" }));
    expect(onRaceSelected).toHaveBeenLastCalledWith("halfling");
  });

  it("does not display Hit Dice as a racial attribute", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Dragonborn" }));

    expect(screen.queryByText(/Hit Die/i)).toBeNull();
    expect(screen.queryByText(/d8/i)).toBeNull();
    expect(screen.getByRole("heading", { name: "Racial traits" })).toBeTruthy();
  });
});
