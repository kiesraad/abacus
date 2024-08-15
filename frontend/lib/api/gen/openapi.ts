// Generated by ./scripts/gen_openapi_types.ts

/** PATHS **/

// /api/elections
export type ELECTION_LIST_REQUEST_PARAMS = Record<string, never>;
export type ELECTION_LIST_REQUEST_PATH = `/api/elections`;

// /api/elections/{election_id}
export interface ELECTION_DETAILS_REQUEST_PARAMS {
  election_id: number;
}
export type ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${number}`;

// /api/elections/{election_id}/polling_stations
export interface POLLING_STATION_LIST_REQUEST_PARAMS {
  election_id: number;
}
export type POLLING_STATION_LIST_REQUEST_PATH = `/api/elections/${number}/polling_stations`;

// /api/elections/{election_id}/status
export interface ELECTION_STATUS_REQUEST_PARAMS {
  election_id: number;
}
export type ELECTION_STATUS_REQUEST_PATH = `/api/elections/${number}/status`;

// /api/polling_stations/{polling_station_id}/data_entries/{entry_number}
export interface POLLING_STATION_DATA_ENTRY_REQUEST_PARAMS {
  polling_station_id: number;
  entry_number: number;
}
export type POLLING_STATION_DATA_ENTRY_REQUEST_PATH =
  `/api/polling_stations/${number}/data_entries/${number}`;
export type POLLING_STATION_DATA_ENTRY_REQUEST_BODY = DataEntryRequest;

// /api/polling_stations/{polling_station_id}/data_entries/{entry_number}/finalise
export interface POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PARAMS {
  polling_station_id: number;
  entry_number: number;
}
export type POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH =
  `/api/polling_stations/${number}/data_entries/${number}/finalise`;

/** TYPES **/

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

/**
 * Request structure for data entry of polling station results
 */
export interface DataEntryRequest {
  data: PollingStationResults;
}

/**
 * Response structure for data entry of polling station results
 */
export interface DataEntryResponse {
  validation_results: ValidationResults;
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
 * Election, optionally with its political groups
 */
export interface Election {
  category: ElectionCategory;
  election_date: string;
  id: number;
  name: string;
  nomination_date: string;
  political_groups?: PoliticalGroup[];
}

/**
 * Election category (limited for now)
 */
export type ElectionCategory = "Municipal";

/**
 * Election details response, including the election's candidate list (political groups)
 */
export interface ElectionDetailsResponse {
  election: Election;
}

/**
 * Election list response

Does not include the candidate list (political groups) to keep the response size small.
 */
export interface ElectionListResponse {
  elections: Election[];
}

/**
 * Election status response
 */
export interface ElectionStatusResponse {
  statuses: PollingStationStatusEntry[];
}

/**
 * Response structure for errors
 */
export interface ErrorResponse {
  error: string;
}

/**
 * Political group with its candidates
 */
export interface PoliticalGroup {
  candidates: Candidate[];
  name: string;
  number: number;
}

export interface PoliticalGroupVotes {
  candidate_votes: CandidateVotes[];
  number: number;
  total: number;
}

/**
 * Polling station of a certain [Election]
 */
export interface PollingStation {
  election_id: number;
  house_number: string;
  house_number_addition?: string;
  id: number;
  locality: string;
  name: string;
  number: number;
  number_of_voters?: number;
  polling_station_type: PollingStationType;
  postal_code: string;
  street: string;
}

/**
 * Polling station list response
 */
export interface PollingStationListResponse {
  polling_stations: PollingStation[];
}

/**
 * PollingStationResults, following the fields in
"Model Na 31-2. Proces-verbaal van een gemeentelijk stembureau/stembureau voor het openbaar lichaam
in een gemeente/openbaar lichaam waar een centrale stemopneming wordt verricht"
"Bijlage 2: uitkomsten per stembureau"
<https://wetten.overheid.nl/BWBR0034180/2023-11-01#Bijlage1_DivisieNa31.2
 */
export interface PollingStationResults {
  differences_counts: DifferencesCounts;
  political_group_votes: PoliticalGroupVotes[];
  recounted: boolean;
  voters_counts: VotersCounts;
  voters_recounts?: VotersRecounts;
  votes_counts: VotesCounts;
}

export type PollingStationStatus = "Incomplete" | "Complete";

export interface PollingStationStatusEntry {
  id: number;
  status: PollingStationStatus;
}

/**
 * Type of Polling station
 */
export type PollingStationType = "VasteLocatie" | "Bijzonder" | "Mobiel";

export interface ValidationResult {
  code: ValidationResultCode;
  fields: string[];
}

export type ValidationResultCode =
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
  | "W210"
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
 * Voters recounts, part of the polling station results.
 */
export interface VotersRecounts {
  poll_card_recount: number;
  proxy_certificate_recount: number;
  total_admitted_voters_recount: number;
  voter_card_recount: number;
}

/**
 * Votes counts, part of the polling station results.
 */
export interface VotesCounts {
  blank_votes_count: number;
  invalid_votes_count: number;
  total_votes_cast_count: number;
  votes_candidates_counts: number;
}
