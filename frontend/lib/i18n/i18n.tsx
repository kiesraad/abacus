import { ReactElement } from "react";

import { DEFAULT_ALLOWED_TAGS, locale, parse, renderAst, translations } from ".";

import { Translation } from "./i18n.types";

export type RenderCallback = (contents: ReactElement) => ReactElement;

// get the translation for the given key
export function translate(k: keyof Translation): string {
  return translations[locale][k];
}

/**
 * Translate a text and optionally interpolate variables
 *
 * @param k translation key
 * @param vars variables to interpolate
 * @returns a translated string
 * @example
 *
 * return (
 *  <div>
 *    <h1>{t('elections')}</h1>
 *    <p>{t('elections_count', { count: numberOfElections })}</p>
 *  </div>
 * );
 */
export function t(k: keyof Translation, vars?: Record<string, string>): string {
  if (vars) {
    return Object.entries(vars).reduce((acc, [key, value]) => acc.replace(`{${key}}`, value), translate(k));
  }

  return translate(k);
}

/**
 * Translate a text and optionally interpolate variables and elements
 *
 * @param k translation key
 * @param elements React elements to interpolate
 * @param vars variables to interpolate
 * @returns a translated string
 * @example
 *
 * return (
 *  <div>
 *    <h1>{t('internal_error')}</h1>
 *    <p>{t('check_manual_instruction', { link: (title) => <a href="/manual">{title}</a> })}</p>
 *  </div>
 * );
 */
export function tx(
  k: keyof Translation,
  elements?: Record<string, RenderCallback>,
  vars?: Record<string, string>,
): ReactElement {
  const text = vars ? t(k, vars) : translate(k);

  const allowed = elements ? [...DEFAULT_ALLOWED_TAGS, ...Object.keys(elements)] : DEFAULT_ALLOWED_TAGS;

  return renderAst(parse(text, allowed), elements);
}
