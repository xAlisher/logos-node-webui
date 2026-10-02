import { expect, test } from "vitest";

import {
  canonical,
  compareLepta,
  format,
  isAmountInput,
  normalizeInput,
  sumLepta,
  toLepta,
} from "./units";

test("format groups integer digits and trims the fraction", () => {
  expect(format("1500000000")).toBe("1.5 LGO");
  expect(format("1234567890000")).toBe("1,234.56789 LGO");
  expect(format("1")).toBe("0.000000001 LGO"); // never rounds a lepta to 0
  expect(format("abc")).toBe("");
});

test("toLepta is exact or refuses", () => {
  expect(toLepta("1.5")).toBe("1500000000");
  expect(toLepta("2")).toBe("2000000000");
  expect(toLepta("")).toBe("");
  expect(toLepta("1.2345678901")).toBe(""); // more places than the chain has
});

test("canonical round-trips what copy hands over", () => {
  expect(canonical("1500000000")).toBe("1.5");
  expect(canonical("5000000000")).toBe("5");
});

test("compareLepta orders at any width; NaN on non-numeric", () => {
  expect(compareLepta("2000000000", "5000000000")).toBe(-1);
  expect(compareLepta("5000000000", "5000000000")).toBe(0);
  expect(compareLepta("9000000000", "5000000000")).toBe(1);
  expect(Number.isNaN(compareLepta("x", "5"))).toBe(true);
});

test("sumLepta adds exactly and skips non-numeric", () => {
  expect(sumLepta([1000000000, 2000000000])).toBe("3000000000");
  expect(sumLepta(["1000000000", "bad", "2000000000"])).toBe("3000000000");
});

test("input grammar + normalisation", () => {
  expect(isAmountInput("1.")).toBe(true);
  expect(isAmountInput("1.5")).toBe(true);
  expect(isAmountInput("abc")).toBe(false);
  expect(isAmountInput("1.2345678901")).toBe(false);
  expect(normalizeInput("1,234.5")).toBe("1234.5");
});
