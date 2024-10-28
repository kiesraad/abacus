export enum Locale {
  nl = "nl",
  en = "en",
}

export interface Translation {
  election: string;
  role: string;
  status: string;
  "account.title": string;
  test: string;
}

export const translations: Record<Locale, Translation> = {
  [Locale.nl]: {
    election: "Verkiezing",
    role: "Rol",
    status: "Status",
    "account.title": "Je account is ingesteld",
    test: "Hallo wereld, <link>hier<link> is de uitleg",
  },
  [Locale.en]: {
    election: "Election",
    role: "Role",
    status: "Status",
    "account.title": "Your account is set up",
    test: "Hello to world, <link>here<link> is the explanation",
  },
};

export const locale: Locale = Locale.en;

export type TranslationKey = keyof Translation;

export function t(k: keyof Translation, vars?: Record<string, string>): string {
  if (vars) {
    return Object.entries(vars).reduce((acc, [key, value]) => {
      return acc.replace(`$${key}`, value);
    }, translations[locale][k]);
  }
  return translations[locale][k];
}

export * from "./react";
