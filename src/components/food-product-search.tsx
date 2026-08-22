import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Clock, Loader2, Search, Star, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchFoodLabels } from "@/lib/meal-scan.functions";
import type { FoodLabelMatch as FoodProductMatch } from "@/lib/meal-nutrition";
import {
  clearRecentFoodSearches,
  foodFavoriteKey,
  listFavoriteFoods,
  listRecentFoodSearches,
  onFavoritesChange,
  rememberFoodSearch,
  toggleFavoriteFood,
  type FavoriteFood,
} from "@/lib/food-favorites";

function macroLine(match: FoodProductMatch) {
  return `${match.perServing?.calories ?? 0} kcal · ${match.perServing?.protein_g ?? 0}g protein · ${match.perServing?.carbs_g ?? 0}g carbs · ${match.perServing?.fat_g ?? 0}g fat`;
}

/**
 * Pick the right manufacturer panel by name when a barcode didn't resolve —
 * a published label beats a photo estimate, so this runs before OCR fallback.
 *
 * Before anything is typed we surface starred foods and recent searches, so
 * the food someone eats every day is one tap away instead of one search away.
 */
export function FoodProductSearch({
  open,
  onOpenChange,
  initialQuery,
  onPick,
  onSkip,
  skipLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onPick: (match: FoodProductMatch) => void;
  /** Fallback action, e.g. "Use the photo estimate instead". */
  onSkip?: () => void;
  skipLabel?: string;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [results, setResults] = useState<FoodProductMatch[] | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [recentTerms, setRecentTerms] = useState<string[]>([]);
  const search = useServerFn(searchFoodLabels);

  const refreshShortcuts = useCallback(() => {
    setFavorites(listFavoriteFoods());
    setRecentTerms(listRecentFoodSearches());
  }, []);

  useEffect(() => {
    const unsubscribe = onFavoritesChange(refreshShortcuts);
    return () => {
      unsubscribe();
    };
  }, [refreshShortcuts]);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery ?? "");
    setResults(null);
    setSearchError(false);
    refreshShortcuts();
  }, [open, initialQuery, refreshShortcuts]);

  const searchMutation = useMutation({
    mutationFn: async (terms: string) => search({ data: { query: terms } }),
    onSuccess: (matches) => {
      setSearchError(false);
      setResults(matches as FoodProductMatch[]);
    },
    onError: () => {
      setSearchError(true);
      setResults(null);
    },
  });

  const runTerms = useCallback(
    (terms: string) => {
      const clean = terms.trim();
      if (clean.length < 2) return;
      setQuery(clean);
      setSearchError(false);
      rememberFoodSearch(clean);
      searchMutation.mutate(clean);
    },
    [searchMutation],
  );

  const favoriteKeys = new Set(favorites.map((row) => foodFavoriteKey(row)));
  const showShortcuts = results === null && !searchMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85svh] overflow-y-auto rounded-t-2xl px-4 pb-8 pt-4"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Find the right label</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-xs text-muted-foreground">
          Tap a starred food to use it straight away, or search a product by name and brand to use
          its real numbers.
        </p>

        <div className="mt-3 flex gap-2">
          <Input
            autoFocus
            aria-label="Product name"
            placeholder="e.g. Chobani vanilla yogurt"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runTerms(query);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            aria-label="Search products"
            disabled={searchMutation.isPending || query.trim().length < 2}
            onClick={() => runTerms(query)}
          >
            {searchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {showShortcuts && favorites.length > 0 && (
          <section className="mt-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Star className="h-3.5 w-3.5" aria-hidden />
              Favourite foods
            </h3>
            <ul className="mt-2 space-y-1.5">
              {favorites.slice(0, 8).map((match) => (
                <li key={foodFavoriteKey(match)} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPick(match)}
                    className="tap-target min-w-0 flex-1 rounded-xl border border-border p-3 text-left transition hover:bg-muted"
                  >
                    <div className="truncate text-sm font-medium">
                      {match.brand ? `${match.brand} — ` : ""}
                      {match.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                      {macroLine(match)}
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${match.name} from favourites`}
                    onClick={() => toggleFavoriteFood(match)}
                    className="tap-target rounded-lg p-2 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {showShortcuts && recentTerms.length > 0 && (
          <section className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Recent searches
              </h3>
              <button
                type="button"
                onClick={clearRecentFoodSearches}
                className="text-[11px] text-muted-foreground underline underline-offset-2"
              >
                Clear
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {recentTerms.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => runTerms(term)}
                  className="tap-target rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  {term}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-4 space-y-2">
          {results?.length === 0 && !searchMutation.isPending && (
            <p className="text-sm text-muted-foreground">
              No published panel matched that search. Try the brand name, or fall back to the photo
              estimate below.
            </p>
          )}
          {searchError && !searchMutation.isPending && (
            <p className="text-sm text-destructive" role="alert">
              Food search is temporarily unavailable. Please try again, or use the photo estimate.
            </p>
          )}
          {(results ?? []).map((match) => {
            const starred = favoriteKeys.has(foodFavoriteKey(match));
            return (
              <div key={`${match.barcode}-${match.name}`} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPick(match)}
                  className="tap-target min-w-0 flex-1 rounded-xl border border-border p-3 text-left transition hover:bg-muted"
                >
                  <div className="text-sm font-medium">
                    {match.brand ? `${match.brand} — ` : ""}
                    {match.name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {macroLine(match)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {match.basis === "100g"
                      ? "Per 100 g"
                      : `Per serving${match.servingSize ? ` (${match.servingSize})` : ""}`}
                    {match.barcode ? ` · ${match.barcode}` : ""}
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={starred ? `Unstar ${match.name}` : `Save ${match.name} to favourites`}
                  aria-pressed={starred}
                  onClick={() => toggleFavoriteFood(match)}
                  className="tap-target rounded-lg p-2 text-muted-foreground hover:bg-muted"
                >
                  <Star
                    className={`h-4 w-4 ${starred ? "fill-primary text-primary" : ""}`}
                    aria-hidden
                  />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {onSkip && (
            <Button type="button" className="flex-1" onClick={onSkip}>
              {skipLabel ?? "Use photo estimate"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
