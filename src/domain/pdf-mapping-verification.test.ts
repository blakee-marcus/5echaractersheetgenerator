import { describe, expect, it } from "vitest";

import inventory from "../../docs/5e-character-sheet-fields.json";
import type { CharacterSheet } from "./character-sheet";
import { mapCharacterToPdfFields, type PdfFieldUpdate } from "./pdf-field-mapping";
import { verifyPdfFieldUpdates } from "./pdf-mapping-verification";

const makeSpells = (level: number, capacity: number, prepared: boolean) =>
  Array.from({ length: capacity }, (_, index) => ({
    name: `L${level} spell ${index + 1}`,
    ...(level === 0 ? {} : { prepared }),
  }));

const fullSupportedCharacter: CharacterSheet = {
  identity: {
    characterName: "Nyx",
    classAndLevel: "Wizard 9",
    race: "Tiefling",
    background: "Sage",
    alignment: "Neutral Good",
    experiencePoints: 48000,
    playerName: "Blake",
  },
  inspiration: true,
  passivePerception: 15,
  proficiencyBonus: 4,
  abilities: {
    strength: { score: 8, modifier: -1, savingThrow: { bonus: -1, proficient: false } },
    dexterity: { score: 14, modifier: 2, savingThrow: { bonus: 2, proficient: false } },
    constitution: { score: 12, modifier: 1, savingThrow: { bonus: 1, proficient: false } },
    intelligence: { score: 18, modifier: 4, savingThrow: { bonus: 8, proficient: true } },
    wisdom: { score: 13, modifier: 1, savingThrow: { bonus: 5, proficient: true } },
    charisma: { score: 10, modifier: 0, savingThrow: { bonus: 0, proficient: false } },
  },
  skills: {
    acrobatics: { bonus: 1, proficient: true },
    animalHandling: { bonus: 2, proficient: false },
    arcana: { bonus: 3, proficient: true },
    athletics: { bonus: 4, proficient: false },
    deception: { bonus: 5, proficient: true },
    history: { bonus: 6, proficient: false },
    insight: { bonus: 7, proficient: true },
    intimidation: { bonus: 8, proficient: false },
    investigation: { bonus: 9, proficient: true },
    medicine: { bonus: 10, proficient: false },
    nature: { bonus: 11, proficient: true },
    perception: { bonus: 12, proficient: false },
    performance: { bonus: 13, proficient: true },
    persuasion: { bonus: 14, proficient: false },
    religion: { bonus: 15, proficient: true },
    sleightOfHand: { bonus: 16, proficient: false },
    stealth: { bonus: 17, proficient: true },
    survival: { bonus: 18, proficient: false },
  },
  combat: {
    armorClass: 15,
    initiative: 2,
    speed: 30,
    hitPoints: { maximum: 48, current: 32, temporary: 0 },
    hitDice: { total: 9, denomination: "d6" },
    deathSaves: { successes: 2, failures: 1 },
  },
  attacks: [
    { name: "Dagger", attackBonus: 6, damage: "1d4+2", damageType: "piercing", notes: "finesse" },
    { name: "Fire Bolt", attackBonus: 8, damage: "2d10", damageType: "fire", notes: "120 ft" },
    { name: "Staff", attackBonus: 3, damage: "1d6-1", damageType: "bludgeoning", notes: "versatile" },
  ],
  equipment: {
    currency: { copper: 1, silver: 2, electrum: 3, gold: 4, platinum: 5 },
    inventory: ["Spellbook", "Component pouch"],
    otherProficiencies: "Daggers, darts, slings, quarterstaffs, light crossbows",
    languages: ["Common", "Infernal"],
  },
  personality: { traits: "Precise", ideals: "Knowledge", bonds: "Archive", flaws: "Pride" },
  features: {
    classFeatures: "Arcane Recovery",
    racialTraits: "Darkvision",
    additionalFeatures: "Keen Mind",
  },
  appearance: {
    age: "27",
    height: "5 ft 8 in",
    weight: "140 lb",
    eyes: "Silver",
    skin: "Olive",
    hair: "Black",
  },
  backstory: {
    history: "Raised in Candlekeep",
    allies: "The Harpers",
    organizations: "Harpers",
    treasure: "A brass key",
  },
  spellcasting: {
    class: "Wizard",
    ability: "INT",
    spellSaveDc: 16,
    spellAttackBonus: 8,
    spells: {
      "0": makeSpells(0, 8, false),
      "1": makeSpells(1, 12, true),
      "2": makeSpells(2, 13, true),
      "3": makeSpells(3, 13, true),
      "4": makeSpells(4, 13, true),
      "5": makeSpells(5, 9, true),
      "6": makeSpells(6, 9, true),
      "7": makeSpells(7, 9, true),
      "8": makeSpells(8, 7, true),
      "9": makeSpells(9, 7, true),
    },
    slots: {
      "1": { total: 1, expended: 0 },
      "2": { total: 2, expended: 1 },
      "3": { total: 3, expended: 2 },
      "4": { total: 4, expended: 3 },
      "5": { total: 5, expended: 4 },
      "6": { total: 6, expended: 5 },
      "7": { total: 7, expended: 6 },
      "8": { total: 8, expended: 7 },
      "9": { total: 9, expended: 8 },
    },
  },
};

describe("verifyPdfFieldUpdates", () => {
  it("accepts existing fields with inventory-declared types", () => {
    expect(
      verifyPdfFieldUpdates(
        [
          { field: "CharacterName", type: "text", value: "Nyx" },
          { field: "Check Box 23", type: "checkbox", checked: false },
        ],
        inventory.fields,
      ),
    ).toEqual([]);
  });

  it("maps all 332 supported fields with only image-import buttons unused", () => {
    const result = mapCharacterToPdfFields(fullSupportedCharacter);
    const mappedNames = new Set(result.updates.map((update) => update.field));

    expect(result.issues).toEqual([]);
    expect(result.updates).toHaveLength(332);
    expect(mappedNames.size).toBe(result.updates.length);
    expect(verifyPdfFieldUpdates(result.updates, inventory.fields)).toEqual([]);
    expect(
      inventory.fields
        .map((field) => field.name)
        .filter((name) => !mappedNames.has(name))
        .sort(),
    ).toEqual(["CHARACTER IMAGE", "Faction Symbol Image"]);
  });

  it("fails missing, mistyped, and conflicting field mappings", () => {
    const updates: PdfFieldUpdate[] = [
      { field: "Not In Template", type: "text", value: "bad" },
      { field: "ClassLevel", type: "checkbox", checked: true },
      { field: "CharacterName", type: "text", value: "Nyx" },
      { field: "CharacterName", type: "text", value: "Duplicate" },
    ];

    expect(verifyPdfFieldUpdates(updates, inventory.fields)).toEqual([
      {
        field: "Not In Template",
        code: "PDF_FIELD_MISSING",
        message: 'Mapped PDF field "Not In Template" does not exist in the Phase 1 inventory',
      },
      {
        field: "ClassLevel",
        code: "PDF_FIELD_TYPE_MISMATCH",
        message: 'Mapped PDF field "ClassLevel" expects text, not checkbox',
      },
      {
        field: "CharacterName",
        code: "PDF_FIELD_MAPPING_CONFLICT",
        message: 'PDF field "CharacterName" has more than one mapping update',
      },
    ]);
  });
});
