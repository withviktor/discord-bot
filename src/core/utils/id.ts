import { nanoid } from "nanoid";

/**
 * Generates a prefixed random ID.
 * e.g. generateId("C") → "CaB3xK9mRq"
 *      generateId("T") → "TmN7pL2wXz"
 */
export function generateId(prefix: string, length = 10): string {
  return `${prefix}${nanoid(length)}`;
}
