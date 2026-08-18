// Client-side mirror of services/logistics/app/services/form_schema.py.
//
// The backend rejects a definition that carries keys which do not apply to the
// field's type (`options` on a text field, `min` on a date, …), so the builder
// keeps every control in local state and `normalizeField` strips it down to
// exactly what the server accepts on the way out. `validateFormSchema`
// reproduces the server's rules so mistakes surface in the form, not as a 422.

import type { FormFieldSpec, FormFieldType } from "./types";

export const MAX_FIELDS = 50;
export const MAX_OPTIONS = 100;
export const KEY_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;

const TEXTUAL: FormFieldType[] = ["text", "textarea", "phone"];
const NUMERIC: FormFieldType[] = ["integer", "number"];
const CHOICE: FormFieldType[] = ["select", "multiselect"];

/** form_schema.py _DEFAULT_MAX_LENGTH — also the hard cap the server enforces. */
export const MAX_LENGTH_CAP: Partial<Record<FormFieldType, number>> = {
  text: 500,
  textarea: 5000,
  phone: 30,
};

export const isTextual = (t: FormFieldType) => TEXTUAL.includes(t);
export const isNumeric = (t: FormFieldType) => NUMERIC.includes(t);
export const isChoice = (t: FormFieldType) => CHOICE.includes(t);

/** Derive a wire-legal key from a human label. */
export function slugifyKey(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[^a-z]+/, "")
    .slice(0, 50);
  return slug || "field";
}

/** The builder's working shape: every control present, applicability decided later. */
export interface FieldDraft {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  min: string;
  max: string;
  maxLength: string;
  helpText: string;
  /** false once the admin edits the key by hand, so we stop tracking the label. */
  keyAuto: boolean;
}

export function emptyDraft(): FieldDraft {
  return {
    key: "",
    label: "",
    type: "text",
    required: false,
    options: [],
    min: "",
    max: "",
    maxLength: "",
    helpText: "",
    keyAuto: true,
  };
}

export function draftFromSpec(spec: FormFieldSpec): FieldDraft {
  return {
    key: spec.key,
    label: spec.label ?? spec.key,
    type: spec.type,
    required: !!spec.required,
    options: spec.options ? [...spec.options] : [],
    min: spec.min === undefined ? "" : String(spec.min),
    max: spec.max === undefined ? "" : String(spec.max),
    maxLength: spec.max_length === undefined ? "" : String(spec.max_length),
    helpText: spec.help_text ?? "",
    keyAuto: false,
  };
}

/** Strip a draft down to the keys the server accepts for that field type. */
export function normalizeField(draft: FieldDraft): FormFieldSpec {
  const key = draft.key.trim() || slugifyKey(draft.label);
  const spec: FormFieldSpec = {
    key,
    label: draft.label.trim() || key,
    type: draft.type,
    required: draft.required,
  };
  if (draft.helpText.trim()) spec.help_text = draft.helpText.trim();

  if (isChoice(draft.type)) {
    spec.options = draft.options.map((o) => o.trim()).filter(Boolean);
  }
  if (isNumeric(draft.type)) {
    if (draft.min.trim() !== "") spec.min = Number(draft.min);
    if (draft.max.trim() !== "") spec.max = Number(draft.max);
  }
  if (isTextual(draft.type) && draft.maxLength.trim() !== "") {
    spec.max_length = Number(draft.maxLength);
  }
  return spec;
}

/** Per-field problems, keyed by the field's index in the builder. */
export function validateFormSchema(
  drafts: FieldDraft[],
): Record<number, string> {
  const errors: Record<number, string> = {};
  const seen = new Map<string, number>();

  drafts.forEach((draft, index) => {
    const fail = (message: string) => {
      if (!errors[index]) errors[index] = message;
    };

    if (!draft.label.trim()) fail("Give this field a label.");

    const key = draft.key.trim() || slugifyKey(draft.label);
    if (!KEY_PATTERN.test(key)) {
      fail(
        "Field key must be lower snake_case, start with a letter, max 50 characters.",
      );
    } else if (seen.has(key)) {
      fail(`Duplicate field key “${key}” — already used by field ${seen.get(key)! + 1}.`);
    } else {
      seen.set(key, index);
    }

    if (isChoice(draft.type)) {
      const options = draft.options.map((o) => o.trim()).filter(Boolean);
      if (options.length === 0) fail("Add at least one option.");
      else if (options.length > MAX_OPTIONS)
        fail(`At most ${MAX_OPTIONS} options.`);
      else if (new Set(options).size !== options.length)
        fail("Options must be unique.");
    }

    if (isNumeric(draft.type)) {
      const min = draft.min.trim();
      const max = draft.max.trim();
      if (min !== "" && Number.isNaN(Number(min))) fail("Minimum must be a number.");
      else if (max !== "" && Number.isNaN(Number(max)))
        fail("Maximum must be a number.");
      else if (min !== "" && max !== "" && Number(min) > Number(max))
        fail("Minimum is greater than maximum.");
    }

    if (isTextual(draft.type) && draft.maxLength.trim() !== "") {
      const cap = MAX_LENGTH_CAP[draft.type]!;
      const value = Number(draft.maxLength);
      if (!Number.isInteger(value) || value <= 0)
        fail("Max length must be a positive whole number.");
      else if (value > cap) fail(`Max length for this type cannot exceed ${cap}.`);
    }
  });

  if (drafts.length > MAX_FIELDS) {
    errors[MAX_FIELDS] = `A category may define at most ${MAX_FIELDS} fields.`;
  }
  return errors;
}

/** Render a stored answer for display in the request detail panel. */
export function formatAnswer(spec: FormFieldSpec | undefined, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (spec?.type === "date" && typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  return String(value);
}
