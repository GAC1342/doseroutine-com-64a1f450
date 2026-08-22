import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain JS CI script, no type declarations needed here.
import { compare, INSTALL_COMMAND } from "../../../scripts/check-node-modules-sync.mjs";

type Installed = Record<string, { version?: string }>;

function reader(installed: Installed) {
  return (lockPath: string) => installed[lockPath] ?? null;
}

const lock = {
  packages: {
    "": { name: "app", version: "1.0.0" },
    "node_modules/left-pad": { version: "1.3.0" },
    "node_modules/react": { version: "19.0.0" },
    "node_modules/linked": { link: true, resolved: "packages/linked" },
  },
};

describe("node_modules vs package-lock sync check", () => {
  it("passes when every locked package is installed at the pinned version", () => {
    const { checked, problems } = compare(
      lock,
      reader({
        "node_modules/left-pad": { version: "1.3.0" },
        "node_modules/react": { version: "19.0.0" },
      }),
    );
    expect(checked).toBe(2); // link entries and the root project are skipped
    expect(problems).toEqual([]);
  });

  it("flags a package that is missing from disk", () => {
    const { problems } = compare(lock, reader({ "node_modules/react": { version: "19.0.0" } }));
    expect(problems).toEqual([
      { name: "node_modules/left-pad", kind: "missing", expected: "1.3.0", actual: null },
    ]);
  });

  it("flags a package installed at the wrong version", () => {
    const { problems } = compare(
      lock,
      reader({
        "node_modules/left-pad": { version: "1.3.0" },
        "node_modules/react": { version: "18.3.1" },
      }),
    );
    expect(problems).toEqual([
      {
        name: "node_modules/react",
        kind: "version-mismatch",
        expected: "19.0.0",
        actual: "18.3.1",
      },
    ]);
  });

  it("uses the same install command CI runs", () => {
    expect(INSTALL_COMMAND).toBe("npm ci");
  });
});
