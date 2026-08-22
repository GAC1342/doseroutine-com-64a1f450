/**
 * Shared mock factories for meal component tests.
 *
 * `vi.mock` is hoisted per test file, so a helper cannot register mocks on a
 * test's behalf. Instead each function here returns the module shape, and a
 * test wires it in one line:
 *
 *   vi.mock("@tanstack/react-start", () => startMock());
 *   vi.mock("@tanstack/react-query", () => portionsQueryMock());
 *
 * Factories import fixtures dynamically so they stay safe under hoisting.
 */
import { vi } from "vitest";

/** @tanstack/react-start stubs used by server-fn-aware components. */
export function startMock() {
  return {
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
  };
}

/** @tanstack/react-router stub for components that navigate. */
export function routerMock() {
  return { useNavigate: () => vi.fn() };
}

/**
 * useQuery stub that serves household portion chips from the food fixtures,
 * keyed on the foodId in the query key.
 */
export function portionsQueryMock() {
  return {
    useQuery: ({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
      if (enabled === false) return { data: [] };
      // Loaded synchronously on first call, then cached for later renders.
      return { data: portionsForSync(String(queryKey[1] ?? "")) };
    },
  };
}

/** Food DB server functions used by the picker and review sheet. */
export function foodDbMock() {
  return { foodPortionsFor: vi.fn(), recordScanCorrections: vi.fn() };
}

export function mealScanMock() {
  return { scanMealInput: vi.fn() };
}

export function sonnerMock() {
  return {
    toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), message: vi.fn() }),
  };
}

export function supabaseMock() {
  return {
    supabase: {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } } })) },
      from: vi.fn(() => ({
        insert: vi.fn(async () => ({ error: null })),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      })),
      storage: { from: vi.fn(() => ({ upload: vi.fn(async () => ({ error: null })) })) },
    },
  };
}

export function barcodeScannerMock() {
  return { scanBarcodeFromImage: vi.fn(async () => null) };
}

export function imageDownscaleMock() {
  return { dataUrlToBlob: vi.fn(), fileToDownscaledDataUrl: vi.fn(async () => "") };
}

/**
 * Synchronous portion lookup that mirrors `portionsFor` from the fixtures.
 * Duplicated as a literal map so the react-query factory never needs an async
 * import while a component is rendering.
 */
function portionsForSync(foodId: string): { label: string; grams: number }[] {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing; do not add new ones.
  return PORTION_CHIPS[foodId] ?? [];
}

const PORTION_CHIPS: Record<string, { label: string; grams: number }[]> = {
  "food-chicken": [
    { label: "1 small breast (85 g)", grams: 85 },
    { label: "1 breast (170 g)", grams: 170 },
  ],
  "food-salmon": [{ label: "1 fillet (113 g)", grams: 113 }],
  "food-egg": [{ label: "2 eggs (100 g)", grams: 100 }],
  "food-broccoli": [
    { label: "1 cup chopped (91 g)", grams: 91 },
    { label: "1 bowl (180 g)", grams: 180 },
  ],
  "food-salad": [{ label: "1 bowl (85 g)", grams: 85 }],
  "food-rice": [
    { label: "1/2 cup (98 g)", grams: 98 },
    { label: "1 cup (195 g)", grams: 195 },
  ],
  "food-pasta": [{ label: "1 cup (140 g)", grams: 140 }],
  "food-banana": [{ label: "1 medium (118 g)", grams: 118 }],
  "food-almonds": [{ label: "1 small handful (28 g)", grams: 28 }],
  "food-olive-oil": [{ label: "1 tbsp (14 g)", grams: 14 }],
  "food-ranch": [{ label: "2 tbsp (30 g)", grams: 30 }],
  "food-cheddar": [{ label: "1 slice (28 g)", grams: 28 }],
  "food-yogurt": [{ label: "1 container (170 g)", grams: 170 }],
  "food-granola": [{ label: "1/4 cup (30 g)", grams: 30 }],
  "food-ground-beef": [
    { label: "4 oz", grams: 113 },
    { label: "1 lb", grams: 454 },
    { label: "1 lb 4 oz", grams: 567 },
  ],
  "food-tuna": [
    { label: "1 can drained (142 g)", grams: 142 },
    { label: "½ can (71 g)", grams: 71 },
  ],
  "food-tofu": [
    { label: "1/2 block (126 g)", grams: 126 },
    { label: "3/4 cup cubed (126 g)", grams: 126 },
  ],
  "food-shrimp": [
    { label: "4 oz", grams: 113 },
    { label: "6 large (43 g)", grams: 43 },
  ],
  "food-chicken-thigh": [{ label: "1 thigh (95 g)", grams: 95 }],
  "food-baked-potato": [
    { label: "1 medium (173 g)", grams: 173 },
    { label: "1 large (299 g)", grams: 299 },
  ],
  "food-quinoa": [
    { label: "½ cup (93 g)", grams: 93 },
    { label: "1 cup (185 g)", grams: 185 },
  ],
  "food-black-beans": [
    { label: "1/3 cup (80 g)", grams: 80 },
    { label: "1 cup (240 g)", grams: 240 },
  ],
  "food-bread": [
    { label: "1 slice (43 g)", grams: 43 },
    { label: "2 slices (86 g)", grams: 86 },
  ],
  "food-oatmeal": [
    { label: "1 cup (234 g)", grams: 234 },
    { label: "1 big bowl (400 g)", grams: 400 },
  ],
  "food-spinach": [
    { label: "1 cup (30 g)", grams: 30 },
    { label: "3 cups (90 g)", grams: 90 },
  ],
  "food-baby-carrots": [{ label: "10 carrots (85 g)", grams: 85 }],
  "food-apple": [
    { label: "1 medium (182 g)", grams: 182 },
    { label: "½ apple (91 g)", grams: 91 },
  ],
  "food-blueberries": [
    { label: "¼ cup (37 g)", grams: 37 },
    { label: "1 cup (148 g)", grams: 148 },
  ],
  "food-avocado": [
    { label: "1/2 avocado (68 g)", grams: 68 },
    { label: "1 whole (136 g)", grams: 136 },
  ],
  "food-peanut-butter": [
    { label: "1 tbsp (16 g)", grams: 16 },
    { label: "2 tbsp (32 g)", grams: 32 },
  ],
  "food-walnuts": [{ label: "¼ cup (30 g)", grams: 30 }],
  "food-butter": [
    { label: "1 tsp (5 g)", grams: 5 },
    { label: "1 tbsp (14 g)", grams: 14 },
  ],
  "food-hummus": [{ label: "2 tbsp (30 g)", grams: 30 }],
  "food-marinara": [{ label: "1/2 cup (125 g)", grams: 125 }],
  "food-cottage-cheese": [
    { label: "1/2 cup (113 g)", grams: 113 },
    { label: "1 cup (226 g)", grams: 226 },
  ],
  "food-protein-bar": [{ label: "1 bar (60 g)", grams: 60 }],
  "food-almond-milk": [
    { label: "250 ml", grams: 250 },
    { label: "1 cup (240 g)", grams: 240 },
  ],
  "food-whey-shake": [{ label: "1 shaker (300 g)", grams: 300 }],
  "food-tortilla-chips": [
    { label: "10 chips (28 g)", grams: 28 },
    { label: "1 oz", grams: 28 },
  ],
};
