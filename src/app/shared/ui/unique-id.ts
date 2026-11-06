let counter = 0;

/**
 * Génère un identifiant DOM unique, pour relier libellés, aides et champs
 * (`for`, `aria-labelledby`, `aria-describedby`) dans les composants réutilisables.
 */
export function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
