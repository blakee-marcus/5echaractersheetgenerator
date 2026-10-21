import type { CharacterSheet } from "./character-sheet";

export type PdfFieldUpdate =
  | { field: string; type: "text"; value: string }
  | { field: string; type: "checkbox"; checked: boolean };

export interface PdfMappingIssue {
  path: string;
  code: string;
  message: string;
}

export interface PdfMappingResult {
  updates: PdfFieldUpdate[];
  issues: PdfMappingIssue[];
}

const ABILITY_MAPPINGS = [
  { key: "strength", score: "STR", modifier: "STRmod", savingThrow: "ST Strength", proficient: "Check Box 11" },
  { key: "dexterity", score: "DEX", modifier: "DEXmod ", savingThrow: "ST Dexterity", proficient: "Check Box 18" },
  { key: "constitution", score: "CON", modifier: "CONmod", savingThrow: "ST Constitution", proficient: "Check Box 19" },
  { key: "intelligence", score: "INT", modifier: "INTmod", savingThrow: "ST Intelligence", proficient: "Check Box 20" },
  { key: "wisdom", score: "WIS", modifier: "WISmod", savingThrow: "ST Wisdom", proficient: "Check Box 21" },
  { key: "charisma", score: "CHA", modifier: "CHamod", savingThrow: "ST Charisma", proficient: "Check Box 22" },
] as const;

const SKILL_MAPPINGS = [
  { key: "acrobatics", bonus: "Acrobatics", proficient: "Check Box 23" },
  { key: "animalHandling", bonus: "Animal", proficient: "Check Box 24" },
  { key: "arcana", bonus: "Arcana", proficient: "Check Box 25" },
  { key: "athletics", bonus: "Athletics", proficient: "Check Box 26" },
  { key: "deception", bonus: "Deception ", proficient: "Check Box 27" },
  { key: "history", bonus: "History ", proficient: "Check Box 28" },
  { key: "insight", bonus: "Insight", proficient: "Check Box 29" },
  { key: "intimidation", bonus: "Intimidation", proficient: "Check Box 30" },
  { key: "investigation", bonus: "Investigation ", proficient: "Check Box 31" },
  { key: "medicine", bonus: "Medicine", proficient: "Check Box 32" },
  { key: "nature", bonus: "Nature", proficient: "Check Box 33" },
  { key: "perception", bonus: "Perception ", proficient: "Check Box 34" },
  { key: "performance", bonus: "Performance", proficient: "Check Box 35" },
  { key: "persuasion", bonus: "Persuasion", proficient: "Check Box 36" },
  { key: "religion", bonus: "Religion", proficient: "Check Box 37" },
  { key: "sleightOfHand", bonus: "SleightofHand", proficient: "Check Box 38" },
  { key: "stealth", bonus: "Stealth ", proficient: "Check Box 39" },
  { key: "survival", bonus: "Survival", proficient: "Check Box 40" },
] as const;

const ATTACK_ROWS = [
  { name: "Wpn Name", bonus: "Wpn1 AtkBonus", damage: "Wpn1 Damage" },
  { name: "Wpn Name 2", bonus: "Wpn2 AtkBonus ", damage: "Wpn2 Damage " },
  { name: "Wpn Name 3", bonus: "Wpn3 AtkBonus  ", damage: "Wpn3 Damage " },
] as const;

export const ATTACK_PDF_CAPACITY = ATTACK_ROWS.length;

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index);
const spellFields = (numbers: readonly number[]): string[] =>
  numbers.map((number) => `Spells ${number}`);
const checkboxFields = (numbers: readonly number[]): string[] =>
  numbers.map((number) => `Check Box ${number}`);

const SPELL_ROWS: readonly { text: readonly string[]; checkboxes?: readonly string[] }[] = [
  { text: spellFields([1014, 1016, 1017, 1018, 1019, 1020, 1021, 1022]) },
  {
    text: spellFields([1015, ...range(1023, 1033)]),
    checkboxes: checkboxFields([251, 309, ...range(3010, 3019)]),
  },
  {
    text: spellFields([1046, ...range(1034, 1045)]),
    checkboxes: checkboxFields([313, 310, ...range(3020, 3030)]),
  },
  {
    text: spellFields([1048, 1047, ...range(1049, 1059)]),
    checkboxes: checkboxFields([315, 314, ...range(3031, 3041)]),
  },
  {
    text: spellFields([1061, 1060, ...range(1062, 1072)]),
    checkboxes: checkboxFields([317, 316, ...range(3042, 3052)]),
  },
  {
    text: spellFields([1074, 1073, ...range(1075, 1081)]),
    checkboxes: checkboxFields([319, 318, ...range(3053, 3059)]),
  },
  {
    text: spellFields([1083, 1082, ...range(1084, 1090)]),
    checkboxes: checkboxFields([321, 320, ...range(3060, 3066)]),
  },
  {
    text: spellFields([1092, 1091, ...range(1093, 1099)]),
    checkboxes: checkboxFields([323, 322, ...range(3067, 3073)]),
  },
  {
    text: spellFields([10101, 10100, ...range(10102, 10106)]),
    checkboxes: checkboxFields([325, 324, ...range(3074, 3078)]),
  },
  {
    text: spellFields([10108, 10107, 10109, 101010, 101011, 101012, 101013]),
    checkboxes: checkboxFields([327, 326, ...range(3079, 3083)]),
  },
];

export const SPELL_PDF_CAPACITIES: readonly number[] = SPELL_ROWS.map(
  ({ text }) => text.length,
);

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function combineLabeledSections(
  sections: readonly { label: string; value: string | undefined }[],
): string | undefined {
  const supplied = sections.filter(
    (section): section is { label: string; value: string } => section.value !== undefined,
  );
  if (supplied.length === 0) return undefined;
  if (supplied.length === 1) return supplied[0].value;
  return supplied.map((section) => `${section.label}\n${section.value}`).join("\n\n");
}

export function mapCharacterToPdfFields(
  character: CharacterSheet,
): PdfMappingResult {
  const updates: PdfFieldUpdate[] = [];
  const issues: PdfMappingIssue[] = [];
  const addText = (field: string, value: string | number | undefined) => {
    if (value !== undefined) {
      updates.push({ field, type: "text", value: String(value) });
    }
  };
  const addSignedText = (field: string, value: number | undefined) => {
    if (value !== undefined) {
      updates.push({ field, type: "text", value: formatSigned(value) });
    }
  };
  const addCheckbox = (field: string, checked: boolean | undefined) => {
    if (checked !== undefined) {
      updates.push({ field, type: "checkbox", checked });
    }
  };

  const identity = character.identity;
  if (identity?.characterName !== undefined) {
    addText("CharacterName", identity.characterName);
    addText("CharacterName 2", identity.characterName);
  }
  addText("ClassLevel", identity?.classAndLevel);
  addText("Race ", identity?.race);
  addText("Background", identity?.background);
  addText("Alignment", identity?.alignment);
  addText("PlayerName", identity?.playerName);
  addText("XP", identity?.experiencePoints);
  addText(
    "Inspiration",
    character.inspiration === undefined ? undefined : character.inspiration ? "X" : "",
  );
  addText("Passive", character.passivePerception);

  addSignedText("ProfBonus", character.proficiencyBonus);
  for (const mapping of ABILITY_MAPPINGS) {
    const ability = character.abilities?.[mapping.key];
    addText(mapping.score, ability?.score);
    addSignedText(mapping.modifier, ability?.modifier);
    addSignedText(mapping.savingThrow, ability?.savingThrow?.bonus);
    addCheckbox(mapping.proficient, ability?.savingThrow?.proficient);
  }
  for (const mapping of SKILL_MAPPINGS) {
    const skill = character.skills?.[mapping.key];
    addSignedText(mapping.bonus, skill?.bonus);
    addCheckbox(mapping.proficient, skill?.proficient);
  }

  const combat = character.combat;
  addText("AC", combat?.armorClass);
  addSignedText("Initiative", combat?.initiative);
  addText("Speed", combat?.speed);
  addText("HPMax", combat?.hitPoints?.maximum);
  addText("HPCurrent", combat?.hitPoints?.current);
  addText("HPTemp", combat?.hitPoints?.temporary);
  addText("HDTotal", combat?.hitDice?.total);
  addText("HD", combat?.hitDice?.denomination);
  if (combat?.hitDice?.expended !== undefined) {
    issues.push({
      path: "/combat/hitDice/expended",
      code: "PDF_UNSUPPORTED_PROPERTY",
      message: "The PDF has no field for expended hit dice without calculating a remaining value",
    });
  }
  const addDeathSaves = (
    fields: readonly string[],
    count: number | undefined,
    path: string,
    label: string,
  ) => {
    if (count === undefined) return;
    if (count < 0 || count > fields.length) {
      issues.push({
        path,
        code: "PDF_CAPACITY_EXCEEDED",
        message: `Death-save ${label} exceed the ${fields.length} available PDF checkboxes`,
      });
      return;
    }
    fields.forEach((field, index) => addCheckbox(field, index < count));
  };
  addDeathSaves(
    ["Check Box 12", "Check Box 13", "Check Box 14"],
    combat?.deathSaves?.successes,
    "/combat/deathSaves/successes",
    "successes",
  );
  addDeathSaves(
    ["Check Box 15", "Check Box 16", "Check Box 17"],
    combat?.deathSaves?.failures,
    "/combat/deathSaves/failures",
    "failures",
  );

  const attackNotes: string[] = [];
  character.attacks?.slice(ATTACK_ROWS.length).forEach((_attack, index) => {
    issues.push({
      path: `/attacks/${index + ATTACK_ROWS.length}`,
      code: "PDF_CAPACITY_EXCEEDED",
      message: `Attack exceeds the ${ATTACK_ROWS.length} available PDF rows`,
    });
  });
  character.attacks?.slice(0, ATTACK_ROWS.length).forEach((attack, index) => {
    const row = ATTACK_ROWS[index];
    addText(row.name, attack.name);
    addSignedText(row.bonus, attack.attackBonus);
    const damage = [attack.damage, attack.damageType]
      .filter((value): value is string => value !== undefined)
      .join(" ");
    addText(row.damage, damage || undefined);
    if (attack.notes !== undefined) {
      attackNotes.push(attack.name ? `${attack.name}: ${attack.notes}` : attack.notes);
    }
  });
  addText("AttacksSpellcasting", attackNotes.length > 0 ? attackNotes.join("\n") : undefined);

  const equipment = character.equipment;
  addText("CP", equipment?.currency?.copper);
  addText("SP", equipment?.currency?.silver);
  addText("EP", equipment?.currency?.electrum);
  addText("GP", equipment?.currency?.gold);
  addText("PP", equipment?.currency?.platinum);
  addText("Equipment", equipment?.inventory?.join("\n"));
  addText(
    "ProficienciesLang",
    combineLabeledSections([
      { label: "Other Proficiencies", value: equipment?.otherProficiencies },
      { label: "Languages", value: equipment?.languages?.join("\n") },
    ]),
  );

  addText("PersonalityTraits ", character.personality?.traits);
  addText("Ideals", character.personality?.ideals);
  addText("Bonds", character.personality?.bonds);
  addText("Flaws", character.personality?.flaws);

  addText(
    "Features and Traits",
    combineLabeledSections([
      { label: "Class Features", value: character.features?.classFeatures },
      { label: "Racial Traits", value: character.features?.racialTraits },
    ]),
  );
  addText("Feat+Traits", character.features?.additionalFeatures);

  const appearance = character.appearance;
  if (appearance?.description !== undefined) {
    issues.push({
      path: "/appearance/description",
      code: "PDF_UNSUPPORTED_PROPERTY",
      message: "The PDF has no text field for character description",
    });
  }
  addText("Age", appearance?.age);
  addText("Height", appearance?.height);
  addText("Weight", appearance?.weight);
  addText("Eyes", appearance?.eyes);
  addText("Skin", appearance?.skin);
  addText("Hair", appearance?.hair);

  const backstory = character.backstory;
  addText("Backstory", backstory?.history);
  addText("Allies", backstory?.allies);
  addText("FactionName", backstory?.organizations);
  addText("Treasure", backstory?.treasure);

  const spellcasting = character.spellcasting;
  addText("Spellcasting Class 2", spellcasting?.class);
  addText("SpellcastingAbility 2", spellcasting?.ability);
  addText("SpellSaveDC  2", spellcasting?.spellSaveDc);
  addSignedText("SpellAtkBonus 2", spellcasting?.spellAttackBonus);
  SPELL_ROWS.forEach((rows, level) => {
    const spells = spellcasting?.spells?.[String(level) as keyof NonNullable<typeof spellcasting.spells>];
    spells?.forEach((spell, spellIndex) => {
      if (spellIndex >= rows.text.length) {
        issues.push({
          path: `/spellcasting/spells/${level}/${spellIndex}`,
          code: "PDF_CAPACITY_EXCEEDED",
          message: `Spell exceeds the ${rows.text.length} available PDF rows for level ${level}`,
        });
        return;
      }
      addText(rows.text[spellIndex], spell.name);
      if (rows.checkboxes) {
        addCheckbox(rows.checkboxes[spellIndex], spell.prepared);
      } else if (spell.prepared !== undefined) {
        issues.push({
          path: `/spellcasting/spells/0/${spellIndex}/prepared`,
          code: "PDF_UNSUPPORTED_PROPERTY",
          message: "The PDF has no prepared checkbox for cantrips",
        });
      }
      if (spell.notes !== undefined) {
        issues.push({
          path: `/spellcasting/spells/${level}/${spellIndex}/notes`,
          code: "PDF_UNSUPPORTED_PROPERTY",
          message: "The PDF has no per-spell notes field",
        });
      }
    });
  });
  for (let level = 1; level <= 9; level += 1) {
    const slot = spellcasting?.slots?.[String(level) as keyof NonNullable<typeof spellcasting.slots>];
    const suffix = level + 18;
    addText(`SlotsTotal ${suffix}`, slot?.total);
    addText(`SlotsRemaining ${suffix}`, slot?.expended);
  }

  return { updates: issues.length === 0 ? updates : [], issues };
}