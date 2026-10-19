import {
  characterSheetSchema,
  type CharacterSheet,
} from "../domain/character-sheet";

export interface EditorIssue {
  code: string;
  path: string;
  message: string;
}

export type JsonApplyResult =
  | { success: true; character: CharacterSheet; issues: [] }
  | {
      success: false;
      character: CharacterSheet;
      issues: EditorIssue[];
    };

type Identity = NonNullable<CharacterSheet["identity"]>;
type AbilityName = keyof NonNullable<CharacterSheet["abilities"]>;
type Ability = NonNullable<NonNullable<CharacterSheet["abilities"]>[AbilityName]>;
type SavingThrow = NonNullable<Ability["savingThrow"]>;
type Combat = NonNullable<CharacterSheet["combat"]>;
type HitPoints = NonNullable<Combat["hitPoints"]>;
type HitDice = NonNullable<Combat["hitDice"]>;
type DeathSaves = NonNullable<Combat["deathSaves"]>;

export function parseOptionalInteger(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Number.isInteger(parsed)
    ? parsed
    : undefined;
}

export function updateIdentity<K extends keyof Identity>(
  character: CharacterSheet,
  key: K,
  value: Identity[K] | undefined,
): CharacterSheet {
  return {
    ...character,
    identity: { ...character.identity, [key]: value },
  };
}

export function updateTopLevel<K extends "inspiration" | "passivePerception" | "proficiencyBonus">(
  character: CharacterSheet,
  key: K,
  value: CharacterSheet[K],
): CharacterSheet {
  return { ...character, [key]: value };
}

export function updateAbility(
  character: CharacterSheet,
  ability: AbilityName,
  key: "score" | "modifier",
  value: number | undefined,
): CharacterSheet {
  return {
    ...character,
    abilities: {
      ...character.abilities,
      [ability]: {
        ...character.abilities?.[ability],
        [key]: value,
      },
    },
  };
}

export function updateAbilitySavingThrow(
  character: CharacterSheet,
  ability: AbilityName,
  values: Partial<SavingThrow>,
): CharacterSheet {
  return {
    ...character,
    abilities: {
      ...character.abilities,
      [ability]: {
        ...character.abilities?.[ability],
        savingThrow: {
          ...character.abilities?.[ability]?.savingThrow,
          ...values,
        },
      },
    },
  };
}

export function updateCombat<K extends "armorClass" | "initiative" | "speed">(
  character: CharacterSheet,
  key: K,
  value: Combat[K],
): CharacterSheet {
  return {
    ...character,
    combat: { ...character.combat, [key]: value },
  };
}

export function updateHitPoints<K extends keyof HitPoints>(
  character: CharacterSheet,
  key: K,
  value: HitPoints[K],
): CharacterSheet {
  return {
    ...character,
    combat: {
      ...character.combat,
      hitPoints: { ...character.combat?.hitPoints, [key]: value },
    },
  };
}

export function updateHitDice<K extends keyof HitDice>(
  character: CharacterSheet,
  key: K,
  value: HitDice[K],
): CharacterSheet {
  return {
    ...character,
    combat: {
      ...character.combat,
      hitDice: { ...character.combat?.hitDice, [key]: value },
    },
  };
}

export function updateDeathSaves<K extends keyof DeathSaves>(
  character: CharacterSheet,
  key: K,
  value: DeathSaves[K],
): CharacterSheet {
  return {
    ...character,
    combat: {
      ...character.combat,
      deathSaves: { ...character.combat?.deathSaves, [key]: value },
    },
  };
}

export function applyJsonDraft(
  current: CharacterSheet,
  draft: string,
): JsonApplyResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(draft);
  } catch {
    return {
      success: false,
      character: current,
      issues: [
        {
          code: "MALFORMED_JSON",
          path: "/",
          message: "JSON syntax error. Check the editor and try again.",
        },
      ],
    };
  }

  const validation = characterSheetSchema.safeParse(parsed);
  if (!validation.success) {
    return {
      success: false,
      character: current,
      issues: validation.error.issues.flatMap((issue) => {
        const paths =
          issue.code === "unrecognized_keys"
            ? issue.keys.map((key) => [...issue.path, key])
            : [issue.path];
        return paths.map((path) => ({
          code: "INVALID_CHARACTER_DATA",
          path: toJsonPointer(path),
          message: issue.message,
        }));
      }),
    };
  }

  return { success: true, character: validation.data, issues: [] };
}

function toJsonPointer(path: readonly PropertyKey[]): string {
  return path.length === 0
    ? "/"
    : `/${path
        .map((segment) => String(segment).replaceAll("~", "~0").replaceAll("/", "~1"))
        .join("/")}`;
}
