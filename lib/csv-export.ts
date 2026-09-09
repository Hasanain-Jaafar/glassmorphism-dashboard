/** Generic CSV export for a page's already-filtered table data — used by the Customers/Quotations/Deals/Invoices "Export CSV" buttons. */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number;
};

function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(String(c.value(row)))).join(",")
  );
  // Leading BOM so Excel (still the most common opener) detects UTF-8
  // instead of misreading accented characters as another codepage.
  return "﻿" + [header, ...lines].join("\r\n");
}

/** Triggers a browser download — client-side only, no server round trip needed for table-sized exports. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRowsAsCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[]
): void {
  downloadCsv(filename, toCsv(rows, columns));
}
