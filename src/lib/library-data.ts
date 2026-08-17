import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export type LibraryCompound = {
  id: string;
  name: string;
  slug: string;
  category: string;
  aliases: string[] | null;
  goal_tags: string[];
  half_life_hours: number | null;
  typical_timing: string | null;
  food_rule: string | null;
  is_injectable: boolean | null;
  is_controlled: boolean | null;
  education_md: string | null;
  created_at: string | null;
};

export async function fetchAllCompounds(): Promise<LibraryCompound[]> {
  // NOTE: education_md is deliberately NOT selected here. This list query runs on
  // every library/goal/compare page view; the long-form field is only ever read
  // from the single-compound query, so shipping it made the payload ~10x bigger.
  const { data, error } = await supabase
    .from("compounds")
    .select(
      "id,name,slug,category,aliases,goal_tags,half_life_hours,typical_timing,food_rule,is_injectable,is_controlled,created_at",
    )
    .order("name");

  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, education_md: null })) as LibraryCompound[];
}

export const allCompoundsQuery = queryOptions({
  queryKey: ["library", "compounds"],
  queryFn: fetchAllCompounds,
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
});

export async function fetchCompoundBySlug(slug: string) {
  const { data, error } = await supabase
    .from("compounds")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function compoundBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: ["library", "compound", slug],
    queryFn: () => fetchCompoundBySlug(slug),
    staleTime: 5 * 60 * 1000,
  });
}

export async function fetchCompoundContent(compoundId: string) {
  const { data, error } = await supabase
    .from("compound_content")
    .select("*")
    .eq("compound_id", compoundId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function compoundContentQuery(compoundId: string) {
  return queryOptions({
    queryKey: ["library", "content", compoundId],
    queryFn: () => fetchCompoundContent(compoundId),
    staleTime: 5 * 60 * 1000,
  });
}

export async function fetchInteractionsForCompound(compoundId: string, category: string) {
  const { data, error } = await supabase
    .from("interaction_rules")
    .select("*")
    .or(
      `compound_a_id.eq.${compoundId},compound_b_id.eq.${compoundId},category_a.eq.${category},category_b.eq.${category}`,
    );
  if (error) throw error;
  return data ?? [];
}

export function interactionsForCompoundQuery(compoundId: string, category: string) {
  return queryOptions({
    queryKey: ["library", "interactions", compoundId],
    queryFn: () => fetchInteractionsForCompound(compoundId, category),
    staleTime: 5 * 60 * 1000,
  });
}

export async function fetchGoalContent(slug: string) {
  const { data, error } = await supabase
    .from("goal_content")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function goalContentQuery(slug: string) {
  return queryOptions({
    queryKey: ["library", "goal-content", slug],
    queryFn: () => fetchGoalContent(slug),
    staleTime: 5 * 60 * 1000,
  });
}

export interface CompoundReference {
  pmid: string;
  title: string;
  journal: string | null;
  year: string | null;
  position: number;
}

/**
 * Real PubMed citations for a compound (resolved from PubMed E-utilities and
 * stored in `compound_references`). Used for the visible "Key studies" list and
 * for ScholarlyArticle citation JSON-LD.
 */
export async function fetchCompoundReferences(slug: string): Promise<CompoundReference[]> {
  const { data, error } = await supabase
    .from("compound_references")
    .select("pmid,title,journal,year,position")
    .eq("compound_slug", slug)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CompoundReference[];
}

export function compoundReferencesQuery(slug: string) {
  return queryOptions({
    queryKey: ["library", "references", slug],
    queryFn: () => fetchCompoundReferences(slug),
    staleTime: 60 * 60 * 1000,
  });
}
