import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {
  GeneratedReportFile,
  ReportFormat,
  ReportRow,
  ScheduledReportData,
} from './types';

const TITLE_OVERRIDES: Record<string, string> = {
  trip_pnl: 'Trip P&L',
  ageing: 'Outstanding Payment Ageing',
  utilization: 'Fleet Utilization',
};

export async function generateReportFile(
  data: ScheduledReportData,
  format: ReportFormat,
): Promise<GeneratedReportFile> {
  if (format === 'pdf') return generatePdf(data);
  return generateXlsx(data);
}

async function generateXlsx(data: ScheduledReportData): Promise<GeneratedReportFile> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fleetora Report Worker';
  workbook.created = new Date(data.generated_at);
  workbook.modified = new Date(data.generated_at);
  workbook.company = data.company_name;
  workbook.subject = reportTitle(data.report_type);

  const overview = workbook.addWorksheet('Overview', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 20 },
  });
  overview.columns = [{ width: 28 }, { width: 34 }];
  overview.addRow([reportTitle(data.report_type)]);
  overview.mergeCells('A1:B1');
  const titleCell = overview.getCell('A1');
  titleCell.font = { bold: true, size: 20, color: { argb: 'FF0F2A55' } };
  titleCell.alignment = { vertical: 'middle' };
  overview.getRow(1).height = 32;
  overview.addRow(['Company', data.company_name]);
  overview.addRow(['Period', `${data.period.from} to ${data.period.to}`]);
  overview.addRow(['Generated at', data.generated_at]);
  overview.addRow(['Records', data.rows.length]);
  overview.addRow([]);
  overview.addRow(['Summary metric', 'Value']);

  for (const [key, value] of Object.entries(data.summary ?? {})) {
    overview.addRow([humanize(key), cellValue(value)]);
  }
  styleHeader(overview.getRow(7));

  const rows = normalizeRows(data.rows);
  const dataSheet = workbook.addWorksheet('Report data', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 19 },
  });
  const keys = collectKeys(rows);

  if (keys.length === 0) {
    dataSheet.addRow(['No records found for this period']);
  } else {
    dataSheet.columns = keys.map((key) => ({
      header: humanize(key),
      key,
      width: columnWidth(key, rows),
    }));
    for (const row of rows) dataSheet.addRow(row);
    styleHeader(dataSheet.getRow(1));
    dataSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, dataSheet.rowCount), column: keys.length },
    };
    dataSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8FD' } };
      }
    });
  }

  const output = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(output),
    extension: 'xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    rowCount: data.rows.length,
  };
}

async function generatePdf(data: ScheduledReportData): Promise<GeneratedReportFile> {
  const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)));
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.once('end', () => resolve(Buffer.concat(chunks)));
    doc.once('error', reject);
  });

  doc.info.Title = `${reportTitle(data.report_type)} - ${data.company_name}`;
  doc.info.Author = 'Fleetora Report Worker';
  doc.fillColor('#0F2A55').font('Helvetica-Bold').fontSize(20).text(reportTitle(data.report_type));
  doc.moveDown(0.35);
  doc.fillColor('#445D7C').font('Helvetica').fontSize(10);
  doc.text(data.company_name);
  doc.text(`Period: ${data.period.from} to ${data.period.to}`);
  doc.text(`Generated: ${data.generated_at}`);
  doc.moveDown();

  doc.fillColor('#0F2A55').font('Helvetica-Bold').fontSize(12).text('Summary');
  doc.moveDown(0.35);
  for (const [key, value] of Object.entries(data.summary ?? {})) {
    ensurePdfSpace(doc, 24);
    doc.fillColor('#243B5A').font('Helvetica-Bold').fontSize(9).text(`${humanize(key)}: `, { continued: true });
    doc.fillColor('#111827').font('Helvetica').text(displayValue(value));
  }

  doc.moveDown();
  doc.fillColor('#0F2A55').font('Helvetica-Bold').fontSize(12).text(`Report data (${data.rows.length})`);
  doc.moveDown(0.45);

  if (data.rows.length === 0) {
    doc.fillColor('#64748B').font('Helvetica').fontSize(10).text('No records found for this period.');
  } else {
    data.rows.forEach((row, index) => {
      const entries = Object.entries(row);
      ensurePdfSpace(doc, Math.min(150, 30 + entries.length * 15));
      const headingY = doc.y;
      doc.roundedRect(42, headingY, doc.page.width - 84, 20, 3).fill('#EEF4FF');
      doc.fillColor('#185ADB').font('Helvetica-Bold').fontSize(9).text(`Record ${index + 1}`, 50, headingY + 6);
      doc.moveDown(0.4);
      for (const [key, value] of entries) {
        ensurePdfSpace(doc, 20);
        doc.fillColor('#445D7C').font('Helvetica-Bold').fontSize(8).text(`${humanize(key)}: `, { continued: true });
        doc.fillColor('#111827').font('Helvetica').text(displayValue(value));
      }
      doc.moveDown(0.65);
    });
  }

  const pageRange = doc.bufferedPageRange();
  for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    doc.fillColor('#7C8DA6').font('Helvetica').fontSize(8).text(
      `Fleetora • Page ${pageIndex + 1} of ${pageRange.count}`,
      42,
      doc.page.height - 28,
      { width: doc.page.width - 84, align: 'right' },
    );
  }

  doc.end();
  return {
    buffer: await completed,
    extension: 'pdf',
    contentType: 'application/pdf',
    rowCount: data.rows.length,
  };
}

function reportTitle(reportType: string) {
  return TITLE_OVERRIDES[reportType] ?? humanize(reportType);
}

function normalizeRows(rows: ReportRow[]): Record<string, string | number | boolean | null>[] {
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, cellValue(value)]),
  ));
}

function collectKeys(rows: Record<string, unknown>[]) {
  const keys = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) keys.add(key);
  return [...keys];
}

function cellValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function displayValue(value: unknown) {
  const normalized = cellValue(value);
  return normalized === null ? '-' : String(normalized);
}

function humanize(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function columnWidth(key: string, rows: Record<string, unknown>[]) {
  const longest = rows.reduce(
    (length, row) => Math.max(length, displayValue(row[key]).length),
    humanize(key).length,
  );
  return Math.min(45, Math.max(12, longest + 2));
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF185ADB' } };
  row.alignment = { vertical: 'middle' };
  row.height = 23;
}

function ensurePdfSpace(doc: PDFKit.PDFDocument, requiredHeight: number) {
  if (doc.y + requiredHeight > doc.page.height - 48) doc.addPage();
}
