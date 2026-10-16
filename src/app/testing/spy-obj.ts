import {type Mocked, vi} from 'vitest';

/**
 * Équivalent Vitest de `jasmine.createSpyObj`, au comportement identique :
 * - chaque méthode listée est un `vi.fn()` sans implémentation (renvoie `undefined`) ;
 * - chaque propriété est un accesseur dont la lecture est un espion renvoyant la valeur
 *   donnée (modifiable avec `Object.getOwnPropertyDescriptor(obj, nom)!.get`) et dont
 *   l'écriture est un espion sans effet, comme les propriétés espionnées de Jasmine.
 *
 * @param baseName nom affiché dans les messages d'échec (`<baseName>.<méthode>`).
 * @param methodNames méthodes à créer.
 * @param properties propriétés et leur valeur initiale.
 */
export function createSpyObj<T = any>(
  baseName: string,
  methodNames: readonly string[],
  properties: Record<string, unknown> = {}
): Mocked<T> {
  const obj: Record<string, unknown> = {};
  for (const method of methodNames) {
    obj[method] = vi.fn().mockName(`${baseName}.${method}`);
  }
  for (const [name, value] of Object.entries(properties)) {
    Object.defineProperty(obj, name, {
      get: vi.fn().mockName(`${baseName}.${name}.get`).mockReturnValue(value),
      set: vi.fn().mockName(`${baseName}.${name}.set`),
      enumerable: true,
      configurable: true
    });
  }
  return obj as Mocked<T>;
}
