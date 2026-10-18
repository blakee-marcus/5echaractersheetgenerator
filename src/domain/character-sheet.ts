import { z } from "zod";

const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const integer = z.number().int().finite();
const nonNegativeInteger = integer.nonnegative();

const savingThrowSchema = strictObject({
  bonus: integer.optional(),
  proficient: z.boolean().optional(),
});

const abilitySchema = strictObject({
  score: integer.optional(),
  modifier: integer.optional(),
  savingThrow: savingThrowSchema.optional(),
});

const skillSchema = strictObject({
  bonus: integer.optional(),
  proficient: z.boolean().optional(),
});

const hitPointsSchema = strictObject({
  maximum: integer.optional(),
  current: nonNegativeInteger.optional(),
  temporary: nonNegativeInteger.optional(),
});

const hitDiceSchema = strictObject({
  total: integer.optional(),
  expended: integer.optional(),
  denomination: z.string().optional(),
});

const deathSavesSchema = strictObject({
  successes: integer.min(0).max(3).optional(),
  failures: integer.min(0).max(3).optional(),
});

const attackSchema = strictObject({
  name: z.string().optional(),
  attackBonus: integer.optional(),
  damage: z.string().optional(),
  damageType: z.string().optional(),
  notes: z.string().optional(),
});

const currencySchema = strictObject({
  copper: nonNegativeInteger.optional(),
  silver: nonNegativeInteger.optional(),
  electrum: nonNegativeInteger.optional(),
  gold: nonNegativeInteger.optional(),
  platinum: nonNegativeInteger.optional(),
});

const spellSchema = strictObject({
  name: z.string().optional(),
  prepared: z.boolean().optional(),
  notes: z.string().optional(),
});

const spellSlotSchema = strictObject({
  total: nonNegativeInteger.optional(),
  expended: nonNegativeInteger.optional(),
}).superRefine((slot, context) => {
  if (
    slot.total !== undefined &&
    slot.expended !== undefined &&
    slot.expended > slot.total
  ) {
    context.addIssue({
      code: "custom",
      path: ["expended"],
      message: "Expended spell slots cannot exceed the supplied total",
    });
  }
});

const spellsByLevelSchema = strictObject({
  "0": z.array(spellSchema).optional(),
  "1": z.array(spellSchema).optional(),
  "2": z.array(spellSchema).optional(),
  "3": z.array(spellSchema).optional(),
  "4": z.array(spellSchema).optional(),
  "5": z.array(spellSchema).optional(),
  "6": z.array(spellSchema).optional(),
  "7": z.array(spellSchema).optional(),
  "8": z.array(spellSchema).optional(),
  "9": z.array(spellSchema).optional(),
});

const spellSlotsByLevelSchema = strictObject({
  "1": spellSlotSchema.optional(),
  "2": spellSlotSchema.optional(),
  "3": spellSlotSchema.optional(),
  "4": spellSlotSchema.optional(),
  "5": spellSlotSchema.optional(),
  "6": spellSlotSchema.optional(),
  "7": spellSlotSchema.optional(),
  "8": spellSlotSchema.optional(),
  "9": spellSlotSchema.optional(),
});

export const characterSheetSchema = strictObject({
  identity: strictObject({
    characterName: z.string().optional(),
    classAndLevel: z.string().optional(),
    race: z.string().optional(),
    background: z.string().optional(),
    alignment: z.string().optional(),
    playerName: z.string().optional(),
    experiencePoints: integer.optional(),
  }).optional(),
  inspiration: z.boolean().optional(),
  passivePerception: integer.optional(),
  proficiencyBonus: integer.optional(),
  abilities: strictObject({
    strength: abilitySchema.optional(),
    dexterity: abilitySchema.optional(),
    constitution: abilitySchema.optional(),
    intelligence: abilitySchema.optional(),
    wisdom: abilitySchema.optional(),
    charisma: abilitySchema.optional(),
  }).optional(),
  skills: strictObject({
    acrobatics: skillSchema.optional(),
    animalHandling: skillSchema.optional(),
    arcana: skillSchema.optional(),
    athletics: skillSchema.optional(),
    deception: skillSchema.optional(),
    history: skillSchema.optional(),
    insight: skillSchema.optional(),
    intimidation: skillSchema.optional(),
    investigation: skillSchema.optional(),
    medicine: skillSchema.optional(),
    nature: skillSchema.optional(),
    perception: skillSchema.optional(),
    performance: skillSchema.optional(),
    persuasion: skillSchema.optional(),
    religion: skillSchema.optional(),
    sleightOfHand: skillSchema.optional(),
    stealth: skillSchema.optional(),
    survival: skillSchema.optional(),
  }).optional(),
  combat: strictObject({
    armorClass: integer.optional(),
    initiative: integer.optional(),
    speed: integer.optional(),
    hitPoints: hitPointsSchema.optional(),
    hitDice: hitDiceSchema.optional(),
    deathSaves: deathSavesSchema.optional(),
  }).optional(),
  attacks: z.array(attackSchema).optional(),
  equipment: strictObject({
    currency: currencySchema.optional(),
    inventory: z.array(z.string()).optional(),
    otherProficiencies: z.string().optional(),
    languages: z.array(z.string()).optional(),
  }).optional(),
  personality: strictObject({
    traits: z.string().optional(),
    ideals: z.string().optional(),
    bonds: z.string().optional(),
    flaws: z.string().optional(),
  }).optional(),
  features: strictObject({
    classFeatures: z.string().optional(),
    racialTraits: z.string().optional(),
    additionalFeatures: z.string().optional(),
  }).optional(),
  appearance: strictObject({
    age: z.string().optional(),
    height: z.string().optional(),
    weight: z.string().optional(),
    eyes: z.string().optional(),
    skin: z.string().optional(),
    hair: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  backstory: strictObject({
    history: z.string().optional(),
    allies: z.string().optional(),
    organizations: z.string().optional(),
    treasure: z.string().optional(),
  }).optional(),
  spellcasting: strictObject({
    class: z.string().optional(),
    ability: z.string().optional(),
    spellSaveDc: integer.optional(),
    spellAttackBonus: integer.optional(),
    spells: spellsByLevelSchema.optional(),
    slots: spellSlotsByLevelSchema.optional(),
  }).optional(),
});

export const finalizedCharacterSheetSchema = characterSheetSchema.superRefine(
  (character, context) => {
    character.attacks?.forEach((attack, index) => {
      if (attack.name?.trim() === "" || attack.name === undefined) {
        context.addIssue({
          code: "custom",
          path: ["attacks", index],
          message: "Finalized attack entries require a name",
        });
      }
    });

    if (character.spellcasting?.spells) {
      for (const [level, spells] of Object.entries(
        character.spellcasting.spells,
      )) {
        spells?.forEach((spell, index) => {
          if (spell.name?.trim() === "" || spell.name === undefined) {
            context.addIssue({
              code: "custom",
              path: ["spellcasting", "spells", level, index],
              message: "Finalized spell entries require a name",
            });
          }
        });
      }
    }
  },
);

export type CharacterSheet = z.infer<typeof characterSheetSchema>;
