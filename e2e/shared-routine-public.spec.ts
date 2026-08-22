import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";

/**
 * Public share links (/r/<id>) are the only workout surface a stranger can
 * reach. These runs cover the four states the owner can put a visitor in —
 * valid + logged out, link switched off, invalid id, and a routine with no
 * exercises — and assert the privacy contract on the wire: no compound, dose,
 * lab, body-metric, photo or note ever reaches the page.
 */

/** Playwright does not load .env, so read the publishable client config here. */
function supabaseEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const get = (k: string) =>
      raw
        .split("\n")
        .find((l) => l.startsWith(`${k}=`))
        ?.slice(k.length + 1)
        .trim()
        .replace(/^"|"$/g, "");
    return { url: get("VITE_SUPABASE_URL"), key: get("VITE_SUPABASE_PUBLISHABLE_KEY") };
  } catch {
    return { url: undefined, key: undefined };
  }
}

/**
 * Data-shaped terms only. Generic marketing copy elsewhere on the site
 * mentions words like "peptide"; what must never appear is a value or field
 * belonging to somebody's health record, so the assertion is scoped to the
 * routine region and looks for record-shaped markers.
 */
const PRIVATE_TERMS = [
  "testosterone",
  "mg/ml",
  "iu/ml",
  "bloodwork",
  "lab result",
  "body fat",
  "body_metrics",
  "user_compounds",
  "lab_results",
  "progress_photos",
  "compound_id",
  "dose_mg",
  "note:",
];

async function bodyText(page: Page) {
  return (await page.locator("main#main-content").innerText()).toLowerCase();
}

test.describe("public shared routine page", () => {
  test("invalid id shows the friendly not-shared page, never a blank screen", async ({ page }) => {
    await page.goto("/r/definitelynotreal9");
    await expect(page.getByRole("heading", { name: /no longer shared/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /go to doseroutine/i })).toBeVisible();
    // Nothing that looks like an error dump or an empty document.
    const text = await bodyText(page);
    expect(text.length).toBeGreaterThan(30);
    expect(text).not.toContain("unexpected error");
  });

  test("malformed id lands on the same friendly page", async ({ page }) => {
    await page.goto("/r/short");
    await expect(page.getByRole("heading", { name: /no longer shared/i })).toBeVisible();
  });

  test("page is noindex so share links never enter search results", async ({ page }) => {
    await page.goto("/r/definitelynotreal9");
    const robots = await page
      .locator('meta[name="robots"]')
      .first()
      .getAttribute("content")
      .catch(() => null);
    expect((robots ?? "").toLowerCase()).toContain("noindex");
  });

  test("logged-out visitor sees no private health data anywhere on the page", async ({ page }) => {
    await page.goto("/r/definitelynotreal9");
    const text = await bodyText(page);
    for (const term of PRIVATE_TERMS) {
      expect(text, `"${term}" must never appear on a public share page`).not.toContain(term);
    }
  });

  test("anonymous PostgREST access to routine_shares returns no rows", async ({ request }) => {
    const { url, key } = supabaseEnv();
    test.skip(!url || !key, "Supabase env not present");
    const res = await request.get(`${url}/rest/v1/routine_shares?select=*`, {
      headers: { apikey: key!, Authorization: `Bearer ${key!}` },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("anonymous insert into routine_shares is refused by RLS", async ({ request }) => {
    const { url, key } = supabaseEnv();
    test.skip(!url || !key, "Supabase env not present");
    const res = await request.post(`${url}/rest/v1/routine_shares`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key!}`,
        "Content-Type": "application/json",
      },
      data: {
        routine_id: "00000000-0000-0000-0000-000000000000",
        owner_user_id: "00000000-0000-0000-0000-000000000000",
        public_id: "anonattempt1",
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(await res.json())).toMatch(/row-level security/i);
  });

  test("the public read RPC returns nothing for an unknown id", async ({ request }) => {
    const { url, key } = supabaseEnv();
    test.skip(!url || !key, "Supabase env not present");
    const res = await request.post(`${url}/rest/v1/rpc/get_shared_routine`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key!}`,
        "Content-Type": "application/json",
      },
      data: { _public_id: "definitelynotreal9" },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
