import type { DataEntryResults, DataEntrySection, SectionValues } from "@/types/types";
import { parseIntUserInput } from "@/utils/strings";

type PathValue = boolean | number | string | undefined;

/**
 * Extracts all data field paths and their types from a DataEntrySection as a Map
 * @param section The data entry section to extract field information from
 * @returns Map where key is the field path and value is the field type
 */
export function extractFieldInfoFromSection(section: DataEntrySection): Map<string, "boolean" | "number"> {
  const fieldInfoMap = new Map<string, "boolean" | "number">();

  for (const subsection of section.subsections) {
    switch (subsection.type) {
      case "radio":
        fieldInfoMap.set(subsection.path, "boolean");
        break;
      case "inputGrid":
        for (const row of subsection.rows) {
          fieldInfoMap.set(row.path, "number");
        }
        break;
      case "checkboxes":
        for (const option of subsection.options) {
          fieldInfoMap.set(option.path, "boolean");
        }
        break;
    }
  }

  return fieldInfoMap;
}

export function mapSectionValues<T extends DataEntryResults>(
  currentResults: T,
  formValues: SectionValues,
  section: DataEntrySection,
): T {
  const newResults: T = structuredClone(currentResults);

  const fieldInfoMap = extractFieldInfoFromSection(section);

  Object.entries(formValues).forEach(([path, value]) => {
    const valueType = fieldInfoMap.get(path);
    (newResults as Record<string, PathValue>)[path] = processValue(value, valueType);
  });

  return newResults;
}

export function mapResultsToSectionValues(section: DataEntrySection, results: DataEntryResults): SectionValues {
  const formValues: SectionValues = {};

  const fieldInfoMap = extractFieldInfoFromSection(section);
  for (const path of fieldInfoMap.keys()) {
    formValues[path] = valueToString((results as Record<string, PathValue>)[path]);
  }

  return formValues;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO function should be refactored
function processValue(
  value: string,
  valueType: "boolean" | "number" | undefined,
): boolean | number | string | undefined {
  if (valueType === "boolean") {
    if (value === "") {
      return undefined;
    }
    return value === "true";
  }

  if (valueType === "number") {
    return parseIntUserInput(value) ?? 0;
  }

  return value;
}

function valueToString(value: PathValue): string {
  if (value === undefined || value === 0) {
    return "";
  }
  return String(value);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO function should be refactored
/**
 * Combine the previousValue and correction by returning previousValue if correction is empty and else the correction.
 * Note that this also returns the correction if it is set to zero.
 */
export function correctedValue(previousValue: string | undefined, correction: string): string {
  if (previousValue === undefined) {
    return correction;
  }

  if (correction !== "") {
    return correction;
  } else {
    return previousValue;
  }
}

/**
 * Determine the corrections by comparing previousValues and currentValues.
 * The correction is set to "", if the current value and the previous value are the same,
 * and else set to the current value (changing "" into "0").
 */
export function determineCorrections(previousValues: SectionValues, currentValues: SectionValues) {
  const corrections = { ...currentValues };
  for (const field in previousValues) {
    if (currentValues[field] === previousValues[field]) {
      corrections[field] = "";
    } else if (currentValues[field] === "") {
      corrections[field] = "0";
    }
  }
  return corrections;
}
