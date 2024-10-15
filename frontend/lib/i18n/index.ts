export enum Locale {
  nl = "nl",
  en = "en",
}

export interface Translation {
  election: string;
  role: string;
  status: string;
  "account.title": string;
}

const translations: Record<Locale, Translation> = {
  [Locale.nl]: {
    election: "Verkiezing",
    role: "Rol",
    status: "Status",
    "account.title": "Je account is ingesteld",
  },
  [Locale.en]: {
    election: "Election",
    role: "Role",
    status: "Status",
    "account.title": "Your account is set up",
  },
};

export const locale: Locale = Locale.nl;

export function t(k: keyof Translation, vars?: Record<string, string>): string {
  if (vars) {
    return Object.entries(vars).reduce((acc, [key, value]) => {
      return acc.replace(`$${key}`, value);
    }, translations[locale][k]);
  }
  return translations[locale][k];
}
