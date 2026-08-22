/**
 * Grocery list exports: CSV for spreadsheets, and a printable sheet the
 * browser's print dialog can save as a PDF (no PDF dependency needed).
 */
import { isNativeShell } from "@/lib/platform";

export type GroceryExportLine = {
  name: string;
  portions: number;
  grams: number | null;
  notes: string[];
  checked: boolean;
  /** User-typed quantity that wins over the generated one. */
  override?: string | null;
};

/** The quantity text shown on both exports. */
export function quantityText(line: GroceryExportLine): string {
  if (line.override && line.override.trim()) return line.override.trim();
  if (line.grams != null) return `${line.grams}g`;
  return line.notes.join(", ");
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** RFC 4180 CSV with a header row. */
export function groceryListToCsv(lines: ReadonlyArray<GroceryExportLine>): string {
  const rows = [
    ["Item", "Quantity", "Planned portions", "Bought"],
    ...lines.map((line) => [
      line.name,
      quantityText(line),
      String(line.portions),
      line.checked ? "yes" : "no",
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Standalone printable HTML — deliberately plain so it prints cleanly. */
export function groceryListToPrintHtml(
  lines: ReadonlyArray<GroceryExportLine>,
  options: { title?: string; weekLabel?: string } = {},
): string {
  const title = options.title ?? "Grocery list";
  const rows = lines
    .map((line) => {
      const qty = escapeHtml(quantityText(line));
      const count = line.portions > 1 ? ` <span class="muted">×${line.portions}</span>` : "";
      return `<li class="${line.checked ? "done" : ""}"><span class="box"></span><span class="name">${escapeHtml(
        line.name,
      )}${count}</span><span class="qty">${qty}</span></li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 14px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; margin: 32px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.sub { margin: 0 0 20px; color: #666; font-size: 12px; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid #eee; }
  li.done .name, li.done .qty { color: #999; text-decoration: line-through; }
  .box { width: 13px; height: 13px; border: 1.5px solid #888; border-radius: 3px; flex: none; }
  .name { flex: 1; }
  .qty { color: #555; font-variant-numeric: tabular-nums; }
  .muted { color: #999; }
  footer { margin-top: 24px; font-size: 11px; color: #999; }
  @media print { body { margin: 12mm; } }
</style></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${escapeHtml(options.weekLabel ?? "")}</p>
  <ul>${rows}</ul>
  <footer>DoseRoutine — ${lines.length} item${lines.length === 1 ? "" : "s"}</footer>
</body></html>`;
}

/** Trigger a client-side file download. */
export function downloadFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Plain-text list used by the native share sheet (no print dialog in WKWebView). */
export function groceryShareText(
  lines: ReadonlyArray<GroceryExportLine>,
  weekLabel?: string,
): string {
  const header = weekLabel ? `Grocery list — ${weekLabel}` : "Grocery list";
  const body = lines.map((line) => {
    const qty = quantityText(line);
    return `• ${line.name}${qty ? ` — ${qty}` : ""}`;
  });
  return [header, "", ...body].join("\n");
}

/**
 * H1 — the native shell has no print dialog and `window.open` is handed to the
 * OS browser, so the printable sheet never renders. Share the list as text
 * instead, falling back to the clipboard when no share sheet is available.
 */
export async function shareGroceryListText(text: string): Promise<"shared" | "copied" | "failed"> {
  try {
    const nav = typeof navigator === "undefined" ? null : navigator;
    if (nav && typeof nav.share === "function") {
      await nav.share({ title: "Grocery list", text });
      return "shared";
    }
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return "copied";
    }
  } catch (err) {
    // A user-cancelled share sheet is not an error worth surfacing.
    if (err instanceof Error && err.name === "AbortError") return "shared";
  }
  return "failed";
}

/** Open the printable sheet and hand it to the browser's print/save-as-PDF dialog. */
export function printGroceryList(html: string): boolean {
  // Inside the native shell a blank script-written window is an empty tab with
  // no way back — callers must use the share sheet instead.
  if (isNativeShell()) return false;
  const win = window.open("", "_blank", "noopener,width=720,height=900");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.addEventListener("load", () => {
    win.focus();
    win.print();
  });
  // Some browsers fire load before the listener attaches.
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* already printed */
    }
  }, 400);
  return true;
}
