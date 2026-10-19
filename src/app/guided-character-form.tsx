"use client";

import type { ChangeEvent } from "react";

import type { CharacterSheet } from "../domain/character-sheet";
import {
  parseOptionalInteger,
  updateAbility,
  updateAbilitySavingThrow,
  updateCombat,
  updateDeathSaves,
  updateHitDice,
  updateHitPoints,
  updateIdentity,
  updateTopLevel,
} from "./character-editor-state";

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

const inputClass =
  "min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-sans text-base text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/30";
const fieldsetClass =
  "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6";
const labelClass = "block font-sans text-sm font-bold text-[var(--foreground)]";

export function GuidedCharacterForm({
  character,
  onChange,
}: GuidedCharacterFormProps) {
  return (
    <div className="space-y-8">
      <fieldset className={fieldsetClass}>
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

      <fieldset className={fieldsetClass}>
        <legend className="px-2 font-sans text-xl font-extrabold">
          Abilities and saving throws
        </legend>
        <p className="mt-1 font-sans text-sm text-[var(--muted)]">
          Scores, modifiers, and saving-throw bonuses are manual values. This
          editor does not calculate them.
        </p>
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
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <NumberField
                    id={`${key}-score`}
                    label={`${label} score`}
                    value={ability?.score}
                    onChange={(value) =>
                      onChange(updateAbility(character, key, "score", value))
                    }
                  />
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
                          updateAbilitySavingThrow(character, key, { bonus: value }),
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

      <fieldset className={fieldsetClass}>
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
    </div>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string | undefined;
  placeholder?: string;
  onChange: (value: string | undefined) => void;
}

function TextField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: TextFieldProps) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <input
        className={`${inputClass} mt-1`}
        id={id}
        type="text"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || undefined)}
      />
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: number | undefined;
  min?: number;
  max?: number;
  onChange: (value: number | undefined) => void;
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: NumberFieldProps) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <input
        className={`${inputClass} mt-1`}
        id={id}
        type="number"
        step={1}
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(event) => onChange(parseOptionalInteger(event.target.value))}
      />
    </div>
  );
}

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxField({
  id,
  label,
  checked,
  onChange,
}: CheckboxFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.checked);
  }

  return (
    <label
      className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--border)] px-3 py-2 font-sans text-sm font-bold"
      htmlFor={id}
    >
      <input
        className="size-5 accent-[var(--accent-strong)]"
        id={id}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
      />
      {label}
    </label>
  );
}
