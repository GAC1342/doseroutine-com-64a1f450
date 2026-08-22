import { describe, expect, it } from "vitest";
import {
  groceryListToCsv,
  groceryListToPrintHtml,
  quantityText,
  type GroceryExportLine,
} from "@/lib/grocery-export";

const line = (over: Partial<GroceryExportLine> = {}): GroceryExportLine => ({
  name: "Chicken breast",
  portions: 3,
  grams: 450,
  notes: [],
  checked: false,
  override: null,
  ...over,
});

describe("quantityText", () => {
  it("prefers the user override", () => {
    expect(quantityText(line({ override: "2 packs" }))).toBe("2 packs");
  });
  it("falls back to grams then notes", () => {
    expect(quantityText(line())).toBe("450g");
    expect(quantityText(line({ grams: null, notes: ["1 cup", "1 scoop"] }))).toBe("1 cup, 1 scoop");
  });
});

describe("groceryListToCsv", () => {
  it("writes a header and one row per item", () => {
    const csv = groceryListToCsv([line(), line({ name: "Oats", grams: 200, checked: true })]);
    const rows = csv.split("\r\n");
    expect(rows[0]).toBe("Item,Quantity,Planned portions,Bought");
    expect(rows[1]).toBe("Chicken breast,450g,3,no");
    expect(rows[2]).toBe("Oats,200g,3,yes");
  });

  it("escapes commas and quotes", () => {
    const csv = groceryListToCsv([line({ name: 'Rice, "long" grain', grams: null, notes: [] })]);
    expect(csv).toContain('"Rice, ""long"" grain"');
  });
});

describe("groceryListToPrintHtml", () => {
  it("escapes HTML and marks bought items", () => {
    const html = groceryListToPrintHtml([line({ name: "<script>x</script>", checked: true })], {
      weekLabel: "Week of May 1",
    });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('class="done"');
    expect(html).toContain("Week of May 1");
  });
});
