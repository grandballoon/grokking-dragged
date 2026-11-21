/**
 * A tiny virtual filesystem, so the port of printnames can run in the
 * browser. It is a flat list of entries, each naming its parent folder;
 * paths are POSIX-style, rooted at the one entry without a parent.
 *
 * `listdir`, `isfile` and `join` are pure stand-ins for `os.listdir`,
 * `os.path.isfile` and `os.path.join` over such a tree. Like the real
 * `listdir`, this one promises no order: it lists entries in the order the
 * tree stores them, which is why the Python sorts.
 */

export type Entry = {
  readonly id: string;
  readonly name: string;
  readonly kind: "file" | "dir";
  /** The id of the folder holding this entry; null for the root. */
  readonly parent: string | null;
};
export type Tree = readonly Entry[];

export const ROOT = "pics";

/** A plausible pics folder, stored in no particular order. */
export const BOOK_TREE: Tree = [
  { id: "pics", name: "pics", kind: "dir", parent: null },
  { id: "odyssey", name: "odyssey.png", kind: "file", parent: "pics" },
  { id: "2002", name: "2002", kind: "dir", parent: "pics" },
  { id: "trip", name: "trip", kind: "dir", parent: "2002" },
  { id: "sea", name: "sea.png", kind: "file", parent: "trip" },
  { id: "london", name: "london.png", kind: "file", parent: "2002" },
  { id: "2001", name: "2001", kind: "dir", parent: "pics" },
  { id: "space", name: "space.png", kind: "file", parent: "2001" },
  { id: "beach", name: "beach.png", kind: "file", parent: "trip" },
  { id: "a", name: "a.png", kind: "file", parent: "2001" },
];

export function children(tree: Tree, id: string): Entry[] {
  return tree.filter((e) => e.parent === id);
}

/** The entry at a path like "pics/2001/a.png", if there is one. */
export function entryAt(tree: Tree, path: string): Entry | undefined {
  const [rootName, ...rest] = path.split("/");
  let entry = tree.find((e) => e.parent === null && e.name === rootName);
  for (const name of rest) {
    if (entry === undefined) return undefined;
    const parentId: string = entry.id;
    entry = tree.find((e) => e.parent === parentId && e.name === name);
  }
  return entry;
}

export function pathOf(tree: Tree, id: string): string {
  const entry = tree.find((e) => e.id === id);
  if (entry === undefined) throw new Error(`No entry ${id}`);
  return entry.parent === null
    ? entry.name
    : join(pathOf(tree, entry.parent), entry.name);
}

export function listdir(tree: Tree, dir: string): string[] {
  const entry = entryAt(tree, dir);
  if (entry === undefined) {
    throw new Error(`FileNotFoundError: No such file or directory: '${dir}'`);
  }
  if (entry.kind !== "dir")
    throw new Error(`NotADirectoryError: Not a directory: '${dir}'`);
  return children(tree, entry.id).map((e) => e.name);
}

export function isfile(tree: Tree, path: string): boolean {
  return entryAt(tree, path)?.kind === "file";
}

/** `os.path.join` for two relative POSIX parts. */
export function join(a: string, b: string): string {
  if (b.startsWith("/")) return b;
  return a === "" || a.endsWith("/") ? a + b : `${a}/${b}`;
}

/** Whether `id` is `ancestor` or sits somewhere inside it. */
export function isWithin(tree: Tree, id: string, ancestor: string): boolean {
  let at: string | null = id;
  while (at !== null) {
    if (at === ancestor) return true;
    at = tree.find((e) => e.id === at)?.parent ?? null;
  }
  return false;
}

/**
 * Every tree reachable by moving entry `id` into another folder (the
 * current tree included): never into itself or its own contents, and never
 * next to an entry with the same name.
 */
export function moves(tree: Tree, id: string): Tree[] {
  const entry = tree.find((e) => e.id === id);
  if (entry === undefined || entry.parent === null) return [tree];
  const result: Tree[] = [tree];
  for (const folder of tree) {
    if (folder.kind !== "dir" || folder.id === entry.parent) continue;
    if (isWithin(tree, folder.id, id)) continue;
    if (children(tree, folder.id).some((e) => e.name === entry.name)) continue;
    result.push(tree.map((e) => (e.id === id ? { ...e, parent: folder.id } : e)));
  }
  return result;
}
