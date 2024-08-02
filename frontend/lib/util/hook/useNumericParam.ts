import { useParams } from "react-router-dom";

// Takes a parameter key, then tries to find it in the URL params.
// When it is found, it tries to validate it as a number and returns it.
// Throws an error when the paramater key is not found or not an integer
export function useNumericParam(parameterKey: string): number {
  const params = useParams();
  const param = params[parameterKey];

  if (!param) {
    throw Error(`Parameter ${parameterKey} does not exist`);
  }

  // Matches only if the whole string is numeric
  if (!/^\d+$/.test(param)) {
    throw Error(`Parameter ${parameterKey} is not numeric`);
  }

  return parseInt(param, 10);
}
