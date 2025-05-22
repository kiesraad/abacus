import { Locale, Translation } from "./i18n.types";
import nl from "./locales/nl/nl";

export let locale: Locale = Locale.nl;

export function setLocale(l: Locale) {
  locale = l;
}

export const translations: Record<Locale, Translation> = {
  [Locale.nl]: nl,
};
