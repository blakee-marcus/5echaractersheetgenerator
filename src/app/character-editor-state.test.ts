import { describe, expect, it } from "vitest";

import { exampleCharacter } from "../fixtures/example-character";
import {
  addAttack,
  addInventoryItem,
  addLanguage,
  applyJsonDraft,
  parseOptionalInteger,
  removeAttack,
  removeInventoryItem,
  removeLanguage,
  updateAbility,
  updateAbilitySavingThrow,
  updateAttack,
  updateCombat,
  updateCurrency,
  updateDeathSaves,
  updateEquipmentText,
  updateHitPoints,
  updateIdentity,
  updateInventoryItem,
  updateLanguage,
  updateSkill,
} from "./character-editor-state";

describe("character editor state", () => {
  it("updates identity without changing untouched character sections", () => {
    const updated = updateIdentity(
      exampleCharacter,
      "characterName",
      "Seraphine Vale",
    );

    expect(updated.identity?.characterName).toBe("Seraphine Vale");
    expect(updated.spellcasting).toEqual(exampleCharacter.spellcasting);
    expect(updated.attacks).toEqual(exampleCharacter.attacks);
  });

  it("preserves explicit zero and negative integers while empty input removes the value", () => {
    expect(parseOptionalInteger("0")).toBe(0);
    expect(parseOptionalInteger("-2")).toBe(-2);
    expect(parseOptionalInteger("")).toBeUndefined();
    expect(parseOptionalInteger("  ")).toBeUndefined();
  });

  it("updates ability and saving-throw fields without calculating related values", () => {
    const withScore = updateAbility(
      exampleCharacter,
      "intelligence",
      "score",
      20,
    );
    const withModifier = updateAbility(
      withScore,
      "intelligence",
      "modifier",
      5,
    );
    const withSave = updateAbilitySavingThrow(
      withModifier,
      "intelligence",
      { bonus: 9, proficient: true },
    );

    expect(withSave.abilities?.intelligence).toEqual({
      score: 20,
      modifier: 5,
      savingThrow: { bonus: 9, proficient: true },
    });
    expect(withSave.abilities?.wisdom).toEqual(
      exampleCharacter.abilities.wisdom,
    );
  });

  it("updates nested combat values and preserves sibling combat fields", () => {
    const withArmor = updateCombat(exampleCharacter, "armorClass", 17);
    const withHitPoints = updateHitPoints(withArmor, "current", 41);
    const withDeathSaves = updateDeathSaves(withHitPoints, "successes", 2);

    expect(withDeathSaves.combat).toMatchObject({
      armorClass: 17,
      initiative: exampleCharacter.combat.initiative,
      hitPoints: {
        maximum: exampleCharacter.combat.hitPoints.maximum,
        current: 41,
      },
      deathSaves: { successes: 2 },
    });
  });

  it("updates a skill without changing other sections", () => {
    const updated = updateSkill(exampleCharacter, "arcana", {
      bonus: 9,
      proficient: false,
    });

    expect(updated.skills?.arcana).toEqual({ bonus: 9, proficient: false });
    expect(updated.skills?.history).toEqual(exampleCharacter.skills.history);
    expect(updated.attacks).toEqual(exampleCharacter.attacks);
    expect(updated.spellcasting).toEqual(exampleCharacter.spellcasting);
  });

  it("adds, edits, and removes attacks while enforcing the PDF capacity", () => {
    const withThird = addAttack(exampleCharacter);
    const edited = updateAttack(withThird, 2, "name", "Quarterstaff");
    const atCapacity = addAttack(edited);
    const removed = removeAttack(atCapacity, 0);

    expect(edited.attacks).toHaveLength(3);
    expect(edited.attacks?.[2]).toEqual({ name: "Quarterstaff" });
    expect(atCapacity).toBe(edited);
    expect(removed.attacks).toEqual([
      exampleCharacter.attacks[1],
      { name: "Quarterstaff" },
    ]);
    expect(removed.equipment).toEqual(exampleCharacter.equipment);
  });

  it("updates currency, inventory, proficiencies, and languages immutably", () => {
    const withCurrency = updateCurrency(exampleCharacter, "gold", 125);
    const withProficiencies = updateEquipmentText(
      withCurrency,
      "otherProficiencies",
      "Daggers and calligrapher's supplies",
    );
    const withInventory = addInventoryItem(withProficiencies);
    const editedInventory = updateInventoryItem(
      withInventory,
      (withInventory.equipment?.inventory?.length ?? 1) - 1,
      "Ink and quill",
    );
    const trimmedInventory = removeInventoryItem(editedInventory, 0);
    const withLanguage = addLanguage(trimmedInventory);
    const editedLanguage = updateLanguage(
      withLanguage,
      (withLanguage.equipment?.languages?.length ?? 1) - 1,
      "Elvish",
    );
    const trimmedLanguage = removeLanguage(editedLanguage, 0);

    expect(trimmedLanguage.equipment).toMatchObject({
      currency: { gold: 125 },
      otherProficiencies: "Daggers and calligrapher's supplies",
      inventory: ["Component pouch", "Scholar's pack", "Ink and quill"],
      languages: ["Infernal", "Draconic", "Elvish"],
    });
    expect(trimmedLanguage.skills).toEqual(exampleCharacter.skills);
    expect(trimmedLanguage.personality).toEqual(exampleCharacter.personality);
  });

  it("applies valid JSON through the existing schema", () => {
    const result = applyJsonDraft(
      exampleCharacter,
      JSON.stringify({
        identity: { characterName: "Applied JSON" },
        combat: { armorClass: 18 },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.character).toEqual({
        identity: { characterName: "Applied JSON" },
        combat: { armorClass: 18 },
      });
    }
  });

  it("keeps canonical state unchanged for malformed or schema-invalid drafts", () => {
    const malformed = applyJsonDraft(exampleCharacter, '{"identity":');
    const invalid = applyJsonDraft(
      exampleCharacter,
      JSON.stringify({ abilities: { strength: { score: "18" } } }),
    );

    expect(malformed.success).toBe(false);
    expect(malformed.character).toBe(exampleCharacter);
    expect(malformed.issues[0]).toMatchObject({ code: "MALFORMED_JSON" });
    expect(invalid.success).toBe(false);
    expect(invalid.character).toBe(exampleCharacter);
    expect(invalid.issues[0]).toMatchObject({
      code: "INVALID_CHARACTER_DATA",
      path: "/abilities/strength/score",
    });
  });
});