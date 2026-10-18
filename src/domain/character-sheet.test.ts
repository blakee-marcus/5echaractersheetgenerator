import { describe, expect, it } from "vitest";

import { characterSheetSchema } from "./character-sheet";

describe("characterSheetSchema", () => {
  it("accepts supplied inspiration and passive perception without deriving either value", () => {
    const input = { inspiration: false, passivePerception: 0 };

    expect(characterSheetSchema.parse(input)).toEqual(input);
  });

  it("accepts a fully populated character across all supported categories", () => {
    const fullCharacter = {
      identity: {
        characterName: "Nyx Vesper",
        classAndLevel: "Warlock 9",
        race: "Tiefling",
        background: "Sage",
        alignment: "Chaotic Good",
        playerName: "Blake",
        experiencePoints: 48000,
      },
      proficiencyBonus: 4,
      abilities: {
        strength: { score: 8, modifier: -1, savingThrow: { bonus: -1, proficient: false } },
        dexterity: { score: 14, modifier: 2, savingThrow: { bonus: 2, proficient: false } },
        constitution: { score: 14, modifier: 2, savingThrow: { bonus: 6, proficient: true } },
        intelligence: { score: 12, modifier: 1, savingThrow: { bonus: 1, proficient: false } },
        wisdom: { score: 10, modifier: 0, savingThrow: { bonus: 4, proficient: true } },
        charisma: { score: 18, modifier: 4, savingThrow: { bonus: 8, proficient: true } },
      },
      skills: {
        acrobatics: { bonus: 2, proficient: false },
        animalHandling: { bonus: 0, proficient: false },
        arcana: { bonus: 5, proficient: true },
        athletics: { bonus: -1, proficient: false },
        deception: { bonus: 8, proficient: true },
        history: { bonus: 5, proficient: true },
        insight: { bonus: 0, proficient: false },
        intimidation: { bonus: 8, proficient: true },
        investigation: { bonus: 1, proficient: false },
        medicine: { bonus: 0, proficient: false },
        nature: { bonus: 1, proficient: false },
        perception: { bonus: 4, proficient: true },
        performance: { bonus: 4, proficient: false },
        persuasion: { bonus: 8, proficient: true },
        religion: { bonus: 1, proficient: false },
        sleightOfHand: { bonus: 2, proficient: false },
        stealth: { bonus: 6, proficient: true },
        survival: { bonus: 0, proficient: false },
      },
      combat: {
        armorClass: 15,
        initiative: 2,
        speed: 30,
        hitPoints: { maximum: 66, current: 50, temporary: 5 },
        hitDice: { total: 9, expended: 2, denomination: "d8" },
        deathSaves: { successes: 1, failures: 0 },
      },
      attacks: [
        { name: "Quarterstaff", attackBonus: 3, damage: "1d6-1", damageType: "bludgeoning" },
        { name: "Eldritch Blast", attackBonus: 8, damage: "2d10", damageType: "force", notes: "120 ft" },
      ],
      equipment: {
        currency: { copper: 1, silver: 2, electrum: 3, gold: 40, platinum: 5 },
        inventory: ["Arcane focus", "Scholar's pack"],
        otherProficiencies: "Light armor, simple weapons",
        languages: ["Common", "Infernal", "Draconic"],
      },
      personality: {
        traits: "I speak precisely.",
        ideals: "Knowledge should be shared.",
        bonds: "My old library must be restored.",
        flaws: "I overestimate obscure plans.",
      },
      features: {
        classFeatures: "Pact of the Tome",
        racialTraits: "Darkvision; Hellish Resistance",
        additionalFeatures: "Researcher",
      },
      appearance: {
        age: "28",
        height: "5 ft 8 in",
        weight: "145 lb",
        eyes: "Gold",
        skin: "Crimson",
        hair: "Black",
        description: "A scholar carrying an old brass-bound grimoire.",
      },
      backstory: {
        history: "Nyx found a patron while translating a sealed manuscript.",
        allies: "The Lantern Archive",
        organizations: "Order of the Brass Key",
        treasure: "Annotated planar atlas",
      },
      spellcasting: {
        class: "Warlock",
        ability: "CHA",
        spellSaveDc: 16,
        spellAttackBonus: 8,
        spells: {
          "0": [{ name: "Eldritch Blast" }, { name: "Mage Hand" }],
          "1": [{ name: "Hex", prepared: true }],
          "2": [{ name: "Misty Step", prepared: true }],
          "3": [{ name: "Counterspell", prepared: false }],
          "4": [{ name: "Banishment", prepared: true }],
          "5": [{ name: "Hold Monster", prepared: true, notes: "Patron spell" }],
          "6": [{ name: "Arcane Gate" }],
          "7": [{ name: "Forcecage" }],
          "8": [{ name: "Glibness" }],
          "9": [{ name: "Foresight" }],
        },
        slots: {
          "1": { total: 2, expended: 0 },
          "2": { total: 2, expended: 1 },
          "3": { total: 2, expended: 0 },
          "4": { total: 2, expended: 1 },
          "5": { total: 2, expended: 0 },
          "6": { total: 1, expended: 0 },
          "7": { total: 1, expended: 0 },
          "8": { total: 1, expended: 0 },
          "9": { total: 1, expended: 0 },
        },
      },
    };

    expect(characterSheetSchema.parse(fullCharacter)).toEqual(fullCharacter);
  });

  it("accepts a partial character and preserves omitted values", () => {
    const input = {
      identity: {
        characterName: "Nyx",
        classAndLevel: "Warlock 3",
        race: "Tiefling",
      },
      abilities: {
        charisma: {
          score: 16,
          modifier: 3,
          savingThrow: {
            bonus: 5,
            proficient: true,
          },
        },
      },
      skills: {
        deception: {
          bonus: 5,
          proficient: true,
        },
      },
      spellcasting: {
        class: "Warlock",
        ability: "CHA",
        spellSaveDc: 13,
        spells: {
          "0": [{ name: "Eldritch Blast" }],
          "1": [{ name: "Hex", prepared: true }],
        },
        slots: {
          "1": { total: 2, expended: 0 },
        },
      },
    };

    expect(characterSheetSchema.parse(input)).toEqual(input);
  });

  it("rejects invalid scalar types with a precise nested path", () => {
    const result = characterSheetSchema.safeParse({
      abilities: { charisma: { score: "16" } },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "invalid_type",
            path: ["abilities", "charisma", "score"],
          }),
        ]),
      );
    }
  });

  it("rejects fractional values in discrete numeric fields", () => {
    const result = characterSheetSchema.safeParse({
      combat: { hitPoints: { current: 12.5 } },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        code: "invalid_type",
        path: ["combat", "hitPoints", "current"],
      });
    }
  });

  it("rejects negative currency quantities", () => {
    const result = characterSheetSchema.safeParse({
      equipment: { currency: { gold: -1 } },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["equipment", "currency", "gold"],
      });
    }
  });

  it("restricts death-save counts to the three available outcomes", () => {
    const negative = characterSheetSchema.safeParse({
      combat: { deathSaves: { successes: -1 } },
    });
    const overflow = characterSheetSchema.safeParse({
      combat: { deathSaves: { failures: 4 } },
    });

    expect(negative.success).toBe(false);
    expect(overflow.success).toBe(false);
  });

  it("rejects negative current and temporary hit points", () => {
    const current = characterSheetSchema.safeParse({
      combat: { hitPoints: { current: -1 } },
    });
    const temporary = characterSheetSchema.safeParse({
      combat: { hitPoints: { temporary: -1 } },
    });

    expect(current.success).toBe(false);
    expect(temporary.success).toBe(false);
  });

  it("requires nonnegative spell slots and rejects expended counts above a supplied total", () => {
    const negative = characterSheetSchema.safeParse({
      spellcasting: { slots: { "1": { total: -1 } } },
    });
    const overdrawn = characterSheetSchema.safeParse({
      spellcasting: { slots: { "2": { total: 2, expended: 3 } } },
    });
    const partialDraft = characterSheetSchema.safeParse({
      spellcasting: { slots: { "3": { expended: 1 } } },
    });

    expect(negative.success).toBe(false);
    expect(overdrawn.success).toBe(false);
    expect(partialDraft.success).toBe(true);
  });

  it("rejects spell and slot levels outside the modeled ranges", () => {
    const spellLevel = characterSheetSchema.safeParse({
      spellcasting: { spells: { "10": [{ name: "Impossible Spell" }] } },
    });
    const slotLevel = characterSheetSchema.safeParse({
      spellcasting: { slots: { "0": { total: 1, expended: 0 } } },
    });

    expect(spellLevel.success).toBe(false);
    expect(slotLevel.success).toBe(false);
  });

  it("rejects unknown properties at top-level and nested boundaries", () => {
    const topLevel = characterSheetSchema.safeParse({ typo: true });
    const nested = characterSheetSchema.safeParse({
      identity: { characterName: "Nyx", classLevel: "Warlock 3" },
    });

    expect(topLevel.success).toBe(false);
    expect(nested.success).toBe(false);
    if (!nested.success) {
      expect(nested.error.issues[0]).toMatchObject({
        code: "unrecognized_keys",
        path: ["identity"],
        keys: ["classLevel"],
      });
    }
  });

  it("rejects malformed repeated and nested structures", () => {
    const attacks = characterSheetSchema.safeParse({ attacks: { name: "Dagger" } });
    const spells = characterSheetSchema.safeParse({
      spellcasting: { spells: { "1": { name: "Hex" } } },
    });

    expect(attacks.success).toBe(false);
    expect(spells.success).toBe(false);
    if (!spells.success) {
      expect(spells.error.issues[0]).toMatchObject({
        code: "invalid_type",
        path: ["spellcasting", "spells", "1"],
      });
    }
  });

  it("does not impose PDF row capacity on attacks or spells", () => {
    const input = {
      attacks: Array.from({ length: 20 }, (_, index) => ({ name: `Attack ${index + 1}` })),
      spellcasting: {
        spells: {
          "1": Array.from({ length: 50 }, (_, index) => ({ name: `Spell ${index + 1}` })),
        },
      },
    };

    expect(characterSheetSchema.parse(input)).toEqual(input);
  });

  it("accepts an empty partial character without inventing defaults", () => {
    const result = characterSheetSchema.parse({});

    expect(result).toEqual({});
  });
});
