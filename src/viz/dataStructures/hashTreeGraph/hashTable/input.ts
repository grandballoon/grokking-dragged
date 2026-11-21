import { script } from "../../opScript";
import type { Input } from "./trace";

/** Collisions in buckets 1, 2 and 3, the hash(-1) quirk, and a failed delete. */
export const INITIAL_INPUT: Input = {
  buckets: 5,
  ops: script(
    ["insert", 6],
    ["insert", 4],
    ["insert", 11],
    ["insert", 2],
    ["insert", -1],
    ["insert", 9],
    ["search", 6],
    ["search", -1],
    ["contains", -1],
    ["delete", 4],
    ["delete", 11],
    ["delete", 7],
  ),
};
