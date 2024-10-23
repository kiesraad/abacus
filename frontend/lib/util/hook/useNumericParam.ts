import { useParams } from "react-router-dom";

import { parseIntStrict } from "@kiesraad/util";

// Takes a parameter key, then tries to find it in the URL params.
// When it is found, it tries to validate it as a number and returns it.
// Throws an error when the parameter key is not found or not an integer
export function useNumericParam(parameterKey: string): number {
  const params = useParams();
  const param = params[parameterKey];

  if (!param) {
    throw new Error(`Parameter ${parameterKey} does not exist`);
  }

  // Matches only if the whole string is numeric
  const parsedParam = parseIntStrict(param);
  if (parsedParam === undefined) {
    throw new Error(`Parameter ${parameterKey} is not numeric`);
  }

  return parsedParam;
}
