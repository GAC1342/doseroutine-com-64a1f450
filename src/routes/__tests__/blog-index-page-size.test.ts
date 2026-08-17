import { describe, expect, it } from "vitest";
import { blogIndexSearchSchema } from "../blog.index";

describe("blog index search schema", () => {
  it("defaults pageSize to 3", () => {
    const parsed = blogIndexSearchSchema.parse({});
    expect(parsed.pageSize).toBe(3);
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBe("newest");
  });

  it("accepts 3, 6, and 9 as pageSize", () => {
    expect(blogIndexSearchSchema.parse({ pageSize: 3 }).pageSize).toBe(3);
    expect(blogIndexSearchSchema.parse({ pageSize: 6 }).pageSize).toBe(6);
    expect(blogIndexSearchSchema.parse({ pageSize: 9 }).pageSize).toBe(9);
  });

  it("coerces numeric strings from the URL", () => {
    expect(blogIndexSearchSchema.parse({ pageSize: "9" }).pageSize).toBe(9);
    expect(blogIndexSearchSchema.parse({ pageSize: "6" }).pageSize).toBe(6);
  });

  it("falls back to 3 for every unsupported value", () => {
    for (const bad of [12, -1, 0, 3.5, Number.NaN, Infinity, "abc", "", null, undefined, {}, []]) {
      expect(blogIndexSearchSchema.parse({ pageSize: bad }).pageSize).toBe(3);
    }
  });
});
