import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  generateCharacterSheet,
  PdfGenerationError,
} from "./pdf-generation";

const templatePath = resolve(process.cwd(), "assets/5E_CharacterSheet_Fillable.pdf");
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

describe("generateCharacterSheet", () => {
  it("rejects unchecked input at the real generation boundary", async () => {
    await expect(generateCharacterSheet({ typo: true })).rejects.toMatchObject({
      name: "PdfGenerationError",
      message: "Character data failed structural validation",
      issues: [
        {
          path: "/typo",
          code: "INVALID_CHARACTER_DATA",
        },
      ],
    });
  });

  it("reports the nested path for invalid runtime input", async () => {
    await expect(
      generateCharacterSheet({ abilities: { charisma: { score: "18" } } }),
    ).rejects.toMatchObject({
      name: "PdfGenerationError",
      issues: [
        {
          path: "/abilities/charisma/score",
          code: "INVALID_CHARACTER_DATA",
        },
      ],
    });
  });

  it("rejects invalid quantities through the real generation path", async () => {
    await expect(
      generateCharacterSheet({
        equipment: { currency: { gold: -1 } },
        combat: { hitPoints: { current: -1 } },
        spellcasting: { slots: { "1": { total: 1, expended: 2 } } },
      }),
    ).rejects.toMatchObject({
      name: "PdfGenerationError",
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "/equipment/currency/gold" }),
        expect.objectContaining({ path: "/combat/hitPoints/current" }),
        expect.objectContaining({ path: "/spellcasting/slots/1/expended" }),
      ]),
    });
  });

  it("requires meaningful attack and spell entries only in finalized mode", async () => {
    await expect(
      generateCharacterSheet(
        {
          attacks: [{}],
          spellcasting: { spells: { "1": [{}] } },
        },
        { validationMode: "finalized" },
      ),
    ).rejects.toMatchObject({
      name: "PdfGenerationError",
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "/attacks/0" }),
        expect.objectContaining({ path: "/spellcasting/spells/1/0" }),
      ]),
    });

    await expect(
      generateCharacterSheet({
        attacks: [{}],
        spellcasting: { spells: { "1": [{}] } },
      }),
    ).resolves.toBeInstanceOf(Uint8Array);
  });

  it("generates a fresh editable three-page PDF from an empty character without changing the template", async () => {
    const templateBefore = await readFile(templatePath);

    const generated = await generateCharacterSheet({});
    const reopened = await PDFDocument.load(generated);

    expect(generated).toBeInstanceOf(Uint8Array);
    expect(reopened.getPageCount()).toBe(3);
    expect(reopened.getForm().getFields()).toHaveLength(334);
    expect(sha256(await readFile(templatePath))).toBe(sha256(templateBefore));
  });

  it("round-trips partial text, checkbox, zero, and duplicate-name updates", async () => {
    const generated = await generateCharacterSheet({
      identity: { characterName: "Nyx", experiencePoints: 0 },
      abilities: {
        intelligence: {
          score: 18,
          modifier: 4,
          savingThrow: { bonus: 8, proficient: false },
        },
      },
      skills: { arcana: { bonus: 8, proficient: true } },
    });
    const form = (await PDFDocument.load(generated)).getForm();

    expect(form.getTextField("CharacterName").getText()).toBe("Nyx");
    expect(form.getTextField("CharacterName 2").getText()).toBe("Nyx");
    expect(form.getTextField("XP").getText()).toBe("0");
    expect(form.getTextField("INTmod").getText()).toBe("+4");
    expect(form.getCheckBox("Check Box 20").isChecked()).toBe(false);
    expect(form.getCheckBox("Check Box 25").isChecked()).toBe(true);
  });

  it("round-trips representative spellcasting fields", async () => {
    const generated = await generateCharacterSheet({
      spellcasting: {
        class: "Wizard",
        ability: "INT",
        spellSaveDc: 16,
        spellAttackBonus: 8,
        spells: {
          "0": [{ name: "Fire Bolt" }],
          "1": [
            { name: "Shield", prepared: true },
            { name: "Magic Missile", prepared: false },
          ],
          "9": [{ name: "Wish", prepared: true }],
        },
        slots: {
          "1": { total: 4, expended: 1 },
          "9": { total: 1, expended: 0 },
        },
      },
    });
    const form = (await PDFDocument.load(generated)).getForm();

    expect(form.getTextField("Spellcasting Class 2").getText()).toBe("Wizard");
    expect(form.getTextField("Spells 1014").getText()).toBe("Fire Bolt");
    expect(form.getTextField("Spells 1015").getText()).toBe("Shield");
    expect(form.getCheckBox("Check Box 251").isChecked()).toBe(true);
    expect(form.getCheckBox("Check Box 309").isChecked()).toBe(false);
    expect(form.getTextField("Spells 10108").getText()).toBe("Wish");
    expect(form.getTextField("SlotsTotal 19").getText()).toBe("4");
    expect(form.getTextField("SlotsRemaining 19").getText()).toBe("1");
  });

  it("generates and reopens a fully populated representable character", async () => {
    const generated = await generateCharacterSheet({
      identity: {
        characterName: "Nyx Vesper",
        classAndLevel: "Wizard 9",
        race: "Tiefling",
        background: "Sage",
        alignment: "Neutral Good",
        playerName: "Blake",
        experiencePoints: 48000,
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
        arcana: { bonus: 8, proficient: true },
        history: { bonus: 8, proficient: true },
        investigation: { bonus: 8, proficient: true },
        perception: { bonus: 5, proficient: false },
      },
      combat: {
        armorClass: 15,
        initiative: 2,
        speed: 30,
        hitPoints: { maximum: 48, current: 32, temporary: 0 },
        hitDice: { total: 9, denomination: "d6" },
        deathSaves: { successes: 1, failures: 0 },
      },
      attacks: [
        { name: "Dagger", attackBonus: 6, damage: "1d4+2", damageType: "piercing" },
        { name: "Fire Bolt", attackBonus: 8, damage: "2d10", damageType: "fire" },
      ],
      equipment: {
        currency: { copper: 1, silver: 2, electrum: 3, gold: 40, platinum: 5 },
        inventory: ["Spellbook", "Component pouch", "Scholar's pack"],
        otherProficiencies: "Daggers, darts, slings, quarterstaffs, light crossbows",
        languages: ["Common", "Infernal", "Draconic"],
      },
      personality: {
        traits: "I speak precisely.",
        ideals: "Knowledge should be shared.",
        bonds: "My old library must be restored.",
        flaws: "I overestimate obscure plans.",
      },
      features: {
        classFeatures: "Arcane Recovery; Sculpt Spells",
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
      },
      backstory: {
        history: "Nyx found her spellbook while translating a sealed manuscript.",
        allies: "The Lantern Archive",
        organizations: "Order of the Brass Key",
        treasure: "Annotated planar atlas",
      },
      spellcasting: {
        class: "Wizard",
        ability: "INT",
        spellSaveDc: 16,
        spellAttackBonus: 8,
        spells: {
          "0": [{ name: "Fire Bolt" }, { name: "Mage Hand" }],
          "1": [{ name: "Shield", prepared: true }],
          "3": [{ name: "Counterspell", prepared: true }],
          "5": [{ name: "Hold Monster", prepared: false }],
          "9": [{ name: "Wish", prepared: true }],
        },
        slots: {
          "1": { total: 4, expended: 1 },
          "3": { total: 3, expended: 0 },
          "5": { total: 1, expended: 1 },
          "9": { total: 1, expended: 0 },
        },
      },
    });
    const reopened = await PDFDocument.load(generated);
    const form = reopened.getForm();

    expect(reopened.getPageCount()).toBe(3);
    expect(form.getFields()).toHaveLength(334);
    expect(form.getTextField("CharacterName").getText()).toBe("Nyx Vesper");
    expect(form.getTextField("Backstory").getText()).toContain("sealed manuscript");
    expect(form.getTextField("Spells 10108").getText()).toBe("Wish");
    expect(form.getCheckBox("Check Box 327").isChecked()).toBe(true);
  });

  it("rejects fatal mapping issues with structured semantic details", async () => {
    const generation = generateCharacterSheet({
      identity: { characterName: "Should not be generated" },
      attacks: [{ name: "1" }, { name: "2" }, { name: "3" }, { name: "4" }],
    });

    await expect(generation).rejects.toMatchObject({
      name: "PdfGenerationError",
      issues: [
        {
          path: "/attacks/3",
          code: "PDF_CAPACITY_EXCEEDED",
          message: "Attack exceeds the 3 available PDF rows",
        },
      ],
    });
  });

  it("preserves interactive fields by default", async () => {
    const generated = await generateCharacterSheet({ identity: { characterName: "Editable" } });
    const form = (await PDFDocument.load(generated)).getForm();

    expect(form.getFields()).toHaveLength(334);
    expect(form.getTextField("CharacterName").getText()).toBe("Editable");
  });

  it("flattens populated appearances and removes interactive fields", async () => {
    const generated = await generateCharacterSheet(
      {
        identity: { characterName: "Flattened" },
        skills: { arcana: { bonus: 7, proficient: true } },
      },
      { flatten: true },
    );
    const reopened = await PDFDocument.load(generated);

    expect(reopened.getPageCount()).toBe(3);
    expect(reopened.getForm().getFields()).toEqual([]);
  });

  it("does not leak values between consecutive generations", async () => {
    const first = await generateCharacterSheet({ identity: { characterName: "First" } });
    const second = await generateCharacterSheet({ identity: { characterName: "Second" } });
    const blank = await generateCharacterSheet({});

    expect((await PDFDocument.load(first)).getForm().getTextField("CharacterName").getText()).toBe("First");
    expect((await PDFDocument.load(second)).getForm().getTextField("CharacterName").getText()).toBe("Second");
    expect((await PDFDocument.load(blank)).getForm().getTextField("CharacterName").getText()).toBeUndefined();
  });

  it("rejects unsupported Unicode explicitly", async () => {
    await expect(
      generateCharacterSheet({ identity: { characterName: "Nyx 🐉" } }),
    ).rejects.toEqual(
      expect.objectContaining<PdfGenerationError>({
        name: "PdfGenerationError",
        message: 'Field "CharacterName" contains characters unsupported by Helvetica',
        issues: [
          {
            path: "/pdfFields/CharacterName",
            code: "PDF_UNSUPPORTED_UNICODE",
            message: 'Field "CharacterName" contains characters unsupported by Helvetica',
          },
        ],
      }),
    );
  });

  it("rejects text that would be clipped instead of truncating or shrinking it", async () => {
    await expect(
      generateCharacterSheet({
        backstory: {
          organizations: "An extraordinarily long organization name that cannot fit inside the faction name field without clipping",
        },
      }),
    ).rejects.toMatchObject({
      name: "PdfGenerationError",
      issues: [
        {
          path: "/pdfFields/FactionName",
          code: "PDF_TEXT_OVERFLOW",
          message: 'Text does not fit in PDF field "FactionName" at the documented 9pt appearance size',
        },
      ],
    });
  });

  it("rejects multiline content that exceeds the field height", async () => {
    await expect(
      generateCharacterSheet({
        backstory: {
          history: Array.from(
            { length: 100 },
            (_, index) => `Backstory line ${index + 1} with enough words to require wrapping.`,
          ).join("\n"),
        },
      }),
    ).rejects.toMatchObject({
      name: "PdfGenerationError",
      issues: [
        {
          path: "/pdfFields/Backstory",
          code: "PDF_TEXT_OVERFLOW",
          message: 'Text does not fit in PDF field "Backstory" at the documented 8pt appearance size',
        },
      ],
    });
  });
});
