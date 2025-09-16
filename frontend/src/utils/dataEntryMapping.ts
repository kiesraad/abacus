import { DataEntryResults, DataEntrySection, SectionValues } from "@/types/types";
import { parseIntUserInput } from "@/utils/strings";

type PathSegment = string | number;
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
    setValueAtPath(newResults, path, value, valueType);
  });

  return newResults;
}

export function mapResultsToSectionValues(section: DataEntrySection, results: DataEntryResults): SectionValues {
  const formValues: SectionValues = {};

  const fieldInfoMap = extractFieldInfoFromSection(section);
  for (const path of fieldInfoMap.keys()) {
    const value = getValueAtPath(results, path);
    formValues[path] = valueToString(value);
  }

  return formValues;
}

function setValueAtPath(
  results: DataEntryResults,
  path: string,
  value: string,
  valueType: "boolean" | "number" | undefined,
): void {
  const segments = parsePathSegments(path);
  const processedValue = processValue(value, valueType);

  let current: unknown = results;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];

    if (segment === undefined) continue;

    if (typeof segment === "number") {
      if (Array.isArray(current)) {
        ensureArrayLength(current, segment + 1);
        current = current[segment];
      }
    } else {
      if (isRecord(current)) {
        if (!(segment in current)) {
          current[segment] = typeof nextSegment === "number" ? [] : {};
        }
        current = current[segment];
      }
    }
  }

  const finalSegment = segments[segments.length - 1];
  if (finalSegment !== undefined && isRecord(current)) {
    current[finalSegment] = processedValue;
  }
}

export function getValueAtPath(results: DataEntryResults, path: string): PathValue {
  const segments = parsePathSegments(path);

  const result = segments.reduce<unknown>((current, segment) => {
    if (current === undefined) return undefined;

    if (typeof segment === "number") {
      return Array.isArray(current) && segment < current.length ? current[segment] : undefined;
    } else {
      return isRecord(current) && segment in current ? current[segment] : undefined;
    }
  }, results);

  return isPathValue(result) ? result : undefined;
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

function valueToString(value: PathValue): string {
  if (value === undefined || value === 0) {
    return "";
  }
  return String(value);
}

function parsePathSegments(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  let current = "";
  let i = 0;

  while (i < path.length) {
    const char = path[i];
    if (!char) break;

    if (char === ".") {
      if (current) {
        segments.push(current);
        current = "";
      }
    } else if (char === "[") {
      if (current) {
        segments.push(current);
        current = "";
      }
      i++;
      while (i < path.length && path[i] !== "]") {
        const char = path[i];
        if (char) {
          current += char;
        }
        i++;
      }
      if (current && /^\d+$/.test(current)) {
        segments.push(parseInt(current, 10));
        current = "";
      }
    } else if (char !== "]") {
      current += char;
    }

    i++;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPathValue(value: unknown): value is PathValue {
  return typeof value === "boolean" || typeof value === "number" || typeof value === "string" || value === undefined;
}

function ensureArrayLength(arr: unknown[], minLength: number): void {
  while (arr.length < minLength) {
    arr.push({});
  }
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
