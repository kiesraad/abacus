export function classnames(...args: (string | Record<string, string | boolean | number | null | undefined>)[]): string {
  const classes: string[] = [];

  for (const arg of args) {
    if (typeof arg === "string") {
      classes.push(arg);
    } else if (typeof arg === "object") {
      for (const key in arg) {
        if (arg[key]) {
          classes.push(key);
        }
      }
    }
  }

  return classes.join(" ");
}
export const cn = classnames;
