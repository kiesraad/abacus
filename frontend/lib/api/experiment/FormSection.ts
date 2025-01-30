import { PollingStationResults, ValidationResult } from "@kiesraad/api";

import { DataEntryController, FormSectionID } from "./DataEntryController";

export interface FormSectionState<TValues> {
  errors: ValidationResult[];
  warnings: ValidationResult[];
  values: TValues;
}

export class FormSection<TValues> {
  controller: DataEntryController;
  id: string;
  index: number;

  values: TValues;
  draft: TValues;

  state: FormSectionState<TValues>;

  protected static defaultValues: unknown;

  constructor(controller: DataEntryController, id: FormSectionID, index: number, initialValues: TValues) {
    this.controller = controller;
    this.id = id;
    this.index = index;
    this.values = initialValues;
    this.draft = initialValues;
    this.state = {
      errors: [],
      warnings: [],
      values: this.values,
    };
  }

  hasChanges(): boolean {
    // return this.values !== this.draft;
    return false;
  }

  submit() {
    this.values = this.draft;
    this.controller.submit();
  }

  setValues(v: TValues) {
    this.values = v;
  }

  getValue(key: keyof TValues): TValues[keyof TValues] {
    return this.values[key];
  }

  setValue(key: keyof TValues) {
    return (value: TValues[keyof TValues]) => {
      this.draft[key] = value;
    };
  }

  get isSaved() {
    return false;
  }

  get errors() {
    return this.state.errors;
  }

  get warnings() {
    return this.state.warnings;
  }

  get errorsAndWarnings() {
    return {
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  isFinished() {
    return this.errors.length === 0;
  }

  hasError() {
    return this.errors.length > 0;
  }
  hasWarning() {
    return !this.hasError() && this.warnings.length > 0;
  }

  matchError(v: ValidationResult) {
    for (let fieldPath of v.fields) {
      if (fieldPath.includes(this.id)) {
        this.errors.push(v);
      }
    }
  }

  matchWarning(v: ValidationResult) {
    for (let fieldPath of v.fields) {
      if (fieldPath.includes(this.id)) {
        this.warnings.push(v);
      }
    }
  }
}

export type RecountValues = Pick<PollingStationResults, "recounted">;
export class FormSectionRecount extends FormSection<RecountValues> {
  static defaultValues: RecountValues = {
    recounted: false,
  };
  constructor(controller: DataEntryController) {
    super(controller, "recount", 0, FormSectionRecount.defaultValues);
  }
}

export type VotersAndVotesValues = Pick<PollingStationResults, "voters_counts" | "votes_counts" | "voters_recounts">;
export class FormSectionVotersAndVotes extends FormSection<VotersAndVotesValues> {
  static defaultValues: VotersAndVotesValues = {
    votes_counts: {
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 0,
      votes_candidates_count: 0,
    },
    voters_counts: {
      poll_card_count: 0,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 0,
      voter_card_count: 0,
    },
  };

  constructor(controller: DataEntryController) {
    super(controller, "voters_and_votes", 1, FormSectionVotersAndVotes.defaultValues);
  }

  getVotesValue(key: keyof VotersAndVotesValues["votes_counts"]) {
    return this.values.votes_counts[key];
  }

  getVotersValue(key: keyof VotersAndVotesValues["voters_counts"]) {
    return this.values.voters_counts[key];
  }

  setVotesValue(key: keyof VotersAndVotesValues["votes_counts"]) {
    return (value: number) => {
      this.draft.votes_counts[key] = value;
    };
  }

  setVotersValue(key: keyof VotersAndVotesValues["voters_counts"]) {
    return (value: number) => {
      this.draft.voters_counts[key] = value;
    };
  }
}
