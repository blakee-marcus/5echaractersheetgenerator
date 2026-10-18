import { describe, expect, it } from "vitest";

import type { CharacterSheet } from "./character-sheet";
import { mapCharacterToPdfFields } from "./pdf-field-mapping";

function updateFor(
  result: ReturnType<typeof mapCharacterToPdfFields>,
  field: string,
) {
  return result.updates.find((update) => update.field === field);
}

const allSkills: NonNullable<CharacterSheet["skills"]> = {
  acrobatics: { bonus: -1, proficient: true },
  animalHandling: { bonus: 0, proficient: false },
  arcana: { bonus: 2, proficient: true },
  athletics: { bonus: -1, proficient: false },
  deception: { bonus: 0, proficient: true },
  history: { bonus: 2, proficient: false },
  insight: { bonus: -1, proficient: true },
  intimidation: { bonus: 0, proficient: false },
  investigation: { bonus: 2, proficient: true },
  medicine: { bonus: -1, proficient: false },
  nature: { bonus: 0, proficient: true },
  perception: { bonus: 2, proficient: false },
  performance: { bonus: -1, proficient: true },
  persuasion: { bonus: 0, proficient: false },
  religion: { bonus: 2, proficient: true },
  sleightOfHand: { bonus: -1, proficient: false },
  stealth: { bonus: 0, proficient: true },
  survival: { bonus: 2, proficient: false },
};

describe("mapCharacterToPdfFields", () => {
  it("returns no updates or issues for an empty character", () => {
    expect(mapCharacterToPdfFields({})).toEqual({ updates: [], issues: [] });
  });

  it("maps identity and repeats character name on pages one and two", () => {
    const result = mapCharacterToPdfFields({
      identity: {
        characterName: "Nyx",
        classAndLevel: "Warlock 3",
        race: "Tiefling",
        background: "Sage",
        alignment: "Chaotic Good",
        playerName: "Blake",
        experiencePoints: 0,
      },
    });

    expect(result).toEqual({
      updates: [
        { field: "CharacterName", type: "text", value: "Nyx" },
        { field: "CharacterName 2", type: "text", value: "Nyx" },
        { field: "ClassLevel", type: "text", value: "Warlock 3" },
        { field: "Race ", type: "text", value: "Tiefling" },
        { field: "Background", type: "text", value: "Sage" },
        { field: "Alignment", type: "text", value: "Chaotic Good" },
        { field: "PlayerName", type: "text", value: "Blake" },
        { field: "XP", type: "text", value: "0" },
      ],
      issues: [],
    });
  });

  it("preserves explicit false and zero for inspiration and passive perception", () => {
    expect(mapCharacterToPdfFields({ inspiration: false, passivePerception: 0 })).toEqual({
      updates: [
        { field: "Inspiration", type: "text", value: "" },
        { field: "Passive", type: "text", value: "0" },
      ],
      issues: [],
    });
  });

  it("uses a Helvetica-compatible marker for explicit inspiration", () => {
    expect(mapCharacterToPdfFields({ inspiration: true })).toEqual({
      updates: [{ field: "Inspiration", type: "text", value: "X" }],
      issues: [],
    });
  });

  it("maps all abilities and saving throws with consistent bonus formatting", () => {
    const result = mapCharacterToPdfFields({
      proficiencyBonus: 0,
      abilities: {
        strength: { score: 8, modifier: -1, savingThrow: { bonus: -1, proficient: false } },
        dexterity: { score: 14, modifier: 2, savingThrow: { bonus: 2, proficient: true } },
        constitution: { score: 12, modifier: 1, savingThrow: { bonus: 1, proficient: false } },
        intelligence: { score: 10, modifier: 0, savingThrow: { bonus: 0, proficient: true } },
        wisdom: { score: 16, modifier: 3, savingThrow: { bonus: 3, proficient: false } },
        charisma: { score: 18, modifier: 4, savingThrow: { bonus: 4, proficient: true } },
      },
    });

    expect(result.issues).toEqual([]);
    expect(updateFor(result, "ProfBonus")).toEqual({ field: "ProfBonus", type: "text", value: "0" });
    expect(updateFor(result, "STR")).toEqual({ field: "STR", type: "text", value: "8" });
    expect(updateFor(result, "STRmod")).toEqual({ field: "STRmod", type: "text", value: "-1" });
    expect(updateFor(result, "DEXmod ")).toEqual({ field: "DEXmod ", type: "text", value: "+2" });
    expect(updateFor(result, "INTmod")).toEqual({ field: "INTmod", type: "text", value: "0" });
    expect(updateFor(result, "ST Charisma")).toEqual({ field: "ST Charisma", type: "text", value: "+4" });
    expect([11, 18, 19, 20, 21, 22].map((number) => updateFor(result, `Check Box ${number}`))).toEqual([
      { field: "Check Box 11", type: "checkbox", checked: false },
      { field: "Check Box 18", type: "checkbox", checked: true },
      { field: "Check Box 19", type: "checkbox", checked: false },
      { field: "Check Box 20", type: "checkbox", checked: true },
      { field: "Check Box 21", type: "checkbox", checked: false },
      { field: "Check Box 22", type: "checkbox", checked: true },
    ]);
  });

  it("maps all 18 skill bonuses and proficiency checkboxes", () => {
    const result = mapCharacterToPdfFields({ skills: allSkills });

    expect(result.issues).toEqual([]);
    expect(result.updates).toHaveLength(36);
    expect(updateFor(result, "Acrobatics")).toEqual({ field: "Acrobatics", type: "text", value: "-1" });
    expect(updateFor(result, "Animal")).toEqual({ field: "Animal", type: "text", value: "0" });
    expect(updateFor(result, "Arcana")).toEqual({ field: "Arcana", type: "text", value: "+2" });
    expect(updateFor(result, "Check Box 23")).toEqual({ field: "Check Box 23", type: "checkbox", checked: true });
    expect(updateFor(result, "Check Box 40")).toEqual({ field: "Check Box 40", type: "checkbox", checked: false });
  });

  it("maps combat values and death-save counts to visual checkbox sequences", () => {
    const result = mapCharacterToPdfFields({
      combat: {
        armorClass: 15,
        initiative: 2,
        speed: 30,
        hitPoints: { maximum: 40, current: 0, temporary: 5 },
        hitDice: { total: 5, denomination: "d8" },
        deathSaves: { successes: 2, failures: 0 },
      },
    });

    expect(result.issues).toEqual([]);
    expect(updateFor(result, "AC")).toEqual({ field: "AC", type: "text", value: "15" });
    expect(updateFor(result, "Initiative")).toEqual({ field: "Initiative", type: "text", value: "+2" });
    expect(updateFor(result, "HPCurrent")).toEqual({ field: "HPCurrent", type: "text", value: "0" });
    expect(updateFor(result, "HDTotal")).toEqual({ field: "HDTotal", type: "text", value: "5" });
    expect(updateFor(result, "HD")).toEqual({ field: "HD", type: "text", value: "d8" });
    expect([12, 13, 14].map((number) => updateFor(result, `Check Box ${number}`))).toEqual([
      { field: "Check Box 12", type: "checkbox", checked: true },
      { field: "Check Box 13", type: "checkbox", checked: true },
      { field: "Check Box 14", type: "checkbox", checked: false },
    ]);
  });

  it("reports unsupported expended hit dice and suppresses partial updates", () => {
    expect(
      mapCharacterToPdfFields({
        identity: { characterName: "Nyx" },
        combat: { hitDice: { total: 5, denomination: "d8", expended: 2 } },
      }),
    ).toEqual({
      updates: [],
      issues: [
        {
          path: "/combat/hitDice/expended",
          code: "PDF_UNSUPPORTED_PROPERTY",
          message: "The PDF has no field for expended hit dice without calculating a remaining value",
        },
      ],
    });
  });

  it("reports death-save counts that cannot fit the three boxes", () => {
    expect(mapCharacterToPdfFields({ combat: { deathSaves: { successes: 4, failures: 5 } } })).toEqual({
      updates: [],
      issues: [
        {
          path: "/combat/deathSaves/successes",
          code: "PDF_CAPACITY_EXCEEDED",
          message: "Death-save successes exceed the 3 available PDF checkboxes",
        },
        {
          path: "/combat/deathSaves/failures",
          code: "PDF_CAPACITY_EXCEEDED",
          message: "Death-save failures exceed the 3 available PDF checkboxes",
        },
      ],
    });
  });

  it("maps attacks in order into the three structured rows", () => {
    const result = mapCharacterToPdfFields({
      attacks: [
        { name: "Dagger", attackBonus: 5, damage: "1d4+3", damageType: "piercing", notes: "finesse" },
        { name: "Longbow", attackBonus: 0, damage: "1d8", damageType: "piercing", notes: "range 150/600" },
        { name: "Unarmed Strike", attackBonus: -1, damage: "1", damageType: "bludgeoning" },
      ],
    });

    expect(result.issues).toEqual([]);
    expect(updateFor(result, "Wpn Name")).toEqual({ field: "Wpn Name", type: "text", value: "Dagger" });
    expect(updateFor(result, "Wpn2 AtkBonus ")).toEqual({ field: "Wpn2 AtkBonus ", type: "text", value: "0" });
    expect(updateFor(result, "Wpn3 Damage ")).toEqual({ field: "Wpn3 Damage ", type: "text", value: "1 bludgeoning" });
    expect(updateFor(result, "AttacksSpellcasting")).toEqual({
      field: "AttacksSpellcasting",
      type: "text",
      value: "Dagger: finesse\nLongbow: range 150/600",
    });
  });

  it("reports attack overflow and suppresses partial updates", () => {
    const result = mapCharacterToPdfFields({
      identity: { characterName: "Nyx" },
      attacks: [{ name: "One" }, { name: "Two" }, { name: "Three" }, { name: "Four" }],
    });

    expect(result).toEqual({
      updates: [],
      issues: [
        {
          path: "/attacks/3",
          code: "PDF_CAPACITY_EXCEEDED",
          message: "Attack exceeds the 3 available PDF rows",
        },
      ],
    });
  });

  it("maps equipment, currency, proficiencies, and languages", () => {
    const result = mapCharacterToPdfFields({
      equipment: {
        currency: { copper: 0, silver: 2, electrum: 3, gold: 40, platinum: 5 },
        inventory: ["Arcane focus", "Scholar's pack"],
        otherProficiencies: "Light armor",
        languages: ["Common", "Infernal"],
      },
    });

    expect(result.issues).toEqual([]);
    expect(updateFor(result, "CP")).toEqual({ field: "CP", type: "text", value: "0" });
    expect(updateFor(result, "Equipment")).toEqual({ field: "Equipment", type: "text", value: "Arcane focus\nScholar's pack" });
    expect(updateFor(result, "ProficienciesLang")).toEqual({
      field: "ProficienciesLang",
      type: "text",
      value: "Other Proficiencies\nLight armor\n\nLanguages\nCommon\nInfernal",
    });
  });

  it("maps personality fields", () => {
    expect(
      mapCharacterToPdfFields({
        personality: { traits: "Precise", ideals: "Knowledge", bonds: "Archive", flaws: "Pride" },
      }),
    ).toEqual({
      updates: [
        { field: "PersonalityTraits ", type: "text", value: "Precise" },
        { field: "Ideals", type: "text", value: "Knowledge" },
        { field: "Bonds", type: "text", value: "Archive" },
        { field: "Flaws", type: "text", value: "Pride" },
      ],
      issues: [],
    });
  });

  it("maps feature categories to their page-one and page-two fields", () => {
    const result = mapCharacterToPdfFields({
      features: {
        classFeatures: "Arcane Recovery",
        racialTraits: "Darkvision",
        additionalFeatures: "Keen Mind",
      },
    });

    expect(result).toEqual({
      updates: [
        {
          field: "Features and Traits",
          type: "text",
          value: "Class Features\nArcane Recovery\n\nRacial Traits\nDarkvision",
        },
        { field: "Feat+Traits", type: "text", value: "Keen Mind" },
      ],
      issues: [],
    });
  });

  it("maps appearance and backstory fields", () => {
    const result = mapCharacterToPdfFields({
      appearance: { age: "27", height: "5 ft 8 in", weight: "140 lb", eyes: "Silver", skin: "Olive", hair: "Black" },
      backstory: {
        history: "Raised in Candlekeep",
        allies: "The Harpers",
        organizations: "Harpers",
        treasure: "A brass key",
      },
    });

    expect(result.issues).toEqual([]);
    expect(result.updates).toEqual([
      { field: "Age", type: "text", value: "27" },
      { field: "Height", type: "text", value: "5 ft 8 in" },
      { field: "Weight", type: "text", value: "140 lb" },
      { field: "Eyes", type: "text", value: "Silver" },
      { field: "Skin", type: "text", value: "Olive" },
      { field: "Hair", type: "text", value: "Black" },
      { field: "Backstory", type: "text", value: "Raised in Candlekeep" },
      { field: "Allies", type: "text", value: "The Harpers" },
      { field: "FactionName", type: "text", value: "Harpers" },
      { field: "Treasure", type: "text", value: "A brass key" },
    ]);
  });

  it("reports unsupported appearance description and suppresses partial updates", () => {
    expect(
      mapCharacterToPdfFields({ identity: { characterName: "Nyx" }, appearance: { description: "Silver eyes" } }),
    ).toEqual({
      updates: [],
      issues: [
        {
          path: "/appearance/description",
          code: "PDF_UNSUPPORTED_PROPERTY",
          message: "The PDF has no text field for character description",
        },
      ],
    });
  });

  it("maps spellcasting metadata and first spell in every level section", () => {
    const result = mapCharacterToPdfFields({
      spellcasting: {
        class: "Wizard",
        ability: "INT",
        spellSaveDc: 15,
        spellAttackBonus: 7,
        spells: {
          "0": [{ name: "Level 0 spell" }],
          "1": [{ name: "Level 1 spell", prepared: false }],
          "2": [{ name: "Level 2 spell", prepared: true }],
          "3": [{ name: "Level 3 spell", prepared: false }],
          "4": [{ name: "Level 4 spell", prepared: true }],
          "5": [{ name: "Level 5 spell", prepared: false }],
          "6": [{ name: "Level 6 spell", prepared: true }],
          "7": [{ name: "Level 7 spell", prepared: false }],
          "8": [{ name: "Level 8 spell", prepared: true }],
          "9": [{ name: "Level 9 spell", prepared: false }],
        },
      },
    });

    expect(result.issues).toEqual([]);
    expect(updateFor(result, "Spellcasting Class 2")).toEqual({ field: "Spellcasting Class 2", type: "text", value: "Wizard" });
    expect(updateFor(result, "SpellSaveDC  2")).toEqual({ field: "SpellSaveDC  2", type: "text", value: "15" });
    expect(updateFor(result, "SpellAtkBonus 2")).toEqual({ field: "SpellAtkBonus 2", type: "text", value: "+7" });
    const textFields = ["Spells 1014", "Spells 1015", "Spells 1046", "Spells 1048", "Spells 1061", "Spells 1074", "Spells 1083", "Spells 1092", "Spells 10101", "Spells 10108"];
    textFields.forEach((field, level) => {
      expect(updateFor(result, field)).toEqual({ field, type: "text", value: `Level ${level} spell` });
    });
    expect(updateFor(result, "Check Box 251")).toEqual({ field: "Check Box 251", type: "checkbox", checked: false });
    expect(updateFor(result, "Check Box 313")).toEqual({ field: "Check Box 313", type: "checkbox", checked: true });
  });

  it("maps spell slot totals and expended counts for levels one through nine", () => {
    const slots: NonNullable<NonNullable<CharacterSheet["spellcasting"]>["slots"]> = {
      "1": { total: 2, expended: 0 },
      "2": { total: 4, expended: 1 },
      "3": { total: 6, expended: 2 },
      "4": { total: 8, expended: 3 },
      "5": { total: 10, expended: 4 },
      "6": { total: 12, expended: 5 },
      "7": { total: 14, expended: 6 },
      "8": { total: 16, expended: 7 },
      "9": { total: 18, expended: 8 },
    };
    const result = mapCharacterToPdfFields({ spellcasting: { slots } });

    expect(result.issues).toEqual([]);
    for (let level = 1; level <= 9; level += 1) {
      const suffix = level + 18;
      expect(updateFor(result, `SlotsTotal ${suffix}`)).toEqual({
        field: `SlotsTotal ${suffix}`,
        type: "text",
        value: String(level * 2),
      });
      expect(updateFor(result, `SlotsRemaining ${suffix}`)).toEqual({
        field: `SlotsRemaining ${suffix}`,
        type: "text",
        value: String(level - 1),
      });
    }
  });

  it("reports spell overflow at its semantic path and suppresses partial updates", () => {
    const result = mapCharacterToPdfFields({
      identity: { characterName: "Nyx" },
      spellcasting: {
        spells: { "9": Array.from({ length: 8 }, (_, index) => ({ name: `Spell ${index + 1}` })) },
      },
    });

    expect(result).toEqual({
      updates: [],
      issues: [
        {
          path: "/spellcasting/spells/9/7",
          code: "PDF_CAPACITY_EXCEEDED",
          message: "Spell exceeds the 7 available PDF rows for level 9",
        },
      ],
    });
  });

  it("reports unsupported cantrip preparation and spell notes as fatal issues", () => {
    const result = mapCharacterToPdfFields({
      identity: { characterName: "Nyx" },
      spellcasting: {
        spells: {
          "0": [{ name: "Light", prepared: false }],
          "1": [{ name: "Shield", notes: "Reaction" }],
        },
      },
    });

    expect(result).toEqual({
      updates: [],
      issues: [
        {
          path: "/spellcasting/spells/0/0/prepared",
          code: "PDF_UNSUPPORTED_PROPERTY",
          message: "The PDF has no prepared checkbox for cantrips",
        },
        {
          path: "/spellcasting/spells/1/0/notes",
          code: "PDF_UNSUPPORTED_PROPERTY",
          message: "The PDF has no per-spell notes field",
        },
      ],
    });
  });
});
