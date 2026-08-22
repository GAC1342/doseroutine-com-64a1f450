/**
 * Read a grocery list back in from CSV.
 *
 * Deliberately forgiving: the file may have been opened, reordered, and
 * re-saved in Excel, Numbers or Google Sheets, so we accept semicolon or tab
 * delimiters, quoted cells, BOMs, missing columns and a missing header row.
 */

export type GroceryImportRow = {
  name: string;
  /** Free-text quantity, e.g. "450g" or "2 packs". Null when blank. */
  quantity: string | null;
  checked: boolean;
};

/** One thing wrong with one line of the file, so the user can fix it. */
export type GroceryImportIssue = {
  /** 1-based line number in the original file. */
  line: number;
  /** The raw text of that line, trimmed for display. */
  text: string;
  reason: string;
};

export type GroceryImportResult = {
  rows: GroceryImportRow[];
  /** Human-readable reasons rows were dropped. */
  skipped: string[];
  /** Row-by-row detail behind `skipped`. */
  issues: GroceryImportIssue[];
};

const TRUTHY = new Set(["yes", "y", "true", "1", "x", "done", "bought", "✓"]);
const FALSY = new Set(["no", "n", "false", "0", "", "-"]);

/** Split one CSV text into rows of cells, keeping each row's source line. */
export function parseDelimitedRows(
  text: string,
  delimiter: string,
): Array<{ cells: string[]; line: number }> {
  const rows: Array<{ cells: string[]; line: number }> = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push({ cells: row, line: rowLine });
      row = [];
      cell = "";
      line += 1;
      rowLine = line;
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  rows.push({ cells: row, line: rowLine });

  return rows.filter((r) => r.cells.some((c) => c.trim() !== ""));
}

/** Cells only — kept for callers that don't care about line numbers. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  return parseDelimitedRows(text, delimiter).map((r) => r.cells);
}

/** Guess the delimiter from the first non-empty line. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  const counts: Array<[string, number]> = [
    [",", (firstLine.match(/,/g) ?? []).length],
    [";", (firstLine.match(/;/g) ?? []).length],
    ["\t", (firstLine.match(/\t/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : ",";
}

function normalizeHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** Column positions, from a header row when one is present. */
function detectColumns(
  cells: string[],
): { name: number; quantity: number; checked: number } | null {
  const headers = cells.map(normalizeHeader);
  const find = (...candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));
  const name = find("item", "name", "food", "ingredient", "product");
  if (name === -1) return null;
  return {
    name,
    quantity: find("quantity", "qty", "amount", "weight"),
    checked: find("bought", "checked", "have", "done", "purchased"),
  };
}

function toChecked(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (TRUTHY.has(v)) return true;
  if (FALSY.has(v)) return false;
  return false;
}

function titleCase(name: string) {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Exact header row the importer recognises. */
export const GROCERY_TEMPLATE_COLUMNS = ["Name", "Quantity", "Bought"] as const;

/** Max rows accepted from one file, so a stray spreadsheet can't flood the list. */
export const GROCERY_IMPORT_LIMIT = 300;

/** A starter CSV file users can edit and re-import without breaking column detection. */
export function groceryImportTemplate(): string {
  const rows = [
    [...GROCERY_TEMPLATE_COLUMNS],
    ["Chicken breast", "450g", "no"],
    ["Greek yogurt", "2 tubs", "yes"],
    ["Spinach", "200g", ""],
    ["Rice", "1 bag", "no"],
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/**
 * Same template columns, but prefilled with the user's current grocery rows so
 * they can edit quantities in a spreadsheet and re-import without retyping.
 * Falls back to the starter sample when the list is empty.
 */
export function groceryTemplateFromList(
  lines: ReadonlyArray<{ name: string; quantity: string; checked: boolean }>,
): string {
  if (lines.length === 0) return groceryImportTemplate();
  const rows = [
    [...GROCERY_TEMPLATE_COLUMNS],
    ...lines.map((line) => [line.name, line.quantity ?? "", line.checked ? "yes" : "no"]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Parse a CSV export (ours or a hand-edited one) into grocery rows. */
export function parseGroceryCsv(input: string): GroceryImportResult {
  const text = input.replace(/^\uFEFF/, "");
  const issues: GroceryImportIssue[] = [];
  const fail = (result: GroceryImportResult): GroceryImportResult => result;
  if (!text.trim()) {
    return fail({ rows: [], skipped: ["The file is empty"], issues: [] });
  }

  const table = parseDelimitedRows(text, detectDelimiter(text));
  if (table.length === 0) {
    return fail({ rows: [], skipped: ["The file is empty"], issues: [] });
  }

  const columns = detectColumns(table[0]!.cells);
  const body = columns ? table.slice(1) : table;
  const cols = columns ?? { name: 0, quantity: 1, checked: 2 };

  const rows: GroceryImportRow[] = [];
  const seen = new Set<string>();

  const note = (entry: { cells: string[]; line: number }, reason: string) => {
    issues.push({
      line: entry.line,
      text: entry.cells.join(", ").trim().slice(0, 80),
      reason,
    });
  };

  for (const entry of body) {
    const cells = entry.cells;
    const rawName = (cells[cols.name] ?? "").trim();
    if (!rawName) {
      note(entry, "No item name in the Name column");
      continue;
    }
    const name = titleCase(rawName);
    if (name.length > 80) {
      note(entry, "Item name is longer than 80 characters");
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      note(entry, `“${name}” already appeared earlier in the file`);
      continue;
    }
    if (rows.length >= GROCERY_IMPORT_LIMIT) {
      note(
        entry,
        `Over the ${GROCERY_IMPORT_LIMIT}-item limit — this row and any after it were skipped`,
      );
      break;
    }
    seen.add(key);

    const quantityRaw = cols.quantity >= 0 ? (cells[cols.quantity] ?? "").trim() : "";
    if (quantityRaw.length > 60) {
      note(entry, "Quantity was longer than 60 characters and got shortened");
    }
    if (cols.checked >= 0) {
      const bought = (cells[cols.checked] ?? "").trim().toLowerCase();
      if (bought && !TRUTHY.has(bought) && !FALSY.has(bought)) {
        note(entry, `Bought value “${bought}” isn't yes/no — treated as no`);
      }
    }
    rows.push({
      name,
      quantity: quantityRaw ? quantityRaw.slice(0, 60) : null,
      checked: cols.checked >= 0 ? toChecked(cells[cols.checked]) : false,
    });
  }

  if (!columns) {
    issues.unshift({
      line: 1,
      text: table[0]!.cells.join(", ").slice(0, 80),
      reason: "No header row found — assumed Name, Quantity, Bought in that order",
    });
  }

  const skipped = issues.map((issue) => `Line ${issue.line}: ${issue.reason}`);
  if (rows.length === 0 && skipped.length === 0) skipped.push("No items found in that file");
  return { rows, skipped, issues };
}

export type GroceryImportPlan = {
  /** Rows that match a name already on the list — quantity/bought get updated. */
  updates: GroceryImportRow[];
  /** Rows with a new name — added as your own items. */
  additions: GroceryImportRow[];
  /** Existing custom items absent from the file (only when replacing). */
  removals: string[];
  /** Generated (meal-plan) items to hide, when replacing the whole list. */
  hides: string[];
};

/**
 * Work out what an import will change before touching the database, so the
 * user can be shown a plain summary first.
 */
export function planGroceryImport(
  rows: ReadonlyArray<GroceryImportRow>,
  existingNames: ReadonlyArray<string>,
  options: {
    removeMissingCustom?: ReadonlyArray<string>;
    hideMissingGenerated?: ReadonlyArray<string>;
  } = {},
): GroceryImportPlan {
  const existing = new Map(existingNames.map((n) => [n.toLowerCase(), n]));
  const updates: GroceryImportRow[] = [];
  const additions: GroceryImportRow[] = [];

  for (const row of rows) {
    const match = existing.get(row.name.toLowerCase());
    if (match) updates.push({ ...row, name: match });
    else additions.push(row);
  }

  const imported = new Set(rows.map((r) => r.name.toLowerCase()));
  const removals = (options.removeMissingCustom ?? []).filter(
    (name) => !imported.has(name.toLowerCase()),
  );

  const hides = (options.hideMissingGenerated ?? []).filter(
    (name) => !imported.has(name.toLowerCase()),
  );

  return { updates, additions, removals, hides };
}
