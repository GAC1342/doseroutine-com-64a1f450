import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

// vitest-axe 0.1.0 declares matcher symbols with `export type` but exports
// real values at runtime. Cast the module to `unknown` to bypass the type.
const { toHaveNoViolations } = axeMatchers as unknown as {
  toHaveNoViolations: (results: unknown) => { pass: boolean; message: () => string };
};

// vitest-axe's built-in `extend-expect` augments legacy `Vi.Assertion`
// which vitest 4 no longer wires to `expect`. Register the matcher directly.
expect.extend({ toHaveNoViolations });
