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
});
