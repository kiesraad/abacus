export function fieldNameFromPath(path: string): string {
  const bits = path.split(".");
  return bits[bits.length - 1] || path;
}

/**
 *
 * @param fields Fields in Validation result data.<formsection>.<field>
 * @param formSections keys in response data to match
 * @returns true if fields match formSections
 */
export function matchValidationResultWithFormSections(
  fields: string[],
  formSections: string[],
): boolean {
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field) {
      const bits = field.split(".");
      let result = false;
      for (let j = 0; j < formSections.length; j++) {
        const section = formSections[j];
        if (section) {
          if (bits.includes(section)) {
            result = true;
            break;
          }
        }
      }
      if (!result) {
        return false;
      }
    }
  }
  return true;
}
