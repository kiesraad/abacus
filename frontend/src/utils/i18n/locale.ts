import nl from "@/assets/i18n/nl/nl";

import { Locale, Translation } from "./i18n.types";

export let locale: Locale = Locale.nl;

export function setLocale(l: Locale) {
  locale = l;
}

export const translations: Record<Locale, Translation> = {
  [Locale.nl]: nl,
};
