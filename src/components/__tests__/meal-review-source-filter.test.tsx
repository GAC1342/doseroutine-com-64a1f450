/**
 * Coverage for the review sheet's nutrition-source filter: the chips narrow the
 * visible item list without touching the meal totals, which always cover every
 * item regardless of what is on screen.
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { MealDraft } from "@/components/meal-review-sheet";

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
vi.mock("@/lib/meal-scan.functions", () => ({ scanMealInput: vi.fn() }));
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
vi.mock("@/components/food-portion-picker", () => ({
  FoodPortionPicker: () => null,
  rescaleItemToGrams: () => ({}),
}));
vi.mock("@/lib/barcode-scanner", () => ({ scanBarcodeFromImage: vi.fn(async () => null) }));
vi.mock("@/lib/image-downscale", () => ({
  dataUrlToBlob: vi.fn(),
  fileToDownscaledDataUrl: vi.fn(async () => ""),
}));

const { MealReviewSheet } = await import("@/components/meal-review-sheet");

const MIXED_DRAFT: MealDraft = {
  label: "Mixed plate",
  items: [
    {
      name: "Chicken breast",
      portion: "150 g",
      calories: 248,
      protein_g: 46,
      carbs_g: 0,
      fat_g: 5,
      dataSource: "database",
    },
    {
      name: "Brown rice",
      portion: "180 g",
      calories: 216,
      protein_g: 5,
      carbs_g: 45,
      fat_g: 2,
      dataSource: "usda",
    },
    {
      name: "Side salad",
      portion: "1 bowl",
      calories: 60,
      protein_g: 2,
      carbs_g: 8,
      fat_g: 3,
      dataSource: "ai",
    },
  ],
  confidence: "medium",
  note: "",
  source: "photo",
};

function renderSheet() {
  render(<MealReviewSheet open draft={MIXED_DRAFT} onOpenChange={() => {}} />);
}

function visibleItemNames() {
  return screen.getAllByLabelText(/^Item \d+ name$/i).map((el) => (el as HTMLInputElement).value);
}

afterEach(() => vi.clearAllMocks());

describe("MealReviewSheet source filter", () => {
  it("offers a chip per source present, with counts", () => {
    renderSheet();
    const group = screen.getByRole("group", { name: /filter items by nutrition source/i });
    const labels = Array.from(group.querySelectorAll("button")).map((b) => b.textContent);
    expect(labels).toEqual(["All (3)", "Food database (1)", "USDA data (1)", "AI estimate (1)"]);
  });

  it("shows only the items from the selected source", () => {
    renderSheet();
    expect(visibleItemNames()).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: /USDA data \(1\)/i }));
    expect(visibleItemNames()).toEqual(["Brown rice"]);

    fireEvent.click(screen.getByRole("button", { name: /AI estimate \(1\)/i }));
    expect(visibleItemNames()).toEqual(["Side salad"]);
  });

  it("keeps totals across every item while filtered", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /Food database \(1\)/i }));

    expect(visibleItemNames()).toEqual(["Chicken breast"]);
    expect((screen.getByLabelText(/Meal total calories/i) as HTMLInputElement).value).toBe("524");
    expect(screen.getByRole("status", { name: /source filter status/i }).textContent).toMatch(
      /Showing 1 of 3 items/i,
    );
  });

  it("clears the filter with a second tap on the active chip", () => {
    renderSheet();
    const chip = screen.getByRole("button", { name: /AI estimate \(1\)/i });
    fireEvent.click(chip);
    expect(visibleItemNames()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /AI estimate \(1\)/i }));
    expect(visibleItemNames()).toHaveLength(3);
  });
});
