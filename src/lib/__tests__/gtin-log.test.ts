import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  clearGtinLog,
  getGtinLog,
  normalizeGtin14,
  setGtinLogSink,
  type GtinNormalizationEvent,
} from "../gtin-log";
import { classifyDuplicate } from "../food-dedupe";

const food = (name: string, gtin: string | null) => ({
  name,
  gtin,
  kcal100: 100,
  protein100: 10,
  carbs100: 10,
  fat100: 2,
});

beforeEach(() => clearGtinLog());
afterEach(() => setGtinLogSink(null));

describe("normalizeGtin14", () => {
  it("pads a UPC-A to GTIN-14 and logs the change", () => {
    const result = normalizeGtin14("012345678905", "test");
    expect(result.value).toBe("00012345678905");
    expect(result.changed).toBe(true);
    expect(result.event).toMatchObject({
      event: "gtin.normalized",
      source: "test",
      raw: "012345678905",
      digits: "012345678905",
      normalized: "00012345678905",
      reason: "padded",
      paddedZeros: 3,
    });
    expect(getGtinLog()).toHaveLength(1);
  });

  it("logs separator stripping together with padding", () => {
    const result = normalizeGtin14("0 12345-678905", "test");
    expect(result.value).toBe("00012345678905");
    expect(result.event?.reason).toBe("stripped-non-digits+padded");
  });

  it("logs an empty result when there are no usable digits", () => {
    const result = normalizeGtin14("n/a", "test");
    expect(result.value).toBe("");
    expect(result.event?.reason).toBe("empty");
  });

  it("does not log when the value is already GTIN-14", () => {
    const result = normalizeGtin14("00012345678905", "test");
    expect(result.changed).toBe(false);
    expect(result.event).toBeNull();
    expect(getGtinLog()).toHaveLength(0);
  });

  it("does not log null/empty input", () => {
    expect(normalizeGtin14(null, "test").changed).toBe(false);
    expect(normalizeGtin14("", "test").changed).toBe(false);
    expect(getGtinLog()).toHaveLength(0);
  });

  it("forwards events to a registered sink", () => {
    const seen: GtinNormalizationEvent[] = [];
    setGtinLogSink((e) => seen.push(e));
    normalizeGtin14("12345678905", "sink-test");
    expect(seen).toHaveLength(1);
    expect(seen[0].source).toBe("sink-test");
  });

  it("survives a throwing sink", () => {
    setGtinLogSink(() => {
      throw new Error("boom");
    });
    expect(() => normalizeGtin14("12345678905", "test")).not.toThrow();
    expect(getGtinLog()).toHaveLength(1);
  });
});

describe("food matching emits normalization events", () => {
  it("records both sides with their source labels when zeros differ", () => {
    const verdict = classifyDuplicate(
      food("Greek Yogurt", "12345678905"),
      food("Greek Yoghurt", "012345678905"),
    );
    expect(verdict.verdict).toBe("exact");

    const log = getGtinLog();
    const sources = log.map((e) => e.source);
    expect(sources).toContain("food-dedupe.incoming");
    expect(sources).toContain("food-dedupe.existing");
    expect(log.every((e) => e.normalized === "00012345678905")).toBe(true);
  });

  it("logs nothing when both barcodes are already GTIN-14", () => {
    classifyDuplicate(
      food("Greek Yogurt", "00012345678905"),
      food("Greek Yoghurt", "00012345678905"),
    );
    expect(getGtinLog()).toHaveLength(0);
  });
});
