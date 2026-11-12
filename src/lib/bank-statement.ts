import { parseCsv } from "@/lib/csv";

/** Reads a bank statement (CSV, XLSX or text-based PDF) into rows of cells; first row is the header. */
export async function readStatementFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return readPdf(file);
  if (name.endsWith(".xlsx")) return readXlsx(file);
  if (name.endsWith(".xls")) {
    throw new Error("Old .xls files aren't supported — save it as .xlsx or CSV and upload again");
  }
  return parseCsv(await file.text());
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

async function readXlsx(file: File): Promise<string[][]> {
  const { readSheet } = await import("read-excel-file/browser");
  const data = await readSheet(file);
  return data
    .map((row) => row.map(cellToString))
    .filter((row) => row.some((c) => c.trim() !== ""));
}

type PdfItem = { str: string; x: number; width: number; y: number };

async function readPdf(file: File): Promise<string[][]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;

  // Group text items into visual lines per page.
  const lines: PdfItem[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: PdfItem[] = [];
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      items.push({ str: it.str.trim(), x: it.transform[4], width: it.width, y: it.transform[5] });
    }
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    let current: PdfItem[] = [];
    for (const item of items) {
      if (current.length && Math.abs(current[0].y - item.y) > 3) {
        lines.push(current.sort((a, b) => a.x - b.x));
        current = [];
      }
      current.push(item);
    }
    if (current.length) lines.push(current.sort((a, b) => a.x - b.x));
  }

  const headerLineIdx = lines.findIndex((line) => {
    const text = line.map((i) => i.str).join(" ").toLowerCase();
    return text.includes("date") && /debit|withdraw|credit|deposit/.test(text);
  });
  if (headerLineIdx < 0) {
    throw new Error("Couldn't find a header row (Date / Debit / Credit) in this PDF — try the bank's CSV or Excel export");
  }

  // Merge adjacent header words into column labels (gap > 12pt starts a new column).
  const headerCols: { label: string; center: number }[] = [];
  let group: PdfItem[] = [];
  const flush = () => {
    if (!group.length) return;
    const start = group[0].x;
    const end = group[group.length - 1].x + group[group.length - 1].width;
    headerCols.push({ label: group.map((i) => i.str).join(" "), center: (start + end) / 2 });
    group = [];
  };
  for (const item of lines[headerLineIdx]) {
    const prev = group[group.length - 1];
    if (prev && item.x - (prev.x + prev.width) > 12) flush();
    group.push(item);
  }
  flush();

  const header = headerCols.map((c) => c.label);
  const dateCol = header.findIndex((h) => h.toLowerCase().includes("date"));
  const headerKey = header.join("|").toLowerCase();

  const rows: string[][] = [header];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const cells = header.map(() => "");
    for (const item of lines[i]) {
      const center = item.x + item.width / 2;
      let best = 0;
      for (let c = 1; c < headerCols.length; c++) {
        if (Math.abs(headerCols[c].center - center) < Math.abs(headerCols[best].center - center)) best = c;
      }
      cells[best] = cells[best] ? `${cells[best]} ${item.str}` : item.str;
    }
    if (cells.join("|").toLowerCase() === headerKey) continue; // repeated header on next page
    const prev = rows[rows.length - 1];
    if (dateCol >= 0 && !cells[dateCol] && rows.length > 1) {
      // Wrapped narration line: fold its text into the previous row.
      cells.forEach((text, c) => {
        if (text) prev[c] = prev[c] ? `${prev[c]} ${text}` : text;
      });
    } else if (dateCol < 0 || cells[dateCol]) {
      rows.push(cells);
    }
  }
  return rows;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Parses common bank-statement date formats into YYYY-MM-DD, or "" if unrecognised. Day-first for ambiguous numerics. */
export function parseBankDate(raw: string | undefined): string {
  if (!raw) return "";
  const s = raw.trim();
  const pad = (n: number) => String(n).padStart(2, "0");
  const build = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000;
    if (m < 1 || m > 12 || d < 1 || d > 31) return "";
    return `${y}-${pad(m)}-${pad(d)}`;
  };

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2,4})/);
  if (m) return build(Number(m[3]), Number(m[2]), Number(m[1]));
  m = s.match(/^(\d{1,2})[-/.\s]([A-Za-z]{3})[a-z]*[-/.,\s]+(\d{2,4})/);
  if (m) {
    const mi = MONTHS.indexOf(m[2].toLowerCase());
    return mi >= 0 ? build(Number(m[3]), mi + 1, Number(m[1])) : "";
  }
  return "";
}

/** Local calendar date (YYYY-MM-DD) of a stored timestamp. */
export function toLocalDateKey(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
