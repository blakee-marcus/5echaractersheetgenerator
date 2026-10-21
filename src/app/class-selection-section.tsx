"use client";

import { useState } from "react";
import {
  CLASS_CATALOG,
  getClassById,
  type ClassDefinition,
  type ClassFeature,
  CLASS_SOURCE_HOMEBREW,
} from "../domain/class-catalog";
import * as Icons from "./icons";
import {
  secondaryButtonClass,
  TextField,
  NumberField,
  TextareaField,
} from "./character-form-controls";
import type { CharacterSheet } from "../domain/character-sheet";
import { updateIdentity, updateHitDice, updateHitPoints, updateAbilitySavingThrow } from "./character-editor-state";

export interface ClassSelectionProps {
  character: CharacterSheet;
  onChange: (character: CharacterSheet) => void;
  onClassSelected?: (classId: string) => void;
}

const CLASS_ICON_MAP: Record<string, keyof typeof Icons> = {
  barbarian: "Sword",
  bard: "MusicNote",
  cleric: "Shield",
  druid: "Tree",
  fighter: "Shield",
  monk: "Heart",
  paladin: "Shield",
  ranger: "Target",
  rogue: "Sword",
  sorcerer: "Lightning",
  warlock: "MagicWand",
  wizard: "BookOpen",
  homebrew: "PlusCircle",
};

function ClassCard({
  cls,
  isSelected,
  onSelect,
}: {
  cls: ClassDefinition;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const IconComponent = Icons[CLASS_ICON_MAP[cls.id]] ?? Icons.BookOpen;
  const primaryAbility = cls.primaryAbilities[0]?.toUpperCase() ?? "—";
  const secondaryAbility = cls.primaryAbilities[1]?.toUpperCase() ?? "—";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative rounded-xl border-2 p-4 transition-all ${
        isSelected
          ? "border-[var(--accent)] bg-[var(--parchment)] shadow-[0_0_0_2px_var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--parchment)]"
      }`}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 grid size-12 place-items-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--accent)]">
          <IconComponent className="size-6" weight="regular" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold truncate">{cls.name}</h3>
          <p className="mt-1 font-sans text-xs text-[var(--muted)] line-clamp-2">
            {cls.description}
          </p>
          <dl className="mt-2 flex flex-wrap gap-3 font-sans text-[0.65rem]">
            <dt className="font-bold uppercase tracking-wide text-[var(--muted)]">Hit Die</dt>
            <dd className="font-mono tabular-nums">d{cls.hitDie}</dd>
            <dt className="font-bold uppercase tracking-wide text-[var(--muted)]">Primary</dt>
            <dd className="font-medium">{primaryAbility}</dd>
            {secondaryAbility !== "—" && (
              <>
                <dt className="font-bold uppercase tracking-wide text-[var(--muted)]">Secondary</dt>
                <dd className="font-medium">{secondaryAbility}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
      {isSelected && (
        <span className="absolute -top-2 -right-2 size-6 rounded-full bg-[var(--accent)] text-white text-xs font-bold grid place-items-center">
          ✓
        </span>
      )}
    </button>
  );
}

function ClassDetailPanel({
  cls,
  onApply,
  onBack,
}: {
  cls: ClassDefinition;
  onApply: (choices: Record<string, string>) => void;
  onBack: () => void;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});

  const handleChoiceChange = (field: string, value: string) => {
    setChoices((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApply(choices);
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 font-sans text-sm font-bold text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        ← Back to classes
      </button>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-xl font-bold">{cls.name}</h2>
        <p className="mt-2 font-sans text-sm text-[var(--muted)]">{cls.description}</p>

        <dl className="mt-4 grid grid-cols-2 gap-2 font-sans text-sm border-y border-[var(--border)] py-4">
          <dt className="font-bold uppercase tracking-wide text-[var(--muted)]">Hit Die</dt>
          <dd className="font-mono tabular-nums">d{cls.hitDie}</dd>
          <dt className="font-bold uppercase tracking-wide text-[var(--muted)]">Primary Abilities</dt>
          <dd className="font-medium">{cls.primaryAbilities.map((a) => a.toUpperCase()).join(" / ")}</dd>
          {cls.spellcasting && (
            <>
              <dt className="font-bold uppercase tracking-wide text-[var(--muted)]">Spellcasting</dt>
              <dd className="font-medium">
                {cls.spellcasting.ability.toUpperCase()} ({cls.spellcasting.progression["1"]?.slots ? "Yes" : "Ritual only"})
              </dd>
            </>
          )}
        </dl>

        <section>
          <h3 className="font-sans text-lg font-bold mb-3">What you&apos;ll do</h3>
          <p className="font-sans text-sm text-[var(--muted)]">
            {cls.level1Features.map((f) => f.description).join(" ")}
          </p>
        </section>

        <section>
          <h3 className="font-sans text-lg font-bold mb-3">Your strengths</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {cls.proficiencies.armor?.length && (
              <div className="rounded-lg border border-[var(--border)] p-3">
                <dt className="font-bold uppercase tracking-wide text-[var(--muted)] text-xs">Armor</dt>
                <dd className="font-sans text-sm mt-1">{cls.proficiencies.armor.join(", ")}</dd>
              </div>
            )}
            {cls.proficiencies.weapons?.length && (
              <div className="rounded-lg border border-[var(--border)] p-3">
                <dt className="font-bold uppercase tracking-wide text-[var(--muted)] text-xs">Weapons</dt>
                <dd className="font-sans text-sm mt-1">{cls.proficiencies.weapons.join(", ")}</dd>
              </div>
            )}
            {cls.proficiencies.tools?.length && (
              <div className="rounded-lg border border-[var(--border)] p-3">
                <dt className="font-bold uppercase tracking-wide text-[var(--muted)] text-xs">Tools</dt>
                <dd className="font-sans text-sm mt-1">{cls.proficiencies.tools.join(", ")}</dd>
              </div>
            )}
            {cls.proficiencies.savingThrows?.length && (
              <div className="rounded-lg border border-[var(--border)] p-3">
                <dt className="font-bold uppercase tracking-wide text-[var(--muted)] text-xs">Saving Throws</dt>
                <dd className="font-sans text-sm mt-1">
                  {cls.proficiencies.savingThrows.map((s) => s.toUpperCase()).join(", ")}
                </dd>
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="font-sans text-lg font-bold mb-3">What you gain at level 1</h3>
          <ul className="space-y-3">
            {cls.level1Features.map((feature: ClassFeature) => (
              <li key={feature.name} className="rounded-lg border border-[var(--border)] p-4">
                <h4 className="font-display text-base font-bold">{feature.name}</h4>
                <p className="mt-1 font-sans text-sm text-[var(--muted)]">{feature.description}</p>
                {feature.choices?.length && (
                  <div className="mt-3 space-y-3">
                    {feature.choices.map((choice) => (
                      <div key={choice.field}>
                        <label className="block font-sans text-sm font-bold mb-1">{choice.prompt}</label>
                        <select
                          value={choices[choice.field] ?? ""}
                          onChange={(e) => handleChoiceChange(choice.field, e.target.value)}
                          className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-sans text-base text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/30"
                          required={choice.required}
                        >
                          <option value="">Choose...</option>
                          {choice.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        {choice.required && !choices[choice.field] && (
                          <p className="mt-1 font-sans text-xs text-[var(--accent)]">Required choice</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {cls.subclass && (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--parchment)] p-4">
            <h3 className="font-sans text-lg font-bold mb-1">Upcoming choice</h3>
            <p className="font-sans text-sm text-[var(--muted)]">
              At level {cls.subclass.level}, you&apos;ll choose your {cls.subclass.name}: {cls.subclass.description}
            </p>
          </section>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={onBack}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-sans text-sm font-extrabold text-white shadow-[0_6px_16px_rgb(118_37_31/0.18)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            disabled={cls.level1Features.some((f) => f.choices?.some((c) => c.required && !choices[c.field]))}
          >
            Apply {cls.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function HomebrewClassForm({
  onCreate,
  onCancel,
}: {
  onCreate: (customClass: ClassDefinition) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    hitDie: 8,
    primaryAbilities: [] as string[],
    proficiencies: {
      armor: [] as string[],
      weapons: [] as string[],
      tools: [] as string[],
      savingThrows: [] as string[],
      skills: { choose: 2, from: [] as string[] },
    },
    level1Features: [] as Array<{ name: string; description: string }>,
    spellcasting: false,
    spellcastingAbility: "charisma",
  });

  const handleChange = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const customClass: ClassDefinition = {
      id: `homebrew-${Date.now()}`,
      edition: "2014",
      source: CLASS_SOURCE_HOMEBREW,
      name: form.name,
      description: form.description,
      hitDie: form.hitDie,
      primaryAbilities: form.primaryAbilities as ClassDefinition["primaryAbilities"],
      proficiencies: form.proficiencies as ClassDefinition["proficiencies"],
      level1Features: form.level1Features.map((f) => ({ name: f.name, description: f.description })),
      spellcasting: form.spellcasting
        ? {
            ability: form.spellcastingAbility as NonNullable<ClassDefinition["spellcasting"]>["ability"],
            progression: {
              "1": { cantrips: 0, spellsKnown: 0, slots: {} },
            },
          }
        : null,
      subclass: undefined,
    };
    onCreate(customClass);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-6 max-w-2xl">
      <h2 className="font-display text-xl font-bold">Create Homebrew Class</h2>
      <p className="font-sans text-sm text-[var(--muted)]">
        Define a custom class with your Dungeon Master. Homebrew classes are labeled as custom and may not have
        complete rules support.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="homebrew-name"
          label="Class name"
          value={form.name}
          onChange={(v) => handleChange("name", v ?? "")}
        />
        <NumberField
          id="homebrew-hitdie"
          label="Hit die (dN)"
          value={form.hitDie}
          min={6}
          max={12}
          onChange={(v) => handleChange("hitDie", v ?? 8)}
        />
      </div>

      <TextareaField
        id="homebrew-description"
        label="Description"
        value={form.description}
        onChange={(v) => handleChange("description", v ?? "")}
      />

      <fieldset className="rounded-lg border border-[var(--border)] p-4">
        <legend className="px-2 font-sans text-lg font-bold">Primary Abilities</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].map((ability) => (
            <label key={ability} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.primaryAbilities.includes(ability)}
                onChange={(e) =>
                  handleChange("primaryAbilities", e.target.checked
                    ? [...form.primaryAbilities, ability]
                    : form.primaryAbilities.filter((a) => a !== ability))
                }
                className="size-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--focus)]"
              />
              <span className="font-sans text-sm capitalize">{ability}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-[var(--border)] p-4">
        <legend className="px-2 font-sans text-lg font-bold">Level-1 Features</legend>
        <div className="mt-3 space-y-3">
          {form.level1Features.map((feature, index) => (
            <div key={index} className="flex gap-2">
              <TextField
                id={`homebrew-feature-name-${index}`}
                label="Feature name"
                value={feature.name}
                onChange={(v) => {
                  const next = [...form.level1Features];
                  next[index] = { ...next[index], name: v ?? "" };
                  handleChange("level1Features", next);
                }}
              />
              <TextField
                id={`homebrew-feature-desc-${index}`}
                label="Description"
                value={feature.description}
                onChange={(v) => {
                  const next = [...form.level1Features];
                  next[index] = { ...next[index], description: v ?? "" };
                  handleChange("level1Features", next);
                }}
              />
              <button
                type="button"
                onClick={() => handleChange("level1Features", form.level1Features.filter((_, i) => i !== index))}
                className="self-end px-3 py-2 font-sans text-sm text-[var(--accent)] hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleChange("level1Features", [...form.level1Features, { name: "", description: "" }])}
            className={secondaryButtonClass}
          >
            + Add feature
          </button>
        </div>
      </fieldset>

      <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!form.name.trim() || !form.description.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-sans text-sm font-extrabold text-white shadow-[0_6px_16px_rgb(118_37_31/0.18)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Create class
        </button>
      </div>
    </div>
  );
}

export function ClassSelection({
  character,
  onChange,
  onClassSelected,
}: ClassSelectionProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showHomebrew, setShowHomebrew] = useState(false);
  const [homebrewClasses, setHomebrewClasses] = useState<ClassDefinition[]>([]);

  const currentClassId = character.identity?.classAndLevel?.split(" ")[0]?.toLowerCase() ?? null;

  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
  };

  const handleApplyClass = (selectedChoices: Record<string, string>) => {
    const cls = getClassById(selectedClassId!) ?? homebrewClasses.find((c) => c.id === selectedClassId);
    if (!cls) return;

    let nextCharacter = character;

    // Update identity
    nextCharacter = updateIdentity(nextCharacter, "classAndLevel", `${cls.name} 1`);

    // Update hit dice
    nextCharacter = updateHitDice(nextCharacter, "denomination", `d${cls.hitDie}`);
    nextCharacter = updateHitDice(nextCharacter, "total", 1);

    // Update hit points to max for level 1 (hit die + con mod)
    const conMod = nextCharacter.abilities?.constitution?.modifier ?? 0;
    nextCharacter = updateHitPoints(nextCharacter, "maximum", cls.hitDie + conMod);
    nextCharacter = updateHitPoints(nextCharacter, "current", cls.hitDie + conMod);

    // Update saving throw proficiencies
    cls.proficiencies.savingThrows?.forEach((save) => {
      nextCharacter = updateAbilitySavingThrow(nextCharacter, save as "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma", { proficient: true });
    });

    // Update proficiency bonus
    nextCharacter = { ...nextCharacter, proficiencyBonus: 2 };

    onChange(nextCharacter);
    onClassSelected?.(cls.id);
    setSelectedClassId(null);
  };

  const handleHomebrewCreate = (customClass: ClassDefinition) => {
    setHomebrewClasses((prev) => [...prev, customClass]);
    setShowHomebrew(false);
    setSelectedClassId(customClass.id);
  };

  if (showHomebrew) {
    return <HomebrewClassForm onCreate={handleHomebrewCreate} onCancel={() => setShowHomebrew(false)} />;
  }

  if (selectedClassId) {
    const cls = getClassById(selectedClassId) ?? homebrewClasses.find((c) => c.id === selectedClassId);
    if (!cls) return null;
    return (
      <ClassDetailPanel
        cls={cls}
        onApply={handleApplyClass}
        onBack={() => setSelectedClassId(null)}
      />
    );
  }

  return (
    <fieldset className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <legend className="px-2 font-sans text-xl font-extrabold">Choose Your Class</legend>
      <p className="mt-1 font-sans text-sm text-[var(--muted)]">
        How do you want to adventure? Choose what sounds enjoyable. You can customize your character as you go.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CLASS_CATALOG.map((cls) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            isSelected={selectedClassId === cls.id}
            onSelect={() => handleClassSelect(cls.id)}
          />
        ))}
        <button
          type="button"
          onClick={() => setShowHomebrew(true)}
          className="relative rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)] hover:bg-[var(--parchment)]"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 grid size-12 place-items-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
              <Icons.PlusCircle className="size-6" weight="regular" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-bold">Homebrew</h3>
              <p className="mt-1 font-sans text-xs text-[var(--muted)] line-clamp-2">
                Create a custom class with your Dungeon Master.
              </p>
            </div>
          </div>
        </button>
      </div>

      {currentClassId && (
        <p className="mt-4 font-sans text-xs text-[var(--muted)]">
          Current class: <span className="font-medium capitalize">{currentClassId}</span>
        </p>
      )}
    </fieldset>
  );
}