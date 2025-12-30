/// Checks if the given EventTarget is a Node
export function isNode(e: EventTarget | null): e is Node {
  return !(!e || !("nodeType" in e));
}

/// Checks if the given state has a boolean property with the specified key
export function hasBooleanProperty<T extends string>(state: unknown, key: T): state is Record<T, boolean> {
  if (typeof state !== "object" || state === null) {
    return false;
  }

  if (!Object.hasOwn(state, key)) {
    return false;
  }

  const descriptor = Object.getOwnPropertyDescriptor(state, key);

  return descriptor !== undefined && typeof descriptor.value === "boolean";
}

/// Checks if the given value is a Record<string, unknown>
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
