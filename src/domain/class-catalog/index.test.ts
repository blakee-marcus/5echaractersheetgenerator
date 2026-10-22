import { describe, it, expect } from "vitest";
import {
  CLASS_CATALOG,
  getClassById,
  getAllClassIds,
  CLASS_CATALOG_VERSION,
  validateClassDefinition,
  CLASS_EDITION,
  CLASS_SOURCE,
} from "./index";

describe("2014 Class Catalog", () => {
  it("contains exactly 12 official classes", () => {
    expect(CLASS_CATALOG).toHaveLength(12);
  });

  it("each class has a unique stable id", () => {
    const ids = CLASS_CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(12);
  });

  it("every class has required structural fields", () => {
    for (const cls of CLASS_CATALOG) {
      expect(cls.edition).toBe(CLASS_EDITION);
      expect(cls.source).toBe(CLASS_SOURCE);
      expect(cls.name).toBeTruthy();
      expect(cls.description).toBeTruthy();
      expect(cls.hitDie).toBeGreaterThanOrEqual(6);
      expect(cls.hitDie).toBeLessThanOrEqual(12);
      expect(cls.primaryAbilities.length).toBeGreaterThan(0);
      expect(cls.level1Features.length).toBeGreaterThan(0);
      expect(cls.proficiencies).toBeDefined();
    }
  });

  it("getClassById returns the correct class", () => {
    const fighter = getClassById("fighter");
    expect(fighter?.name).toBe("Fighter");
    expect(fighter?.hitDie).toBe(10);
  });

  it("getClassById returns undefined for unknown ids", () => {
    expect(getClassById("nonexistent")).toBeUndefined();
  });

  it("getAllClassIds returns all 12 ids", () => {
    expect(getAllClassIds()).toHaveLength(12);
  });

  it("catalog version is tracked", () => {
    expect(CLASS_CATALOG_VERSION).toBe(1);
  });

  it("validateClassDefinition parses valid class definitions", () => {
    const fighter = getClassById("fighter")!;
    expect(() => validateClassDefinition(fighter)).not.toThrow();
  });

  it("spellcasters have spellcasting progression, non-spellcasters have null", () => {
    const fighter = getClassById("fighter")!;
    const wizard = getClassById("wizard")!;
    expect(fighter.spellcasting).toBeNull();
    expect(wizard.spellcasting).not.toBeNull();
    expect(wizard.spellcasting?.ability).toBe("intelligence");
    expect(wizard.spellcasting?.progression["1"]?.slots).toEqual({ "1": 2 });
  });

  it("level-1 features include descriptive choices where required", () => {
    const fighter = getClassById("fighter")!;
    const fightingStyleFeature = fighter.level1Features.find((f) => f.name === "Fighting Style");
    expect(fightingStyleFeature?.choices).toBeDefined();
    expect(fightingStyleFeature?.choices?.length).toBe(1);
    expect(fightingStyleFeature?.choices?.[0].field).toBe("fightingStyle");
    expect(fightingStyleFeature?.choices?.[0].required).toBe(true);
  });

  it("subclass field is present for classes with subclasses at level 1", () => {
    const cleric = getClassById("cleric")!;
    const sorcerer = getClassById("sorcerer")!;
    const warlock = getClassById("warlock")!;
    expect(cleric.subclass?.level).toBe(1);
    expect(sorcerer.subclass?.level).toBe(1);
    expect(warlock.subclass?.level).toBe(1);
  });

  it("subclass field is absent or higher-level for later-subclass classes", () => {
    const fighter = getClassById("fighter")!;
    const rogue = getClassById("rogue")!;
    const monk = getClassById("monk")!;
    expect(fighter.subclass?.level).toBe(3);
    expect(rogue.subclass?.level).toBe(3);
    expect(monk.subclass?.level).toBe(3);
  });
});

describe("Class Definition Schema", () => {
  it("rejects missing required fields", () => {
    expect(() =>
      validateClassDefinition({
        id: "test",
        edition: "2014",
        source: "SRD 5.1",
        name: "Test",
        description: "Test",
        hitDie: 8,
        primaryAbilities: ["strength"],
        proficiencies: {},
        level1Features: [],
      })
    ).toThrow();
  });

  it("rejects invalid hit die values", () => {
    expect(() =>
      validateClassDefinition({
        id: "test",
        edition: "2014",
        source: "SRD 5.1",
        name: "Test",
        description: "Test",
        hitDie: 4, // too low
        primaryAbilities: ["strength"],
        proficiencies: {},
        level1Features: [{ name: "Test", description: "Test" }],
      })
    ).toThrow();
  });
});