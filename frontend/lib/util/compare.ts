export type Primitive = string | number | boolean | null | undefined;

export function isPrimitive(value: unknown): value is Primitive {
  return value === null || (typeof value !== "object" && typeof value !== "function");
}

export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;

  if (isPrimitive(obj1) || isPrimitive(obj2)) return obj1 === obj2;

  if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1) as Array<keyof typeof obj1>;
  const keys2 = Object.keys(obj2) as Array<keyof typeof obj2>;

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    const val1 = (obj1 as Record<string, unknown>)[key];
    const val2 = (obj2 as Record<string, unknown>)[key];
    if (!deepEqual(val1, val2)) {
      return false;
    }
  }

  return true;
}
