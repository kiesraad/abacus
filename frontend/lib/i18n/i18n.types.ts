export type TranslationKey = keyof Translation;

export enum Locale {
  nl = "nl",
}

// list all object paths as tuples
type TranslationValue<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...TranslationValue<T[K]>];
    }[Extract<keyof T, string>];

// use this to join the keys of a translation object
// see https://github.com/microsoft/TypeScript/pull/40336 for type magic happening here
type Join<T extends string[]> = T extends []
  ? never
  : T extends [infer F]
    ? F
    : T extends [infer F, ...infer R]
      ? F extends string
        ? `${F}.${Join<Extract<R, string[]>>}`
        : never
      : string;

// a type for translations keys as paths (e.g. "candidates_votes.check_totals" | "candidates_votes.check_paper_report" | ...)
export type TranslationPath = Join<TranslationValue<Translation>>;

export interface Translation {
  test: string;
  election: string;
  elections: string;
  number: string;
  vote_count: string;
  candidate: string;
  list: string;
  manage_elections: string;
  role: string;
  progress: string;
  shortcuts: string;
  all_together: string;
  server: string;
  version: string;
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
  account_configured: string;

  candidates_votes: {
    check_totals: string;
    check_paper_report: string;
    confirm_counts: string;
    goto_totals: string;
  };

  check_and_save: {
    title: string;
    counts_add_up: {
      warnings: string;
      no_warnings: string;
    };
    counts_do_not_add_up: string;
    no_warnings: string;
    warnings: string;
    check_warnings: string;
    fix_the_errors: string;
    counts_add_up_title: string;
    can_not_save: string;
    can_save: string;
    notable_form_sections: {
      empty: string;
      "accepted-warnings": string;
      "unaccepted-warnings": string;
      errors: string;
    };
  };

  status: {
    unfinished: string;
    in_progress: string;
    definitive: string;
    not_started: string;
  };

  election_status: {
    label: string;
    title: string;
    first_session: string;
    definitive: {
      title: string;
      message: string;
      finish_button: string;
    };
    finish_first_session_data_entry_status: string;
  };

  election_report: {
    finish_data_entry_phase: string;
    about_to_stop_data_entry: string;
    data_entry_finish_steps_explanation: string;
    for_recount_new_session_needed: string;
    download_report: string;
  };

  feedback: {
    F101: {
      title: string;
      content: string;
      action: string;
    };
    F201: {
      title: string;
      content: string;
    };
    F202: {
      title: string;
      content: string;
    };
    F203: {
      title: string;
      content: string;
    };
    F204: {
      title: string;
      content: string;
    };
    F301: {
      title: string;
      content: string;
    };
    F302: {
      title: string;
      content: string;
    };
    F303: {
      title: string;
      content: string;
    };
    F304: {
      title: string;
      content: string;
    };
    F305: {
      title: string;
      content: string;
    };
    F401: {
      title: string;
      content: string;
    };
    W201: {
      title: string;
      content: string;
    };
    W202: {
      title: string;
      content: string;
    };
    W203: {
      title: string;
      content: string;
    };
    W204: {
      title: string;
      content: string;
    };
    W205: {
      title: string;
      content: string;
    };
    W206: {
      title: string;
      content: string;
    };
    W207: {
      title: string;
      content: string;
    };
    W208: {
      title: string;
      content: string;
    };
    W209: {
      title: string;
      content: string;
    };
    W301: {
      title: string;
      content: string;
    };
    W302: {
      title: string;
      content: string;
    };
  };
}
