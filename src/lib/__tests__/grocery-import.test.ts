import { describe, expect, it } from "vitest";
import { groceryListToCsv } from "@/lib/grocery-export";
import {
  GROCERY_IMPORT_LIMIT,
  groceryImportTemplate,
  parseGroceryCsv,
  planGroceryImport,
} from "@/lib/grocery-import";

describe("parseGroceryCsv", () => {
  it("round-trips our own export", () => {
    const csv = groceryListToCsv([
      { name: "Chicken breast", portions: 3, grams: 450, notes: [], checked: false },
      { name: 'Rice, "long" grain', portions: 1, grams: 200, notes: [], checked: true },
    ]);
    const { rows } = parseGroceryCsv(csv);
    expect(rows).toEqual([
      { name: "Chicken Breast", quantity: "450g", checked: false },
      { name: `Rice, "Long" Grain`, quantity: "200g", checked: true },
    ]);
  });

  it("accepts semicolon and tab files and a BOM", () => {
    expect(parseGroceryCsv("\uFEFFItem;Quantity;Bought\nOats;500g;yes").rows).toEqual([
      { name: "Oats", quantity: "500g", checked: true },
    ]);
    expect(parseGroceryCsv("Item\tQuantity\nEggs\t12").rows).toEqual([
      { name: "Eggs", quantity: "12", checked: false },
    ]);
  });

  it("handles reordered and renamed columns", () => {
    const { rows } = parseGroceryCsv("Purchased,Amount,Food\nx,2 packs,tofu");
    expect(rows).toEqual([{ name: "Tofu", quantity: "2 packs", checked: true }]);
  });

  it("works without a header row", () => {
    expect(parseGroceryCsv("Broccoli,300g\nSalmon,2 fillets").rows).toEqual([
      { name: "Broccoli", quantity: "300g", checked: false },
      { name: "Salmon", quantity: "2 fillets", checked: false },
    ]);
  });

  it("skips blanks and duplicates and reports why", () => {
    const { rows, skipped } = parseGroceryCsv("Item,Quantity\nOats,500g\n,\nOats,1kg\n");
    expect(rows).toHaveLength(1);
    expect(skipped.join(" ")).toContain("already appeared earlier");
  });

  it("caps very large files", () => {
    const csv = ["Item,Quantity", ...Array.from({ length: 400 }, (_, i) => `Item ${i},1`)].join(
      "\n",
    );
    const { rows, skipped } = parseGroceryCsv(csv);
    expect(rows).toHaveLength(GROCERY_IMPORT_LIMIT);
    expect(skipped.join(" ")).toContain("300-item limit");
  });

  it("reports an empty file", () => {
    expect(parseGroceryCsv("   ").rows).toHaveLength(0);
    expect(parseGroceryCsv("   ").skipped[0]).toMatch(/empty/i);
  });

  it("parses the downloadable template exactly", () => {
    const { rows, skipped } = parseGroceryCsv(groceryImportTemplate());
    expect(skipped).toHaveLength(0);
    expect(rows).toEqual([
      { name: "Chicken Breast", quantity: "450g", checked: false },
      { name: "Greek Yogurt", quantity: "2 tubs", checked: true },
      { name: "Spinach", quantity: "200g", checked: false },
      { name: "Rice", quantity: "1 bag", checked: false },
    ]);
  });
});

describe("planGroceryImport", () => {
  const rows = [
    { name: "Oats", quantity: "500g", checked: true },
    { name: "Tofu", quantity: null, checked: false },
  ];

  it("splits matches from new items, case-insensitively", () => {
    const plan = planGroceryImport(rows, ["oats", "Salmon"]);
    expect(plan.updates.map((r) => r.name)).toEqual(["oats"]);
    expect(plan.additions.map((r) => r.name)).toEqual(["Tofu"]);
    expect(plan.removals).toEqual([]);
  });

  it("lists custom items to drop when replacing", () => {
    const plan = planGroceryImport(rows, ["Oats"], { removeMissingCustom: ["Oats", "Napkins"] });
    expect(plan.removals).toEqual(["Napkins"]);
  });
});

describe("row-by-row issue report", () => {
  it("reports the line number and reason for each bad row", () => {
    const csv = ["Name,Quantity,Bought", "Oats,500g,yes", ",200g,no", "Oats,1 bag,maybe"].join(
      "\n",
    );
    const { rows, issues } = parseGroceryCsv(csv);
    expect(rows).toHaveLength(1);
    expect(issues.map((i) => i.line)).toEqual([3, 4]);
    expect(issues[0]!.reason).toMatch(/No item name/);
  });

  it("flags a missing header row", () => {
    const { issues } = parseGroceryCsv("Oats,500g,yes");
    expect(issues[0]!.reason).toMatch(/No header row/);
  });
});

describe("planGroceryImport replace-all", () => {
  it("hides generated items missing from the file", () => {
    const plan = planGroceryImport(
      [{ name: "Oats", quantity: null, checked: false }],
      ["Oats", "Rice"],
      { hideMissingGenerated: ["Oats", "Rice"] },
    );
    expect(plan.hides).toEqual(["Rice"]);
  });
});
