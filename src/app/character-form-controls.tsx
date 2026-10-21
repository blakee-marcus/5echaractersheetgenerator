"use client";

import type { ChangeEvent } from "react";

import { parseOptionalInteger } from "./character-editor-state";
import * as Icons from "./icons";

export const inputClass =
  "min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-sans text-base text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/30";
export const fieldsetClass =
  "scroll-mt-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6";
export const labelClass =
  "block font-sans text-sm font-bold text-[var(--foreground)]";
export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-sans text-sm font-bold text-[var(--foreground)] transition hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50";

interface TextFieldProps {
  id: string;
  label: string;
  value: string | undefined;
  placeholder?: string;
  preserveEmpty?: boolean;
  onChange: (value: string | undefined) => void;
}

export function TextField({
  id,
  label,
  value,
  placeholder,
  preserveEmpty = false,
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
        onChange={(event) =>
          onChange(preserveEmpty ? event.target.value : event.target.value || undefined)
        }
      />
    </div>
  );
}

interface TextareaFieldProps {
  id: string;
  label: string;
  value: string | undefined;
  rows?: number;
  onChange: (value: string | undefined) => void;
}

export function TextareaField({
  id,
  label,
  value,
  rows = 3,
  onChange,
}: TextareaFieldProps) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <textarea
        className={`${inputClass} mt-1 resize-y`}
        id={id}
        rows={rows}
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
  disabled?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  onChange: (value: number | undefined) => void;
}

export function NumberField({
  id,
  label,
  value,
  min,
  max,
  disabled,
  ariaInvalid,
  ariaDescribedBy,
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
        disabled={disabled}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
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

export function CheckboxField({
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

interface IconButtonProps {
  icon: keyof typeof Icons;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: IconButtonProps) {
  const IconComponent = Icons[icon];

  return (
    <button
      className={secondaryButtonClass}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
    >
      <IconComponent
        className="size-4 shrink-0"
        weight="regular"
        strokeWidth={1.5}
      />
      <span className="font-sans text-sm">{label}</span>
    </button>
  );
}
