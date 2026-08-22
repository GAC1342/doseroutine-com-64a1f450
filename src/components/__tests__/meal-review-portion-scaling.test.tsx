/**
 * End-to-end (component level) cover for portion scaling in the review sheet:
 * preset household chips and free-typed grams must both rescale that item's
 * macros, update the meal totals, and show a cue that matches the food.
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { MealDraft } from "@/components/meal-review-sheet";
import { makeMealDraft } from "@/test/fixtures/foods";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => vi.fn(),
  createMiddleware: () => ({ server: () => ({}), client: () => ({}) }),
  createServerFn: () => ({
    inputValidator: () => ({ handler: () => vi.fn() }),
    middleware: () => ({
      inputValidator: () => ({ handler: () => vi.fn() }),
      handler: () => vi.fn(),
    }),
    handler: () => vi.fn(),
  }),
}));
// Household portions come from the food catalog; serve a fixed set per food.
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
    const foodId = String(queryKey[1] ?? "");
    if (!enabled) return { data: [] };
    const byFood: Record<string, { label: string; grams: number }[]> = {
      "food-chicken": [
        { label: "1 small breast (85 g)", grams: 85 },
        { label: "1 breast (170 g)", grams: 170 },
      ],
      "food-broccoli": [
        { label: "1 cup chopped (91 g)", grams: 91 },
        { label: "1 bowl (180 g)", grams: 180 },
      ],
    };
    return { data: byFood[foodId] ?? [] };
  },
}));
vi.mock("@/lib/meal-scan.functions", () => ({ scanMealInput: vi.fn() }));
vi.mock("@/lib/food-db.functions", () => ({
  foodPortionsFor: vi.fn(),
  recordScanCorrections: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), message: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } } })) },
    from: vi.fn(() => ({
      insert: vi.fn(async () => ({ error: null })),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    })),
    storage: { from: vi.fn(() => ({ upload: vi.fn(async () => ({ error: null })) })) },
  },
}));
vi.mock("@/lib/barcode-scanner", () => ({ scanBarcodeFromImage: vi.fn(async () => null) }));
vi.mock("@/lib/image-downscale", () => ({
  dataUrlToBlob: vi.fn(),
  fileToDownscaledDataUrl: vi.fn(async () => ""),
}));

const { MealReviewSheet } = await import("@/components/meal-review-sheet");

const DRAFT: MealDraft = makeMealDraft() as MealDraft;

function renderSheet() {
  render(<MealReviewSheet open draft={DRAFT} onOpenChange={() => {}} />);
}

function value(label: RegExp | string) {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

afterEach(() => vi.clearAllMocks());

describe("review sheet portion scaling", () => {
  it("rescales macros and totals from a free-typed gram amount", async () => {
    renderSheet();
    expect(value(/Meal total calories/i)).toBe("200");

    fireEvent.change(screen.getByLabelText("Item 1 portion"), { target: { value: "200 g" } });

    expect(value("Item 1 kcal")).toBe("330");
    expect(value("Item 1 Protein")).toBe("62");
    expect(value("Item 1 Carbs")).toBe("0");
    // Totals settle after the debounced recalculation.
    await waitFor(() => expect(value(/Meal total calories/i)).toBe("365"));
  });

  it("does not compound when the amount is typed digit by digit", () => {
    renderSheet();
    const field = screen.getByLabelText("Item 1 portion");
    fireEvent.change(field, { target: { value: "2" } });
    fireEvent.change(field, { target: { value: "20" } });
    fireEvent.change(field, { target: { value: "200 g" } });

    expect(value("Item 1 kcal")).toBe("330");
    expect(value("Item 1 Protein")).toBe("62");
  });

  it("rescales from a preset household chip and keeps its label", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "1 breast (170 g)" }));

    expect(value("Item 1 portion")).toBe("1 breast (170 g)");
    expect(value("Item 1 kcal")).toBe("281");
    expect(value("Item 1 Protein")).toBe("52.7");
  });

  it("reads a decimal-comma amount the same as its dot form", async () => {
    renderSheet();
    fireEvent.change(screen.getByLabelText("Item 1 portion"), { target: { value: "0,2 kg" } });

    expect(value("Item 1 kcal")).toBe("330");
    expect(value("Item 1 Protein")).toBe("62");
    await waitFor(() => expect(value(/Meal total calories/i)).toBe("365"));
  });

  it("reads a compound imperial amount and rescales from it", async () => {
    renderSheet();
    // 1 lb 4 oz = 566.8 g -> 5.668x the 100 g basis.
    fireEvent.change(screen.getByLabelText("Item 1 portion"), { target: { value: "1 lb 4 oz" } });

    expect(value("Item 1 kcal")).toBe("936");
    expect(value("Item 1 Protein")).toBe("175.8");
    await waitFor(() => expect(value(/Meal total calories/i)).toBe("971"));
  });

  it("shows a cue that matches the matched food, per item", () => {
    renderSheet();
    fireEvent.change(screen.getByLabelText("Item 1 portion"), { target: { value: "85 g" } });
    fireEvent.change(screen.getByLabelText("Item 2 portion"), { target: { value: "180 g" } });

    const rows = screen
      .getAllByLabelText(/^Item \d+ portion$/i)
      .map((input) => input.closest("div")?.parentElement as HTMLElement);
    expect(within(rows[0]!).getByText(/deck of cards/i)).toBeTruthy();
    const broccoli = within(rows[1]!).getByText(/clenched fist|cupped hand/i);
    expect(broccoli.textContent).not.toMatch(/deck of cards|palm/i);
  });
});
