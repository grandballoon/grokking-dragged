import { ALGORITHMS } from "../viz/algorithms";
import { DATA_STRUCTURES } from "../viz/dataStructures";
import type { Book, VizEntry } from "../viz/defineViz";

export const VIZZES: readonly VizEntry[] = [...ALGORITHMS, ...DATA_STRUCTURES];

export type BookGroup = {
  readonly book: Book;
  readonly chapters: readonly {
    readonly chapter: string;
    readonly entries: VizEntry[];
  }[];
};

/** The number a chapter label starts with, as in "10 · Greedy algorithms". */
export function chapterNumber(chapter: string): number {
  const n = Number.parseInt(chapter, 10);
  if (Number.isNaN(n)) throw new Error(`chapter label without a number: ${chapter}`);
  return n;
}

/**
 * Group entries for the sidebar: books in registry order, chapters by
 * number, and entries within a chapter in registry order.
 */
export function groupByBookAndChapter(entries: readonly VizEntry[]): BookGroup[] {
  const books: { book: Book; chapters: { chapter: string; entries: VizEntry[] }[] }[] =
    [];
  for (const entry of entries) {
    let book = books.find((b) => b.book === entry.book);
    if (book === undefined) {
      book = { book: entry.book, chapters: [] };
      books.push(book);
    }
    let chapter = book.chapters.find((c) => c.chapter === entry.chapter);
    if (chapter === undefined) {
      chapter = { chapter: entry.chapter, entries: [] };
      book.chapters.push(chapter);
    }
    chapter.entries.push(entry);
  }
  for (const book of books) {
    book.chapters.sort((a, b) => chapterNumber(a.chapter) - chapterNumber(b.chapter));
  }
  return books;
}
