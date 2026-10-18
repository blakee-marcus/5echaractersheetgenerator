import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
  PDFOptionList,
  PDFButton,
  PDFSignature,
} from 'pdf-lib';

function typeOf(field) {
  if (field instanceof PDFTextField) return 'text';
  if (field instanceof PDFCheckBox) return 'checkbox';
  if (field instanceof PDFRadioGroup) return 'radio';
  if (field instanceof PDFDropdown) return 'dropdown';
  if (field instanceof PDFOptionList) return 'option-list';
  if (field instanceof PDFButton) return 'button';
  if (field instanceof PDFSignature) return 'signature';
  return field.constructor.name;
}

function safe(call) {
  try { return call(); } catch { return undefined; }
}

(async () => {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input || !output) throw new Error('usage: node inspect-pdf.js INPUT OUTPUT');
  const bytes = fs.readFileSync(input);
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const form = pdf.getForm();
  const pages = pdf.getPages();
  const pageRefToNumber = new Map(pages.map((page, index) => [page.ref.toString(), index + 1]));
  const annotRefToPage = new Map();
  pages.forEach((page, index) => {
    const annots = safe(() => page.node.Annots());
    if (!annots) return;
    for (const ref of annots.asArray()) annotRefToPage.set(ref.toString(), index + 1);
  });

  const fields = form.getFields().map((field) => {
    const widgets = safe(() => field.acroField.getWidgets()) || [];
    const widgetDetails = widgets.map((widget) => {
      const pageRef = safe(() => widget.P());
      const widgetRef = widget.ref;
      const page = (pageRef && pageRefToNumber.get(pageRef.toString())) ||
        (widgetRef && annotRefToPage.get(widgetRef.toString())) || null;
      const rect = safe(() => widget.getRectangle());
      return {
        page,
        rectangle: rect ? {
          x: Number(rect.x.toFixed(3)),
          y: Number(rect.y.toFixed(3)),
          width: Number(rect.width.toFixed(3)),
          height: Number(rect.height.toFixed(3)),
        } : null,
      };
    });
    const type = typeOf(field);
    const record = {
      name: field.getName(),
      type,
      pages: [...new Set(widgetDetails.map((w) => w.page).filter(Boolean))],
      widgets: widgetDetails,
    };
    if (type === 'text') {
      record.multiline = safe(() => field.isMultiline());
      record.password = safe(() => field.isPassword());
      record.fileSelector = safe(() => field.isFileSelector());
      record.maxLength = safe(() => field.getMaxLength()) ?? null;
    }
    if (type === 'checkbox') record.checked = safe(() => field.isChecked());
    if (type === 'radio' || type === 'dropdown' || type === 'option-list') {
      record.options = safe(() => field.getOptions()) || [];
    }
    return record;
  });

  const counts = fields.reduce((acc, field) => {
    acc[field.type] = (acc[field.type] || 0) + 1;
    return acc;
  }, {});
  const unresolvedPageFields = fields.filter((field) => field.pages.length === 0).map((field) => field.name);
  const result = {
    sourceFile: path.basename(input),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    byteLength: bytes.length,
    pageCount: pages.length,
    pageSizes: pages.map((page, index) => ({ page: index + 1, ...page.getSize() })),
    fieldCount: fields.length,
    fieldTypeCounts: counts,
    unresolvedPageFields,
    fields,
  };
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({
    pageCount: result.pageCount,
    fieldCount: result.fieldCount,
    fieldTypeCounts: result.fieldTypeCounts,
    unresolvedPageFields,
    buttons: fields.filter((field) => field.type === 'button').map((field) => ({ name: field.name, pages: field.pages })),
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
