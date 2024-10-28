export type TranslationKey = keyof Translation;

export enum Locale {
  nl = "nl",
  en = "en",
}

export interface Translation {
  election: string;
  elections: string;
  manage_elections: string;
  role: string;
  status: string;
  "account.configured": string;
  test: string;
}
