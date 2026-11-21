/**
 * Text measurement for the monospace font, so a box can be sized to fit its
 * text before it is drawn. Every glyph of JetBrains Mono (and of the Menlo
 * and Consolas fallbacks) advances 0.6em.
 */

/** The width of `text` set in the monospace font at `size`. */
export function monoWidth(text: string, size = 12): number {
  return text.length * size * 0.6;
}

/** The width of a chip holding `text` at `size`, padded by `pad` in all, in whole pixels. */
export function chipWidth(text: string, size = 12, pad = 16): number {
  return Math.ceil(monoWidth(text, size) + pad);
}
