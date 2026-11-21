import { describe, expect, it } from "vitest";
import { chapterNumber, groupByBookAndChapter, VIZZES } from "./registry";

describe("sidebar grouping", () => {
  it("orders each book's chapters by number", () => {
    for (const { chapters } of groupByBookAndChapter(VIZZES)) {
      const numbers = chapters.map((c) => chapterNumber(c.chapter));
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    }
  });

  it("gives every chapter number one title per book", () => {
    for (const { book, chapters } of groupByBookAndChapter(VIZZES)) {
      const numbers = chapters.map((c) => chapterNumber(c.chapter));
      expect(new Set(numbers).size, book).toBe(numbers.length);
    }
  });

  it("uses unique page ids", () => {
    const ids = VIZZES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
