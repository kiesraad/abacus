import { ReactElement } from "react";

import { DEFAULT_ALLOWED_TAGS, locale, parse, renderAst, translations } from ".";

import { Translation } from "./i18n.types";

export type RenderCallback = (contents: ReactElement) => ReactElement;

// get the translation for the given key
export function translate(k: keyof Translation): string {
  return translations[locale][k];
}

// translate the given key and replace the variables
export function t(k: keyof Translation, vars?: Record<string, string>): string {
  if (vars) {
    return Object.entries(vars).reduce((acc, [key, value]) => acc.replace(`$${key}`, value), translate(k));
  }

  return translate(k);
}

// translate and render the translation with the given elements
export function tx(k: keyof Translation, elements?: Record<string, RenderCallback>): ReactElement {
  const text = translate(k);

  if (elements) {
    const allowed = [...DEFAULT_ALLOWED_TAGS, ...Object.keys(elements)];
    return renderAst(parse(text, allowed), elements);
  }

  return <>{text}</>;
}

// translate and render the translation with the given variables and elements
export function ttx(
  k: keyof Translation,
  vars?: Record<string, string>,
  elements?: Record<string, RenderCallback>,
): ReactElement {
  const text = vars ? t(k, vars) : translate(k);

  if (elements) {
    const allowed = [...DEFAULT_ALLOWED_TAGS, ...Object.keys(elements)];
    return renderAst(parse(text, allowed), elements);
  }

  return <>{text}</>;
}
