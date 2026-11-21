import { script } from "../../opScript";
import type { Input } from "./trace";

/**
 * Builds a seven-node tree, then deletes a node whose replacement is its own
 * left child, one whose replacement sits deeper, a leaf, and a value that
 * isn't there, before counting and listing what is left.
 */
export const INITIAL_INPUT: Input = {
  ops: script(
    ["insert", 50],
    ["insert", 30],
    ["insert", 70],
    ["insert", 20],
    ["insert", 40],
    ["insert", 35],
    ["insert", 60],
    ["contains", 35],
    ["delete", 30],
    ["delete", 50],
    ["delete", 60],
    ["delete", 99],
    ["__len__"],
    ["__iter__"],
  ),
};
