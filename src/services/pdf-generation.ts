import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";

import {
  characterSheetSchema,
  finalizedCharacterSheetSchema,
} from "../domain/character-sheet";
import {
  mapCharacterToPdfFields,
  type PdfMappingIssue,
} from "../domain/pdf-field-mapping";

const TEMPLATE_PATH = resolve(
  process.cwd(),
  "assets/5E_CharacterSheet_Fillable.pdf",
);

export interface GenerateCharacterSheetOptions {
  flatten?: boolean;
  validationMode?: "draft" | "finalized";
}

export class PdfGenerationError extends Error {
  readonly issues: PdfMappingIssue[];

  constructor(message: string, issues: PdfMappingIssue[]) {
    super(message);
    this.name = "PdfGenerationError";
    this.issues = issues;
  }
}

export async function generateCharacterSheet(
  input: unknown,
  options: GenerateCharacterSheetOptions = {},
): Promise<Uint8Array> {
  const schema =
    options.validationMode === "finalized"
      ? finalizedCharacterSheetSchema
      : characterSheetSchema;
  const validation = schema.safeParse(input);
  if (!validation.success) {
    throw new PdfGenerationError(
      "Character data failed structural validation",
      validation.error.issues.flatMap((issue) => {
        const paths =
          issue.code === "unrecognized_keys"
            ? issue.keys.map((key) => [...issue.path, key])
            : [issue.path];
        return paths.map((path) => ({
          path: toJsonPointer(path),
          code: "INVALID_CHARACTER_DATA",
          message: issue.message,
        }));
      }),
    );
  }

  const character = validation.data;
  const mapping = mapCharacterToPdfFields(character);
  if (mapping.issues.length > 0) {
    throw new PdfGenerationError(
      "Character cannot be represented by the PDF template",
      mapping.issues,
    );
  }

  const templateBytes = await readFile(TEMPLATE_PATH);
  const pdf = await PDFDocument.load(templateBytes, { updateMetadata: false });
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const update of mapping.updates) {
    if (update.type === "text") {
      try {
        for (const line of update.value.split(/\r?\n/u)) {
          font.encodeText(line);
        }
      } catch {
        throw new PdfGenerationError(
          `Field ${JSON.stringify(update.field)} contains characters unsupported by Helvetica`,
          [
            {
              path: `/pdfFields/${escapeJsonPointer(update.field)}`,
              code: "PDF_UNSUPPORTED_UNICODE",
              message: `Field ${JSON.stringify(update.field)} contains characters unsupported by Helvetica`,
            },
          ],
        );
      }
      const textField = form.getTextField(update.field);
      const fontSize = fontSizeFor(update.field);
      const widget = textField.acroField.getWidgets()[0];
      const rectangle = widget?.getRectangle();
      const fits =
        rectangle === undefined ||
        (textField.isMultiline()
          ? multilineTextFits(
              update.value,
              rectangle.width - 4,
              rectangle.height - 4,
              fontSize,
              font,
            )
          : font.widthOfTextAtSize(update.value, fontSize) <= rectangle.width - 4);
      if (!fits) {
        throw new PdfGenerationError(
          `Text does not fit in PDF field ${JSON.stringify(update.field)}`,
          [
            {
              path: `/pdfFields/${escapeJsonPointer(update.field)}`,
              code: "PDF_TEXT_OVERFLOW",
              message: `Text does not fit in PDF field ${JSON.stringify(update.field)} at the documented ${fontSize}pt appearance size`,
            },
          ],
        );
      }
      textField.acroField.setDefaultAppearance(
        `/${font.name} ${fontSize} Tf 0 g`,
      );
      textField.setText(update.value);
    } else if (update.checked) {
      form.getCheckBox(update.field).check();
    } else {
      form.getCheckBox(update.field).uncheck();
    }
  }

  form.updateFieldAppearances(font);
  if (options.flatten === true) {
    form.flatten({ updateFieldAppearances: false });
  }

  return pdf.save({ updateFieldAppearances: false });
}

function escapeJsonPointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function toJsonPointer(path: readonly PropertyKey[]): string {
  return path.length === 0
    ? "/"
    : `/${path.map((segment) => escapeJsonPointer(String(segment))).join("/")}`;
}

const NARRATIVE_FIELDS = new Set([
  "PersonalityTraits ",
  "Ideals",
  "Bonds",
  "Flaws",
  "AttacksSpellcasting",
  "ProficienciesLang",
  "Equipment",
  "Features and Traits",
  "Backstory",
  "Allies",
  "Feat+Traits",
  "Treasure",
]);

const LARGE_VALUE_FIELDS = new Set([
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA",
  "AC",
  "Initiative",
  "Speed",
  "HPCurrent",
  "HPTemp",
]);

const ABILITY_MODIFIER_FIELDS = new Set([
  "STRmod",
  "DEXmod ",
  "CONmod",
  "INTmod",
  "WISmod",
  "CHamod",
]);

const SKILL_BONUS_FIELDS = new Set([
  "Acrobatics",
  "Animal",
  "Arcana",
  "Athletics",
  "Deception ",
  "History ",
  "Insight",
  "Intimidation",
  "Investigation ",
  "Medicine",
  "Nature",
  "Perception ",
  "Performance",
  "Persuasion",
  "Religion",
  "SleightofHand",
  "Stealth ",
  "Survival",
]);

function fontSizeFor(field: string): number {
  if (NARRATIVE_FIELDS.has(field)) return 8;
  if (LARGE_VALUE_FIELDS.has(field)) return 18;
  if (ABILITY_MODIFIER_FIELDS.has(field)) return 14;
  if (field.startsWith("ST ")) return 5;
  if (SKILL_BONUS_FIELDS.has(field)) return 7;
  if (field.startsWith("Spells ")) return 7;
  if (field.startsWith("Slots")) return 9;
  if (field.startsWith("Spellcasting") || field.startsWith("SpellSave") || field.startsWith("SpellAtk")) return 12;
  if (field.startsWith("Wpn") && field.includes("Damage")) return 6;
  if (field.startsWith("Wpn")) return 8;
  return 9;
}

function multilineTextFits(
  value: string,
  width: number,
  height: number,
  fontSize: number,
  font: PDFFont,
): boolean {
  const maxLines = Math.floor(height / (fontSize * 1.2));
  let lineCount = 0;

  for (const paragraph of value.split(/\r?\n/u)) {
    const words = paragraph.split(/\s+/u).filter(Boolean);
    if (words.length === 0) {
      lineCount += 1;
      continue;
    }

    let line = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(word, fontSize) > width) return false;
      const candidate = line === "" ? word : `${line} ${word}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= width) {
        line = candidate;
      } else {
        lineCount += 1;
        line = word;
      }
    }
    lineCount += 1;
    if (lineCount > maxLines) return false;
  }

  return lineCount <= maxLines;
}
