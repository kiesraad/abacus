export function fieldNameFromPath(path: string): string {
  const bits = path.split(".");
  return bits[bits.length - 1] || path;
}
