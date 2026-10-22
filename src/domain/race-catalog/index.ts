/**
 * 2014 Fifth Edition SRD Race Catalog
 * Source: Player's Handbook (2014) Chapter 2
 * Licensed under OGL v1.0a — SRD 5.1 content used with attribution.
 * Each race describes racial traits, ability increases, languages, size,
 * speed, and other race-owned mechanics. Class-derived mechanics such as
 * Hit Dice and class saving throws are intentionally absent.
 */

export const RACE_EDITION = "2014" as const;
export const RACE_SOURCE = "SRD 5.1" as const;

export type AbilityName =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

export type Size = "Small" | "Medium";

export interface RacialTrait {
  name: string;
  description: string;
}

export interface SkillChoice {
  choose: number;
  from: readonly string[];
}

export interface Subrace {
  id: string;
  name: string;
  description: string;
  abilityScoreIncreases?: Partial<Record<AbilityName, number>>;
  traits?: readonly RacialTrait[];
}

export interface RaceDefinition {
  id: string;
  edition: typeof RACE_EDITION;
  source: typeof RACE_SOURCE;
  name: string;
  description: string;
  size: Size;
  speed: number;
  languages: readonly string[];
  abilityScoreIncreases?: Partial<Record<AbilityName, number>>;
  proficiencies?: {
    weapons?: readonly string[];
    armor?: readonly string[];
    tools?: readonly string[];
    skills?: SkillChoice;
  };
  traits: readonly RacialTrait[];
  subraces?: readonly Subrace[];
}

function trait(name: string, description: string): RacialTrait {
  return { name, description };
}

export const RACE_CATALOG: readonly RaceDefinition[] = [
  {
    id: "dwarf",
    edition: RACE_EDITION,
    source: RACE_SOURCE,
    name: "Dwarf",
    description:
      "Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal. Their kingdoms once sprawled beneath the mountains.",
    size: "Medium",
    speed: 25,
    languages: ["Common", "Dwarvish"],
    abilityScoreIncreases: { constitution: 2 },
    proficiencies: {
      weapons: ["battleaxe", "handaxe", "light hammer", "warhammer"],
      armor: ["light armor", "medium armor", "shields"],
      tools: ["smith's tools", "brewer's supplies", "mason's tools"],
    },
    traits: [
      trait("Darkvision", "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light."),
      trait("Dwarven Resilience", "You have advantage on saving throws against poison, and you have resistance against poison damage."),
      trait("Stonecunning", "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus."),
    ],
    subraces: [
      {
        id: "hill-dwarf",
        name: "Hill Dwarf",
        description: "Hill dwarves are inclined toward a pastoral life.",
        abilityScoreIncreases: { wisdom: 1 },
        traits: [
          trait("Dwarven Toughness", "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level."),
        ],
      },
      {
        id: "mountain-dwarf",
        name: "Mountain Dwarf",
        description: "Mountain dwarves are inclined toward martial pursuits.",
        abilityScoreIncreases: { strength: 2 },
        traits: [
          trait("Dwarven Armor Training", "You have proficiency with light and medium armor."),
        ],
      },
    ],
  },
  {
    id: "elf",
    edition: RACE_EDITION,
    source: RACE_SOURCE,
    name: "Elf",
    description:
      "Elves are a magical people of otherworldly grace, living in the world but not entirely part of it. They live in places of ethereal beauty.",
    size: "Medium",
    speed: 30,
    languages: ["Common", "Elvish"],
    abilityScoreIncreases: { dexterity: 2 },
    proficiencies: {
      weapons: ["longsword", "shortsword", "shortbow", "longbow"],
      skills: { choose: 1, from: ["perception"] },
    },
    traits: [
      trait("Darkvision", "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light."),
      trait("Keen Senses", "You have proficiency in the Perception skill."),
      trait("Fey Ancestry", "You have advantage on saving throws against being charmed, and magic can't put you to sleep."),
      trait("Trance", "Elves don't need to sleep. Instead they meditate deeply for 4 hours a day."),
    ],
    subraces: [
      {
        id: "high-elf",
        name: "High Elf",
        description: "High elves are steeped in magic and scholarship.",
        abilityScoreIncreases: { intelligence: 1 },
        traits: [
          trait("Elf Weapon Training", "You have proficiency with the longsword, shortsword, shortbow, and longbow."),
          trait("Cantrip", "You know one cantrip of your choice from the wizard spell list. Intelligence is your spellcasting ability for it."),
          trait("Extra Language", "You can speak, read, and write one extra language of your choice."),
        ],
      },
      {
        id: "wood-elf",
        name: "Wood Elf",
        description: "Wood elves are tuned to the rhythms of the wild.",
        abilityScoreIncreases: { wisdom: 1 },
        traits: [
          trait("Elf Weapon Training", "You have proficiency with the longsword, shortsword, shortbow, and longbow."),
          trait("Fleet of Foot", "Your base walking speed increases to 35 feet."),
          trait("Mask of the Wild", "You can attempt to hide even when only lightly obscured by foliage, rain, snow, mist, and other natural phenomena."),
        ],
      },
      {
        id: "drow",
        name: "Drow",
        description: "Drow dwell in the Underdark and are touched by its magic.",
        abilityScoreIncreases: { charisma: 1 },
        traits: [
          trait("Superior Darkvision", "Your darkvision has a radius of 120 feet."),
          trait("Sunlight Sensitivity", "You have disadvantage on attack rolls and Wisdom (Perception) checks that rely on sight when you or your target are in direct sunlight."),
          trait("Drow Magic", "You know the dancing lights cantrip. At 3rd level you learn faerie fire, and at 5th level you learn darkness."),
          trait("Drow Weapon Training", "You have proficiency with rapiers, shortswords, and hand crossbows."),
        ],
      },
    ],
  },
  {
    id: "halfling",
    edition: RACE_EDITION,
    source: RACE_SOURCE,
    name: "Halfling",
    description:
      "The diminutive halflings survive in a world full of larger creatures by avoiding notice or, barring that, avoiding offense. They are affable and curious.",
    size: "Small",
    speed: 25,
    languages: ["Common", "Halfling"],
    abilityScoreIncreases: { dexterity: 2 },
    traits: [
      trait("Lucky", "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll."),
      trait("Brave", "You have advantage on saving throws against being frightened."),
      trait("Halfling Nimbleness", "You can move through the space of any creature that is of a size larger than yours."),
    ],
    subraces: [
      {
        id: "lightfoot",
        name: "Lightfoot Halfling",
        description: "Lightfoots are inclined to wander.",
        abilityScoreIncreases: { charisma: 1 },
        traits: [
          trait("Naturally Stealthy", "You can attempt to hide even when obscured only by a creature that is at least one size larger than you."),
        ],
      },
      {
        id: "stout",
        name: "Stout Halfling",
        description: "Stouts are hardier than average.",
        abilityScoreIncreases: { constitution: 1 },
        traits: [
          trait("Stout Resilience", "You have advantage on saving throws against poison, and you have resistance against poison damage."),
        ],
      },
    ],
  },
  {
    id: "human",
    edition: RACE_EDITION,
    source: RACE_SOURCE,
    name: "Human",
    description:
      "Humans are the most adaptable and ambitious people among the common races. Whatever drives them, humans are the innovators, achievers, and pioneers.",
    size: "Medium",
    speed: 30,
    languages: ["Common"],
    abilityScoreIncreases: {
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1,
    },
    proficiencies: {
      skills: { choose: 1, from: ["any skill"] },
    },
    traits: [
      trait("Extra Language", "You can speak, read, and write one extra language of your choice."),
    ],
    subraces: [
      {
        id: "variant-human",
        name: "Variant Human",
        description: "Some humans are blessed with unusual talent.",
        traits: [
          trait("Ability Score Increases", "Two different ability scores of your choice each increase by 1."),
          trait("Skills", "You gain proficiency in one skill of your choice."),
          trait("Feat", "You gain one feat of your choice."),
        ],
      },
    ],
  },
  {
    id: "dragonborn",
    edition: RACE_EDITION,
    source: RACE_SOURCE,
    name: "Dragonborn",
    description:
      "Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or a tail. They carry draconic pride and bloodline gifts.",
    size: "Medium",
    speed: 30,
    languages: ["Common", "Draconic"],
    abilityScoreIncreases: { strength: 2, charisma: 1 },
    traits: [
      trait("Draconic Ancestry", "You have draconic ancestry. Choose one type of dragon; your breath weapon and damage resistance are determined by the dragon type."),
      trait("Breath Weapon", "You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type of the exhalation."),
      trait("Damage Resistance", "You have resistance to the damage type associated with your draconic ancestry."),
    ],
  },
  {
    id: "gnome",
    edition: RACE_EDITION,
    source: RACE_SOURCE,
    name: "Gnome",
    description:
      "A gnome's energy and enthusiasm for living shines through every inch of their small body. They delight in invention, exploration, and play.",
    size: "Small",
    speed: 25,
    languages: ["Common", "Gnomish"],
    abilityScoreIncreases: { intelligence: 2 },
    traits: [
      trait("Darkvision", "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light."),
      trait("Gnome Cunning", "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic."),
    ],
    subraces: [
      {
        id: "forest-gnome",
        name: "Forest Gnome",
        description: "Forest gnomes are deeply in tune with the sylvan world.",
        abilityScoreIncreases: { dexterity: 1 },
        traits: [
          trait("Natural Illusionist", "You know the minor illusion cantrip. Intelligence is your spellcasting ability for it."),
          trait("Speak with Small Beasts", "Through sounds and gestures, you can communicate simple ideas with Small or smaller beasts."),
        ],
      },
      {
        id: "rock-gnome",
        name: "Rock Gnome",
        description: "Rock gnomes are natural inventors and tinkerers.",
        abilityScoreIncreases: { constitution: 1 },
        traits: [
          trait("Artificer's Lore", "Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you are considered proficient and add double your proficiency bonus."),
          trait("Tinker", "You have proficiency with artisan's tools (tinker's tools). Using those tools, you can spend 1 hour and 10 gp worth of materials to construct a Tiny clockwork device."),
        ],
      },
    ],
  },
  {
    id: "half-elf",
    edition: RACE_EDITION,
    source: RACE_SOURCE,
    name: "Half-Elf",
    description:
      "Half-elves combine what some say are the best qualities of their elf and human parents: human curiosity, inventiveness, and ambition tempered by the refined senses and love of nature elves possess.",
    size: "Medium",
    speed: 30,
    languages: ["Common", "Elvish"],
    abilityScoreIncreases: { charisma: 2 },
    proficiencies: {
      skills: { choose: 2, from: ["any skill"] },
    },
    traits: [
      trait("Darkvision", "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light."),
      trait("Fey Ancestry", "You have advantage on saving throws against being charmed, and magic can't put you to sleep."),
      trait("Skill Versatility", "You gain proficiency in two skills of your choice."),
      trait("Extra Language", "You can speak, read, and write one extra language of your choice."),
    ],
  },
  {
    id: "half-orc",
    edition: RACE_EDITION,
    source: RACE_SOURCE,
    name: "Half-Orc",
    description:
      "Some half-orcs rise to become proud chiefs of orcish tribes, their human blood giving them an edge over their full-blooded orc rivals. Others are desperate outcasts.",
    size: "Medium",
    speed: 30,
    languages: ["Common", "Orc"],
    abilityScoreIncreases: { strength: 2, constitution: 1 },
    proficiencies: {
      skills: { choose: 1, from: ["intimidation"] },
    },
    traits: [
      trait("Darkvision", "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light."),
      trait("Menacing", "You gain proficiency in the Intimidation skill."),
      trait("Relentless Endurance", "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. Once per long rest."),
      trait("Savage Attacks", "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time and add it to the extra damage."),
    ],
  },
  {
    id: "tiefling",
    edition: RACE_EDITION,
    source: RACE_SOURCE,
    name: "Tiefling",
    description:
      "To be greeted with stares and whispers, to suffer violence and insult on the street, to see mistrust and fear in every eye: this is the lot of the tiefling, whose fiendish heritage stains the blood.",
    size: "Medium",
    speed: 30,
    languages: ["Common", "Infernal"],
    abilityScoreIncreases: { intelligence: 1, charisma: 2 },
    traits: [
      trait("Darkvision", "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light."),
      trait("Hellish Resistance", "You have resistance to fire damage."),
      trait("Infernal Legacy", "You know the thaumaturgy cantrip. At 3rd level you learn hellish rebuke, and at 5th level you learn darkness. Charisma is your spellcasting ability for these spells."),
    ],
  },
];

export function getRaceById(id: string): RaceDefinition | undefined {
  return RACE_CATALOG.find((race) => race.id === id);
}

export function getSubraceById(raceId: string, subraceId: string): Subrace | undefined {
  const race = getRaceById(raceId);
  return race?.subraces?.find((subrace) => subrace.id === subraceId);
}

export function getAllRaceIds(): readonly string[] {
  return RACE_CATALOG.map((race) => race.id);
}

export const RACE_CATALOG_VERSION = 1;
export const RACE_CATALOG_KEY = "nyx-character-forge:race-catalog";
