/**
 * What a Shorten suggestion saves, as its row and the panel's total say it. Since cells v0.16.0 (yggi/cells#422) a
 * suggestion's `saving` is the structure it saves (decision 049's measure: each leaf a braid writes, one per attribute
 * value, one per cell; names and comments free), not characters (#541).
 */
export const savedText = (saving: number): string => `${saving} in structure`;
