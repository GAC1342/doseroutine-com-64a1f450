import "vitest";
import type { AxeResults } from "axe-core";

// vitest-axe (0.1.0) augments the legacy `Vi.Assertion` namespace, but
// Vitest 4 expects matchers on the `Matchers` interface from `vitest`.
// Bridge the types so `expect(results).toHaveNoViolations()` type-checks.
interface AxeMatchers<R = unknown> {
  toHaveNoViolations: (results?: AxeResults) => R;
}

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends AxeMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
