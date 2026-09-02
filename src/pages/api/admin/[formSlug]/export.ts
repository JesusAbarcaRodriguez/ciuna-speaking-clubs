import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { db } from '../../../../db/client';
import { forms, questions, responses } from '../../../../db/schema';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { formSlug } = params;
  const [form] = await db.select().from(forms).where(eq(forms.slug, formSlug!));

  if (!form) {
    return new Response(JSON.stringify({ error: 'Formulario no encontrado.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.formId, form.id))
    .orderBy(questions.order);
  const responseRows = await db
    .select()
    .from(responses)
    .where(eq(responses.formId, form.id))
    .orderBy(desc(responses.submittedAt));

  const answerable = questionRows.filter((q) => q.type !== 'info');
  const headers = ['Marca temporal', ...answerable.map((q) => q.label)];

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet('Respuestas', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = headers.map((h) => ({ header: h, key: h }));

  for (const r of responseRows) {
    const row: Record<string, string> = {
      'Marca temporal': new Date(r.submittedAt).toLocaleString('es-CR'),
    };
    for (const q of answerable) row[q.label] = r.answers[q.label] ?? '';
    ws.addRow(row);
  }

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B3F9D' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 22;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

  ws.columns.forEach((col) => {
    let max = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 60);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${form.slug}-respuestas-${fecha}.xlsx"`,
    },
  });
};
