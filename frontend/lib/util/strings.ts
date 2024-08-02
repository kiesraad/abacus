export function ellipsis(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

// Checks if the _whole_ string is numeric, returning it as a number
// returns undefined when non-numeric characters are encountered
export function parseIntStrict(text: string, radix: number = 10): number | undefined {
  return /^\d+$/.test(text) ? parseInt(text, radix) : undefined;
}
