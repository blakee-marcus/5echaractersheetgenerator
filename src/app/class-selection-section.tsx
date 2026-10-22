"use client";

import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
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
import {
  updateIdentity,
  updateHitDice,
  updateHitPoints,
  updateAbilitySavingThrow,
} from "./character-editor-state";

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
  barbarian: [{ label: "Martial", color: "var(--accent)" }, { label: "Tank", color: "var(--moss)" }],
  bard: [{ label: "Spellcaster", color: "var(--arcane)" }, { label: "Support", color: "var(--gold)" }],
  cleric: [{ label: "Spellcaster", color: "var(--arcane)" }, { label: "Healer", color: "var(--gold)" }],
  druid: [{ label: "Spellcaster", color: "var(--arcane)" }, { label: "Control", color: "var(--moss)" }],
  fighter: [{ label: "Martial", color: "var(--accent)" }, { label: "Tank", color: "var(--moss)" }],
  monk: [{ label: "Martial", color: "var(--accent)" }, { label: "Striker", color: "var(--gold)" }],
  paladin: [{ label: "Martial", color: "var(--accent)" }, { label: "Spellcaster", color: "var(--arcane)" }],
  ranger: [{ label: "Martial", color: "var(--accent)" }, { label: "Spellcaster", color: "var(--arcane)" }],
  rogue: [{ label: "Martial", color: "var(--accent)" }, { label: "Skill Monkey", color: "var(--arcane)" }],
  sorcerer: [{ label: "Spellcaster", color: "var(--arcane)" }, { label: "Blaster", color: "var(--accent)" }],
  warlock: [{ label: "Spellcaster", color: "var(--arcane)" }, { label: "Blaster", color: "var(--accent)" }],
  wizard: [{ label: "Spellcaster", color: "var(--arcane)" }, { label: "Control", color: "var(--moss)" }],
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

// ---- Helpers ----

type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

function getAppliedClassId(character: CharacterSheet): string | null {
  const classAndLevel = character.identity?.classAndLevel?.trim();
  if (!classAndLevel) return null;
  const name = classAndLevel.split(" ")[0]?.toLowerCase();
  return name && CLASS_CATALOG.some((c) => c.id === name) ? name : null;
}

function getClassGrantedSavingThrows(cls: ClassDefinition): string[] {
  return cls.proficiencies.savingThrows ?? [];
}

function getAllLevel1Choices(cls: ClassDefinition): Array<{
  field: string;
  prompt: string;
  options: string[];
  required: boolean;
  source: "feature" | "skill";
}> {
  const choices: Array<{
    field: string;
    prompt: string;
    options: string[];
    required: boolean;
    source: "feature" | "skill";
  }> = [];

  // Feature choices
  cls.level1Features.forEach((f) => {
    f.choices?.forEach((c) => {
      choices.push({ ...c, source: "feature" });
    });
  });

  // Skill choices (from proficiencies.skills)
  const skills = cls.proficiencies.skills;
  if (skills && skills.choose > 0 && skills.from.length > 0) {
    choices.push({
      field: "skills",
      prompt: `Choose ${skills.choose} skill${skills.choose > 1 ? "s" : ""}`,
      options: skills.from.map((s) => s.replace(/([A-Z])/g, " $1").trim()),
      required: true,
      source: "skill",
    });
  }

  return choices;
}

function clearClassSavingThrows(character: CharacterSheet, oldClass: ClassDefinition): CharacterSheet {
  let next = character;
  const oldSaves = getClassGrantedSavingThrows(oldClass);
  oldSaves.forEach((save) => {
    next = updateAbilitySavingThrow(next, save as AbilityName, { proficient: false, bonus: undefined });
  });
  return next;
}

function isNewLevel1Character(character: CharacterSheet): boolean {
  const level = parseInt(character.identity?.classAndLevel?.split(" ")[1] ?? "0", 10);
  return !character.identity?.classAndLevel || level <= 1;
}

// ---- Persistence for draft choices ----

const DRAFT_STORAGE_KEY = "nyx-character-forge:class-drafts";

function loadDraftChoices(): Record<string, Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveDraftChoices(drafts: Record<string, Record<string, string>>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // ignore quota/private browsing
  }
}

// ---- Components ----

const ClassCard = forwardRef<HTMLButtonElement, {
  cls: ClassDefinition;
  state: "default" | "applied" | "previewed";
  onSelect: () => void;
  onFocus: () => void;
}>(({ cls, state, onSelect, onFocus }, ref) => {
  const IconComponent = Icons[CLASS_ICON_MAP[cls.id]] ?? Icons.BookOpen;
  const playstyles = CLASS_PLAYSTYLE[cls.id] ?? [];
  const complexity = CLASS_COMPLEXITY[cls.id] ?? { label: "&mdash;", description: "" };

  const isApplied = state === "applied";
  const isPreviewed = state === "previewed";

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      onFocus={onFocus}
      className={`relative rounded-xl border-2 p-5 transition-all flex flex-col h-full ${
        isApplied
          ? "border-[var(--accent)] bg-[var(--parchment)] shadow-[0_0_0_2px_var(--accent)]"
          : isPreviewed
          ? "border-[var(--focus)] bg-[var(--surface)] ring-2 ring-[var(--focus)]/20"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--parchment)]"
      }`}
      aria-pressed={isApplied}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 grid size-14 place-items-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--accent)]">
          <IconComponent className="size-7" weight="regular" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3 className="font-display text-xl font-bold truncate">{cls.name}</h3>
            {isApplied && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-[var(--accent)] text-white">
                <Icons.Check className="size-3" weight="regular" />
                Current
              </span>
            )}
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
        {isApplied ? (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] font-sans text-sm font-bold w-full justify-center">
            <Icons.Check className="size-4" weight="regular" />
            Your class
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-sans text-sm font-bold w-full justify-center">
            {isPreviewed ? "View details" : `Choose ${cls.name}`}
          </span>
        )}
      </div>
    </button>
  );
});
ClassCard.displayName = "ClassCard";

function ChoiceField({
  field,
  prompt,
  options,
  required,
  value,
  onChange,
  source,
}: {
  field: string;
  prompt: string;
  options: string[];
  required: boolean;
  value: string;
  onChange: (value: string) => void;
  source: "feature" | "skill";
}) {
  const selectId = `choice-${field}`;

  return (
    <div className="space-y-2">
      <label htmlFor={selectId} className="block font-sans text-sm font-bold">
        {prompt} {required && <span className="text-[var(--accent)]" aria-hidden="true">*</span>}
      </label>
      {source === "skill" && options.length <= 18 ? (
        <fieldset className="flex flex-wrap gap-2" role="radiogroup" aria-label={prompt} aria-required={required}>
          {options.map((opt) => (
            <label key={opt} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--parchment)] transition cursor-pointer">
              <input
                type="checkbox"
                checked={value.split(",").includes(opt)}
                onChange={(e) => {
                  const current = value.split(",").filter(Boolean);
                  const next = e.target.checked
                    ? [...current, opt]
                    : current.filter((o) => o !== opt);
                  onChange(next.slice(0, 4).join(",")); // max 4 for bard
                }}
                className="size-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--focus)]"
              />
              <span className="font-sans text-sm">{opt}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-sans text-base text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/30"
          required={required}
          aria-required={required}
        >
          <option value="">Choose...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      {required && !value && (
        <p className="font-sans text-sm text-[var(--accent)]" role="alert">
          This choice is required
        </p>
      )}
    </div>
  );
}

function ClassDetailPanel({
  cls,
  initialChoices,
  onApply,
  onBack,
  onChoicesChange,
}: {
  cls: ClassDefinition;
  initialChoices: Record<string, string>;
  onApply: (choices: Record<string, string>) => void;
  onBack: () => void;
  onChoicesChange: (choices: Record<string, string>) => void;
}) {
  const [choices, setChoices] = useState<Record<string, string>>(initialChoices);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const allChoices = getAllLevel1Choices(cls);
  const requiredChoices = allChoices.filter((c) => c.required);
  const filledRequired = requiredChoices.filter((c) => choices[c.field] && choices[c.field].trim() !== "");
  const isComplete = requiredChoices.length === 0 || filledRequired.length === requiredChoices.length;

  // Persist choices when they change
  useEffect(() => {
    onChoicesChange(choices);
  }, [choices, onChoicesChange]);

  // Focus management: focus heading on mount
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const handleChoiceChange = useCallback((field: string, value: string) => {
    setChoices((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(choices);
  }, [choices, onApply]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <Icons.ArrowLeft className="size-4" weight="regular" />
          Back to classes
        </button>
        <div className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-[var(--parchment)] border border-[var(--border)] text-[var(--muted)]">
          d{cls.hitDie} Hit Die
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <header className="mb-6">
          <h2 id="class-detail-heading" ref={headingRef} tabIndex={-1} className="font-display text-2xl md:text-3xl font-bold">
            {cls.name}
          </h2>
          <p className="mt-1 font-editorial text-base md:text-lg text-[var(--ink)] leading-relaxed">{cls.description}</p>
        </header>

        {/* Required choices - FIRST */}
        {requiredChoices.length > 0 && (
          <section className="mb-6 p-5 rounded-lg border border-[var(--border)] bg-[var(--parchment)]" aria-labelledby="choices-heading">
            <h3 id="choices-heading" className="font-display text-lg font-bold mb-3 flex items-center gap-2">
              Build your {cls.name}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10">
                {filledRequired.length} of {requiredChoices.length} complete
              </span>
            </h3>
            <div className="space-y-4">
              {requiredChoices.map((choice) => (
                <ChoiceField
                  key={choice.field}
                  field={choice.field}
                  prompt={choice.prompt}
                  options={choice.options}
                  required={choice.required}
                  value={choices[choice.field] ?? ""}
                  onChange={(v) => handleChoiceChange(choice.field, v)}
                  source={choice.source}
                />
              ))}
            </div>
            <p className="mt-3 font-editorial text-sm text-[var(--muted)]">
              Other proficiency and equipment decisions may be completed in later steps.
            </p>
          </section>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
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
            disabled={!isComplete}
          >
            <Icons.Check className="size-4 mr-2" weight="regular" />
            {isComplete ? `Confirm ${cls.name}` : "Complete required choices"}
          </button>
        </div>

        {/* Expandable reference sections - AFTER choices */}
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer font-display text-lg font-bold py-3">
            Learn about this class
            <Icons.CaretDown className="size-5 transition-transform group-open:rotate-180 text-[var(--muted)]" weight="regular" />
          </summary>
          <div className="space-y-6 pt-4 border-t border-[var(--border)] animate-in slide-down duration-200">
            <section>
              <h3 className="font-display text-lg font-bold mb-3">Playstyle and strengths</h3>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-sans text-sm border-y border-[var(--border)] py-4">
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
            </section>

            <section className="mt-6">
              <h3 className="font-display text-lg font-bold mb-3">Starting proficiencies</h3>
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
              </div>
            </section>

            <section className="mt-6">
              <h3 className="font-display text-lg font-bold mb-3">Level 1 features</h3>
              <ul className="space-y-4">
                {cls.level1Features.map((feature: ClassFeature) => (
                  <li key={feature.name} className="rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]">
                    <h4 className="font-display text-lg font-bold">{feature.name}</h4>
                    <p className="mt-2 font-editorial text-base text-[var(--ink)] leading-relaxed">{feature.description}</p>
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
          </div>
        </details>
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
  const appliedClassId = getAppliedClassId(character);
  const [previewedClassId, setPreviewedClassId] = useState<string | null>(null);
  const [showHomebrew, setShowHomebrew] = useState(false);
  const [homebrewClasses, setHomebrewClasses] = useState<ClassDefinition[]>([]);
  const [draftChoices, setDraftChoices] = useState<Record<string, Record<string, string>>>(
    () => loadDraftChoices()
  );
  const cardRefs = useRef<Record<string, HTMLButtonElement>>({});
  const lastFocusedCard = useRef<string | null>(null);

  // Persist draft choices
  useEffect(() => {
    saveDraftChoices(draftChoices);
  }, [draftChoices]);

  const handleClassSelect = useCallback((classId: string) => {
    lastFocusedCard.current = classId;
    setPreviewedClassId(classId);
  }, []);

  const handleBack = useCallback(() => {
    setPreviewedClassId(null);
    // Restore focus to the card that was selected
    requestAnimationFrame(() => {
      cardRefs.current[lastFocusedCard.current ?? ""]?.focus();
    });
  }, []);

  const updateDraftChoices = useCallback((classId: string, choices: Record<string, string>) => {
    setDraftChoices((prev) => ({ ...prev, [classId]: choices }));
  }, []);

  const handleApplyClass = useCallback(
    (selectedChoices: Record<string, string>) => {
      const cls = getClassById(previewedClassId!) ?? homebrewClasses.find((c) => c.id === previewedClassId);
      if (!cls) return;

      let nextCharacter = character;

      // If changing from an existing class, clean up old class data
      const oldClassId = appliedClassId;
      if (oldClassId && oldClassId !== cls.id) {
        const oldClass = getClassById(oldClassId);
        if (oldClass) {
          nextCharacter = clearClassSavingThrows(nextCharacter, oldClass);
          nextCharacter = updateIdentity(nextCharacter, "classChoices", undefined);
        }
      }

      const isNewChar = isNewLevel1Character(character);

      nextCharacter = updateIdentity(nextCharacter, "classAndLevel", `${cls.name} 1`);
      
      if (isNewChar) {
        nextCharacter = updateHitDice(nextCharacter, "denomination", `d${cls.hitDie}`);
        nextCharacter = updateHitDice(nextCharacter, "total", 1);
        const conMod = nextCharacter.abilities?.constitution?.modifier ?? 0;
        nextCharacter = updateHitPoints(nextCharacter, "maximum", cls.hitDie + conMod);
        nextCharacter = updateHitPoints(nextCharacter, "current", cls.hitDie + conMod);
        nextCharacter = { ...nextCharacter, proficiencyBonus: 2 };
      } else {
        // For existing characters, update hit die but preserve level/HP
        nextCharacter = updateHitDice(nextCharacter, "denomination", `d${cls.hitDie}`);
        // Note: HP recalculation for multiclass/level-up should be handled in a separate flow
      }

      cls.proficiencies.savingThrows?.forEach((save) => {
        nextCharacter = updateAbilitySavingThrow(nextCharacter, save as AbilityName, { proficient: true });
      });

      // Apply selected class feature choices
      const classChoices: Record<string, string> = {};
      Object.entries(selectedChoices).forEach(([field, value]) => {
        if (value && value.trim() !== "") {
          classChoices[field] = value;
        }
      });
      if (Object.keys(classChoices).length > 0) {
        nextCharacter = updateIdentity(nextCharacter, "classChoices", classChoices);
      }

      // Clear draft for this class since it's now applied
      setDraftChoices((prev) => {
        const next = { ...prev };
        delete next[cls.id];
        return next;
      });

      onChange(nextCharacter);
      onClassSelected?.(cls.id);
      setPreviewedClassId(null);
    },
    [previewedClassId, homebrewClasses, character, appliedClassId, onChange, onClassSelected]
  );

  const handleHomebrewCreate = useCallback(
    (customClass: ClassDefinition) => {
      setHomebrewClasses((prev) => [...prev, customClass]);
      setShowHomebrew(false);
      setPreviewedClassId(customClass.id);
    },
    []
  );

  if (showHomebrew) {
    return <HomebrewClassForm onCreate={handleHomebrewCreate} onCancel={() => setShowHomebrew(false)} />;
  }

  if (previewedClassId) {
    const cls = getClassById(previewedClassId) ?? homebrewClasses.find((c) => c.id === previewedClassId);
    if (!cls) return null;
    return (
      <ClassDetailPanel
        cls={cls}
        initialChoices={draftChoices[previewedClassId] ?? {}}
        onApply={handleApplyClass}
        onBack={handleBack}
        onChoicesChange={(choices) => updateDraftChoices(previewedClassId, choices)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="text-center" role="heading" aria-level={2}>
        <h2 className="font-display text-2xl md:text-3xl font-bold">Choose Your Class</h2>
        <p className="mt-2 font-editorial text-base md:text-lg text-[var(--ink)] leading-relaxed max-w-2xl mx-auto">
          How do you want to play? Each class offers a distinct fantasy and playstyle.
        </p>
        {appliedClassId && (
          <p className="mt-4 font-sans text-sm text-[var(--muted)]">
            Your class: <span className="font-medium capitalize text-[var(--foreground)]">{appliedClassId}</span>
            {previewedClassId && previewedClassId !== appliedClassId && (
              <> &mdash; previewing <span className="font-medium capitalize">{previewedClassId}</span></>
            )}
          </p>
        )}
      </header>

      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }} role="list" aria-label="Official classes">
        {CLASS_CATALOG.map((cls) => {
          const isApplied = appliedClassId === cls.id;
          const isPreviewed = previewedClassId === cls.id;
          const refKey = cls.id;
          return (
            <ClassCard
              key={cls.id}
              ref={(el) => {
                if (el) cardRefs.current[refKey] = el;
                else delete cardRefs.current[refKey];
              }}
              cls={cls}
              state={isApplied ? "applied" : isPreviewed ? "previewed" : "default"}
              onSelect={() => handleClassSelect(cls.id)}
              onFocus={() => {
                lastFocusedCard.current = cls.id;
              }}
            />
          );
        })}
      </div>

      {/* Homebrew as secondary action */}
      <button
        type="button"
        onClick={() => setShowHomebrew(true)}
        className="w-full md:max-w-xl mx-auto rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)] hover:bg-[var(--parchment)] flex flex-col items-center justify-center"
      >
        <div className="flex-shrink-0 grid size-14 place-items-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] text-[var(--muted)] mb-3">
          <Icons.PlusCircle className="size-7" weight="regular" />
        </div>
        <h3 className="font-display text-xl font-bold text-center">Create Homebrew Class</h3>
        <p className="mt-2 font-editorial text-sm text-[var(--muted)] text-center max-w-xs">
          Define a custom class with your Dungeon Master.
        </p>
      </button>
    </div>
  );
}