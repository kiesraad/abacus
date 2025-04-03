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

// /api/elections/{election_id}/apportionment
export interface ELECTION_APPORTIONMENT_REQUEST_PARAMS {
  election_id: number;
}
export type ELECTION_APPORTIONMENT_REQUEST_PATH = `/api/elections/${number}/apportionment`;

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

// /api/log
export type AUDIT_LOG_LIST_REQUEST_PARAMS = Record<string, never>;
export type AUDIT_LOG_LIST_REQUEST_PATH = `/api/log`;

// /api/log-users
export type AUDIT_LOG_LIST_USERS_REQUEST_PARAMS = Record<string, never>;
export type AUDIT_LOG_LIST_USERS_REQUEST_PATH = `/api/log-users`;

// /api/polling_stations/{polling_station_id}/data_entries/{entry_number}
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

// /api/polling_stations/{polling_station_id}/data_entries/{entry_number}/claim
export interface POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PARAMS {
  polling_station_id: number;
  entry_number: number;
}
export type POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH =
  `/api/polling_stations/${number}/data_entries/${number}/claim`;

// /api/polling_stations/{polling_station_id}/data_entries/{entry_number}/finalise
export interface POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PARAMS {
  polling_station_id: number;
  entry_number: number;
}
export type POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH =
  `/api/polling_stations/${number}/data_entries/${number}/finalise`;

// /api/user
export type USER_LIST_REQUEST_PARAMS = Record<string, never>;
export type USER_LIST_REQUEST_PATH = `/api/user`;
export type USER_CREATE_REQUEST_PARAMS = Record<string, never>;
export type USER_CREATE_REQUEST_PATH = `/api/user`;
export type USER_CREATE_REQUEST_BODY = CreateUserRequest;

// /api/user/account
export type ACCOUNT_UPDATE_REQUEST_PARAMS = Record<string, never>;
export type ACCOUNT_UPDATE_REQUEST_PATH = `/api/user/account`;
export type ACCOUNT_UPDATE_REQUEST_BODY = AccountUpdateRequest;

// /api/user/login
export type LOGIN_REQUEST_PARAMS = Record<string, never>;
export type LOGIN_REQUEST_PATH = `/api/user/login`;
export type LOGIN_REQUEST_BODY = Credentials;

// /api/user/logout
export type LOGOUT_REQUEST_PARAMS = Record<string, never>;
export type LOGOUT_REQUEST_PATH = `/api/user/logout`;

// /api/user/whoami
export type WHOAMI_REQUEST_PARAMS = Record<string, never>;
export type WHOAMI_REQUEST_PATH = `/api/user/whoami`;

// /api/user/{user_id}
export interface USER_GET_REQUEST_PARAMS {
  user_id: number;
}
export type USER_GET_REQUEST_PATH = `/api/user/${number}`;
export interface USER_UPDATE_REQUEST_PARAMS {
  user_id: number;
}
export type USER_UPDATE_REQUEST_PATH = `/api/user/${number}`;
export type USER_UPDATE_REQUEST_BODY = UpdateUserRequest;
export interface USER_DELETE_REQUEST_PARAMS {
  user_id: number;
}
export type USER_DELETE_REQUEST_PATH = `/api/user/${number}`;

/** TYPES **/

/**
 * Contains information about the enactment of article P 9 of the Kieswet.
 */
export interface AbsoluteMajorityReassignedSeat {
  /** Political group number which the residual seat is assigned to */
  pg_assigned_seat: number;
  /** Political group number which the residual seat is retracted from */
  pg_retracted_seat: number;
}

export interface AccountUpdateRequest {
  fullname?: string;
  password: string;
  username: string;
}

export type AuditEvent =
  | (UserLoggedInDetails & { eventType: "UserLoggedIn" })
  | (UserLoggedOutDetails & { eventType: "UserLoggedOut" })
  | { eventType: "UserAccountUpdateFailed" }
  | { eventType: "UserAccountUpdateSuccess" }
  | { eventType: "UserSessionExtended" }
  | (LoginResponse & { eventType: "UserCreated" })
  | (LoginResponse & { eventType: "UserUpdated" })
  | { eventType: "UnknownEvent" };

export type AuditEventLevel = "info" | "success" | "warning" | "error";

export interface AuditLogEvent {
  event: AuditEvent;
  eventLevel: AuditEventLevel;
  id: number;
  ip: string;
  message?: string | null;
  time: string;
  userFullname: string;
  userId: number;
  userRole: Role;
  username: string;
  workstation?: number | null;
}

export interface AuditLogListResponse {
  events: AuditLogEvent[];
  page: number;
  pages: number;
  perPage: number;
}

export interface AuditLogUser {
  fullname: string;
  id: number;
  role: Role;
  username: string;
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

/**
 * The result of the candidate nomination procedure.
 * This contains the preference threshold and percentage that was used.
 * It contains a list of all chosen candidates in alphabetical order.
 * It also contains the preferential nomination of candidates, the remaining
 * nomination of candidates and the final ranking of candidates for each political group.
 */
export interface CandidateNominationResult {
  /** List of chosen candidates in alphabetical order */
  chosen_candidates: Candidate[];
  /** List of chosen candidates and candidate list ranking per political group */
  political_group_candidate_nomination: PoliticalGroupCandidateNomination[];
  /** Preference threshold percentage and number of votes */
  preference_threshold: PreferenceThreshold;
}

export interface CandidateVotes {
  number: number;
  votes: number;
}

/**
 * Response structure for getting data entry of polling station results
 */
export interface ClaimDataEntryResponse {
  client_state: unknown;
  data: PollingStationResults;
  validation_results: ValidationResults;
}

export interface CreateUserRequest {
  fullname?: string;
  role: Role;
  temp_password: string;
  username: string;
}

export interface Credentials {
  password: string;
  username: string;
}

/**
 * Request structure for saving data entry of polling station results
 */
export interface DataEntry {
  /** Client state for the data entry (arbitrary JSON) */
  client_state: unknown;
  /** Data entry for a polling station */
  data: PollingStationResults;
  /** Data entry progress between 0 and 100 */
  progress: number;
}

export type DataEntryStatusName =
  | "first_entry_not_started"
  | "first_entry_in_progress"
  | "second_entry_not_started"
  | "second_entry_in_progress"
  | "entries_different"
  | "definitive";

/**
 * Differences counts, part of the polling station results.
 */
export interface DifferencesCounts {
  /** Number of fewer counted ballots ("Er zijn minder stembiljetten geteld. Hoeveel stembiljetten zijn er minder geteld") */
  fewer_ballots_count: number;
  /** Number of more counted ballots ("Er zijn méér stembiljetten geteld. Hoeveel stembiljetten zijn er meer geteld?") */
  more_ballots_count: number;
  /** Number of no explanations ("Hoe vaak is er geen verklaring voor het verschil?") */
  no_explanation_count: number;
  /** Number of other explanations ("Hoe vaak is er een andere verklaring voor het verschil?") */
  other_explanation_count: number;
  /** Number of fewer ballots handed out ("Hoe vaak is er een stembiljet te weinig uitgereikt?") */
  too_few_ballots_handed_out_count: number;
  /** Number of more ballots handed out ("Hoe vaak is er een stembiljet te veel uitgereikt?") */
  too_many_ballots_handed_out_count: number;
  /** Number of unreturned ballots ("Hoe vaak heeft een kiezer het stembiljet niet ingeleverd?") */
  unreturned_ballots_count: number;
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
 * Election apportionment response, including the seat assignment, candidate nomination and election summary
 */
export interface ElectionApportionmentResponse {
  candidate_nomination: CandidateNominationResult;
  election_summary: ElectionSummary;
  seat_assignment: SeatAssignmentResult;
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
 *
 * Does not include the candidate list (political groups) to keep the response size small.
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
  /** Time when the data entry was finalised */
  finished_at?: string;
  /** First entry progress as a percentage (0 to 100) */
  first_entry_progress?: number;
  /** First entry user id */
  first_entry_user_id?: number;
  /** Polling station id */
  polling_station_id: number;
  /** Second entry progress as a percentage (0 to 100) */
  second_entry_progress?: number;
  /** Second entry user id */
  second_entry_user_id?: number;
  /** Data entry status */
  status: DataEntryStatusName;
}

/**
 * Contains a summary of the election results, added up from the votes of all polling stations.
 */
export interface ElectionSummary {
  /** The differences between voters and votes */
  differences_counts: SummaryDifferencesCounts;
  /** The summary votes for each political group (and each candidate within) */
  political_group_votes: PoliticalGroupVotes[];
  /** A list of polling stations that were recounted */
  recounted_polling_stations: number[];
  /** The total number of voters */
  voters_counts: VotersCounts;
  /** The total number of votes */
  votes_counts: VotesCounts;
}

/**
 * Error reference used to show the corresponding error message to the end-user
 */
export type ErrorReference =
  | "AllListsExhausted"
  | "ApportionmentNotAvailableUntilDataEntryFinalised"
  | "DatabaseError"
  | "DataEntryAlreadyClaimed"
  | "DrawingOfLotsRequired"
  | "EntryNotFound"
  | "EntryNotUnique"
  | "EntryNumberNotSupported"
  | "InternalServerError"
  | "InvalidData"
  | "InvalidDataEntryNumber"
  | "InvalidJson"
  | "InvalidPassword"
  | "InvalidPoliticalGroup"
  | "InvalidSession"
  | "InvalidStateTransition"
  | "InvalidUsernameOrPassword"
  | "InvalidVoteCandidate"
  | "InvalidVoteGroup"
  | "PdfGenerationError"
  | "PollingStationDataValidation"
  | "PollingStationFirstEntryAlreadyFinalised"
  | "PollingStationFirstEntryNotFinalised"
  | "PollingStationRepeated"
  | "PollingStationResultsAlreadyFinalised"
  | "PollingStationSecondEntryAlreadyFinalised"
  | "PollingStationValidationErrors"
  | "UserNotFound"
  | "UsernameNotUnique"
  | "Unauthorized"
  | "PasswordRejection";

/**
 * Response structure for errors
 */
export interface ErrorResponse {
  error: string;
  fatal: boolean;
  reference: ErrorReference;
}

/**
 * Fraction with the integer part split out for display purposes
 */
export interface Fraction {
  denominator: number;
  integer: number;
  numerator: number;
}

/**
 * Contains the details for an assigned seat, assigned through the highest average method.
 */
export interface HighestAverageAssignedSeat {
  /** The list of political groups with the same average, that have been assigned a seat */
  pg_assigned: number[];
  /** The list of political groups with the same average, that have not been assigned a seat */
  pg_options: number[];
  /** The political group that was selected for this seat has this political group number */
  selected_pg_number: number;
  /** This is the votes per seat achieved by the selected political group */
  votes_per_seat: Fraction;
}

/**
 * Contains the details for an assigned seat, assigned through the largest remainder method.
 */
export interface LargestRemainderAssignedSeat {
  /** The list of political groups with the same remainder, that have been assigned a seat */
  pg_assigned: number[];
  /** The list of political groups with the same remainder, that have not been assigned a seat */
  pg_options: number[];
  /** The number of remainder votes achieved by the selected political group */
  remainder_votes: Fraction;
  /** The political group that was selected for this seat has this political group number */
  selected_pg_number: number;
}

/**
 * Contains information about the enactment of article P 10 of the Kieswet.
 */
export interface ListExhaustionRemovedSeat {
  /** Political group number which the seat is retracted from */
  pg_retracted_seat: number;
}

export interface LoginResponse {
  fullname?: string;
  needs_password_change: boolean;
  role: Role;
  user_id: number;
  username: string;
}

/**
 * Political group with its candidates
 */
export interface PoliticalGroup {
  candidates: Candidate[];
  name: string;
  number: number;
}

/**
 * Contains information about the chosen candidates and the candidate list ranking
 * for a specific political group.
 */
export interface PoliticalGroupCandidateNomination {
  /** The list of other chosen candidates, can be empty */
  other_candidate_nomination: CandidateVotes[];
  /** Political group name for which this nomination applies */
  pg_name: string;
  /** Political group number for which this nomination applies */
  pg_number: number;
  /** The number of seats assigned to this group */
  pg_seats: number;
  /** The list of chosen candidates via preferential votes, can be empty */
  preferential_candidate_nomination: CandidateVotes[];
  /** The updated ranking of the whole candidate list, can be empty */
  updated_candidate_ranking: Candidate[];
}

/**
 * Contains information about the final assignment of seats for a specific political group.
 */
export interface PoliticalGroupSeatAssignment {
  /** The number of full seats assigned to this group */
  full_seats: number;
  /** Whether this group met the threshold for largest remainder seat assignment */
  meets_remainder_threshold: boolean;
  /** Political group number for which this assignment applies */
  pg_number: number;
  /** The remainder votes that were not used to get full seats assigned to this political group */
  remainder_votes: Fraction;
  /** The number of residual seats assigned to this group */
  residual_seats: number;
  /** The total number of seats assigned to this group */
  total_seats: number;
  /** The number of votes cast for this group */
  votes_cast: number;
}

/**
 * Contains the standing for a specific political group. This is all the information
 * that is needed to compute the apportionment for that specific political group.
 */
export interface PoliticalGroupStanding {
  /** The number of full seats this political group got assigned */
  full_seats: number;
  /** Whether the remainder votes meet the threshold to be applicable for largest remainder seat assignment */
  meets_remainder_threshold: boolean;
  /** The number of votes per seat if a new seat would be added to the current residual seats */
  next_votes_per_seat: Fraction;
  /** Political group number for which this standing applies */
  pg_number: number;
  /** The remainder of votes that was not used to get full seats (does not have to be a whole number of votes) */
  remainder_votes: Fraction;
  /** The current number of residual seats this political group got assigned */
  residual_seats: number;
  /** The number of votes cast for this group */
  votes_cast: number;
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
 *
 * See "Model Na 31-2. Proces-verbaal van een gemeentelijk stembureau/stembureau voor het openbaar
 * lichaam in een gemeente/openbaar lichaam waar een centrale stemopneming wordt verricht,
 * Bijlage 2: uitkomsten per stembureau" from the
 * [Kiesregeling](https://wetten.overheid.nl/BWBR0034180/2024-04-01#Bijlage1_DivisieNa31.2) or
 * [Verkiezingstoolbox](https://www.rijksoverheid.nl/onderwerpen/verkiezingen/verkiezingentoolkit/modellen).
 */
export interface PollingStationResults {
  /** Differences counts ("3. Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten") */
  differences_counts: DifferencesCounts;
  /** Vote counts per list and candidate (5. "Aantal stemmen per lijst en kandidaat") */
  political_group_votes: PoliticalGroupVotes[];
  /** Recounted ("Is er herteld? - See form for official long description of the checkbox") */
  recounted?: boolean;
  /** Voters counts ("1. Aantal toegelaten kiezers") */
  voters_counts: VotersCounts;
  /** Voters recounts ("3. Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
When filled in, this field should replace `voters_counts` when using the results. */
  voters_recounts?: VotersCounts;
  /** Votes counts ("2. Aantal getelde stembiljetten") */
  votes_counts: VotesCounts;
}

/**
 * Type of Polling station
 */
export type PollingStationType = "FixedLocation" | "Special" | "Mobile";

export interface PreferenceThreshold {
  /** Preference threshold as a number of votes */
  number_of_votes: Fraction;
  /** Preference threshold as a percentage (0 to 100) */
  percentage: number;
}

export type Role = "administrator" | "typist" | "coordinator";

/**
 * Response structure for saving data entry of polling station results
 */
export interface SaveDataEntryResponse {
  validation_results: ValidationResults;
}

/**
 * The result of the seat assignment procedure. This contains the number of seats and the quota
 * that was used. It then contains the initial standing after full seats were assigned,
 * and each of the changes and intermediate standings. The final standing contains the
 * number of seats per political group that was assigned after all seats were assigned.
 */
export interface SeatAssignmentResult {
  final_standing: PoliticalGroupSeatAssignment[];
  full_seats: number;
  quota: Fraction;
  residual_seats: number;
  seats: number;
  steps: SeatChangeStep[];
}

/**
 * Records the political group and specific change for a specific residual seat
 */
export type SeatChange =
  | (HighestAverageAssignedSeat & { changed_by: "HighestAverageAssignment" })
  | (LargestRemainderAssignedSeat & { changed_by: "LargestRemainderAssignment" })
  | (AbsoluteMajorityReassignedSeat & { changed_by: "AbsoluteMajorityReassignment" })
  | (ListExhaustionRemovedSeat & { changed_by: "ListExhaustionRemoval" });

/**
 * Records the change for a specific seat, and how the standing is once
 * that seat was assigned or removed
 */
export interface SeatChangeStep {
  change: SeatChange;
  residual_seat_number?: number;
  standings: PoliticalGroupStanding[];
}

/**
 * Contains a summary count, containing both the count and a list of polling
 * stations that contributed to it.
 */
export interface SumCount {
  count: number;
  polling_stations: number[];
}

/**
 * Contains a summary of the differences, containing which polling stations had differences.
 */
export interface SummaryDifferencesCounts {
  fewer_ballots_count: SumCount;
  more_ballots_count: SumCount;
  no_explanation_count: SumCount;
  other_explanation_count: SumCount;
  too_few_ballots_handed_out_count: SumCount;
  too_many_ballots_handed_out_count: SumCount;
  unreturned_ballots_count: SumCount;
}

export interface UpdateUserRequest {
  fullname?: string;
  temp_password?: string;
}

/**
 * User object, corresponds to a row in the users table
 */
export interface User {
  created_at: string;
  fullname?: string;
  id: number;
  last_activity_at?: string;
  role: Role;
  updated_at: string;
  username: string;
}

export interface UserListResponse {
  users: User[];
}

export interface UserLoggedInDetails {
  loggedInUsersCount: number;
  userAgent: string;
}

export interface UserLoggedOutDetails {
  sessionDuration: number;
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
  /** Number of valid poll cards ("Aantal geldige stempassen") */
  poll_card_count: number;
  /** Number of valid proxy certificates ("Aantal geldige volmachtbewijzen") */
  proxy_certificate_count: number;
  /** Total number of admitted voters ("Totaal aantal toegelaten kiezers") */
  total_admitted_voters_count: number;
  /** Number of valid voter cards ("Aantal geldige kiezerspassen") */
  voter_card_count: number;
}

/**
 * Votes counts, part of the polling station results.
 */
export interface VotesCounts {
  /** Number of blank votes ("Aantal blanco stembiljetten") */
  blank_votes_count: number;
  /** Number of invalid votes ("Aantal ongeldige stembiljetten") */
  invalid_votes_count: number;
  /** Total number of votes cast ("Totaal aantal getelde stemmen") */
  total_votes_cast_count: number;
  /** Number of valid votes on candidates
("Aantal stembiljetten met een geldige stem op een kandidaat") */
  votes_candidates_count: number;
}
