import type { PdfFieldUpdate } from "./pdf-field-mapping";

export interface PdfInventoryField {
  name: string;
  type: string;
}

export interface PdfMappingVerificationIssue {
  field: string;
  code: "PDF_FIELD_MISSING" | "PDF_FIELD_TYPE_MISMATCH" | "PDF_FIELD_MAPPING_CONFLICT";
  message: string;
}

/**
 * Verifies a complete representative mapping result against the Phase 1
 * inventory. The caller supplies the inventory so this module stays pure and
 * performs no filesystem access.
 */
export function verifyPdfFieldUpdates(
  updates: readonly PdfFieldUpdate[],
  inventory: readonly PdfInventoryField[],
): PdfMappingVerificationIssue[] {
  const issues: PdfMappingVerificationIssue[] = [];
  const inventoryByName = new Map(inventory.map((field) => [field.name, field]));
  const seen = new Map<string, PdfFieldUpdate>();

  for (const update of updates) {
    const prior = seen.get(update.field);
    if (prior) {
      issues.push({
        field: update.field,
        code: "PDF_FIELD_MAPPING_CONFLICT",
        message: `PDF field ${JSON.stringify(update.field)} has more than one mapping update`,
      });
      continue;
    }
    seen.set(update.field, update);

    const inventoryField = inventoryByName.get(update.field);
    if (!inventoryField) {
      issues.push({
        field: update.field,
        code: "PDF_FIELD_MISSING",
        message: `Mapped PDF field ${JSON.stringify(update.field)} does not exist in the Phase 1 inventory`,
      });
      continue;
    }
    if (inventoryField.type !== update.type) {
      issues.push({
        field: update.field,
        code: "PDF_FIELD_TYPE_MISMATCH",
        message: `Mapped PDF field ${JSON.stringify(update.field)} expects ${inventoryField.type}, not ${update.type}`,
      });
    }
  }

  return issues;
}
