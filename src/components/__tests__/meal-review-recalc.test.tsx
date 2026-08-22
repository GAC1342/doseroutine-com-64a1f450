/**
 * Integration coverage for the review sheet's live math: totals and the item
 * list must both update as soon as "Servings eaten" changes or a Nutrition
 * Facts total is hand-corrected — no explicit "recalculate" press.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
// The provenance picker fetches household portions; tests don't need a client.
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

const DRAFT: MealDraft = {
  label: "Greek yogurt bowl",
  items: [
    { name: "Greek yogurt", portion: "170 g", calories: 100, protein_g: 17, carbs_g: 6, fat_g: 0 },
    { name: "Granola", portion: "30 g", calories: 140, protein_g: 3, carbs_g: 20, fat_g: 5 },
  ],
  confidence: "medium",
  note: "",
  source: "manual",
};

function totalInput(name: RegExp) {
  return screen.getByLabelText(name) as HTMLInputElement;
}

function itemInput(index: number, macro: string) {
  return screen.getByLabelText(new RegExp(`Item ${index + 1} ${macro}`, "i")) as HTMLInputElement;
}

/** Push past the 350ms debounce on the servings effect. */
async function flushRecalc() {
  await act(async () => {
    vi.advanceTimersByTime(400);
  });
}

function renderSheet(draft: MealDraft = DRAFT) {
  render(<MealReviewSheet open draft={draft} onOpenChange={() => {}} />);
}

describe("MealReviewSheet live recalculation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("starts from the summed item macros", () => {
    renderSheet();
    expect(totalInput(/Meal total calories/i).value).toBe("240");
    expect(totalInput(/Meal total protein/i).value).toBe("20");
    expect(totalInput(/Meal total carbs/i).value).toBe("26");
    expect(totalInput(/Meal total fat/i).value).toBe("5");
  });

  it("scales totals and every item when servings eaten changes", async () => {
    renderSheet();
    fireEvent.change(screen.getByLabelText(/Servings eaten/i), { target: { value: "2" } });
    await flushRecalc();

    expect(totalInput(/Meal total calories/i).value).toBe("480");
    expect(totalInput(/Meal total protein/i).value).toBe("40");
    expect(totalInput(/Meal total carbs/i).value).toBe("52");
    expect(totalInput(/Meal total fat/i).value).toBe("10");

    // Item list scales in step, not just the summary.
    expect(itemInput(0, "kcal").value).toBe("200");
    expect(itemInput(0, "protein").value).toBe("34");
    expect(itemInput(1, "kcal").value).toBe("280");
    expect(itemInput(1, "carbs").value).toBe("40");
  });

  it("scales from the one-serving basis so repeated changes never compound", async () => {
    renderSheet();
    const servings = screen.getByLabelText(/Servings eaten/i);

    fireEvent.change(servings, { target: { value: "3" } });
    await flushRecalc();
    expect(totalInput(/Meal total calories/i).value).toBe("720");

    fireEvent.change(servings, { target: { value: "1.5" } });
    await flushRecalc();
    expect(totalInput(/Meal total calories/i).value).toBe("360");
    expect(itemInput(0, "kcal").value).toBe("150");

    // Back to one serving reproduces the original numbers exactly.
    fireEvent.change(servings, { target: { value: "1" } });
    await flushRecalc();
    expect(totalInput(/Meal total calories/i).value).toBe("240");
    expect(itemInput(0, "kcal").value).toBe("100");
    expect(itemInput(1, "kcal").value).toBe("140");
  });

  it("ignores partial or invalid servings input instead of zeroing the meal", async () => {
    renderSheet();
    const servings = screen.getByLabelText(/Servings eaten/i);

    fireEvent.change(servings, { target: { value: "" } });
    await flushRecalc();
    expect(totalInput(/Meal total calories/i).value).toBe("240");

    fireEvent.change(servings, { target: { value: "0" } });
    await flushRecalc();
    expect(totalInput(/Meal total calories/i).value).toBe("240");
    expect(screen.getByText(/Enter a number of servings/i)).toBeTruthy();
  });

  it("applies a Nutrition Facts override to the totals immediately", () => {
    renderSheet();
    fireEvent.change(totalInput(/Meal total calories/i), { target: { value: "300" } });

    expect(totalInput(/Meal total calories/i).value).toBe("300");
    // Untouched macros keep their summed values.
    expect(totalInput(/Meal total protein/i).value).toBe("20");
  });

  it("scales a hand-typed override by servings without re-deriving from items", async () => {
    renderSheet();
    fireEvent.change(totalInput(/Meal total calories/i), { target: { value: "300" } });
    fireEvent.change(totalInput(/Meal total protein/i), { target: { value: "25" } });

    fireEvent.change(screen.getByLabelText(/Servings eaten/i), { target: { value: "2" } });
    await flushRecalc();

    expect(totalInput(/Meal total calories/i).value).toBe("600");
    expect(totalInput(/Meal total protein/i).value).toBe("50");
    // Items scale alongside the override.
    expect(itemInput(0, "kcal").value).toBe("200");
    expect(itemInput(1, "kcal").value).toBe("280");
  });

  it("keeps the per-serving breakdown consistent with what is shown", async () => {
    renderSheet();
    fireEvent.change(totalInput(/Meal total calories/i), { target: { value: "250" } });
    fireEvent.change(screen.getByLabelText(/Servings eaten/i), { target: { value: "2" } });
    await flushRecalc();

    expect(totalInput(/Meal total calories/i).value).toBe("500");
    fireEvent.click(screen.getByText(/How this was calculated/i));
    // per-serving 250 × 2 servings = 500 shown.
    expect(screen.getAllByText(/× 2/).length).toBeGreaterThan(0);
  });

  it("restores the previous numbers when the recalculation is undone", async () => {
    renderSheet();
    fireEvent.change(screen.getByLabelText(/Servings eaten/i), { target: { value: "2" } });
    await flushRecalc();
    expect(totalInput(/Meal total calories/i).value).toBe("480");

    fireEvent.click(screen.getByRole("button", { name: /Undo/i }));
    expect(totalInput(/Meal total calories/i).value).toBe("240");
    expect(itemInput(0, "kcal").value).toBe("100");
  });

  it("resets an override and its servings math back to the item totals", async () => {
    renderSheet();
    fireEvent.change(totalInput(/Meal total calories/i), { target: { value: "999" } });
    fireEvent.change(screen.getByLabelText(/Servings eaten/i), { target: { value: "2" } });
    await flushRecalc();

    fireEvent.click(screen.getByRole("button", { name: /Reset to items/i }));
    await flushRecalc();

    // The hand-typed override is dropped, so the totals fall back to the
    // (already scaled) item list rather than the override math.
    expect(totalInput(/Meal total calories/i).value).toBe("480");
    expect(itemInput(0, "kcal").value).toBe("200");
    expect((screen.getByLabelText(/Servings eaten/i) as HTMLInputElement).value).toBe("1");
  });
});
