/**
 * 2014 Fifth Edition SRD Class Catalog
 * Source: Player's Handbook (2014) Chapter 3
 * Licensed under OGL v1.0a — SRD 5.1 content used with attribution.
 * Each class definition describes level-1 features, proficiencies, and rules.
 * Homebrew classes are user-defined and stored separately.
 */

import { z } from "zod";

const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

export const CLASS_EDITION = "2014" as const;
export const CLASS_SOURCE = "SRD 5.1" as const;
export const CLASS_SOURCE_HOMEBREW = "Homebrew" as const;

export type ClassSource = typeof CLASS_SOURCE | typeof CLASS_SOURCE_HOMEBREW;

// Skills list from the character sheet schema
export const SKILL_NAMES = [
  "acrobatics",
  "animalHandling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleightOfHand",
  "stealth",
  "survival",
];

export type SkillName = (typeof SKILL_NAMES)[number];

// Proficiency categories
export const ARMOR_TYPES = [
  "light",
  "medium",
  "heavy",
  "shields",
] as const;

export const WEAPON_TYPES = [
  "simple",
  "martial",
] as const;

export const TOOL_TYPES = [
  "thievesTools",
  "artisanTools",
  "gamingSets",
  "musicalInstruments",
  "vehicles",
  "disguiseKit",
  "forgeryKit",
  "herbalismKit",
  "navigatorTools",
  "poisonerKit",
] as const;

export type ArmorType = (typeof ARMOR_TYPES)[number];
export type WeaponType = (typeof WEAPON_TYPES)[number];
export type ToolType = (typeof TOOL_TYPES)[number];

// Level-1 feature definition
export const classFeatureSchema = strictObject({
  name: z.string(),
  description: z.string(),
  choices: z
    .array(
      strictObject({
        field: z.string(), // e.g., "fightingStyle", "skill"
        prompt: z.string(),
        options: z.array(z.string()),
        required: z.boolean(),
      }),
    )
    .optional(),
});

// Proficiency definition
export const proficienciesSchema = strictObject({
  armor: z.array(z.enum(ARMOR_TYPES)).optional(),
  weapons: z.array(z.enum(WEAPON_TYPES)).optional(),
  tools: z.array(z.enum(TOOL_TYPES)).optional(),
  savingThrows: z.array(z.string()).optional(),
  skills: z
    .object({
      choose: z.number(),
      from: z.array(z.enum(SKILL_NAMES)),
    })
    .optional(),
});

// Class definition schema
export const classDefinitionSchema = strictObject({
  id: z.string(), // stable identifier, e.g., "fighter"
  edition: z.literal(CLASS_EDITION),
  source: z.union([z.literal(CLASS_SOURCE), z.literal(CLASS_SOURCE_HOMEBREW)]),
  name: z.string(),
  description: z.string(),
  hitDie: z.number().int().positive().max(12), // d6, d8, d10, d12
  primaryAbilities: z.array(z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])),
  proficiencies: proficienciesSchema,
  level1Features: z.array(classFeatureSchema),
  spellcasting: z
    .object({
      ability: z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]),
      // level -> {cantripsKnown, spellsKnownOrPrepared, slots}
      progression: z.record(
        z.string(),
        strictObject({
          cantrips: z.number().int().nonnegative().optional(),
          spellsKnown: z.number().int().nonnegative().optional(),
          slots: z.record(z.string(), z.number().int().nonnegative()).optional(),
        }),
      ),
    })
    .nullable(), // null for non-spellcasters
  subclass: z
    .object({
      level: z.number().int().positive(),
      name: z.string(), // e.g., "Divine Domain", "Fighting Style"
      description: z.string(),
    })
    .optional(),
});

export type ClassDefinition = z.infer<typeof classDefinitionSchema>;
export type ClassFeature = z.infer<typeof classFeatureSchema>;
export type Proficiencies = z.infer<typeof proficienciesSchema>;
export type SpellcastingProgression = NonNullable<ClassDefinition["spellcasting"]>;

// Helper: create a class feature
function feature(name: string, description: string, choices?: ClassFeature["choices"]): ClassFeature {
  return { name, description, choices };
}

// Helper: create proficiencies
function profs(data: Partial<Proficiencies>): Proficiencies {
  return data as Proficiencies;
}

// ============================================================================
// OFFICIAL 2014 CLASS CATALOG (12 classes)
// ============================================================================

export const CLASS_CATALOG: readonly ClassDefinition[] = [
  {
    id: "barbarian",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Barbarian",
    description:
      "A tough frontline fighter who becomes more dangerous through rage. Barbarians have the highest hit points in the game and resist damage while raging.",
    hitDie: 12,
    primaryAbilities: ["strength", "constitution"],
    proficiencies: profs({
      armor: ["light", "medium", "shields"],
      weapons: ["simple", "martial"],
      savingThrows: ["strength", "constitution"],
      skills: { choose: 2, from: ["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"] },
    }),
    level1Features: [
      feature(
        "Rage",
        "As a bonus action, you enter a rage that lasts 1 minute. While raging you gain advantage on Strength checks and saves, add +2 to melee weapon damage, and take half damage from bludgeoning, piercing, and slashing. You can rage 2 times per long rest.",
      ),
      feature(
        "Unarmored Defense",
        "While not wearing armor, your AC equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield and still gain this benefit.",
      ),
    ],
    spellcasting: null,
    subclass: undefined,
  },
  {
    id: "bard",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Bard",
    description:
      "A versatile magician who inspires allies and uses music or performance to channel magic. Bards are skill masters with a mix of spells, support, and utility.",
    hitDie: 8,
    primaryAbilities: ["charisma", "dexterity"],
    proficiencies: profs({
      armor: ["light"],
      weapons: ["simple"],
      tools: ["musicalInstruments"],
      savingThrows: ["dexterity", "charisma"],
      skills: { choose: 3, from: SKILL_NAMES },
    }),
    level1Features: [
      feature(
        "Spellcasting",
        "You have learned to cast spells through your music and performance. Charisma is your spellcasting ability. You know 2 cantrips and 4 level-1 spells from the bard list. You have 2 level-1 spell slots per long rest.",
      ),
      feature(
        "Bardic Inspiration",
        "As a bonus action, choose one creature within 60 ft. that can hear you. That creature gains a d6 Bardic Inspiration die. Once in the next 10 minutes, it can add the die to one ability check, attack roll, or saving throw. You can use this 3 times per long rest (Cha modifier times, minimum 1).",
        [
          {
            field: "musicalInstruments",
            prompt: "Choose three musical instruments you're proficient with.",
            options: [
              "Lute",
              "Lyre",
              "Flute",
              "Drum",
              "Horn",
              "Violin",
              "Panpipes",
              "Harp",
              "Bagpipes",
              "Dulcimer",
            ],
            required: true,
          },
        ],
      ),
    ],
    spellcasting: {
      ability: "charisma",
      progression: {
        "1": { cantrips: 2, spellsKnown: 4, slots: { "1": 2 } },
      },
    },
    subclass: undefined,
  },
  {
    id: "cleric",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Cleric",
    description:
      "A divine spellcaster who can protect, heal, and fight. Clerics choose a Divine Domain that defines their deity's portfolio and grants domain spells and features.",
    hitDie: 8,
    primaryAbilities: ["wisdom", "constitution"],
    proficiencies: profs({
      armor: ["light", "medium", "shields"],
      weapons: ["simple"],
      savingThrows: ["wisdom", "charisma"],
      skills: { choose: 2, from: ["history", "insight", "medicine", "persuasion", "religion"] },
    }),
    level1Features: [
      feature(
        "Spellcasting",
        "You cast cleric spells using Wisdom. You know 3 cantrips and prepare a number of level-1 spells equal to your Wisdom modifier + cleric level (minimum 1). You have 2 level-1 spell slots per long rest.",
      ),
      feature(
        "Divine Domain",
        "Choose one domain representing your deity's influence. Each domain grants domain spells (always prepared), a 1st-level feature, and additional features at higher levels.",
        [
          {
            field: "divineDomain",
            prompt: "Choose your Divine Domain.",
            options: [
              "Knowledge",
              "Life",
              "Light",
              "Nature",
              "Tempest",
              "Trickery",
              "War",
            ],
            required: true,
          },
        ],
      ),
    ],
    spellcasting: {
      ability: "wisdom",
      progression: {
        "1": { cantrips: 3, spellsKnown: 0, slots: { "1": 2 } },
      },
    },
    subclass: { level: 1, name: "Divine Domain", description: "Your deity's portfolio defines your domain spells and features." },
  },
  {
    id: "druid",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Druid",
    description:
      "A nature-based spellcaster who controls the environment and later gains animal transformations. Druids revere nature and draw power from the land.",
    hitDie: 8,
    primaryAbilities: ["wisdom", "constitution"],
    proficiencies: profs({
      armor: ["light", "medium", "shields"],
      weapons: ["simple"],
      tools: ["herbalismKit"],
      savingThrows: ["intelligence", "wisdom"],
      skills: { choose: 2, from: ["arcana", "animalHandling", "insight", "medicine", "nature", "perception", "religion", "survival"] },
    }),
    level1Features: [
      feature(
        "Druidic",
        "You know Druidic, the secret language of druids. You can leave hidden messages that only other druids can decipher.",
      ),
      feature(
        "Spellcasting",
        "You cast druid spells using Wisdom. You know 2 cantrips and prepare a number of level-1 spells equal to your Wisdom modifier + druid level (minimum 1). You have 2 level-1 spell slots per long rest.",
      ),
    ],
    spellcasting: {
      ability: "wisdom",
      progression: {
        "1": { cantrips: 2, spellsKnown: 0, slots: { "1": 2 } },
      },
    },
    subclass: undefined,
  },
  {
    id: "fighter",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Fighter",
    description:
      "A flexible warrior who specializes in weapons, armor, and direct combat. Fighters gain more attacks, more ability score improvements, and action surge.",
    hitDie: 10,
    primaryAbilities: ["strength", "dexterity"],
    proficiencies: profs({
      armor: ["light", "medium", "heavy", "shields"],
      weapons: ["simple", "martial"],
      savingThrows: ["strength", "constitution"],
      skills: { choose: 2, from: ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "perception", "survival"] },
    }),
    level1Features: [
      feature(
        "Fighting Style",
        "Choose one fighting style. You can't take the same style more than once.",
        [
          {
            field: "fightingStyle",
            prompt: "Choose your Fighting Style.",
            options: [
              "Archery (+2 to ranged attack rolls)",
              "Defense (+1 AC while wearing armor)",
              "Dueling (+2 damage with one-handed melee weapon)",
              "Great Weapon Fighting (reroll 1/2 on damage dice for two-handed weapons)",
              "Protection (impose disadvantage on attacks against allies within 5 ft)",
              "Two-Weapon Fighting (add ability modifier to off-hand attack damage)",
            ],
            required: true,
          },
        ],
      ),
      feature(
        "Second Wind",
        "As a bonus action, you regain 1d10 + fighter level hit points. Once per short or long rest.",
      ),
    ],
    spellcasting: null,
    subclass: { level: 3, name: "Martial Archetype", description: "Choose a combat specialization at 3rd level." },
  },
  {
    id: "monk",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Monk",
    description:
      "An agile martial artist who uses speed, discipline, and unarmed combat. Monks harness ki to perform extraordinary physical feats.",
    hitDie: 8,
    primaryAbilities: ["dexterity", "wisdom"],
    proficiencies: profs({
      armor: [],
      weapons: ["simple"],
      tools: ["artisanTools"],
      savingThrows: ["strength", "dexterity"],
      skills: { choose: 2, from: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] },
    }),
    level1Features: [
      feature(
        "Unarmored Defense",
        "While not wearing armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.",
      ),
      feature(
        "Martial Arts",
        "You gain the following benefits while unarmed or wielding only monk weapons (simple melee weapons without heavy or two-handed properties):\n- You can use Dexterity instead of Strength for attack and damage rolls.\n- You can roll a d4 in place of the normal damage of your unarmed strike or monk weapon. This die changes as you gain levels.\n- When you use the Attack action with an unarmed strike or monk weapon, you can make one unarmed strike as a bonus action.",
      ),
    ],
    spellcasting: null,
    subclass: { level: 3, name: "Monastic Tradition", description: "Choose a monastic tradition at 3rd level." },
  },
  {
    id: "paladin",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Paladin",
    description:
      "A heavily armed protector empowered by conviction and sacred abilities. Paladins combine martial prowess with divine magic.",
    hitDie: 10,
    primaryAbilities: ["strength", "charisma"],
    proficiencies: profs({
      armor: ["light", "medium", "heavy", "shields"],
      weapons: ["simple", "martial"],
      savingThrows: ["wisdom", "charisma"],
      skills: { choose: 2, from: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] },
    }),
    level1Features: [
      feature(
        "Divine Sense",
        "As an action, you open your awareness to detect celestials, fiends, and undead within 60 ft. You learn their location but not identity. Usable 1 + Cha modifier times per long rest.",
      ),
      feature(
        "Lay on Hands",
        "Your touch heals. You have a pool of healing equal to 5 × your paladin level. As an action, you can touch a creature and draw from the pool to restore hit points or cure diseases and poisons. The pool recharges on a long rest.",
      ),
    ],
    spellcasting: {
      ability: "charisma",
      progression: {
        "1": { cantrips: 0, spellsKnown: 0, slots: {} },
      },
    },
    subclass: { level: 3, name: "Sacred Oath", description: "Swear a sacred oath at 3rd level that defines your path." },
  },
  {
    id: "ranger",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Ranger",
    description:
      "An explorer and hunter skilled at tracking threats and surviving dangerous environments. Rangers blend martial skill with nature magic.",
    hitDie: 10,
    primaryAbilities: ["dexterity", "wisdom"],
    proficiencies: profs({
      armor: ["light", "medium", "shields"],
      weapons: ["simple", "martial"],
      tools: [],
      savingThrows: ["strength", "dexterity"],
      skills: { choose: 3, from: ["animalHandling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"] },
    }),
    level1Features: [
      feature(
        "Favored Enemy",
        "Choose a type of favored enemy. You have advantage on Wisdom (Survival) checks to track them and on Intelligence checks to recall information about them. You learn one language they speak.",
        [
          {
            field: "favoredEnemy",
            prompt: "Choose your Favored Enemy.",
            options: [
              "Aberrations",
              "Beasts",
              "Celestials",
              "Constructs",
              "Dragons",
              "Elementals",
              "Fey",
              "Fiends",
              "Giants",
              "Monstrosities",
              "Oozes",
              "Plants",
              "Undead",
            ],
            required: true,
          },
        ],
      ),
      feature(
        "Natural Explorer",
        "Choose one favored terrain. While in that terrain, your proficiency bonus is doubled for related checks, you don't get lost, you can forage for double food, and travel isn't slowed by difficult terrain.",
        [
          {
            field: "favoredTerrain",
            prompt: "Choose your Favored Terrain.",
            options: [
              "Arctic",
              "Coast",
              "Desert",
              "Forest",
              "Grassland",
              "Mountain",
              "Swamp",
              "Underdark",
            ],
            required: true,
          },
        ],
      ),
    ],
    spellcasting: {
      ability: "wisdom",
      progression: {
        "1": { cantrips: 0, spellsKnown: 0, slots: {} },
      },
    },
    subclass: { level: 3, name: "Ranger Archetype", description: "Choose a ranger archetype at 3rd level." },
  },
  {
    id: "rogue",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Rogue",
    description:
      "A stealthy specialist who relies on precision, skills, and clever tactics. Rogues deal extra damage when they have advantage or an ally nearby.",
    hitDie: 8,
    primaryAbilities: ["dexterity"],
    proficiencies: profs({
      armor: ["light"],
      weapons: ["simple"],
      tools: ["thievesTools"],
      savingThrows: ["dexterity", "intelligence"],
      skills: { choose: 4, from: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleightOfHand", "stealth"] },
    }),
    level1Features: [
      feature(
        "Expertise",
        "Choose two of your skill proficiencies, or one skill and thieves' tools. Your proficiency bonus is doubled for those checks.",
        [
          {
            field: "expertise",
            prompt: "Choose two skills (or one skill and thieves' tools) for Expertise.",
            options: SKILL_NAMES,
            required: true,
          },
        ],
      ),
      feature(
        "Sneak Attack",
        "Once per turn, you deal an extra 1d6 damage to one creature you hit with an attack if you have advantage, or if another enemy is within 5 ft of the target and you don't have disadvantage. The extra damage increases as you level.",
      ),
      feature(
        "Thieves' Cant",
        "You know a secret language of symbols and slang used by rogues and criminals. You can hide messages in normal conversation.",
      ),
    ],
    spellcasting: null,
    subclass: { level: 3, name: "Roguish Archetype", description: "Choose a roguish archetype at 3rd level." },
  },
  {
    id: "sorcerer",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Sorcerer",
    description:
      "A spellcaster whose magic comes from an innate supernatural source. Sorcerers have fewer spells but can manipulate them with Metamagic.",
    hitDie: 6,
    primaryAbilities: ["charisma", "constitution"],
    proficiencies: profs({
      armor: [],
      weapons: ["simple"],
      savingThrows: ["constitution", "charisma"],
      skills: { choose: 2, from: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
    }),
    level1Features: [
      feature(
        "Spellcasting",
        "You draw on your innate magic to cast sorcerer spells. Charisma is your spellcasting ability. You know 4 cantrips and 2 level-1 spells. You have 2 level-1 spell slots per long rest.",
      ),
      feature(
        "Sorcerous Origin",
        "Choose the source of your innate magic. Your origin grants features at 1st, 6th, 14th, and 18th level.",
        [
          {
            field: "sorcerousOrigin",
            prompt: "Choose your Sorcerous Origin.",
            options: ["Draconic Bloodline", "Wild Magic"],
            required: true,
          },
        ],
      ),
    ],
    spellcasting: {
      ability: "charisma",
      progression: {
        "1": { cantrips: 4, spellsKnown: 2, slots: { "1": 2 } },
      },
    },
    subclass: { level: 1, name: "Sorcerous Origin", description: "Your innate magic's source defines your features." },
  },
  {
    id: "warlock",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Warlock",
    description:
      "A magical adventurer who gains unusual powers through a supernatural patron. Warlocks have few spell slots but recover them on a short rest.",
    hitDie: 8,
    primaryAbilities: ["charisma", "constitution"],
    proficiencies: profs({
      armor: ["light"],
      weapons: ["simple"],
      savingThrows: ["wisdom", "charisma"],
      skills: { choose: 2, from: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] },
    }),
    level1Features: [
      feature(
        "Otherworldly Patron",
        "You have made a pact with a powerful entity. Your patron grants features at 1st, 6th, 10th, and 14th level.",
        [
          {
            field: "otherworldlyPatron",
            prompt: "Choose your Otherworldly Patron.",
            options: ["Archfey", "Fiend", "Great Old One"],
            required: true,
          },
        ],
      ),
      feature(
        "Pact Magic",
        "Your patron grants you spellcasting. Charisma is your spellcasting ability. You know 2 cantrips and 2 level-1 spells. You have 1 level-1 spell slot that recharges on a short or long rest.",
      ),
    ],
    spellcasting: {
      ability: "charisma",
      progression: {
        "1": { cantrips: 2, spellsKnown: 2, slots: { "1": 1 } },
      },
    },
    subclass: { level: 1, name: "Otherworldly Patron", description: "Your patron defines your features and expanded spell list." },
  },
  {
    id: "wizard",
    edition: CLASS_EDITION,
    source: CLASS_SOURCE,
    name: "Wizard",
    description:
      "A scholarly spellcaster with a broad collection of spells and magical techniques. Wizards prepare spells from their spellbook each day.",
    hitDie: 6,
    primaryAbilities: ["intelligence", "constitution"],
    proficiencies: profs({
      armor: [],
      weapons: ["simple"],
      savingThrows: ["intelligence", "wisdom"],
      skills: { choose: 2, from: ["arcana", "history", "insight", "investigation", "medicine", "religion"] },
    }),
    level1Features: [
      feature(
        "Spellcasting",
        "You have a spellbook containing 6 level-1 spells of your choice. Each day, you prepare a number of spells equal to your Intelligence modifier + wizard level (minimum 1). You have 2 level-1 spell slots per long rest. Intelligence is your spellcasting ability.",
      ),
      feature(
        "Arcane Recovery",
        "Once per day during a short rest, you can recover expended spell slots with a combined level up to half your wizard level (rounded up).",
      ),
    ],
    spellcasting: {
      ability: "intelligence",
      progression: {
        "1": { cantrips: 3, spellsKnown: 6, slots: { "1": 2 } },
      },
    },
    subclass: { level: 2, name: "Arcane Tradition", description: "Choose an arcane tradition at 2nd level." },
  },
];

// ============================================================================
// CATALOG LOOKUP & VALIDATION
// ============================================================================

export function getClassById(id: string): ClassDefinition | undefined {
  return CLASS_CATALOG.find((cls) => cls.id === id);
}

export function getAllClassIds(): readonly string[] {
  return CLASS_CATALOG.map((cls) => cls.id);
}

export function validateClassDefinition(input: unknown): ClassDefinition {
  return classDefinitionSchema.parse(input);
}

export const CLASS_CATALOG_VERSION = 1;
export const CLASS_CATALOG_KEY = "nyx-character-forge:class-catalog";