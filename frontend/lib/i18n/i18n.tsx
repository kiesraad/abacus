import { Fragment, ReactElement } from "react";

import { locale, translations } from ".";

import { Translation } from "./i18n.types";

export type RenderCallback = (text: string) => ReactElement;

export function translate(k: keyof Translation): string {
  return translations[locale][k];
}

export function t(k: keyof Translation, vars?: Record<string, string>): string {
  if (vars) {
    return Object.entries(vars).reduce(
      (acc, [key, value]) => (typeof value === "string" ? acc.replace(`$${key}`, value) : acc),
      translate(k),
    );
  }

  return translate(k);
}

export function tx(k: keyof Translation, vars?: Record<string, RenderCallback | string>): Array<string | ReactElement> {
  if (vars) {
    // replace text elements with variables
    const stringVars = Object.entries(vars)
      .filter(([, value]) => typeof value === "string")
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    const text = t(k, stringVars);

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

  return [translate(k)];
}
