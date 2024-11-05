export type TranslationKey = keyof Translation;

export enum Locale {
  nl = "nl",
}

export interface Translation {
  test: string;

  election: string;
  elections: string;
  manage_elections: string;
  role: string;
  status: string;
  loading: string;

  "election_status.title": string;
  "election_status.first_session": string;
  "election_status.definitive.title": string;
  "election_status.definitive.message": string;
  "election_status.definitive.finish_button": string;

  "account.configured": string;
  "feedback.F101.title": string;
  "feedback.F101.content": string;
  "feedback.F101.action": string;
  "feedback.F201.title": string;
  "feedback.F201.content": string;
  "feedback.F202.title": string;
  "feedback.F202.content": string;
  "feedback.F203.title": string;
  "feedback.F203.content": string;
  "feedback.F204.title": string;
  "feedback.F204.content": string;
  "feedback.F301.title": string;
  "feedback.F301.content": string;
  "feedback.F302.title": string;
  "feedback.F302.content": string;
  "feedback.F303.title": string;
  "feedback.F303.content": string;
  "feedback.F304.title": string;
  "feedback.F304.content": string;
  "feedback.F305.title": string;
  "feedback.F305.content": string;
  "feedback.F401.title": string;
  "feedback.F401.content": string;
  "feedback.W201.title": string;
  "feedback.W201.content": string;
  "feedback.W202.title": string;
  "feedback.W202.content": string;
  "feedback.W203.title": string;
  "feedback.W203.content": string;
  "feedback.W204.title": string;
  "feedback.W204.content": string;
  "feedback.W205.title": string;
  "feedback.W205.content": string;
  "feedback.W206.title": string;
  "feedback.W206.content": string;
  "feedback.W207.title": string;
  "feedback.W207.content": string;
  "feedback.W208.title": string;
  "feedback.W208.content": string;
  "feedback.W209.title": string;
  "feedback.W209.content": string;
  "feedback.W301.title": string;
  "feedback.W301.content": string;
  "feedback.W302.title": string;
  "feedback.W302.content": string;
}
