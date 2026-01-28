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

/**
 * Maps form values to the results object based on the provided section structure
 * @param currentResults The current results object to be updated
 * @param formValues The form values to map into the results
 * @param section The data entry section defining the structure
 * @returns Results object with updated values
 */
export function mapSectionValues<T extends DataEntryResults>(
  currentResults: T,
  formValues: SectionValues,
  section: DataEntrySection,
): T {
  const newResults: T = structuredClone(currentResults);
  const fieldInfoMap = extractFieldInfoFromSection(section);

  for (const [path, value] of Object.entries(formValues)) {
    const valueType = fieldInfoMap.get(path);
    setValueAtPath(newResults, path, value, valueType);
  }

  return newResults;
}

/**
 * Maps results object to form values based on the provided section structure
 * @param section The data entry section defining the structure
 * @param results The data object to map from
 * @returns Form values object with mapped values
 */
export function mapResultsToSectionValues(section: DataEntrySection, results: DataEntryResults): SectionValues {
  const formValues: SectionValues = {};

  const fieldInfoMap = extractFieldInfoFromSection(section);
  for (const path of fieldInfoMap.keys()) {
    const value = getValueAtPath(results, path);
    formValues[path] = valueToString(value);
  }

  return formValues;
}

/**
 * Retrieves the value at the specified path from the results object
 * @param data The data object to retrieve the value from
 * @param path The dot-separated path string (e.g. "political_group_votes.0.total")
 * @returns The value at the specified path or undefined if not found/unexpected type
 */
export function getValueAtPath(data: DataEntryResults, path: string): PathValue {
  const segments = path.split(".");
  const result = traversePath(data, segments);

  return isPathValue(result) ? result : undefined;
}

/**
 * Sets the value at the specified path in the results object
 * @param data The data object to set the value in
 * @param path The dot-separated path string (e.g. "political_group_votes.0.total")
 * @param value The value to set
 * @param valueType The type of the value for processing
 */
function setValueAtPath(
  data: DataEntryResults,
  path: string,
  value: string,
  valueType: "boolean" | "number" | undefined,
): void {
  const segments = path.split(".");
  const lastProperty = segments.pop();
  const refParent = traversePath(data, segments, true);

  if (isRecord(refParent) && lastProperty) {
    refParent[lastProperty] = processValue(value, valueType);
  }
}

/**
 * Traverses the data object based on the provided path segments
 * @param data The data object to traverse
 * @param segments The path segments to follow
 * @param createMissing Whether to create missing objects/arrays along the path
 * @return The value at the end of the path or undefined if not found
 */
function traversePath(data: DataEntryResults, segments: string[], createMissing = false): unknown {
  const handleMissingRecord = (obj: Record<string, unknown>, key: string, nextSegment: string | undefined) => {
    if (nextSegment && obj[key] === undefined) {
      obj[key] = stringContainsInteger(nextSegment) ? [] : {};
    }
  };

  const ensureArrayLength = (arr: unknown[], index: number) => {
    while (arr.length < index + 1) {
      arr.push({});
    }
  };

  return segments.reduce<unknown>((prev, curr, index, segments) => {
    if (isRecord(prev)) {
      if (createMissing) handleMissingRecord(prev, curr, segments[index + 1]);
      return prev[curr];
    }

    if (Array.isArray(prev) && stringContainsInteger(curr)) {
      const arrayIndex = parseInt(curr, 10);
      if (createMissing) ensureArrayLength(prev, arrayIndex);
      return prev[arrayIndex];
    }

    return undefined;
  }, data);
}

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

/**
 * Checks if a string represents a valid integer
 * @param str The string to check
 * @returns True if the string is an integer, false otherwise
 */
function stringContainsInteger(str: string): boolean {
  return /^\d+$/.test(str);
}

function valueToString(value: PathValue): string {
  if (value === undefined || value === 0) {
    return "";
  }
  return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPathValue(value: unknown): value is PathValue {
  return typeof value === "boolean" || typeof value === "number" || typeof value === "string" || value === undefined;
}

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
