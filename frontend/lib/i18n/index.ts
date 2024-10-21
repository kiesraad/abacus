import { Locale, Translation } from "./i18n.types";
import { en } from "./locales/en";
import { nl } from "./locales/nl";

export * from "./i18n.types";
export * from "./i18n";

export const locale: Locale = Locale.nl;

export const translations: Record<Locale, Translation> = {
  [Locale.nl]: nl,
  [Locale.en]: en,
};
