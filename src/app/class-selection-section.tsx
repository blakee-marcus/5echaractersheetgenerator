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
  barbarian: "Axe",
  bard: "MusicNotesSimple",
  cleric: "ShieldCheck",
  druid: "Leaf",
  fighter: "Sword",
  monk: "HandFist",
  paladin: "ShieldStar",
  ranger: "Target",
  rogue: "Sword",
  sorcerer: "Sparkle",
  warlock: "MagicWand",
  wizard: "BookOpen",
  homebrew: "PlusCircle",
};

const CLASS_PLAYSTYLE: Record<string, { label: string; color: string }[]> = {
  barbarian: [{ label: "Melee", color: "var(--accent)" }, { label: "Tank", color: "var(--moss)" }],
  bard: [{ label: "Support", color: "var(--arcane)" }, { label: "Control", color: "var(--gold)" }, { label: "Utility", color: "var(--moss)" }],
  cleric: [{ label: "Support", color: "var(--arcane)" }, { label: "Tank", color: "var(--moss)" }, { label: "Healer", color: "var(--gold)" }],
  druid: [{ label: "Control", color: "var(--moss)" }, { label: "Utility", color: "var(--arcane)" }, { label: "Healer", color: "var(--gold)" }],
  fighter: [{ label: "Melee", color: "var(--accent)" }, { label: "Tank", color: "var(--moss)" }, { label: "Ranged", color: "var(--gold)" }],
  monk: [{ label: "Melee", color: "var(--accent)" }, { label: "Striker", color: "var(--gold)" }, { label: "Mobility", color: "var(--moss)" }],
  paladin: [{ label: "Melee", color: "var(--accent)" }, { label: "Tank", color: "var(--moss)" }, { label: "Support", color: "var(--gold)" }],
  ranger: [{ label: "Ranged", color: "var(--gold)" }, { label: "Explorer", color: "var(--moss)" }, { label: "Striker", color: "var(--accent)" }],
  rogue: [{ label: "Striker", color: "var(--accent)" }, { label: "Skill Monkey", color: "var(--arcane)" }, { label: "Utility", color: "var(--moss)" }],
  sorcerer: [{ label: "Blaster", color: "var(--accent)" }, { label: "Control", color: "var(--arcane)" }, { label: "Metamagic", color: "var(--gold)" }],
  warlock: [{ label: "Blaster", color: "var(--accent)" }, { label: "Control", color: "var(--arcane)" }, { label: "Utility", color: "var(--moss)" }],
  wizard: [{ label: "Control", color: "var(--arcane)" }, { label: "Utility", color: "var(--moss)" }, { label: "Blaster", color: "var(--gold)" }],
};

const CLASS_COMPLEXITY: Record<string, { label: string; description: string }> = {
  barbarian: { label: "Straightforward", description: "Simple mechanics, high durability" },
  bard: { label: "Moderate", description: "Versatile spellcasting + skills" },
  cleric: { label: "Moderate", description: "Prepared spells, domain choice" },
  druid: { label: "Moderate", description: "Prepared spells, wild shape later" },
  fighter: { label: "Straightforward", description: "Few resource pools, consistent damage" },
  monk: { label: "Moderate", description: "Ki points, bonus actions, mobility" },
  paladin: { label: "Moderate", description: "Spell slots for smites, auras later" },
  ranger: { label: "Moderate", description: "Spellcasting + favored choices" },
  rogue: { label: "Straightforward", description: "Sneak attack, cunning action, skills" },
  sorcerer: { label: "Complex", description: "Metamagic, limited spells known" },
  warlock: { label: "Moderate", description: "Pact magic, invocations, patron" },
  wizard: { label: "Complex", description: "Spellbook, prepared spells, arcane recovery" },
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
  const playstyles = CLASS_PLAYSTYLE[cls.id] ?? [];
  const complexity = CLASS_COMPLEXITY[cls.id] ?? { label: "&mdash;", description: "" };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative rounded-xl border-2 p-5 transition-all flex flex-col h-full ${
        isSelected
          ? "border-[var(--accent)] bg-[var(--parchment)] shadow-[0_0_0_2px_var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--parchment)]"
      }`}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 grid size-14 place-items-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--accent)]">
          <IconComponent className="size-7" weight="regular" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3 className="font-display text-xl font-bold truncate">{cls.name}</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-[var(--parchment)] border border-[var(--border)] text-[var(--muted)]">
              d{cls.hitDie} Hit Die
            </span>
          </div>

          <p className="mt-2 font-editorial text-sm text-[var(--ink)] leading-relaxed line-clamp-3">
            {cls.description}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {playstyles.slice(0, 2).map((ps, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                style={{ backgroundColor: `${ps.color}15`, borderColor: `${ps.color}40`, color: ps.color }}
              >
                {ps.label}
              </span>
            ))}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-[var(--parchment)] border border-[var(--border)] text-[var(--muted)]">
              {complexity.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--border)]">
        {isSelected ? (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-sans text-sm font-bold w-full justify-center">
            <Icons.Check className="size-4" weight="regular" />
            Selected &mdash; View details
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] font-sans text-sm font-bold w-full justify-center">
            Choose {cls.name}
          </span>
        )}
      </div>
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

  const requiredChoices = cls.level1Features.flatMap((f) =>
    f.choices?.filter((c) => c.required).map((c) => c.field) ?? []
  );
  const allRequiredFilled = requiredChoices.every((field) => choices[field]);

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 font-sans text-sm font-bold text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <Icons.ArrowLeft className="size-4" weight="regular" />
        Back to classes
      </button>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">{cls.name}</h2>
            <p className="mt-1 font-editorial text-base md:text-lg text-[var(--ink)] leading-relaxed">{cls.description}</p>
          </div>
          <span className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-[var(--parchment)] border border-[var(--border)] text-[var(--muted)]">
            d{cls.hitDie} Hit Die
          </span>
        </header>

        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 font-sans text-sm border-y border-[var(--border)] py-4">
          <dt className="font-bold uppercase tracking-wide text-[var(--muted)]">Hit Die</dt>
          <dd className="font-mono tabular-nums text-xl">d{cls.hitDie}</dd>
          <dt className="font-bold uppercase tracking-wide text-[var(--muted)]">Primary Abilities</dt>
          <dd className="font-medium sm:col-span-3">{cls.primaryAbilities.map((a) => a.toUpperCase()).join(" / ")}</dd>
          <dt className="font-bold uppercase tracking-wide text-[var(--muted)]">Saving Throws</dt>
          <dd className="font-medium sm:col-span-3">{cls.proficiencies.savingThrows?.map((s) => s.toUpperCase()).join(", ") ?? "&mdash;"}</dd>
          {cls.spellcasting && (
            <>
              <dt className="font-bold uppercase tracking-wide text-[var(--muted)]">Spellcasting</dt>
              <dd className="font-medium sm:col-span-3">
                {cls.spellcasting.ability.toUpperCase()} &mdash; {cls.spellcasting.progression["1"]?.cantrips ?? 0} cantrips, {cls.spellcasting.progression["1"]?.slots?.[1] ?? 0} level-1 slot(s)
              </dd>
            </>
          )}
        </dl>

        <section className="mt-6">
          <h3 className="font-display text-lg font-bold mb-3">What you&apos;ll do</h3>
          <p className="font-editorial text-base md:text-lg text-[var(--ink)] leading-relaxed max-w-3xl">
            {cls.level1Features.map((f) => f.description).join(" ")}
          </p>
        </section>

        <section className="mt-6">
          <h3 className="font-display text-lg font-bold mb-3">Your strengths</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cls.proficiencies.armor?.length && (
              <div className="rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]">
                <dt className="font-bold uppercase tracking-wide text-[var(--muted)] text-xs mb-2">Armor</dt>
                <dd className="font-sans text-sm text-[var(--ink)] leading-relaxed">{cls.proficiencies.armor.join(", ")}</dd>
              </div>
            )}
            {cls.proficiencies.weapons?.length && (
              <div className="rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]">
                <dt className="font-bold uppercase tracking-wide text-[var(--muted)] text-xs mb-2">Weapons</dt>
                <dd className="font-sans text-sm text-[var(--ink)] leading-relaxed">{cls.proficiencies.weapons.join(", ")}</dd>
              </div>
            )}
            {cls.proficiencies.tools?.length && (
              <div className="rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]">
                <dt className="font-bold uppercase tracking-wide text-[var(--muted)] text-xs mb-2">Tools</dt>
                <dd className="font-sans text-sm text-[var(--ink)] leading-relaxed">{cls.proficiencies.tools.map((t) => t.replace(/([A-Z])/g, " $1").trim()).join(", ")}</dd>
              </div>
            )}
            {cls.proficiencies.savingThrows?.length && (
              <div className="rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]">
                <dt className="font-bold uppercase tracking-wide text-[var(--muted)] text-xs mb-2">Saving Throws</dt>
                <dd className="font-sans text-sm text-[var(--ink)] leading-relaxed">{cls.proficiencies.savingThrows.map((s) => s.toUpperCase()).join(", ")}</dd>
              </div>
            )}
            {cls.proficiencies.skills && (
              <div className="rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)] sm:col-span-2 lg:col-span-3">
                <dt className="font-bold uppercase tracking-wide text-[var(--muted)] text-xs mb-2">Skills (choose {cls.proficiencies.skills.choose})</dt>
                <dd className="font-sans text-sm text-[var(--ink)] leading-relaxed">{cls.proficiencies.skills.from.map((s) => s.replace(/([A-Z])/g, " $1").trim()).join(", ")}</dd>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="font-display text-lg font-bold mb-3">What you gain at level 1</h3>
          <ul className="space-y-5">
            {cls.level1Features.map((feature: ClassFeature) => (
              <li key={feature.name} className="rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]">
                <h4 className="font-display text-lg font-bold">{feature.name}</h4>
                <p className="mt-2 font-editorial text-base text-[var(--ink)] leading-relaxed">{feature.description}</p>
                {feature.choices?.length && (
                  <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                    {feature.choices.map((choice) => (
                      <div key={choice.field}>
                        <label className="block font-sans text-sm font-bold mb-2">{choice.prompt}</label>
                        <select
                          value={choices[choice.field] ?? ""}
                          onChange={(e) => handleChoiceChange(choice.field, e.target.value)}
                          className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-sans text-base text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/30"
                          required={choice.required}
                          aria-required={choice.required}
                        >
                          <option value="">Choose...</option>
                          {choice.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        {choice.required && !choices[choice.field] && (
                          <p className="mt-1 font-sans text-sm text-[var(--accent)]">This choice is required</p>
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
          <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--parchment)] p-5">
            <h3 className="font-display text-lg font-bold mb-2">Upcoming Choice</h3>
            <p className="font-editorial text-base text-[var(--ink)] leading-relaxed">
              At level <strong>{cls.subclass.level}</strong>, you&apos;ll choose your <strong>{cls.subclass.name}</strong>: {cls.subclass.description}
            </p>
          </section>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={onBack}
            className={secondaryButtonClass}
          >
            <Icons.ArrowLeft className="size-4 mr-2" weight="regular" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 font-sans text-sm font-extrabold text-white shadow-[0_6px_16px_rgb(118_37_31/0.18)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!allRequiredFilled}
          >
            <Icons.Check className="size-4 mr-2" weight="regular" />
            Become a {cls.name}
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6 max-w-2xl">
      <header>
        <h2 className="font-display text-2xl font-bold">Create Homebrew Class</h2>
        <p className="mt-1 font-editorial text-base text-[var(--ink)] leading-relaxed">
          Define a custom class with your Dungeon Master. Homebrew classes are labeled as custom and may not have
          complete rules support.
        </p>
      </header>

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
        rows={3}
      />

      <fieldset className="rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]">
        <legend className="px-2 font-display text-lg font-bold">Primary Abilities</legend>
        <p className="mt-1 font-editorial text-sm text-[var(--ink)]">Choose 1&ndash;2 primary abilities for this class.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].map((ability) => (
            <label key={ability} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] transition cursor-pointer">
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

      <fieldset className="rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]">
        <legend className="px-2 font-display text-lg font-bold">Level-1 Features</legend>
        <p className="mt-1 font-editorial text-sm text-[var(--ink)]">Add the features this class grants at 1st level.</p>
        <div className="mt-4 space-y-3">
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
            <Icons.Plus className="size-4 mr-2" weight="regular" />
            Add feature
          </button>
        </div>
      </fieldset>

      <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          <Icons.X className="size-4 mr-2" weight="regular" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!form.name.trim() || !form.description.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 font-sans text-sm font-extrabold text-white shadow-[0_6px_16px_rgb(118_37_31/0.18)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icons.Sparkle className="size-4 mr-2" weight="regular" />
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

    nextCharacter = updateIdentity(nextCharacter, "classAndLevel", `${cls.name} 1`);
    nextCharacter = updateHitDice(nextCharacter, "denomination", `d${cls.hitDie}`);
    nextCharacter = updateHitDice(nextCharacter, "total", 1);

    const conMod = nextCharacter.abilities?.constitution?.modifier ?? 0;
    nextCharacter = updateHitPoints(nextCharacter, "maximum", cls.hitDie + conMod);
    nextCharacter = updateHitPoints(nextCharacter, "current", cls.hitDie + conMod);

    cls.proficiencies.savingThrows?.forEach((save) => {
      nextCharacter = updateAbilitySavingThrow(nextCharacter, save as "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma", { proficient: true });
    });

    // Apply selected class feature choices (fighting style, divine domain, etc.)
    const classChoices: Record<string, string> = {};
    Object.entries(selectedChoices).forEach(([field, value]) => {
      if (value) {
        classChoices[field] = value;
      }
    });
    if (Object.keys(classChoices).length > 0) {
      nextCharacter = updateIdentity(nextCharacter, "classChoices", classChoices);
    }

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
    <div className="space-y-6">
      <div className="text-center" role="heading" aria-level={2}>
        <h2 className="font-display text-2xl md:text-3xl font-bold">Choose Your Class</h2>
        <p className="mt-2 font-editorial text-base md:text-lg text-[var(--ink)] leading-relaxed max-w-2xl mx-auto">
          Your class defines your capabilities, your role in the party, and how you&apos;ll grow.
          Read each description and pick what sounds fun &mdash; you can customize the details afterward.
        </p>
        {currentClassId && (
          <p className="mt-4 font-sans text-sm text-[var(--muted)]">
            Current class: <span className="font-medium capitalize">{currentClassId}</span>
          </p>
        )}
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
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
          className="relative rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)] hover:bg-[var(--parchment)] flex flex-col items-center justify-center min-h-[280px]"
        >
          <div className="flex-shrink-0 grid size-14 place-items-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] text-[var(--muted)] mb-3">
            <Icons.PlusCircle className="size-7" weight="regular" />
          </div>
          <h3 className="font-display text-xl font-bold text-center">Homebrew</h3>
          <p className="mt-2 font-editorial text-sm text-[var(--muted)] text-center max-w-xs">
            Create a custom class with your Dungeon Master.
          </p>
        </button>
      </div>
    </div>
  );
}