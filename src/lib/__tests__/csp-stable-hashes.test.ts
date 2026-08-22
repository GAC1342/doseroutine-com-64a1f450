import { describe, expect, it } from "vitest";
import { BOOT_INLINE_SCRIPT, STABLE_INLINE_SCRIPTS } from "../boot-script";
import {
  applyNonceToHtml,
  buildContentSecurityPolicy,
  computeScriptHashes,
  stableScriptHashes,
} from "../security-headers";

const html = `<html><head><script>${BOOT_INLINE_SCRIPT}</script><script src="/a.js"></script><script>window.__x=1</script></head><body></body></html>`;

describe("stable inline script hashes", () => {
  it("leaves the stable boot script nonce-free and nonces everything else", () => {
    const out = applyNonceToHtml(html, "abc123");
    expect(out).toContain(`<script>${BOOT_INLINE_SCRIPT}</script>`);
    expect(out).toContain('<script nonce="abc123">window.__x=1</script>');
    expect(out).toContain('<script nonce="abc123" src="/a.js">');
  });

  it("allows the boot script by hash in the production policy", async () => {
    const hashes = await stableScriptHashes();
    expect(hashes).toHaveLength(STABLE_INLINE_SCRIPTS.length);
    const documentHashes = await computeScriptHashes(html);
    for (const hash of hashes) expect(documentHashes).toContain(hash);

    const policy = buildContentSecurityPolicy({ nonce: "abc123", scriptHashes: hashes });
    for (const hash of hashes) expect(policy).toContain(`'${hash}'`);
    expect(policy).toContain("'strict-dynamic'");
  });

  it("keeps hashes stable across responses so cached bodies stay valid", async () => {
    expect(await stableScriptHashes()).toEqual(await stableScriptHashes());
  });
});
