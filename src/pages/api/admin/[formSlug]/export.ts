import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { db } from '../../../../db/client';
import { forms, questions, responses } from '../../../../db/schema';

export const prerender = false;

function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'club'
  );
}

// Los nombres de hoja de Excel no admiten \ / ? * [ ] : y tienen un máximo
// de 31 caracteres; hay que garantizar además que no se repitan.
function sheetName(text: string, used: Set<string>): string {
  const base = text.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Club';
  let name = base;
  let i = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${i})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
    i++;
  }
  used.add(name.toLowerCase());
  return name;
}

function buildSheet(
  ws: ExcelJS.Worksheet,
  headers: string[],
  answerable: Array<{ label: string }>,
  rows: Array<{ submittedAt: Date; answers: Record<string, string> }>,
) {
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.columns = headers.map((h) => ({ header: h, key: h }));

  for (const r of rows) {
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
}

export const GET: APIRoute = async ({ params, url }) => {
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

  // La pregunta de tipo "radio" es, por convención de este proyecto, la
  // pregunta de club/horario (ver sql/006_scope_triggers_to_form.sql).
  const clubQuestion = questionRows.find((q) => q.type === 'radio') ?? null;
  const club = url.searchParams.get('club');
  const groupByClub = url.searchParams.get('groupBy') === 'club';

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const fecha = new Date().toISOString().slice(0, 10);
  let filename = `${form.slug}-respuestas-${fecha}.xlsx`;

  if (groupByClub && clubQuestion) {
    const groups = new Map<string, typeof responseRows>();
    for (const opt of clubQuestion.options || []) groups.set(opt, []);
    for (const r of responseRows) {
      const val = r.answers[clubQuestion.label];
      if (val === undefined || val === '') continue;
      if (!groups.has(val)) groups.set(val, []);
      groups.get(val)!.push(r);
    }

    const used = new Set<string>();
    for (const [clubName, rows] of groups) {
      if (rows.length === 0) continue;
      const ws = wb.addWorksheet(sheetName(clubName, used));
      buildSheet(ws, headers, answerable, rows);
    }
    if (wb.worksheets.length === 0) {
      wb.addWorksheet('Respuestas');
    }
    filename = `${form.slug}-por-club-${fecha}.xlsx`;
  } else {
    let rows = responseRows;
    if (club && clubQuestion) {
      rows = responseRows.filter((r) => r.answers[clubQuestion.label] === club);
      filename = `${form.slug}-${slugify(club)}-${fecha}.xlsx`;
    }
    const ws = wb.addWorksheet('Respuestas');
    buildSheet(ws, headers, answerable, rows);
  }

  const buffer = await wb.xlsx.writeBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
};
