"use client";

import type { CharacterSheet } from "../domain/character-sheet";
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

export function GuidedCharacterForm({
  character,
  onChange,
}: GuidedCharacterFormProps) {
  return (
    <div className="space-y-8">
      <nav
        className="flex gap-2 overflow-x-auto pb-1 font-sans text-sm"
        aria-label="Character sections"
      >
        {[
          ["identity", "Identity"],
          ["abilities", "Abilities"],
          ["skills", "Skills"],
          ["combat", "Combat"],
          ["attacks", "Attacks"],
          ["equipment", "Equipment"],
          ["features", "Features"],
          ["personality", "Personality"],
          ["appearance", "Appearance"],
          ["backstory", "Backstory"],
        ].map(([id, label]) => (
          <a
            key={id}
            className="min-h-11 shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-bold transition hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            href={`#${id}`}
          >
            {label}
          </a>
        ))}
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

      <fieldset id="abilities" className={fieldsetClass}>
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
    </div>
  );
}
