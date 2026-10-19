import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { generateCharacterSheet } from "../services/pdf-generation";
import { exampleCharacter } from "./example-character";

describe("exampleCharacter", () => {
  it("generates a valid editable three-page character sheet", async () => {
    const pdf = await PDFDocument.load(
      await generateCharacterSheet(exampleCharacter),
    );

    expect(pdf.getPageCount()).toBe(3);
    expect(pdf.getForm().getFields()).toHaveLength(334);
    expect(pdf.getForm().getTextField("CharacterName").getText()).toBe(
      exampleCharacter.identity.characterName,
    );
  });
});
