import type { ReactElement } from "react";

import type nl from "./locales/nl/nl";

export enum Locale {
  nl = "nl",
}

// list all object paths as tuples
type TranslationValue<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...TranslationValue<T[K]>];
    }[Extract<keyof T, string>];

// use this to join the keys of a translation object
// see https://github.com/microsoft/TypeScript/pull/40336 for type magic happening here
type Join<T extends string[]> = T extends []
  ? never
  : T extends [infer F]
    ? F
    : T extends [infer F, ...infer R]
      ? F extends string
        ? `${F}.${Join<Extract<R, string[]>>}`
        : never
      : string;

// a type for translations keys as paths (e.g. "candidates_votes.check_paper_report" | ...)
export type TranslationPath = Join<TranslationValue<Translation>>;

// Dutch is our type source for translations
export type Translation = typeof nl;

export type RenderFunction = (contents: ReactElement, attributes?: Record<string, string>) => ReactElement;
