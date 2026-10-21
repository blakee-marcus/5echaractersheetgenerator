"use client";

import { useState } from "react";

import type { CharacterSheet } from "../domain/character-sheet";
import * as Icons from "./icons";
import {
  updateAbility,
  updateAbilitySavingThrow,
  updateCombat,
  updateDeathSaves,
  updateHitDice,
  updateHitPoints,
  updateIdentity,
  updateTopLevel,
} from "./character-editor-state";
import {
  CheckboxField,
  fieldsetClass,
  NumberField,
  secondaryButtonClass,
  TextField,
} from "./character-form-controls";
import {
  AppearanceSection,
  AttacksSection,
  BackstorySection,
  EquipmentSection,
  FeaturesSection,
  PersonalitySection,
  SkillsSection,
} from "./guided-character-details";
import { SpellcastingSection } from "./guided-spellcasting-section";

interface GuidedCharacterFormProps {
  character: CharacterSheet;
  onChange: (character: CharacterSheet) => void;
}

type AbilityName = keyof NonNullable<CharacterSheet["abilities"]>;

const abilities: readonly { key: AbilityName; label: string }[] = [
  { key: "strength", label: "Strength" },
  { key: "dexterity", label: "Dexterity" },
  { key: "constitution", label: "Constitution" },
  { key: "intelligence", label: "Intelligence" },
  { key: "wisdom", label: "Wisdom" },
  { key: "charisma", label: "Charisma" },
];

type GenerationMethod =
  | "manual"
  | "standard-array"
  | "point-buy"
  | "rolling";

type DraftScores = Record<AbilityName, number | undefined>;
type CompleteScores = Record<AbilityName, number>;
type ScoreAssignments = Record<number, AbilityName | null>;

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

const POINT_BUY_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

const POINT_BUY_BUDGET = 27;

const METHOD_LABELS: Record<GenerationMethod, string> = {
  manual: "Manual entry",
  "standard-array": "Standard array",
  "point-buy": "Point buy",
  rolling: "Roll 4d6, drop lowest",
};

const METHOD_DESCRIPTIONS: Record<GenerationMethod, string> = {
  manual:
    "Enter each ability score directly. You can type your own scores or numbers supplied by your Dungeon Master.",
  "standard-array":
    "Your character has six abilities. You'll receive six numbers: 15, 14, 13, 12, 10, and 8. Choose which number goes with each ability. Higher numbers generally mean your character is better at tasks involving that ability.",
  "point-buy":
    "Start with 8 in each ability. You have 27 points to improve them. Higher scores cost more points, so you'll need to decide which abilities matter most to your character.",
  rolling:
    "Roll four six-sided dice and ignore the lowest result. Add the remaining three dice together. Repeat this six times to generate your ability scores.",
};

const DM_REMINDER =
  "Your Dungeon Master decides which ability score methods are allowed in your campaign. Ask them before choosing.";

const abilityKeyLabel = (key: AbilityName): string => {
  const ability = abilities.find((a) => a.key === key);
  return ability ? ability.label : key;
};

export function normalizePointBuyScore(
  requested: number | undefined,
): number | undefined {
  if (requested === undefined) return 8;
  if (!Number.isFinite(requested) || !Number.isInteger(requested)) return undefined;
  return Math.min(15, Math.max(8, requested));
}

export function GuidedCharacterForm({
  character,
  onChange,
}: GuidedCharacterFormProps) {
  const navItems: readonly {
    id: string;
    label: string;
    icon: keyof typeof Icons;
  }[] = [
    { id: "identity", label: "Identity", icon: "UserCircle" },
    { id: "abilities", label: "Abilities", icon: "Heart" },
    { id: "skills", label: "Skills", icon: "List" },
    { id: "combat", label: "Combat", icon: "Sword" },
    { id: "attacks", label: "Attacks", icon: "Shield" },
    { id: "equipment", label: "Equipment", icon: "Bag" },
    { id: "features", label: "Features", icon: "MagicWand" },
    { id: "personality", label: "Personality", icon: "Star" },
    { id: "appearance", label: "Appearance", icon: "UserCircle" },
    { id: "backstory", label: "Backstory", icon: "BookOpen" },
    { id: "spellcasting", label: "Spellcasting", icon: "Lightning" },
  ];

  const [generationMethod, setGenerationMethod] = useState<GenerationMethod>(
    "manual",
  );
  const emptyAssignments = (): ScoreAssignments =>
    Object.fromEntries(
      abilities.map((_, slotIndex) => [slotIndex, null]),
    ) as ScoreAssignments;
  const defaultPointBuyScores = (): CompleteScores => ({
    strength: 8,
    dexterity: 8,
    constitution: 8,
    intelligence: 8,
    wisdom: 8,
    charisma: 8,
  });
  const [standardAssignments, setStandardAssignments] =
    useState<ScoreAssignments>(emptyAssignments);
  const [pointBuyScores, setPointBuyScores] =
    useState<CompleteScores>(defaultPointBuyScores);
  const [rolledScores, setRolledScores] = useState<number[]>([]);
  const [rollingAssignments, setRollingAssignments] =
    useState<ScoreAssignments>(emptyAssignments);

  const generateRoll = (): number => {
    const dice = Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 6) + 1,
    );
    const sorted = [...dice].sort((a, b) => a - b);
    return sorted[1] + sorted[2] + sorted[3];
  };

  const rollAll = () => {
    setRolledScores(Array.from({ length: 6 }, () => generateRoll()));
    setRollingAssignments(emptyAssignments());
  };

  const pointBuyCost = (score: number | undefined): number => {
    if (score === undefined || !Number.isInteger(score)) {
      return Number.POSITIVE_INFINITY;
    }
    return POINT_BUY_COST[score] ?? Number.POSITIVE_INFINITY;
  };
  const totalPointBuyCost = (scores: CompleteScores): number =>
    abilities.reduce((total, { key }) => total + pointBuyCost(scores[key]), 0);
  const remainingPoints = POINT_BUY_BUDGET - totalPointBuyCost(pointBuyScores);

  const updatePointBuyScore = (key: AbilityName, requested: number | undefined) => {
    const proposed = normalizePointBuyScore(requested);
    if (proposed === undefined) return;
    setPointBuyScores((current) => {
      const next = { ...current, [key]: proposed };
      return totalPointBuyCost(next) <= POINT_BUY_BUDGET ? next : current;
    });
  };

  const assignUniqueAbility = (
    setAssignments: React.Dispatch<React.SetStateAction<ScoreAssignments>>,
    slotIndex: number,
    abilityKey: AbilityName | undefined,
  ) => {
    setAssignments((current) => {
      const next = { ...current };
      if (abilityKey) {
        for (const [otherIndex, assignedAbility] of Object.entries(next)) {
          if (Number(otherIndex) !== slotIndex && assignedAbility === abilityKey) {
            next[Number(otherIndex)] = null;
          }
        }
      }
      next[slotIndex] = abilityKey ?? null;
      return next;
    });
  };

  const assignmentsAreComplete = (assignments: ScoreAssignments): boolean => {
    const assigned = abilities.map((_, slotIndex) => assignments[slotIndex]);
    return assigned.every((ability): ability is AbilityName => ability != null) &&
      new Set(assigned).size === abilities.length;
  };

  const applyAssignedScores = (
    scores: readonly number[],
    assignments: ScoreAssignments,
  ) => {
    if (!assignmentsAreComplete(assignments)) return;
    const generatedScores: DraftScores = {
      strength: undefined,
      dexterity: undefined,
      constitution: undefined,
      intelligence: undefined,
      wisdom: undefined,
      charisma: undefined,
    };
    scores.forEach((score, slotIndex) => {
      const abilityKey = assignments[slotIndex];
      if (abilityKey) generatedScores[abilityKey] = score;
    });
    applyGeneratedScores(generatedScores);
  };

  const applyGeneratedScores = (scores: DraftScores) => {
    const nextCharacter = abilities.reduce((next, { key }) => {
      const score = scores[key];
      return score === undefined
        ? next
        : updateAbility(next, key, "score", score);
    }, character);
    onChange(nextCharacter);
  };

  const cancelDraft = () => {
    setStandardAssignments(emptyAssignments());
    setPointBuyScores(defaultPointBuyScores());
    setRolledScores([]);
    setRollingAssignments(emptyAssignments());
  };

  return (
    <div className="space-y-8">
      <nav
        className="flex gap-2 overflow-x-auto pb-1 font-sans text-sm"
        aria-label="Character sections"
      >
        {navItems.map(({ id, label, icon }) => {
          const IconComponent = Icons[icon];
          return (
            <a
              key={id}
              className="min-h-11 shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-bold transition hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              href={`#${id}`}
            >
              <IconComponent className="size-3 shrink-0 mr-1.5" weight="regular" />
              {label}
            </a>
          );
        })}
      </nav>

      <fieldset id="identity" className={fieldsetClass}>
        <legend className="px-2 font-sans text-xl font-extrabold">Identity</legend>
        <p className="mt-1 font-sans text-sm text-[var(--muted)]">
          Enter the values exactly as they should appear on the character sheet.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            id="identity-character-name"
            label="Character name"
            value={character.identity?.characterName}
            onChange={(value) =>
              onChange(updateIdentity(character, "characterName", value))
            }
          />
          <TextField
            id="identity-class-level"
            label="Class and level"
            value={character.identity?.classAndLevel}
            onChange={(value) =>
              onChange(updateIdentity(character, "classAndLevel", value))
            }
          />
          <TextField
            id="identity-race"
            label="Species / race"
            value={character.identity?.race}
            onChange={(value) =>
              onChange(updateIdentity(character, "race", value))
            }
          />
          <TextField
            id="identity-background"
            label="Background"
            value={character.identity?.background}
            onChange={(value) =>
              onChange(updateIdentity(character, "background", value))
            }
          />
          <TextField
            id="identity-alignment"
            label="Alignment"
            value={character.identity?.alignment}
            onChange={(value) =>
              onChange(updateIdentity(character, "alignment", value))
            }
          />
          <TextField
            id="identity-player-name"
            label="Player name"
            value={character.identity?.playerName}
            onChange={(value) =>
              onChange(updateIdentity(character, "playerName", value))
            }
          />
          <NumberField
            id="identity-experience"
            label="Experience points"
            value={character.identity?.experiencePoints}
            onChange={(value) =>
              onChange(updateIdentity(character, "experiencePoints", value))
            }
          />
          <NumberField
            id="proficiency-bonus"
            label="Proficiency bonus"
            value={character.proficiencyBonus}
            onChange={(value) =>
              onChange(updateTopLevel(character, "proficiencyBonus", value))
            }
          />
          <NumberField
            id="passive-perception"
            label="Passive perception"
            value={character.passivePerception}
            onChange={(value) =>
              onChange(updateTopLevel(character, "passivePerception", value))
            }
          />
          <CheckboxField
            id="inspiration"
            label="Inspiration"
            checked={character.inspiration ?? false}
            onChange={(checked) =>
              onChange(updateTopLevel(character, "inspiration", checked))
            }
          />
        </div>
      </fieldset>

      <fieldset id="abilities" className={`${fieldsetClass} scroll-mt-36`}>
        <legend className="px-2 font-sans text-xl font-extrabold">
          Abilities and saving throws
        </legend>
        <div className="mt-1">
          <label className="block font-sans text-sm font-bold" htmlFor="ability-generation-method">
            How would you like to determine your ability scores?
          </label>
          <select
            id="ability-generation-method"
            className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-sans text-base text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/30 mt-1"
            value={generationMethod}
            onChange={(event) =>
              setGenerationMethod(event.target.value as GenerationMethod)
            }
          >
            {Object.entries(METHOD_LABELS).map(([method, label]) => (
              <option key={method} value={method}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 font-sans text-sm text-[var(--muted)]">
          {METHOD_DESCRIPTIONS[generationMethod]}
        </p>
        <p className="mt-1 font-sans text-xs text-[var(--muted)]">
          {DM_REMINDER}
        </p>

        {generationMethod === "manual" ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {abilities.map(({ key, label }) => {
              const ability = character.abilities?.[key];
              return (
                <section
                  key={key}
                  aria-labelledby={`ability-${key}`}
                  className="rounded-lg border border-[var(--border)] p-4"
                >
                  <h3 id={`ability-${key}`} className="font-sans text-lg font-bold">
                    {label}
                  </h3>
                  <div className="mt-3">
                    <NumberField
                      id={`${key}-score`}
                      label={`${label} score`}
                      value={ability?.score}
                      onChange={(value) =>
                        onChange(updateAbility(character, key, "score", value))
                      }
                    />
                  </div>
                </section>
              );
            })}
          </div>
        ) : generationMethod === "standard-array" ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <p className="col-span-full font-sans text-sm text-[var(--muted)]">
              Assign each of the six numbers to one ability. A number can only
              be used once.
            </p>
            {STANDARD_ARRAY.map((value, slotIndex) => {
              const assignedKey = standardAssignments[slotIndex];
              return (
                <section
                  key={slotIndex}
                  aria-labelledby={`standard-array-slot-${slotIndex}`}
                  className="rounded-lg border border-[var(--border)] p-4"
                >
                  <h4 id={`standard-array-slot-${slotIndex}`} className="font-sans text-lg font-bold">
                    Score {value}
                  </h4>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label
                      className="block font-sans text-sm font-bold text-[var(--muted)]"
                      htmlFor={`standard-array-${slotIndex}`}
                    >
                      Assign score {value} to ability
                    </label>
                    <select
                      id={`standard-array-${slotIndex}`}
                      className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-sans text-base text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/30"
                      value={assignedKey ?? ""}
                      onChange={(event) => {
                        const selected = event.target.value as AbilityName | "";
                        assignUniqueAbility(
                          setStandardAssignments,
                          slotIndex,
                          selected || undefined,
                        );
                      }}
                    >
                      <option value="">Select ability</option>
                      {abilities.map(({ key, label }) => (
                        <option
                          key={key}
                          value={key}
                          disabled={Object.entries(standardAssignments).some(
                            ([otherIndex, assignedAbility]) =>
                              Number(otherIndex) !== slotIndex && assignedAbility === key,
                          )}
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {assignedKey !== null ? (
                    <p className="mt-1 font-sans text-sm text-[var(--accent)]">
                      Assigned to {abilityKeyLabel(assignedKey)}: {value}
                    </p>
                  ) : null}
                </section>
              );
            })}
            <div className="mt-4 flex items-center justify-between gap-2 col-span-full">
              <button
                className={secondaryButtonClass}
                type="button"
                disabled={!assignmentsAreComplete(standardAssignments)}
                onClick={() => applyAssignedScores(STANDARD_ARRAY, standardAssignments)}
              >
                Apply scores
              </button>
              <button
                className={secondaryButtonClass}
                type="button"
                onClick={cancelDraft}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : generationMethod === "point-buy" ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="col-span-full">
              <p className="mt-1 font-sans text-sm font-bold">
                Points remaining:{" "}
                <span className="font-mono">
                  {remainingPoints}
                </span>{" "}
                of {POINT_BUY_BUDGET}
              </p>
              <p className="mt-1 font-sans text-xs text-[var(--muted)]">
                Cost table: 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9
              </p>
            </div>
            {abilities.map(({ key, label }) => {
              const value = pointBuyScores[key];
              const cost = pointBuyCost(value);
              return (
                <section
                  key={key}
                  aria-labelledby={`point-buy-${key}`}
                  className="rounded-lg border border-[var(--border)] p-4"
                >
                  <h3 id={`point-buy-${key}`} className="font-sans text-lg font-bold">
                    {label}
                  </h3>
                  <div className="mt-3">
                    <NumberField
                      id={`point-buy-${key}-score`}
                      label={`${label} point-buy score`}
                      min={8}
                      max={15}
                      value={value}
                      onChange={(nextValue) => updatePointBuyScore(key, nextValue)}
                    />
                    <p className="mt-1 font-sans text-xs text-[var(--muted)]">
                      Cost: {cost} point{cost === 1 ? "" : "s"}
                    </p>
                  </div>
                </section>
              );
            })}
            <div className="mt-4 flex items-center justify-between gap-2 col-span-full">
              <button
                className={secondaryButtonClass}
                type="button"
                disabled={remainingPoints < 0}
                onClick={() => applyGeneratedScores(pointBuyScores)}
              >
                Apply scores
              </button>
              <button
                className={secondaryButtonClass}
                type="button"
                onClick={cancelDraft}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <p className="col-span-full font-sans text-sm text-[var(--muted)]">
              Roll four six-sided dice and ignore the lowest result. Add the
              remaining three dice together. Repeat six times.
            </p>
            <div className="col-span-full mb-4">
              <button
                className={secondaryButtonClass}
                type="button"
                onClick={rollAll}
              >
                Roll all six
              </button>
            </div>
            {rolledScores.map((total, rollIndex) => {
              const assignedKey = rollingAssignments[rollIndex];
              return (
                <section
                  key={rollIndex}
                  aria-labelledby={`rolling-roll-${rollIndex}`}
                  className="rounded-lg border border-[var(--border)] p-4"
                >
                  <h4 id={`rolling-roll-${rollIndex}`} className="font-sans text-lg font-bold">
                    Roll {rollIndex + 1}: {total}
                  </h4>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label
                      className="block font-sans text-sm font-bold text-[var(--muted)]"
                      htmlFor={`rolling-${rollIndex}`}
                    >
                      Assign roll {rollIndex + 1} to ability
                    </label>
                    <select
                      id={`rolling-${rollIndex}`}
                      className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-sans text-base text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/30"
                      value={assignedKey ?? ""}
                      onChange={(event) => {
                        const selected = event.target.value as AbilityName | "";
                        assignUniqueAbility(
                          setRollingAssignments,
                          rollIndex,
                          selected || undefined,
                        );
                      }}
                    >
                      <option value="">Select ability</option>
                      {abilities.map(({ key, label }) => (
                        <option
                          key={key}
                          value={key}
                          disabled={Object.entries(rollingAssignments).some(
                            ([otherIndex, assignedAbility]) =>
                              Number(otherIndex) !== rollIndex && assignedAbility === key,
                          )}
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {assignedKey !== null ? (
                    <p className="mt-1 font-sans text-sm text-[var(--accent)]">
                      Assigned to {abilityKeyLabel(assignedKey)}: {total}
                    </p>
                  ) : null}
                </section>
              );
            })}
            {rolledScores.length > 0 && (
              <div className="mt-4 flex items-center justify-between gap-2 col-span-full">
                <button
                  className={secondaryButtonClass}
                  type="button"
                  disabled={!assignmentsAreComplete(rollingAssignments)}
                  onClick={() => applyAssignedScores(rolledScores, rollingAssignments)}
                >
                  Apply scores
                </button>
                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={cancelDraft}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {abilities.map(({ key, label }) => {
            const ability = character.abilities?.[key];
            return (
              <section
                key={key}
                aria-labelledby={`ability-${key}-fields`}
                className="rounded-lg border border-[var(--border)] p-4"
              >
                <h3 id={`ability-${key}-fields`} className="font-sans text-lg font-bold">
                  {label} — details
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <NumberField
                    id={`${key}-modifier`}
                    label={`${label} modifier`}
                    value={ability?.modifier}
                    onChange={(value) =>
                      onChange(updateAbility(character, key, "modifier", value))
                    }
                  />
                  <div className="col-span-2">
                    <NumberField
                      id={`${key}-saving-throw-bonus`}
                      label={`${label} saving throw bonus`}
                      value={ability?.savingThrow?.bonus}
                      onChange={(value) =>
                        onChange(
                          updateAbilitySavingThrow(character, key, {
                            bonus: value,
                          }),
                        )
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <CheckboxField
                      id={`${key}-saving-throw-proficient`}
                      label={`${label} saving throw proficient`}
                      checked={ability?.savingThrow?.proficient ?? false}
                      onChange={(checked) =>
                        onChange(
                          updateAbilitySavingThrow(character, key, {
                            proficient: checked,
                          }),
                        )
                      }
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </fieldset>

      <SkillsSection character={character} onChange={onChange} />

      <fieldset id="combat" className={fieldsetClass}>
        <legend className="px-2 font-sans text-xl font-extrabold">Combat</legend>
        <p className="mt-1 font-sans text-sm text-[var(--muted)]">
          Supply combat values directly; no ruleset calculations are performed.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            id="combat-armor-class"
            label="Armor class"
            value={character.combat?.armorClass}
            onChange={(value) =>
              onChange(updateCombat(character, "armorClass", value))
            }
          />
          <NumberField
            id="combat-initiative"
            label="Initiative"
            value={character.combat?.initiative}
            onChange={(value) =>
              onChange(updateCombat(character, "initiative", value))
            }
          />
          <NumberField
            id="combat-speed"
            label="Speed"
            value={character.combat?.speed}
            onChange={(value) =>
              onChange(updateCombat(character, "speed", value))
            }
          />
          <NumberField
            id="combat-hp-maximum"
            label="Maximum hit points"
            value={character.combat?.hitPoints?.maximum}
            onChange={(value) =>
              onChange(updateHitPoints(character, "maximum", value))
            }
          />
          <NumberField
            id="combat-hp-current"
            label="Current hit points"
            min={0}
            value={character.combat?.hitPoints?.current}
            onChange={(value) =>
              onChange(updateHitPoints(character, "current", value))
            }
          />
          <NumberField
            id="combat-hp-temporary"
            label="Temporary hit points"
            min={0}
            value={character.combat?.hitPoints?.temporary}
            onChange={(value) =>
              onChange(updateHitPoints(character, "temporary", value))
            }
          />
          <NumberField
            id="combat-hit-dice-total"
            label="Hit dice total"
            value={character.combat?.hitDice?.total}
            onChange={(value) =>
              onChange(updateHitDice(character, "total", value))
            }
          />
          <TextField
            id="combat-hit-dice-denomination"
            label="Hit dice denomination"
            value={character.combat?.hitDice?.denomination}
            placeholder="d8"
            onChange={(value) =>
              onChange(updateHitDice(character, "denomination", value))
            }
          />
          <NumberField
            id="combat-death-save-successes"
            label="Death save successes"
            min={0}
            max={3}
            value={character.combat?.deathSaves?.successes}
            onChange={(value) =>
              onChange(updateDeathSaves(character, "successes", value))
            }
          />
          <NumberField
            id="combat-death-save-failures"
            label="Death save failures"
            min={0}
            max={3}
            value={character.combat?.deathSaves?.failures}
            onChange={(value) =>
              onChange(updateDeathSaves(character, "failures", value))
            }
          />
        </div>
      </fieldset>

      <AttacksSection character={character} onChange={onChange} />
      <EquipmentSection character={character} onChange={onChange} />
      <FeaturesSection character={character} onChange={onChange} />
      <PersonalitySection character={character} onChange={onChange} />
      <AppearanceSection character={character} onChange={onChange} />
      <BackstorySection character={character} onChange={onChange} />
      <SpellcastingSection character={character} onChange={onChange} />
    </div>
  );
}
