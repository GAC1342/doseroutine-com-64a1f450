import { describe, expect, it } from "vitest";
import { friendlyOAuthError, readCallbackError } from "@/lib/oauth-error";

describe("friendlyOAuthError", () => {
  it("explains a rejected return URL without jargon", () => {
    const msg = friendlyOAuthError("Invalid web redirect url", "apple");
    expect(msg).toContain("Apple rejected the return address");
    expect(msg).toContain("email sign-in");
  });

  it("handles a disabled provider", () => {
    expect(friendlyOAuthError("provider 'apple' is not supported", "apple")).toContain(
      "isn't available right now",
    );
  });

  it("handles cancellation", () => {
    expect(friendlyOAuthError("access_denied", "apple")).toContain("cancelled");
  });

  it("falls back to a framed raw message", () => {
    expect(friendlyOAuthError("weird backend blip", "google")).toBe(
      "Google sign-in failed: weird backend blip",
    );
  });

  it("has a message when the provider says nothing", () => {
    expect(friendlyOAuthError("", "apple")).toBe(
      "Apple sign-in didn't complete. Please try again.",
    );
  });
});

describe("readCallbackError", () => {
  it("reads query params", () => {
    expect(
      readCallbackError("?error=access_denied&error_description=User+cancelled", ""),
    ).toContain("User cancelled");
  });

  it("reads hash params", () => {
    expect(readCallbackError("", "#error=invalid_request")).toContain("invalid_request");
  });

  it("returns null on a clean callback", () => {
    expect(readCallbackError("?code=abc", "")).toBeNull();
  });
});
