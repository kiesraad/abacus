import {
  DataEntry,
  Election,
  GetDataEntryResponse,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH,
  PollingStationResults,
  SaveDataEntryResponse,
  ValidationResults,
} from "lib/api/gen/openapi";

import { ApiResult } from "../api.types";
import { ApiClient } from "../ApiClient";
import { ApiResponseStatus } from "../ApiResponseStatus";
import {
  FormSectionRecount,
  FormSectionState,
  FormSectionVotersAndVotes,
  RecountValues,
  VotersAndVotesValues,
} from "./FormSection";

export type FormSectionID = "recount" | "voters_and_votes";

export type CurrentState = "initilizing" | "dataentry" | "bla";

export interface DataEntryState {
  state: CurrentState;
  entryNumber: number;
  sections: {
    recount: FormSectionState<RecountValues>;
    voters_and_votes: FormSectionState<VotersAndVotesValues>;
  };
}

export const initialState: DataEntryState = {
  state: "initilizing",
  entryNumber: 0,
  sections: {
    recount: {
      errors: [],
      warnings: [],
      values: FormSectionRecount.defaultValues,
    },
    voters_and_votes: {
      errors: [],
      warnings: [],
      values: FormSectionVotersAndVotes.defaultValues,
    },
  },
};

export type FormSections = {
  recount: FormSectionRecount;
  voters_and_votes: FormSectionVotersAndVotes;
};

export interface DataEntryControllerParams {
  setState: React.Dispatch<React.SetStateAction<DataEntryState>>;
  election: Required<Election>;
  pollingStationId: number;
  entryNumber: number;
}

export class DataEntryController {
  api: ApiClient;

  requestPath: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH;

  election: Required<Election>;
  pollingStationId: number;
  entryNumber: number;
  state: DataEntryState = initialState;

  setState: React.Dispatch<React.SetStateAction<DataEntryState>>;

  sections: FormSections;

  constructor({ setState, election, pollingStationId, entryNumber }: DataEntryControllerParams) {
    this.api = new ApiClient();
    this.requestPath = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;

    this.setState = setState;
    this.election = election;
    this.pollingStationId = pollingStationId;
    this.entryNumber = entryNumber;

    this.sections = {
      recount: new FormSectionRecount(this),
      voters_and_votes: new FormSectionVotersAndVotes(this),
    };

    this.init();
  }

  init() {
    const run = async () => {
      const response = await this.api.getRequest<GetDataEntryResponse>(this.requestPath);
      if ("status" in response && response.status === ApiResponseStatus.Success) {
        this.processData(response.data.data);
        this.processValidationResults(response.data.validation_results);
      }
      this.state = {
        ...this.state,
        state: "dataentry",
      };
      this.render();
    };

    run();
  }

  render() {
    this.setState({
      entryNumber: this.entryNumber,
      sections: {
        recount: this.sections.recount.state,
        voters_and_votes: this.sections.voters_and_votes.state,
      },
    });
  }

  async submit() {
    const response: ApiResult<SaveDataEntryResponse> = await this.api.postRequest(this.requestPath, {
      progress: 1,
      data: {
        recounted: this.sections.recount.values.recounted,
        voters_counts: this.sections.voters_and_votes.values.voters_counts,
        votes_counts: this.sections.voters_and_votes.values.votes_counts,
        differences_counts: {},
        political_group_votes: [],
      },
      client_state: {},
    } satisfies DataEntry);
    if ("status" in response && response.status === ApiResponseStatus.Success) {
      this.processValidationResults(response.data.validation_results);

      if (this.currentSection?.isFinished()) {
        this.gotoNextSection();
      } else {
        this.render();
      }
    }
  }

  get currentSection() {
    return this.sectionList[this.state.entryNumber];
  }

  gotoNextSection() {
    this.state = {
      ...this.state,
      entryNumber: this.state.entryNumber + 1,
    };
    this.render();
  }

  get sectionList() {
    return Object.values(this.sections);
  }

  processData(data: PollingStationResults) {
    this.sections.recount.setValues({ recounted: data.recounted });
    this.sections.voters_and_votes.setValues({
      voters_counts: data.voters_counts,
      votes_counts: data.votes_counts,
      voters_recounts: data.voters_recounts,
    });
  }

  processValidationResults(results: ValidationResults) {
    results.errors.forEach((error) => {
      this.sectionList.forEach((section) => {
        section.matchError(error);
      });
    });

    results.warnings.forEach((warning) => {
      this.sectionList.forEach((section) => {
        section.matchWarning(warning);
      });
    });
  }
}
