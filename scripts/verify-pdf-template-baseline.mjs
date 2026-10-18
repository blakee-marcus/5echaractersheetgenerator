import fs from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

(async () => {
  const input = process.argv[2];
  const output = process.argv[3];
  const source = fs.readFileSync(input);
  const pdf = await PDFDocument.load(source, { updateMetadata: false });
  const form = pdf.getForm();
  const field = form.getTextField('CharacterName');
  field.setText('Phase 1 Baseline');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  const generated = await pdf.save();
  fs.writeFileSync(output, generated);

  const reopened = await PDFDocument.load(fs.readFileSync(output), { updateMetadata: false });
  const value = reopened.getForm().getTextField('CharacterName').getText();
  const result = {
    outputBytes: generated.length,
    pageCount: reopened.getPageCount(),
    fieldCount: reopened.getForm().getFields().length,
    characterName: value,
    valid: reopened.getPageCount() === 3 && value === 'Phase 1 Baseline',
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
