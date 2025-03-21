export function ellipsis(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

// Checks if the _whole_ string is numeric, returning it as a number.
// Returns undefined when non-numeric characters are encountered
export function parseIntStrict(text: string): number | undefined {
  const num = parseInt(text, 10);
  return !isNaN(num) && num.toString() === text ? num : undefined;
}

// Removes leading zeroes from a string, making sure 1 zero is left if there are no other characters
export function removeLeadingZeros(input: string) {
  let result = input;
  while (result[0] === "0" && result.length !== 1) {
    result = result.substring(1);
  }
  return result;
}

// Checks if the _whole_ string is numeric, ignoring leading zeroes, returning it as a number.
// Returns undefined when non-numeric characters are encountered
export function parseIntUserInput(text: string): number | undefined {
  const num = parseInt(text, 10);
  return !isNaN(num) && num.toString() === removeLeadingZeros(text) ? num : undefined;
}
