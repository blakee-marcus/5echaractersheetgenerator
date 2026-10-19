import type { CharacterSheet } from "../domain/character-sheet";

export const exampleCharacter = {
  identity: {
    characterName: "Nyx Vesper",
    classAndLevel: "Wizard 9",
    race: "Tiefling",
    background: "Sage",
    alignment: "Neutral Good",
    playerName: "Example Player",
    experiencePoints: 48000,
  },
  inspiration: true,
  passivePerception: 15,
  proficiencyBonus: 4,
  abilities: {
    strength: {
      score: 8,
      modifier: -1,
      savingThrow: { bonus: -1, proficient: false },
    },
    dexterity: {
      score: 14,
      modifier: 2,
      savingThrow: { bonus: 2, proficient: false },
    },
    constitution: {
      score: 12,
      modifier: 1,
      savingThrow: { bonus: 1, proficient: false },
    },
    intelligence: {
      score: 18,
      modifier: 4,
      savingThrow: { bonus: 8, proficient: true },
    },
    wisdom: {
      score: 13,
      modifier: 1,
      savingThrow: { bonus: 5, proficient: true },
    },
    charisma: {
      score: 10,
      modifier: 0,
      savingThrow: { bonus: 0, proficient: false },
    },
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
    {
      name: "Dagger",
      attackBonus: 6,
      damage: "1d4+2",
      damageType: "piercing",
    },
    {
      name: "Fire Bolt",
      attackBonus: 8,
      damage: "2d10",
      damageType: "fire",
    },
  ],
  equipment: {
    currency: { copper: 1, silver: 2, electrum: 3, gold: 40, platinum: 5 },
    inventory: ["Spellbook", "Component pouch", "Scholar's pack"],
    otherProficiencies:
      "Daggers, darts, slings, quarterstaffs, light crossbows",
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
    },
    slots: {
      "1": { total: 4, expended: 1 },
      "3": { total: 3, expended: 0 },
      "5": { total: 1, expended: 1 },
    },
  },
} satisfies CharacterSheet;
