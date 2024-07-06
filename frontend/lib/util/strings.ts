export function ellipsis(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}
