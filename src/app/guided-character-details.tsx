"use client";

import type { CharacterSheet } from "../domain/character-sheet";
import { ATTACK_PDF_CAPACITY } from "../domain/pdf-field-mapping";
import {
  addAttack,
  addInventoryItem,
  addLanguage,
  removeAttack,
  removeInventoryItem,
  removeLanguage,
  updateAttack,
  updateCurrency,
  updateEquipmentText,
  updateInventoryItem,
  updateLanguage,
  updateSkill,
} from "./character-editor-state";
import {
  CheckboxField,
  fieldsetClass,
  NumberField,
  secondaryButtonClass,
  TextareaField,
  TextField,
} from "./character-form-controls";

interface SectionProps {
  character: CharacterSheet;
  onChange: (character: CharacterSheet) => void;
}

type SkillName = keyof NonNullable<CharacterSheet["skills"]>;

const skills: readonly { key: SkillName; label: string }[] = [
  { key: "acrobatics", label: "Acrobatics" },
  { key: "animalHandling", label: "Animal handling" },
  { key: "arcana", label: "Arcana" },
  { key: "athletics", label: "Athletics" },
  { key: "deception", label: "Deception" },
  { key: "history", label: "History" },
  { key: "insight", label: "Insight" },
  { key: "intimidation", label: "Intimidation" },
  { key: "investigation", label: "Investigation" },
  { key: "medicine", label: "Medicine" },
  { key: "nature", label: "Nature" },
  { key: "perception", label: "Perception" },
  { key: "performance", label: "Performance" },
  { key: "persuasion", label: "Persuasion" },
  { key: "religion", label: "Religion" },
  { key: "sleightOfHand", label: "Sleight of hand" },
  { key: "stealth", label: "Stealth" },
  { key: "survival", label: "Survival" },
];

const currencies = [
  { key: "copper", label: "Copper pieces" },
  { key: "silver", label: "Silver pieces" },
  { key: "electrum", label: "Electrum pieces" },
  { key: "gold", label: "Gold pieces" },
  { key: "platinum", label: "Platinum pieces" },
] as const;

export function SkillsSection({ character, onChange }: SectionProps) {
  return (
    <fieldset id="skills" className={fieldsetClass}>
      <legend className="px-2 font-sans text-xl font-extrabold">Skills</legend>
      <p className="mt-1 font-sans text-sm text-[var(--muted)]">
        Enter each bonus and proficiency explicitly. Values are never derived
        from ability scores or the proficiency bonus.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {skills.map(({ key, label }) => {
          const skill = character.skills?.[key];
          return (
            <div
              key={key}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 rounded-lg border border-[var(--border)] p-3"
            >
              <NumberField
                id={`skill-${key}-bonus`}
                label={`${label} bonus`}
                value={skill?.bonus}
                onChange={(bonus) =>
                  onChange(updateSkill(character, key, { bonus }))
                }
              />
              <div className="self-end">
                <CheckboxField
                  id={`skill-${key}-proficient`}
                  label={`${label} proficient`}
                  checked={skill?.proficient ?? false}
                  onChange={(proficient) =>
                    onChange(updateSkill(character, key, { proficient }))
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AttacksSection({ character, onChange }: SectionProps) {
  const attacks = character.attacks ?? [];
  const atCapacity = attacks.length >= ATTACK_PDF_CAPACITY;

  return (
    <fieldset id="attacks" className={fieldsetClass}>
      <legend className="px-2 font-sans text-xl font-extrabold">Attacks</legend>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl font-sans text-sm text-[var(--muted)]">
          The PDF has three attack rows. Names are required before generation;
          bonuses, damage, type, and notes remain manual.
        </p>
        <button
          className={secondaryButtonClass}
          type="button"
          disabled={atCapacity}
          aria-describedby="attack-capacity"
          onClick={() => onChange(addAttack(character))}
        >
          Add attack
        </button>
      </div>
      <p
        id="attack-capacity"
        className="mt-3 font-sans text-sm font-bold"
        role="status"
        aria-label="Attack capacity"
      >
        {attacks.length} of {ATTACK_PDF_CAPACITY} PDF attack rows used
        {atCapacity ? ". Remove an attack to add another." : "."}
      </p>

      <div className="mt-5 space-y-4">
        {attacks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] p-4 font-sans text-sm text-[var(--muted)]">
            No attacks added.
          </p>
        ) : null}
        {attacks.map((attack, index) => {
          const number = index + 1;
          const removeLabel = attack.name?.trim()
            ? `Remove ${attack.name} attack`
            : `Remove attack ${number}`;
          return (
            <fieldset
              key={index}
              className="rounded-lg border border-[var(--border)] p-4"
            >
              <legend className="px-2 font-sans text-base font-extrabold">
                Attack {number}
              </legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <TextField
                  id={`attack-${index}-name`}
                  label={`Attack ${number} name`}
                  value={attack.name}
                  onChange={(value) =>
                    onChange(updateAttack(character, index, "name", value))
                  }
                />
                <NumberField
                  id={`attack-${index}-bonus`}
                  label={`Attack ${number} bonus`}
                  value={attack.attackBonus}
                  onChange={(value) =>
                    onChange(updateAttack(character, index, "attackBonus", value))
                  }
                />
                <TextField
                  id={`attack-${index}-damage`}
                  label={`Attack ${number} damage`}
                  value={attack.damage}
                  onChange={(value) =>
                    onChange(updateAttack(character, index, "damage", value))
                  }
                />
                <TextField
                  id={`attack-${index}-damage-type`}
                  label={`Attack ${number} damage type`}
                  value={attack.damageType}
                  onChange={(value) =>
                    onChange(updateAttack(character, index, "damageType", value))
                  }
                />
                <div className="sm:col-span-2 lg:col-span-3">
                  <TextareaField
                    id={`attack-${index}-notes`}
                    label={`Attack ${number} notes`}
                    rows={2}
                    value={attack.notes}
                    onChange={(value) =>
                      onChange(updateAttack(character, index, "notes", value))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <button
                    className={`${secondaryButtonClass} w-full`}
                    type="button"
                    aria-label={removeLabel}
                    onClick={() => onChange(removeAttack(character, index))}
                  >
                    Remove attack
                  </button>
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>
    </fieldset>
  );
}

export function EquipmentSection({ character, onChange }: SectionProps) {
  const equipment = character.equipment;
  const inventory = equipment?.inventory ?? [];
  const languages = equipment?.languages ?? [];

  return (
    <fieldset id="equipment" className={fieldsetClass}>
      <legend className="px-2 font-sans text-xl font-extrabold">
        Equipment and currency
      </legend>
      <p className="mt-1 font-sans text-sm text-[var(--muted)]">
        Record exact inventory, currency, language, and proficiency values. No
        prices, weights, or encumbrance are calculated.
      </p>

      <section className="mt-5" aria-labelledby="currency-heading">
        <h3 id="currency-heading" className="font-sans text-lg font-extrabold">
          Currency
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {currencies.map(({ key, label }) => (
            <NumberField
              key={key}
              id={`currency-${key}`}
              label={label}
              min={0}
              value={equipment?.currency?.[key]}
              onChange={(value) =>
                onChange(updateCurrency(character, key, value))
              }
            />
          ))}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="inventory-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="inventory-heading" className="font-sans text-lg font-extrabold">
            Inventory
          </h3>
          <button
            className={secondaryButtonClass}
            type="button"
            onClick={() => onChange(addInventoryItem(character))}
          >
            Add inventory item
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {inventory.length === 0 ? (
            <p className="font-sans text-sm text-[var(--muted)]">No inventory items.</p>
          ) : null}
          {inventory.map((item, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            >
              <TextField
                id={`inventory-${index}`}
                label={`Inventory item ${index + 1}`}
                value={item}
                preserveEmpty
                onChange={(value) =>
                  onChange(updateInventoryItem(character, index, value ?? ""))
                }
              />
              <button
                className={secondaryButtonClass}
                type="button"
                aria-label={`Remove inventory item ${index + 1}`}
                onClick={() => onChange(removeInventoryItem(character, index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <TextareaField
          id="equipment-other-proficiencies"
          label="Other proficiencies"
          value={equipment?.otherProficiencies}
          onChange={(value) =>
            onChange(updateEquipmentText(character, "otherProficiencies", value))
          }
        />
      </div>

      <section className="mt-6" aria-labelledby="languages-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="languages-heading" className="font-sans text-lg font-extrabold">
            Languages
          </h3>
          <button
            className={secondaryButtonClass}
            type="button"
            onClick={() => onChange(addLanguage(character))}
          >
            Add language
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {languages.length === 0 ? (
            <p className="font-sans text-sm text-[var(--muted)]">No languages.</p>
          ) : null}
          {languages.map((language, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            >
              <TextField
                id={`language-${index}`}
                label={`Language ${index + 1}`}
                value={language}
                preserveEmpty
                onChange={(value) =>
                  onChange(updateLanguage(character, index, value ?? ""))
                }
              />
              <button
                className={secondaryButtonClass}
                type="button"
                aria-label={`Remove language ${index + 1}`}
                onClick={() => onChange(removeLanguage(character, index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
    </fieldset>
  );
}

export function FeaturesSection({ character, onChange }: SectionProps) {
  return (
    <fieldset id="features" className={fieldsetClass}>
      <legend className="px-2 font-sans text-xl font-extrabold">Features</legend>
      <p className="mt-1 font-sans text-sm text-[var(--muted)]">
        Record feature text exactly as it should appear on the PDF.
      </p>
      <div className="mt-5 grid gap-4">
        <TextareaField
          id="features-class"
          label="Class features"
          rows={5}
          value={character.features?.classFeatures}
          onChange={(value) =>
            onChange({
              ...character,
              features: { ...character.features, classFeatures: value },
            })
          }
        />
        <TextareaField
          id="features-racial"
          label="Species / racial traits"
          rows={5}
          value={character.features?.racialTraits}
          onChange={(value) =>
            onChange({
              ...character,
              features: { ...character.features, racialTraits: value },
            })
          }
        />
        <TextareaField
          id="features-additional"
          label="Additional features and traits"
          rows={5}
          value={character.features?.additionalFeatures}
          onChange={(value) =>
            onChange({
              ...character,
              features: { ...character.features, additionalFeatures: value },
            })
          }
        />
      </div>
    </fieldset>
  );
}

export function AppearanceSection({ character, onChange }: SectionProps) {
  const textFields = [
    ["age", "Age"],
    ["height", "Height"],
    ["weight", "Weight"],
    ["eyes", "Eyes"],
    ["skin", "Skin"],
    ["hair", "Hair"],
  ] as const;

  return (
    <fieldset id="appearance" className={fieldsetClass}>
      <legend className="px-2 font-sans text-xl font-extrabold">Appearance</legend>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {textFields.map(([field, label]) => (
          <TextField
            key={field}
            id={`appearance-${field}`}
            label={label}
            value={character.appearance?.[field]}
            onChange={(value) =>
              onChange({
                ...character,
                appearance: { ...character.appearance, [field]: value },
              })
            }
          />
        ))}
      </div>
    </fieldset>
  );
}

export function BackstorySection({ character, onChange }: SectionProps) {
  const fields = [
    ["history", "Character history"],
    ["allies", "Allies"],
    ["organizations", "Organizations"],
    ["treasure", "Treasure"],
  ] as const;

  return (
    <fieldset id="backstory" className={fieldsetClass}>
      <legend className="px-2 font-sans text-xl font-extrabold">Backstory</legend>
      <p className="mt-1 font-sans text-sm text-[var(--muted)]">
        Backstory is separate from the personality traits used on the first PDF page.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {fields.map(([field, label]) => (
          <TextareaField
            key={field}
            id={`backstory-${field}`}
            label={label}
            rows={5}
            value={character.backstory?.[field]}
            onChange={(value) =>
              onChange({
                ...character,
                backstory: { ...character.backstory, [field]: value },
              })
            }
          />
        ))}
      </div>
    </fieldset>
  );
}

export function PersonalitySection({ character, onChange }: SectionProps) {
  const fields = [
    ["traits", "Personality traits"],
    ["ideals", "Ideals"],
    ["bonds", "Bonds"],
    ["flaws", "Flaws"],
  ] as const;

  return (
    <fieldset id="personality" className={fieldsetClass}>
      <legend className="px-2 font-sans text-xl font-extrabold">Personality</legend>
      <p className="mt-1 font-sans text-sm text-[var(--muted)]">
        These four values are the canonical personality fields used by the PDF.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {fields.map(([field, label]) => (
          <TextareaField
            key={field}
            id={`personality-${field}`}
            label={label}
            rows={4}
            value={character.personality?.[field]}
            onChange={(value) =>
              onChange({
                ...character,
                personality: { ...character.personality, [field]: value },
              })
            }
          />
        ))}
      </div>
    </fieldset>
  );
}
