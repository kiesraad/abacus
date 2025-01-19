// Generated by ./scripts/gen_openapi_types.ts

/** PATHS **/

// /api/elections
export type ELECTION_LIST_REQUEST_PARAMS = Record<string, never>;
export type ELECTION_LIST_REQUEST_PATH = `/api/elections`;
export type ELECTION_CREATE_REQUEST_PARAMS = Record<string, never>;
export type ELECTION_CREATE_REQUEST_PATH = `/api/elections`;
export type ELECTION_CREATE_REQUEST_BODY = ElectionRequest;

// /api/elections/{election_id}
export interface ELECTION_DETAILS_REQUEST_PARAMS {
  election_id: number;
}
export type ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${number}`;

// /api/elections/{election_id}/download_pdf_results
export interface ELECTION_DOWNLOAD_PDF_RESULTS_REQUEST_PARAMS {
  election_id: number;
}
export type ELECTION_DOWNLOAD_PDF_RESULTS_REQUEST_PATH = `/api/elections/${number}/download_pdf_results`;

// /api/elections/{election_id}/download_xml_results
export interface ELECTION_DOWNLOAD_XML_RESULTS_REQUEST_PARAMS {
  election_id: number;
}
export type ELECTION_DOWNLOAD_XML_RESULTS_REQUEST_PATH = `/api/elections/${number}/download_xml_results`;

// /api/elections/{election_id}/download_zip_results
export interface ELECTION_DOWNLOAD_ZIP_RESULTS_REQUEST_PARAMS {
  election_id: number;
}
export type ELECTION_DOWNLOAD_ZIP_RESULTS_REQUEST_PATH = `/api/elections/${number}/download_zip_results`;

// /api/elections/{election_id}/polling_stations
export interface POLLING_STATION_LIST_REQUEST_PARAMS {
  election_id: number;
}
export type POLLING_STATION_LIST_REQUEST_PATH = `/api/elections/${number}/polling_stations`;
export interface POLLING_STATION_CREATE_REQUEST_PARAMS {
  election_id: number;
}
export type POLLING_STATION_CREATE_REQUEST_PATH = `/api/elections/${number}/polling_stations`;
export type POLLING_STATION_CREATE_REQUEST_BODY = PollingStationRequest;

// /api/elections/{election_id}/polling_stations/{polling_station_id}
export interface POLLING_STATION_GET_REQUEST_PARAMS {
  election_id: number;
  polling_station_id: number;
}
export type POLLING_STATION_GET_REQUEST_PATH = `/api/elections/${number}/polling_stations/${number}`;
export interface POLLING_STATION_UPDATE_REQUEST_PARAMS {
  election_id: number;
  polling_station_id: number;
}
export type POLLING_STATION_UPDATE_REQUEST_PATH = `/api/elections/${number}/polling_stations/${number}`;
export type POLLING_STATION_UPDATE_REQUEST_BODY = PollingStationRequest;
export interface POLLING_STATION_DELETE_REQUEST_PARAMS {
  election_id: number;
  polling_station_id: number;
}
export type POLLING_STATION_DELETE_REQUEST_PATH = `/api/elections/${number}/polling_stations/${number}`;

// /api/elections/{election_id}/status
export interface ELECTION_STATUS_REQUEST_PARAMS {
  election_id: number;
}
export type ELECTION_STATUS_REQUEST_PATH = `/api/elections/${number}/status`;

// /api/polling_stations/{polling_station_id}/data_entries/{entry_number}
export interface POLLING_STATION_DATA_ENTRY_GET_REQUEST_PARAMS {
  polling_station_id: number;
  entry_number: number;
}
export type POLLING_STATION_DATA_ENTRY_GET_REQUEST_PATH = `/api/polling_stations/${number}/data_entries/${number}`;
export interface POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS {
  polling_station_id: number;
  entry_number: number;
}
export type POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${number}/data_entries/${number}`;
export type POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY = DataEntry;
export interface POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PARAMS {
  polling_station_id: number;
  entry_number: number;
}
export type POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PATH = `/api/polling_stations/${number}/data_entries/${number}`;

// /api/polling_stations/{polling_station_id}/data_entries/{entry_number}/finalise
export interface POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PARAMS {
  polling_station_id: number;
  entry_number: number;
}
export type POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH =
  `/api/polling_stations/${number}/data_entries/${number}/finalise`;

// /api/user/login
export type LOGIN_REQUEST_PARAMS = Record<string, never>;
export type LOGIN_REQUEST_PATH = `/api/user/login`;
export type LOGIN_REQUEST_BODY = Credentials;

// /api/user/logout
export type LOGOUT_REQUEST_PARAMS = Record<string, never>;
export type LOGOUT_REQUEST_PATH = `/api/user/logout`;

/** TYPES **/

export interface ApportionmentResult {
  political_groups_seats: PoliticalGroupSeats[];
  quota: DisplayFraction;
  rest_seat_allocation?: null | RestSeatAllocationDetails;
  seats: number;
}

export interface Average {
  average: DisplayFraction;
  highest: boolean;
  political_group_number: number;
}

/**
 * Candidate
 */
export interface Candidate {
  country_code?: string;
  first_name?: string;
  gender?: CandidateGender;
  initials: string;
  last_name: string;
  last_name_prefix?: string;
  locality: string;
  number: number;
}

/**
 * Candidate gender
 */
export type CandidateGender = "Male" | "Female" | "X";

export interface CandidateVotes {
  number: number;
  votes: number;
}

export interface Credentials {
  password: string;
  username: string;
}

/**
 * Request structure for saving data entry of polling station results
 */
export interface DataEntry {
  client_state: unknown;
  data: PollingStationResults;
  progress: number;
}

export type DataEntryStatusName =
  | "first_entry_not_started"
  | "first_entry_in_progress"
  | "second_entry_not_started"
  | "second_entry_in_progress"
  | "entries_different"
  | "definitive";

export interface Definitive {
  finished_at: string;
}

/**
 * Differences counts, part of the polling station results.
 */
export interface DifferencesCounts {
  fewer_ballots_count: number;
  more_ballots_count: number;
  no_explanation_count: number;
  other_explanation_count: number;
  too_few_ballots_handed_out_count: number;
  too_many_ballots_handed_out_count: number;
  unreturned_ballots_count: number;
}

/**
 * Fraction with the integer part split out for display purposes
 */
export interface DisplayFraction {
  denominator: number;
  integer: number;
  numerator: number;
}

/**
 * Election, optionally with its political groups
 */
export interface Election {
  category: ElectionCategory;
  election_date: string;
  id: number;
  location: string;
  name: string;
  nomination_date: string;
  number_of_seats: number;
  number_of_voters: number;
  political_groups?: PoliticalGroup[];
  status: ElectionStatus;
}

/**
 * Election category (limited for now)
 */
export type ElectionCategory = "Municipal";

/**
 * Election details response, including the election's candidate list (political groups) and its polling stations
 */
export interface ElectionDetailsResponse {
  election: Election;
  polling_stations: PollingStation[];
}

/**
 * Election list response

Does not include the candidate list (political groups) to keep the response size small.
 */
export interface ElectionListResponse {
  elections: Election[];
}

/**
 * Election request
 */
export interface ElectionRequest {
  category: ElectionCategory;
  election_date: string;
  location: string;
  name: string;
  nomination_date: string;
  number_of_seats: number;
  number_of_voters: number;
  political_groups: PoliticalGroup[];
  status: ElectionStatus;
}

/**
 * Election status (limited for now)
 */
export type ElectionStatus = "DataEntryInProgress" | "DataEntryFinished";

/**
 * Election polling stations data entry statuses response
 */
export interface ElectionStatusResponse {
  statuses: ElectionStatusResponseEntry[];
}

/**
 * Election polling stations data entry statuses response
 */
export interface ElectionStatusResponseEntry {
  finished_at?: string;
  first_data_entry_progress?: number;
  polling_station_id: number;
  second_data_entry_progress?: number;
  status: DataEntryStatusName;
}

export interface EntriesDifferent {
  first_entry: PollingStationResults;
  second_entry: PollingStationResults;
}

/**
 * Error reference used to show the corresponding error message to the end-user
 */
export type ErrorReference =
  | "EntryNumberNotSupported"
  | "EntryNotFound"
  | "PollingStationFirstEntryAlreadyFinalised"
  | "PollingStationFirstEntryNotFinalised"
  | "PollingStationSecondEntryAlreadyFinalised"
  | "PollingStationResultsAlreadyFinalised"
  | "PollingStationDataValidation"
  | "InvalidVoteGroup"
  | "InvalidVoteCandidate"
  | "InvalidData"
  | "InvalidJson"
  | "InvalidDataEntryNumber"
  | "InvalidStateTransition"
  | "EntryNotUnique"
  | "DatabaseError"
  | "InternalServerError"
  | "PdfGenerationError"
  | "PollingStationRepeated"
  | "PollingStationValidationErrors"
  | "InvalidPoliticalGroup"
  | "InvalidUsernamePassword"
  | "InvalidSession";

/**
 * Response structure for errors
 */
export interface ErrorResponse {
  error: string;
  fatal: boolean;
  reference: ErrorReference;
}

export interface FirstEntryInProgress {
  client_state: unknown;
  first_entry: PollingStationResults;
  progress: number;
}

/**
 * Response structure for getting data entry of polling station results
 */
export interface GetDataEntryResponse {
  client_state: unknown;
  data: PollingStationResults;
  progress: number;
  updated_at: string;
  validation_results: ValidationResults;
}

export interface Gte19SeatsAllocation {
  highest_averages: HighestAveragesAllocation[];
}

export interface HighestAveragesAllocation {
  assigned_to_political_group_number: number;
  averages: Average[];
  rest_seat_number: number;
}

export interface HighestSurplusesAllocation {
  political_group_number: number;
  rest_seats: number;
  surplus: DisplayFraction;
}

export interface LoginResponse {
  user_id: number;
  username: string;
}

export interface Lt19SeatsAllocation {
  highest_averages_max_one: HighestAveragesAllocation[];
  highest_averages_remainder: HighestAveragesAllocation[];
  highest_surpluses: HighestSurplusesAllocation[];
}

/**
 * Political group with its candidates
 */
export interface PoliticalGroup {
  candidates: Candidate[];
  name: string;
  number: number;
}

export interface PoliticalGroupSeats {
  political_group_number: number;
  rest_seats: number;
  total_seats: number;
  whole_seats: number;
}

export interface PoliticalGroupVotes {
  candidate_votes: CandidateVotes[];
  number: number;
  total: number;
}

/**
 * Polling station of a certain [crate::election::Election]
 */
export interface PollingStation {
  address: string;
  election_id: number;
  id: number;
  locality: string;
  name: string;
  number: number;
  number_of_voters?: number;
  polling_station_type?: PollingStationType;
  postal_code: string;
}

/**
 * Polling station list response
 */
export interface PollingStationListResponse {
  polling_stations: PollingStation[];
}

/**
 * Polling station of a certain [crate::election::Election]
 */
export interface PollingStationRequest {
  address: string;
  locality: string;
  name: string;
  number: number;
  number_of_voters?: number;
  polling_station_type?: PollingStationType;
  postal_code: string;
}

/**
 * PollingStationResults, following the fields in Model Na 31-2 Bijlage 2.

See "Model Na 31-2. Proces-verbaal van een gemeentelijk stembureau/stembureau voor het openbaar
lichaam in een gemeente/openbaar lichaam waar een centrale stemopneming wordt verricht,
Bijlage 2: uitkomsten per stembureau" from the
[Kiesregeling](https://wetten.overheid.nl/BWBR0034180/2024-04-01#Bijlage1_DivisieNa31.2) or
[Verkiezingstoolbox](https://www.rijksoverheid.nl/onderwerpen/verkiezingen/verkiezingentoolkit/modellen).
 */
export interface PollingStationResults {
  differences_counts: DifferencesCounts;
  political_group_votes: PoliticalGroupVotes[];
  recounted?: boolean;
  voters_counts: VotersCounts;
  voters_recounts?: VotersCounts;
  votes_counts: VotesCounts;
}

/**
 * Type of Polling station
 */
export type PollingStationType = "FixedLocation" | "Special" | "Mobile";

/**
 * Response structure for saving data entry of polling station results
 */
export interface SaveDataEntryResponse {
  validation_results: ValidationResults;
}

export interface SecondEntryInProgress {
  client_state: unknown;
  finalised_first_entry: PollingStationResults;
  first_entry_finished_at: string;
  progress: number;
  second_entry: PollingStationResults;
}

export interface SecondEntryNotStarted {
  finalised_first_entry: PollingStationResults;
  first_entry_finished_at: string;
}

export interface ValidationResult {
  code: ValidationResultCode;
  fields: string[];
}

export type ValidationResultCode =
  | "F101"
  | "F201"
  | "F202"
  | "F203"
  | "F204"
  | "F301"
  | "F302"
  | "F303"
  | "F304"
  | "F305"
  | "F401"
  | "W201"
  | "W202"
  | "W203"
  | "W204"
  | "W205"
  | "W206"
  | "W207"
  | "W208"
  | "W209"
  | "W301"
  | "W302";

export interface ValidationResults {
  errors: ValidationResult[];
  warnings: ValidationResult[];
}

/**
 * Voters counts, part of the polling station results.
 */
export interface VotersCounts {
  poll_card_count: number;
  proxy_certificate_count: number;
  total_admitted_voters_count: number;
  voter_card_count: number;
}

/**
 * Votes counts, part of the polling station results.
 */
export interface VotesCounts {
  blank_votes_count: number;
  invalid_votes_count: number;
  total_votes_cast_count: number;
  votes_candidates_count: number;
}
