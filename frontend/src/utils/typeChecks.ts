export function isNode(e: EventTarget | null): e is Node {
  if (!e || !("nodeType" in e)) {
    return false;
  }

  return true;
}

export function hasBooleanProperty<T extends string>(state: unknown, key: T): state is Record<T, boolean> {
  if (typeof state !== "object" || state === null) {
    return false;
  }

  if (!Object.prototype.hasOwnProperty.call(state, key)) {
    return false;
  }

  const descriptor = Object.getOwnPropertyDescriptor(state, key);

  return descriptor !== undefined && typeof descriptor.value === "boolean";
}
