import { Locale, Translation } from "./i18n.types";
import nl from "./locales/nl/nl";

export * from "./i18n.types";
export * from "./i18n";
export * from "./format";

export let locale: Locale = Locale.nl;

export function setLocale(l: Locale) {
  locale = l;
}

export const translations: Record<Locale, Translation> = {
  [Locale.nl]: nl,
};
