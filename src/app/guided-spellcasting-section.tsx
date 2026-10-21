"use client";

import type { CharacterSheet } from "../domain/character-sheet";
import { SPELL_PDF_CAPACITIES } from "../domain/pdf-field-mapping";
import {
  addSpell,
  removeSpell,
  type SpellLevel,
  updateSpell,
  updateSpellcastingMetadata,
  updateSpellSlot,
} from "./character-editor-state";
import {
  CheckboxField,
  fieldsetClass,
  IconButton,
  NumberField,
  TextField,
} from "./character-form-controls";

interface SpellcastingSectionProps {
  character: CharacterSheet;
  onChange: (character: CharacterSheet) => void;
}

const spellLevels = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const slotLevels = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function levelLabel(level: SpellLevel): string {
  return level === "0" ? "Cantrips" : `Level ${level}`;
}

function addSpellLabel(level: SpellLevel): string {
  return level === "0" ? "Add cantrip" : `Add level ${level} spell`;
}

export function SpellcastingSection({
  character,
  onChange,
}: SpellcastingSectionProps) {
  const spellcasting = character.spellcasting;

  return (
    <fieldset id="spellcasting" className={fieldsetClass}>
      <legend className="px-2 font-sans text-xl font-extrabold">Spellcasting</legend>
      <p className="mt-1 font-sans text-sm text-[var(--muted)]">
        Enter spellcasting values manually. The editor does not calculate save DCs,
        attack bonuses, spell slots, or prepared spells.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          id="spellcasting-class"
          label="Spellcasting class"
          value={spellcasting?.class}
          onChange={(value) =>
            onChange(updateSpellcastingMetadata(character, "class", value))
          }
        />
        <TextField
          id="spellcasting-ability"
          label="Spellcasting ability"
          value={spellcasting?.ability}
          placeholder="INT"
          onChange={(value) =>
            onChange(updateSpellcastingMetadata(character, "ability", value))
          }
        />
        <NumberField
          id="spellcasting-save-dc"
          label="Spell save DC"
          value={spellcasting?.spellSaveDc}
          onChange={(value) =>
            onChange(updateSpellcastingMetadata(character, "spellSaveDc", value))
          }
        />
        <NumberField
          id="spellcasting-attack-bonus"
          label="Spell attack bonus"
          value={spellcasting?.spellAttackBonus}
          onChange={(value) =>
            onChange(updateSpellcastingMetadata(character, "spellAttackBonus", value))
          }
        />
      </div>

      <section className="mt-8" aria-labelledby="spell-slots-heading">
        <h3 id="spell-slots-heading" className="font-sans text-lg font-extrabold">
          Spell slots
        </h3>
        <p className="mt-1 font-sans text-sm text-[var(--muted)]">
          Record total and expended slots for levels 1–9.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slotLevels.map((level) => {
            const slot = spellcasting?.slots?.[level];
            const invalid =
              slot?.total !== undefined &&
              slot.expended !== undefined &&
              slot.expended > slot.total;
            const errorId = `spell-slot-${level}-error`;
            return (
              <div
                key={level}
                className="rounded-lg border border-[var(--border)] p-4"
              >
                <h4 className="font-sans font-extrabold">Level {level}</h4>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <NumberField
                    id={`spell-slot-${level}-total`}
                    label={`Level ${level} slot total`}
                    min={0}
                    value={slot?.total}
                    onChange={(value) =>
                      onChange(updateSpellSlot(character, level, "total", value))
                    }
                  />
                  <NumberField
                    id={`spell-slot-${level}-expended`}
                    label={`Level ${level} slots expended`}
                    min={0}
                    value={slot?.expended}
                    ariaInvalid={invalid}
                    ariaDescribedBy={invalid ? errorId : undefined}
                    onChange={(value) =>
                      onChange(updateSpellSlot(character, level, "expended", value))
                    }
                  />
                </div>
                {invalid ? (
                  <p
                    id={errorId}
                    className="mt-2 font-sans text-sm font-bold text-[var(--danger)]"
                    role="alert"
                  >
                    Expended slots cannot exceed the level {level} total of {slot.total}.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="spells-heading">
        <h3 id="spells-heading" className="font-sans text-lg font-extrabold">
          Spells by level
        </h3>
        <p className="mt-1 font-sans text-sm text-[var(--muted)]">
          Spell names are required for PDF generation. The template does not support
          cantrip preparation or per-spell notes.
        </p>
        <div className="mt-4 space-y-5">
          {spellLevels.map((level) => {
            const spells = spellcasting?.spells?.[level] ?? [];
            const capacity = SPELL_PDF_CAPACITIES[Number(level)] ?? 0;
            const atCapacity = spells.length >= capacity;
            const headingId = `spell-level-${level}-heading`;
            const capacityId = `spell-level-${level}-capacity`;
            return (
              <section
                key={level}
                className="rounded-lg border border-[var(--border)] p-4"
                aria-labelledby={headingId}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 id={headingId} className="font-sans font-extrabold">
                      {levelLabel(level)}
                    </h4>
                    <p
                      id={capacityId}
                      className="mt-1 font-sans text-sm font-bold"
                      role="status"
                      aria-label={`${levelLabel(level)} spell capacity`}
                    >
                      {spells.length} of {capacity} PDF spell rows used
                      {atCapacity ? ". Remove a spell to add another." : "."}
                    </p>
                  </div>
                  <IconButton
                    icon="Plus"
                    label={addSpellLabel(level)}
                    disabled={atCapacity}
                    onClick={() => onChange(addSpell(character, level))}
                  />
                </div>

                <div className="mt-4 space-y-3">
                  {spells.length === 0 ? (
                    <p className="font-sans text-sm text-[var(--muted)]">
                      No {level === "0" ? "cantrips" : `level ${level} spells`} added.
                    </p>
                  ) : null}
                  {spells.map((spell, index) => {
                    const number = index + 1;
                    const itemLabel =
                      level === "0" ? `Cantrip ${number}` : `Level ${level} spell ${number}`;
                    const removeLabel = spell.name?.trim()
                      ? `Remove ${spell.name} ${
                          level === "0" ? "cantrip" : `level ${level} spell`
                        }`
                      : `Remove ${itemLabel.toLowerCase()}`;
                    return (
                      <div
                        key={index}
                        className="grid gap-3 rounded-md border border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
                      >
                        <TextField
                          id={`spell-${level}-${index}-name`}
                          label={`${itemLabel} name`}
                          value={spell.name}
                          onChange={(value) =>
                            onChange(updateSpell(character, level, index, "name", value))
                          }
                        />
                        {level === "0" ? null : (
                          <CheckboxField
                            id={`spell-${level}-${index}-prepared`}
                            label={`${itemLabel} prepared`}
                            checked={spell.prepared ?? false}
                            onChange={(prepared) =>
                              onChange(
                                updateSpell(character, level, index, "prepared", prepared),
                              )
                            }
                          />
                        )}
                        <IconButton
                          icon="TrashSimple"
                          label={removeLabel}
                          onClick={() => onChange(removeSpell(character, level, index))}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </fieldset>
  );
}
