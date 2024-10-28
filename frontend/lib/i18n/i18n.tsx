import { Fragment, ReactElement } from "react";

import { locale, translations } from ".";

import { Translation } from "./i18n.types";

export type RenderCallback = (text: string) => ReactElement;

export function t(k: keyof Translation, vars?: Record<string, RenderCallback | string>): Array<string | ReactElement> {
  if (vars) {
    // replace text elements with variables
    const text = Object.entries(vars).reduce(
      (acc, [key, value]) => (typeof value === "string" ? acc.replace(`$${key}`, value) : acc),
      translations[locale][k],
    );

    // replace tags for tag callbacks
    return Object.entries(vars).reduce(
      (acc: Array<string | ReactElement>, [key, value]) => {
        if (typeof value !== "string") {
          return acc.flatMap((part) => {
            if (typeof part !== "string") {
              return [part] as Array<string | ReactElement>;
            }

            const search = new RegExp(`<${key}>(.*)</${key}>`, "g");
            const found = part.split(search);

            if (found.length === 3) {
              return [
                <Fragment key="incipit">{found[0]}</Fragment>,
                <Fragment key="medium">{value(found[1] as string)}</Fragment>,
                <Fragment key="finem">{found[2]}</Fragment>,
              ] as Array<string | ReactElement>;
            }

            return [part] as Array<string | ReactElement>;
          });
        }

        return acc;
      },
      [text],
    );
  }

  return [translations[locale][k]];
}
