/**
 * Styled XLSX exports with Arabic RTL support.
 * Backwards-compatible with the old exportToCSV API — call sites pass the same
 * { key, label } headers and now get a nicely formatted .xlsx file.
 */
import ExcelJS from 'exceljs';

export interface ExportHeader<T> {
  key: keyof T;
  label: string;
  /** Hints for formatting. Omit for auto-detect. */
  type?: 'text' | 'number' | 'currency' | 'badge' | 'date';
  /** Optional column width override (Excel units). */
  width?: number;
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const isNumeric = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const badgeFill = (raw: unknown): string | null => {
  const v = String(raw ?? '').toLowerCase();
  if (!v) return null;
  const green = ['delivered', 'تم التسليم', 'paid', 'مدفوع', 'active', 'نشط', 'approved', 'موافق', 'completed'];
  const red = ['cancelled', 'ملغي', 'returned', 'راجع', 'failed', 'فشل', 'rejected', 'مرفوض', 'inactive'];
  const amber = ['pending', 'قيد الانتظار', 'processing', 'قيد المراجعة', 'قيد التجهيز', 'awaiting', 'مؤجل'];
  const blue = ['shipped', 'تم الشحن', 'printed', 'تم التجهيز', 'resent'];
  if (green.some(k => v.includes(k))) return 'FFDCFCE7';
  if (red.some(k => v.includes(k))) return 'FFFEE2E2';
  if (amber.some(k => v.includes(k))) return 'FFFEF3C7';
  if (blue.some(k => v.includes(k))) return 'FFDBEAFE';
  return null;
};

const badgeText = (raw: unknown): string | null => {
  const v = String(raw ?? '').toLowerCase();
  if (!v) return null;
  const green = ['delivered', 'تم التسليم', 'paid', 'مدفوع', 'active', 'نشط', 'approved', 'موافق', 'completed'];
  const red = ['cancelled', 'ملغي', 'returned', 'راجع', 'failed', 'فشل', 'rejected', 'مرفوض', 'inactive'];
  const amber = ['pending', 'قيد الانتظار', 'processing', 'قيد المراجعة', 'قيد التجهيز', 'awaiting', 'مؤجل'];
  const blue = ['shipped', 'تم الشحن', 'printed', 'تم التجهيز', 'resent'];
  if (green.some(k => v.includes(k))) return 'FF166534';
  if (red.some(k => v.includes(k))) return 'FF991B1B';
  if (amber.some(k => v.includes(k))) return 'FF92400E';
  if (blue.some(k => v.includes(k))) return 'FF1E40AF';
  return null;
};

export const exportToExcel = async <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers: ExportHeader<T>[],
  options?: { title?: string }
): Promise<void> => {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const title = options?.title || filename;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lovable';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title.slice(0, 31), {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 3 }],
    properties: { defaultRowHeight: 22 },
  });

  const colCount = headers.length;

  // Auto-detect column types when not provided
  const resolvedTypes: NonNullable<ExportHeader<T>['type']>[] = headers.map(h => {
    if (h.type) return h.type;
    const allNumeric = data.every(row => {
      const v = row[h.key];
      if (v === null || v === undefined || v === '') return true;
      return isNumeric(v);
    }) && data.some(row => isNumeric(row[h.key]));
    return allNumeric ? 'number' : 'text';
  });

  // Row 1: title (merged)
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Cairo', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
  sheet.getRow(1).height = 38;

  // Row 2: meta info
  sheet.mergeCells(2, 1, 2, colCount);
  const metaCell = sheet.getCell(2, 1);
  const nowStr = new Intl.DateTimeFormat('ar-IQ', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date());
  metaCell.value = `تم التصدير: ${nowStr}  •  عدد السجلات: ${data.length.toLocaleString('ar-IQ')}`;
  metaCell.font = { name: 'Cairo', size: 10, color: { argb: 'FF64748B' }, italic: true };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
  sheet.getRow(2).height = 22;

  // Row 3: headers
  const headerRow = sheet.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.label;
    cell.font = { name: 'Cairo', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF4F46E5' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });
  headerRow.height = 30;

  // Body rows
  const thinBorder = { style: 'thin' as const, color: { argb: 'FFE2E8F0' } };
  data.forEach((row, idx) => {
    const excelRow = sheet.getRow(idx + 4);
    const zebra = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    headers.forEach((h, i) => {
      const cell = excelRow.getCell(i + 1);
      const raw = row[h.key];
      const type = resolvedTypes[i];

      // Value + format
      if (type === 'currency') {
        const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '0'));
        cell.value = Number.isFinite(num) ? num : 0;
        cell.numFmt = '#,##0" د.ع";[Red](#,##0" د.ع")';
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (type === 'number') {
        const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
        cell.value = Number.isFinite(num) ? num : (raw as any ?? '');
        cell.numFmt = '#,##0;[Red](#,##0)';
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (type === 'date') {
        cell.value = raw as any;
        cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
      } else if (type === 'badge') {
        cell.value = String(raw ?? '');
        const bg = badgeFill(raw);
        const fg = badgeText(raw);
        if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { name: 'Cairo', size: 11, bold: true, color: { argb: fg || 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
      } else {
        cell.value = raw === null || raw === undefined ? '' : String(raw);
        cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
      }

      // Base styling (don't overwrite badge font)
      if (type !== 'badge') {
        cell.font = { name: 'Cairo', size: 11, color: { argb: 'FF0F172A' } };
      }
      if (!cell.fill || (type !== 'badge')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebra } };
      }
      cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
    });
    excelRow.height = 22;
  });

  // Column widths (auto from content, capped)
  headers.forEach((h, i) => {
    if (h.width) {
      sheet.getColumn(i + 1).width = h.width;
      return;
    }
    const headerLen = h.label.length;
    let maxLen = headerLen;
    for (const row of data) {
      const v = row[h.key];
      const s = v === null || v === undefined ? '' : String(v);
      if (s.length > maxLen) maxLen = s.length;
    }
    sheet.getColumn(i + 1).width = Math.min(48, Math.max(12, maxLen + 4));
  });

  // Autofilter on header row
  sheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: colCount },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const timestamp = new Date().toISOString().split('T')[0];
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${filename}_${timestamp}.xlsx`);
};

/**
 * Backwards-compatible alias. Existing callers keep working; output is now a
 * styled .xlsx file instead of raw CSV.
 */
export const exportToCSV = exportToExcel;

/**
 * Format date for export (kept for callers that pre-format strings).
 */
export const formatDateForExport = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    return new Intl.DateTimeFormat('ar-IQ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

/**
 * Format currency for export (kept for callers that pre-format strings).
 */
export const formatCurrencyForExport = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '0';
  return `${amount.toLocaleString('ar-IQ')} د.ع`;
};
