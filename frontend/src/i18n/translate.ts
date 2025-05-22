import { ReactElement } from "react";

import { DEFAULT_ALLOWED_TAGS, parse, renderAst } from "./format";
import { locale, translations } from "./i18n";
import { RenderCallback, TranslationPath } from "./i18n.types";

// get the translation for the given path key, return undefined if not found
function getTranslation(path: string): string | undefined {
  const segments = path.split(".");

  const value = segments.reduce((o: unknown, k: string) => {
    if (o && typeof o === "object" && k in o) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      return o[k as keyof typeof o];
    } else {
      return undefined;
    }
  }, translations[locale]);

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

// check if the given path key exists in the translations
export function hasTranslation(path: string): boolean {
  const value = getTranslation(path);

  return typeof value === "string" ? true : false;
}

// get the translation for the given path key, return the path key if not found
export function translate(path: TranslationPath): string {
  const value = getTranslation(path);

  return typeof value === "string" ? value : path;
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
 *    <h1>{t("elections")}</h1>
 *    <p>{t('elections_count', { count: numberOfElections })}</p>
 *  </div>
 * );
 */
export function t(k: TranslationPath, vars?: Record<string, string | number>): string {
  if (vars) {
    return Object.entries(vars).reduce((acc, [key, value]) => acc.replace(`{${key}}`, value.toString()), translate(k));
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
 *    <h1>{t("internal_error")}</h1>
 *    <p>{tx('check_manual_instruction', { link: (title) => <a href="/manual">{title}</a> })}</p>
 *  </div>
 * );
 */
export function tx(
  k: TranslationPath,
  elements?: Record<string, RenderCallback>,
  vars?: Record<string, string | number>,
): ReactElement {
  const text = vars ? t(k, vars) : translate(k);

  const allowed = elements ? [...DEFAULT_ALLOWED_TAGS, ...Object.keys(elements)] : DEFAULT_ALLOWED_TAGS;

  return renderAst(parse(text, allowed), elements);
}
