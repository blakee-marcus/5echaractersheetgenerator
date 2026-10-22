"use client";

import { useState, useEffect, useCallback, useMemo, forwardRef, useRef } from "react";
import {
  getRaceById,
  getSubraceById,
  RACE_CATALOG,
  type RaceDefinition,
  type Subrace,
} from "../domain/race-catalog";
import type { CharacterSheet } from "../domain/character-sheet";
import * as Icons from "./icons";
import { inputClass, secondaryButtonClass } from "./character-form-controls";
import { updateIdentity } from "./character-editor-state";

export interface RaceSelectionProps {
  character: CharacterSheet;
  onChange: (character: CharacterSheet) => void;
  onRaceSelected?: (raceId: string) => void;
}

type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

const TRAIT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone" }>
> = {
  darkvision: Icons.Eye,
  "superior darkvision": Icons.Eye,
  "duergar resilience": Icons.Shield,
  "dwarven resilience": Icons.Shield,
  stonecunning: Icons.House,
  "fey ancestry": Icons.Star,
  trance: Icons.Moon,
  "elf weapon training": Icons.Sword,
  lucky: Icons.Clover,
  brave: Icons.ShieldCheck,
  "halfling nimbleness": Icons.SneakerMove,
  "gnome cunning": Icons.Sparkle,
  "natural illusionist": Icons.MagicWand,
  "speak with small beasts": Icons.Star,
  "draconic ancestry": Icons.Globe,
  "breath weapon": Icons.Flame,
  "damage resistance": Icons.Shield,
  "relentless endurance": Icons.Heart,
  "savage attacks": Icons.Axe,
  menacing: Icons.HandFist,
  aggressive: Icons.Lightning,
  "hellish rebuke": Icons.Flame,
  "infernal legacy": Icons.MagicWand,
  "skill versatility": Icons.Plus,
  "extra language": Icons.BookOpen,
};

const ABILITY_COLORS: Record<string, string> = {
  strength: "accent",
  dexterity: "moss",
  constitution: "gold",
  intelligence: "arcane",
  wisdom: "moss",
  charisma: "arcane",
};

const ABILITY_LABELS: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

function getAppliedRaceId(character: CharacterSheet): string | null {
  const race = character.identity?.race?.trim();
  if (!race) return null;
  const byId = RACE_CATALOG.find((r) => r.id.toLowerCase() === race.toLowerCase());
  if (byId) return byId.id;
  const byName = RACE_CATALOG.find((r) => r.name.toLowerCase() === race.toLowerCase());
  if (byName) return byName.id;
  // Subrace names may be stored in identity.race; resolve back to the parent race.
  const bySubrace = RACE_CATALOG.find((r) =>
    r.subraces?.some((s) => s.name.toLowerCase() === race.toLowerCase()),
  );
  return bySubrace?.id ?? null;
}

function buildRaceTraitBlock(race: RaceDefinition, subrace?: Subrace): string {
  const raceTraitText = race.traits.map((t) => `${t.name}: ${t.description}`).join("\n");
  const subraceTraitText = subrace?.traits
    ?.map((t) => `${t.name}: ${t.description}`)
    .join("\n");
  return [raceTraitText, subraceTraitText].filter(Boolean).join("\n\n");
}

function formatAbilityIncreases(increases: Partial<Record<AbilityName, number>> | undefined): {
  ability: string;
  value: number;
}[] {
  if (!increases) return [];
  return Object.entries(increases)
    .filter(([, value]) => value !== undefined && value !== 0)
    .map(([ability, value]) => ({ ability, value: value as number }));
}

function formatProficiencies(race: RaceDefinition): string[] {
  const parts: string[] = [];
  const prof = race.proficiencies;
  if (prof?.weapons?.length) parts.push(`Weapons: ${prof.weapons.join(", ")}`);
  if (prof?.armor?.length) parts.push(`Armor: ${prof.armor.join(", ")}`);
  if (prof?.tools?.length) parts.push(`Tools: ${prof.tools.join(", ")}`);
  if (prof?.skills) {
    parts.push(`Skills: choose ${prof.skills.choose} from ${prof.skills.from.join(", ")}`);
  }
  return parts;
}

function applyRaceToCharacter(
  character: CharacterSheet,
  race: RaceDefinition,
  subrace?: Subrace,
): CharacterSheet {
  // Store the subrace name in identity.race when a subrace is chosen so the
  // canonical state (and PDF path) reflects the exact lineage.
  const lineageName = subrace?.name ?? race.name;
  let next = updateIdentity(character, "race", lineageName);

  // Compose the exact auto-generated trait block for this race+subrace.
  const combinedRaceTraits = buildRaceTraitBlock(race, subrace);
  const existingRacialTraits = next.features?.racialTraits ?? "";

  // Remove any previously auto-generated block for this same race/subrace to
  // prevent duplication on reapply, then append the fresh block at the top.
  // Any user-authored text below the auto block is preserved.
  let preserved = existingRacialTraits;
  if (combinedRaceTraits && preserved.includes(combinedRaceTraits)) {
    preserved = preserved.replace(combinedRaceTraits, "").trim();
  }

  if (combinedRaceTraits) {
    next = {
      ...next,
      features: {
        ...next.features,
        racialTraits: preserved ? `${combinedRaceTraits}\n\n${preserved}` : combinedRaceTraits,
      },
    };
  }

  // Merge racial languages into equipment.languages, avoiding duplicates
  const currentLanguages = next.equipment?.languages ?? [];
  const raceLanguages = race.languages.filter((lang) => !currentLanguages.includes(lang));
  if (raceLanguages.length > 0) {
    next = {
      ...next,
      equipment: {
        ...next.equipment,
        languages: [...currentLanguages, ...raceLanguages],
      },
    };
  }

  // Update combat.speed to the racial speed only if it hasn't been manually set
  if (next.combat?.speed === undefined) {
    next = {
      ...next,
      combat: { ...next.combat, speed: race.speed },
    };
  }

  return next;
}

function clearPreviousRaceEffects(character: CharacterSheet, previousRaceId: string): CharacterSheet {
  const previousRace = getRaceById(previousRaceId);
  if (!previousRace) return character;

  let next = character;

  // Strip racialTraits text that was generated from the previous race. We match
  // the auto-generated block and remove it, leaving any user-authored text.
  const existingRacialTraits = next.features?.racialTraits;
  if (existingRacialTraits) {
    // Determine the prior subrace from the stored identity.race if possible.
    const identityRace = next.identity?.race?.toLowerCase() ?? "";
    const previousSubrace = previousRace.subraces?.find((s) =>
      identityRace.includes(s.name.toLowerCase()),
    );
    const prefix = buildRaceTraitBlock(previousRace, previousSubrace);
    let cleaned = existingRacialTraits;
    if (prefix) {
      cleaned = cleaned.replace(prefix, "").trim();
    }
    next = {
      ...next,
      features: {
        ...next.features,
        racialTraits: cleaned || undefined,
      },
    };
  }

  // Intentionally do not remove languages when switching races. Race-granted
  // languages are merged additively; user-authored languages (including renamed
  // or custom ones) are preserved without risk of accidental deletion.

  return next;
}

// ---- Shared UI helpers ----

function Pill({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string; weight?: never }>;
  label?: string;
  value: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
      style={{
        backgroundColor: "color-mix(in srgb, var(--gold) 12%, transparent)",
        borderColor: "color-mix(in srgb, var(--gold) 40%, transparent)",
        color: "var(--gold)",
      }}
    >
      {Icon && <Icon className="size-3.5" />}
      {label && <span className="opacity-80">{label}:</span>}
      <span>{value}</span>
    </span>
  );
}

function AbilityPill({ ability, value }: { ability: string; value: number }) {
  const color = ABILITY_COLORS[ability] ?? "gold";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border"
      style={{
        backgroundColor: `color-mix(in srgb, var(--${color}) 12%, transparent)`,
        borderColor: `color-mix(in srgb, var(--${color}) 40%, transparent)`,
        color: `var(--${color})`,
      }}
    >
      <Icons.Sparkle className="size-3" weight="regular" />
      {ABILITY_LABELS[ability] ?? ability.toUpperCase()} +{value}
    </span>
  );
}

function TraitIcon({ name }: { name: string }) {
  const key = name.toLowerCase();
  const Icon = TRAIT_ICONS[key] ?? Icons.Star;
  const color = TRAIT_ICONS[key] ? "var(--accent)" : "var(--muted)";
  return (
    <span className="shrink-0" style={{ color }}>
      <Icon className="size-5" weight="regular" />
    </span>
  );
}

function AtAGlance({
  race,
  abilityIncreases,
}: {
  race: RaceDefinition;
  subrace?: Subrace;
  abilityIncreases: Partial<Record<AbilityName, number>>;
}) {
  const sizeDescription = race.size === "Small"
    ? "Small characters take up less space and can move through the space of most larger creatures."
    : "Medium characters occupy one 5-foot square on a typical battle map.";

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--parchment)] p-5 md:p-6">
      <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
        <Icons.Star className="size-5 text-[var(--accent)]" weight="fill" />
        At a glance
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <dt className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-1">
            <Icons.Ruler className="size-4" weight="regular" />
            Size
          </dt>
          <dd className="font-sans text-base font-bold text-[var(--foreground)]">{race.size}</dd>
          <p className="mt-1 font-editorial text-xs text-[var(--ink)] leading-relaxed">{sizeDescription}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <dt className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-1">
            <Icons.SneakerMove className="size-4" weight="regular" />
            Speed
          </dt>
          <dd className="font-sans text-base font-bold text-[var(--foreground)]">{race.speed} ft per turn</dd>
          <p className="mt-1 font-editorial text-xs text-[var(--ink)] leading-relaxed">
            How far you can usually move on your turn.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <dt className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-1">
            <Icons.BookOpen className="size-4" weight="regular" />
            Languages
          </dt>
          <dd className="font-sans text-sm font-medium text-[var(--ink)]">{race.languages.join(", ")}</dd>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <dt className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-1">
            <Icons.Sparkle className="size-4" weight="regular" />
            Ability bonuses
          </dt>
          <dd className="flex flex-wrap gap-1.5">
            {formatAbilityIncreases(abilityIncreases).map(({ ability, value }) => (
              <AbilityPill key={ability} ability={ability} value={value} />
            ))}
            {formatAbilityIncreases(abilityIncreases).length === 0 && (
              <span className="font-editorial text-sm text-[var(--muted)]">—</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

// ---- Components ----

const RaceCard = forwardRef<HTMLButtonElement, {
  race: RaceDefinition;
  state: "default" | "applied" | "previewed";
  onSelect: () => void;
  onFocus: () => void;
}>(({ race, state, onSelect, onFocus }, ref) => {
  const isApplied = state === "applied";
  const isPreviewed = state === "previewed";
  const abilities = formatAbilityIncreases(race.abilityScoreIncreases as Record<AbilityName, number> | undefined);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Choose ${race.name}`}
      onClick={onSelect}
      onFocus={onFocus}
      className={`relative rounded-xl border-2 p-5 transition-all flex flex-col h-full text-left ${
        isApplied
          ? "border-[var(--accent)] bg-[var(--parchment)] shadow-[0_0_0_2px_var(--accent)]"
          : isPreviewed
            ? "border-[var(--focus)] bg-[var(--surface)] ring-2 ring-[var(--focus)]/20"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--parchment)]"
      }`}
      aria-pressed={isApplied}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h3 className="font-display text-xl font-bold truncate">{race.name}</h3>
          {isApplied && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-[var(--accent)] text-white">
              <Icons.Check className="size-3" weight="regular" />
              Current
            </span>
          )}
        </div>

        <p className="mt-2 font-editorial text-sm text-[var(--ink)] leading-relaxed line-clamp-3">
          {race.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Pill icon={Icons.Ruler} label="Size" value={race.size} />
          <Pill icon={Icons.SneakerMove} label="Speed" value={`${race.speed} ft`} />
          {abilities.map(({ ability, value }) => (
            <AbilityPill key={ability} ability={ability} value={value} />
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--border)]">
        {isApplied ? (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] font-sans text-sm font-bold w-full justify-center">
            <Icons.Check className="size-4" weight="regular" />
            Your race
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-sans text-sm font-bold w-full justify-center">
            {isPreviewed ? "View details" : `Choose ${race.name}`}
          </span>
        )}
      </div>
    </button>
  );
});
RaceCard.displayName = "RaceCard";

function RaceDetailPanel({
  race,
  initialSubraceId,
  onApply,
  onBack,
}: {
  race: RaceDefinition;
  initialSubraceId: string | undefined;
  onApply: (subraceId: string | undefined) => void;
  onBack: () => void;
}) {
  const [selectedSubraceId, setSelectedSubraceId] = useState<string | undefined>(
    initialSubraceId,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasSubraces = (race.subraces?.length ?? 0) > 0;
  const subraceComplete = true;
  const selectedSubrace = selectedSubraceId
    ? race.subraces?.find((s) => s.id === selectedSubraceId)
    : undefined;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const abilityIncreases = useMemo(() => {
    const base = race.abilityScoreIncreases ?? {};
    const sub = selectedSubrace?.abilityScoreIncreases ?? {};
    const combined: Partial<Record<AbilityName, number>> = {};
    Object.entries(base).forEach(([k, v]) => {
      const key = k as AbilityName;
      combined[key] = (combined[key] ?? 0) + v;
    });
    Object.entries(sub).forEach(([k, v]) => {
      const key = k as AbilityName;
      combined[key] = (combined[key] ?? 0) + v;
    });
    return combined;
  }, [race, selectedSubrace]);

  const displayedName = selectedSubrace ? selectedSubrace.name : race.name;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <Icons.ArrowLeft className="size-4" weight="regular" />
          Back to races
        </button>
        <div className="flex-shrink-0 flex flex-wrap gap-2 justify-end">
          {formatAbilityIncreases(abilityIncreases).map(({ ability, value }) => (
            <AbilityPill key={ability} ability={ability} value={value} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <header className="mb-6">
          <h2
            id="race-detail-heading"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-2xl md:text-3xl font-bold"
          >
            {displayedName}
          </h2>
          <p className="mt-1 font-editorial text-base md:text-lg text-[var(--ink)] leading-relaxed">
            {selectedSubrace ? selectedSubrace.description : race.description}
          </p>
        </header>

        <AtAGlance race={race} subrace={selectedSubrace} abilityIncreases={abilityIncreases} />

        {hasSubraces && (
          <section
            className="mt-6 p-5 rounded-lg border border-[var(--border)] bg-[var(--parchment)]"
            aria-labelledby="subrace-heading"
          >
            <h3 id="subrace-heading" className="font-display text-lg font-bold mb-3">
              Choose a subrace
            </h3>
            <div className="space-y-3">
              {race.subraces?.map((subrace) => (
                <label
                  key={subrace.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    selectedSubraceId === subrace.id
                      ? "border-[var(--accent)] bg-[var(--surface)]"
                      : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="subrace"
                    value={subrace.id}
                    checked={selectedSubraceId === subrace.id}
                    onChange={() => setSelectedSubraceId(subrace.id)}
                    className="mt-1 size-4 border-[var(--border)] text-[var(--accent)] focus:ring-[var(--focus)]"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-sans text-sm font-bold">{subrace.name}</span>
                      {formatAbilityIncreases(subrace.abilityScoreIncreases as Record<AbilityName, number> | undefined).length > 0 && (
                        <span className="flex flex-wrap gap-1">
                          {formatAbilityIncreases(subrace.abilityScoreIncreases as Record<AbilityName, number> | undefined).map(({ ability, value }) => (
                            <AbilityPill key={ability} ability={ability} value={value} />
                          ))}
                        </span>
                      )}
                    </div>
                    <p className="font-editorial text-sm text-[var(--muted)] leading-relaxed">
                      {subrace.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <h3 className="font-display text-lg font-bold mb-3">Racial traits</h3>
          <ul className="space-y-4">
            {race.traits.map((t) => (
              <li key={t.name} className="flex gap-4 rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]">
                <TraitIcon name={t.name} />
                <div className="min-w-0">
                  <h4 className="font-display text-base font-bold">{t.name}</h4>
                  <p className="mt-1 font-editorial text-sm text-[var(--ink)] leading-relaxed">{t.description}</p>
                </div>
              </li>
            ))}
            {selectedSubrace?.traits?.map((t) => (
              <li key={t.name} className="flex gap-4 rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]">
                <TraitIcon name={t.name} />
                <div className="min-w-0">
                  <h4 className="font-display text-base font-bold">{t.name}</h4>
                  <p className="mt-1 font-editorial text-sm text-[var(--ink)] leading-relaxed">{t.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {formatProficiencies(race).length > 0 && (
          <section className="mt-6">
            <h3 className="font-display text-lg font-bold mb-3">Starting proficiencies</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {formatProficiencies(race).map((prof) => (
                <div
                  key={prof}
                  className="rounded-lg border border-[var(--border)] p-5 bg-[var(--parchment)]"
                >
                  <p className="font-sans text-sm text-[var(--ink)] leading-relaxed">{prof}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <details className="group mt-6">
          <summary className="flex items-center justify-between cursor-pointer font-display text-lg font-bold py-3 border-t border-[var(--border)]">
            Learn about this race
            <Icons.CaretDown className="size-5 transition-transform group-open:rotate-180 text-[var(--muted)]" weight="regular" />
          </summary>
          <div className="space-y-6 pt-4">
            <p className="font-editorial text-sm text-[var(--ink)] leading-relaxed">
              {race.description}
            </p>
          </div>
        </details>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4 mt-6">
          <button type="button" onClick={onBack} className={secondaryButtonClass}>
            <Icons.ArrowLeft className="size-4 mr-2" weight="regular" />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(selectedSubraceId)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 font-sans text-sm font-extrabold text-white shadow-[0_6px_16px_rgb(118_37_31/0.18)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!subraceComplete}
          >
            <Icons.Check className="size-4 mr-2" weight="regular" />
            {subraceComplete ? `Confirm ${displayedName}` : "Choose a subrace"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RaceSelection({
  character,
  onChange,
  onRaceSelected,
}: RaceSelectionProps) {
  const appliedRaceId = getAppliedRaceId(character);
  const [previewedRaceId, setPreviewedRaceId] = useState<string | null>(null);
  const [isCustomLineage, setIsCustomLineage] = useState(false);
  const cardRefs = useRef<Record<string, HTMLButtonElement>>({});
  const lastFocusedCard = useRef<string | null>(null);

  const appliedSubraceId = useMemo(() => {
    if (!appliedRaceId) return undefined;
    const race = getRaceById(appliedRaceId);
    const identityRace = character.identity?.race?.toLowerCase() ?? "";
    return race?.subraces?.find((s) => identityRace === s.name.toLowerCase())?.id;
  }, [appliedRaceId, character.identity?.race]);

  const handleRaceSelect = useCallback((raceId: string) => {
    lastFocusedCard.current = raceId;
    setPreviewedRaceId(raceId);
    onRaceSelected?.(raceId);
  }, [onRaceSelected]);

  const handleBack = useCallback(() => {
    setPreviewedRaceId(null);
    requestAnimationFrame(() => {
      cardRefs.current[lastFocusedCard.current ?? ""]?.focus();
    });
  }, []);

  const handleApplyRace = useCallback(
    (subraceId: string | undefined) => {
      const race = getRaceById(previewedRaceId ?? "");
      if (!race) return;

      let nextCharacter = character;

      // If a race is already applied, clear the auto-generated effects we
      // previously added so subrace changes and race switches never duplicate.
      if (appliedRaceId) {
        nextCharacter = clearPreviousRaceEffects(nextCharacter, appliedRaceId);
      }

      const subrace = subraceId ? getSubraceById(race.id, subraceId) : undefined;
      nextCharacter = applyRaceToCharacter(nextCharacter, race, subrace);

      onChange(nextCharacter);
      onRaceSelected?.(race.id);
      setPreviewedRaceId(null);
    },
    [previewedRaceId, appliedRaceId, character, onChange, onRaceSelected],
  );

  if (isCustomLineage) {
    return (
      <CustomLineagePanel
        character={character}
        onChange={onChange}
        onBack={() => {
          setIsCustomLineage(false);
          requestAnimationFrame(() => {
            cardRefs.current["custom-lineage"]?.focus();
          });
        }}
      />
    );
  }

  if (previewedRaceId) {
    const race = getRaceById(previewedRaceId);
    if (!race) return null;
    return (
      <RaceDetailPanel
        race={race}
        initialSubraceId={
          appliedRaceId === race.id ? appliedSubraceId : undefined
        }
        onApply={handleApplyRace}
        onBack={handleBack}
      />
    );
  }

  const appliedRaceName = character.identity?.race?.trim() || (appliedRaceId ? getRaceById(appliedRaceId)?.name : undefined);

  return (
    <div className="space-y-6">
      <section className="text-center">
        <h2 className="font-display text-2xl md:text-3xl font-bold" role="heading" aria-level={2}>Choose Your Race</h2>
        <p className="mt-2 font-editorial text-base md:text-lg text-[var(--ink)] leading-relaxed max-w-2xl mx-auto">
          Your lineage shapes your character&apos;s natural talents, senses, and place in the world.
        </p>
        {appliedRaceName && (
          <p className="mt-4 font-sans text-sm text-[var(--muted)]">
            Your race:{" "}
            <span className="font-medium text-[var(--foreground)]">
              {appliedRaceName}
            </span>
          </p>
        )}
      </section>

      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
        role="list"
        aria-label="Official races"
      >
        {RACE_CATALOG.map((race) => {
          const isApplied = appliedRaceId === race.id;
          const isPreviewed = previewedRaceId === race.id;
          return (
            <RaceCard
              key={race.id}
              ref={(el) => {
                if (el) cardRefs.current[race.id] = el;
                else delete cardRefs.current[race.id];
              }}
              race={race}
              state={isApplied ? "applied" : isPreviewed ? "previewed" : "default"}
              onSelect={() => handleRaceSelect(race.id)}
              onFocus={() => {
                lastFocusedCard.current = race.id;
              }}
            />
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Create Homebrew Race"
        onClick={() => setIsCustomLineage(true)}
        className="w-full md:max-w-xl mx-auto rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)] hover:bg-[var(--parchment)] flex flex-col items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <div className="flex-shrink-0 grid size-14 place-items-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] text-[var(--muted)] mb-3">
          <Icons.PlusCircle className="size-7" weight="regular" />
        </div>
        <h3 className="font-display text-xl font-bold text-center">Create Homebrew Race</h3>
        <p className="mt-2 font-editorial text-sm text-[var(--muted)] text-center max-w-xs">
          Set a custom lineage without applying catalog traits.
        </p>
      </button>
    </div>
  );
}

function CustomLineagePanel({
  character,
  onChange,
  onBack,
}: {
  character: CharacterSheet;
  onChange: (character: CharacterSheet) => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState(character.identity?.race ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleApply = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

    let next = character;

    // If a catalog race was previously applied, strip its auto-generated effects
    // so the character does not keep stale racial traits, but leave manual
    // languages, manual traits text, and any manually set speed untouched.
    const appliedRaceId = getAppliedRaceId(character);
    if (appliedRaceId) {
      next = clearPreviousRaceEffects(next, appliedRaceId);
    }

    next = updateIdentity(next, "race", trimmed);
    onChange(next);
    onBack();
  }, [character, value, onChange, onBack]);

  return (
    <div className="space-y-6 max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 font-sans text-sm font-bold text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <Icons.ArrowLeft className="size-4" weight="regular" />
        Back to races
      </button>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <h2 className="font-display text-2xl md:text-3xl font-bold">Custom Lineage</h2>
        <p className="mt-2 font-editorial text-base text-[var(--ink)] leading-relaxed">
          Enter the exact name for your homebrew or table-specific lineage. No catalog traits, languages, or speed will be applied.
        </p>

        <div className="mt-6">
          <label className="block font-sans text-sm font-semibold text-[var(--foreground)]" htmlFor="custom-lineage-name">
            Lineage name
          </label>
          <input
            ref={inputRef}
            id="custom-lineage-name"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={`${inputClass} mt-1`}
            placeholder="e.g. Aarakocra"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
          <button type="button" onClick={onBack} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!value.trim()}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 font-sans text-sm font-extrabold text-white shadow-[0_6px_16px_rgb(118_37_31/0.18)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icons.Check className="size-4 mr-2" weight="regular" />
            Confirm {value.trim() || "Custom Lineage"}
          </button>
        </div>
      </div>
    </div>
  );
}
