export type TranslationKey = keyof Translation;

export enum Locale {
  nl = "nl",
}

export interface Translation {
  test: string;

  election: string;
  elections: string;
  polling_station: string;
  polling_stations: string;
  number: string;
  vote_count: string;
  candidate: string;
  list: string;
  manage_elections: string;
  role: string;
  status: string;
  progress: string;
  shortcuts: string;
  all_together: string;
  server: string;
  version: string;
  check_and_save: string;
  totals_list: string;
  error: string;
  history_back: string;
  stack_trace: string;
  something_went_wrong: string;
  error_code: string;
  close_message: string;
  next: string;
  save: string;
  loading: string;

  "candidates_votes.check_totals": string;
  "candidates_votes.check_paper_report": string;
  "candidates_votes.confirm_counts": string;
  "candidates_votes.goto_totals": string;

  "check_and_save.counts_add_up.warnings": string;
  "check_and_save.counts_add_up.no_warnings": string;
  "check_and_save.counts_do_not_add_up": string;
  "check_and_save.no_warnings": string;
  "check_and_save.warnings": string;
  "check_and_save.check_warnings": string;
  "check_and_save.fix_the_errors": string;
  "check_and_save.counts_add_up_title": string;
  "check_and_save.can_not_save": string;
  "check_and_save.can_save": string;

  "check_and_save.notable_form_sections.empty": string;
  "check_and_save.notable_form_sections.accepted-warnings": string;
  "check_and_save.notable_form_sections.unaccepted-warnings": string;
  "check_and_save.notable_form_sections.errors": string;

  "status.unfinished": string;
  "status.in_progress": string;
  "status.definitive": string;
  "status.not_started": string;

  "election_status.title": string;
  "election_status.first_session": string;
  "election_status.definitive.title": string;
  "election_status.definitive.message": string;
  "election_status.definitive.finish_button": string;
  "election_status.main_title": string;
  "election_status.add_polling_station": string;

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
