import type {
  CommitteeSession,
  ElectionDefinitionValidateResponse,
  ElectionDetailsResponse,
  ElectionListResponse,
  ElectionWithPoliticalGroups,
  InvestigationListResponse,
  NewElection,
  PoliticalGroup,
  PollingStationInvestigation,
} from "@/types/generated/openapi";

import {
  committeeSessionMockData,
  getCommitteeSessionMockData,
  getCSBCommitteeSessionMockData,
} from "./CommitteeSessionMockData";
import { pollingStationMockData } from "./PollingStationMockData";

export const politicalGroupMockData: PoliticalGroup = {
  number: 1,
  name: "Vurige Vleugels Partij",
  candidates: [
    {
      number: 1,
      initials: "E.",
      first_name: "Eldor",
      last_name: "Zilverlicht",
      locality: "Amsterdam",
    },
    {
      number: 2,
      initials: "G.",
      first_name: "Grom",
      last_name: "Donderbrul",
      locality: "Rotterdam",
    },
    {
      number: 3,
      initials: "S.",
      first_name: "Seraphina",
      last_name: "Fluisterwind",
      locality: "Almere",
    },
    {
      number: 4,
      initials: "V.",
      first_name: "Vesper",
      last_name: "Nachtschaduw",
      locality: "Haarlem",
    },
    {
      number: 5,
      initials: "R.",
      first_name: "Ravian",
      last_name: "Stormvleugel",
      locality: "Den Haag",
    },
    {
      number: 6,
      initials: "M.",
      first_name: "Mirella",
      last_name: "Sterrenzwerver",
      locality: "Almelo",
    },
    {
      number: 7,
      initials: "X.",
      first_name: "Xander",
      last_name: "Maanfluisteraar",
      locality: "Leeuwarden",
    },
    {
      number: 8,
      initials: "P.",
      first_name: "Paxton",
      last_name: "Windzanger",
      locality: "Groningen",
    },
    {
      number: 9,
      initials: "F.",
      first_name: "Faelia",
      last_name: "Vuurvlinder",
      locality: "Heerlen",
    },
    {
      number: 10,
      initials: "H.",
      first_name: "Helga",
      last_name: "Rotsbreker",
      locality: "Maastricht",
    },
    {
      number: 11,
      initials: "L.",
      first_name: "Luna",
      last_name: "Zonnewende",
      locality: "Den Bosch",
    },
    {
      number: 12,
      initials: "T.",
      first_name: "Timo",
      last_name: "Groenhart",
      locality: "Eindhoven",
    },
    {
      number: 13,
      initials: "N.",
      first_name: "Naima",
      last_name: "Veldbloem",
      locality: "Utrecht",
    },
    {
      number: 14,
      initials: "V.",
      first_name: "Vincent",
      last_name: "IJzeren",
      locality: "Leerdam",
    },
    {
      number: 15,
      initials: "P.",
      first_name: "Priya",
      last_name: "Blauwhof",
      locality: "Zeist",
    },
    {
      number: 16,
      initials: "J.",
      first_name: "Jamal",
      last_name: "Windmaker",
      locality: "Nijmegen",
    },
    {
      number: 17,
      initials: "E.",
      first_name: "Esmée",
      last_name: "Sterrenveld",
      locality: "Wageningen",
    },
    {
      number: 18,
      initials: "M.",
      first_name: "Mohammed",
      last_name: "Roodman",
      locality: "Enschede",
    },
    {
      number: 19,
      initials: "C.",
      first_name: "Chen",
      last_name: "Zilverberg",
      locality: "Scheveningen",
    },
    {
      number: 20,
      initials: "S.",
      first_name: "Soraya",
      last_name: "Duinwalker",
      locality: "Zandvoort",
    },
    {
      number: 21,
      initials: "A.",
      first_name: "Alex",
      last_name: "Lichtveld",
      locality: "Bloemendaal",
    },
    {
      number: 22,
      initials: "H.",
      first_name: "Habiba",
      last_name: "Kruidentuin",
      locality: "Emmeloord",
    },
    {
      number: 23,
      initials: "B.",
      first_name: "Bram",
      last_name: "Vlietstra",
      locality: "Lelystad",
    },
    {
      number: 24,
      initials: "K.",
      first_name: "Kai",
      last_name: "Meermin",
      locality: "Hoorn",
    },
    {
      number: 25,
      initials: "D.",
      first_name: "Diana",
      last_name: "Goudappel",
      locality: "Nieuwegein",
    },
    {
      number: 26,
      initials: "F.",
      first_name: "Finn",
      last_name: "Bosrank",
      locality: "Berkel en Roderijs",
    },
    {
      number: 27,
      initials: "J.",
      first_name: "Julia",
      last_name: "Sterrenveld",
      locality: "Nieuw-Vennep",
    },
    {
      number: 28,
      initials: "G.",
      first_name: "Giovanni",
      last_name: "Regenboog",
      locality: "Arnhem",
    },
    {
      number: 29,
      initials: "M.",
      first_name: "Milan",
      last_name: "Hemelrijk",
      locality: "Zwolle",
    },
  ],
};

export const politicalGroupsMockData: PoliticalGroup[] = [
  politicalGroupMockData,
  {
    number: 2,
    name: "Wijzen van Water en Wind",
    candidates: [
      {
        number: 1,
        initials: "A.",
        first_name: "Alice",
        last_name: "Foo",
        locality: "Amsterdam",
        gender: "Female",
      },
      {
        number: 2,
        initials: "C.",
        first_name: "Charlie",
        last_name: "Doe",
        locality: "Rotterdam",
      },
    ],
  },
];

export const electionListMockResponse: ElectionListResponse = {
  committee_sessions: [committeeSessionMockData],
  elections: [
    {
      id: 1,
      name: "Gemeenteraadsverkiezingen 2026",
      committee_category: "GSB",
      counting_method: "CSO",
      election_id: "GR2024_Heemdamseburg",
      location: "Heemdamseburg",
      domain_id: "0035",
      category: "Municipal",
      number_of_seats: 29,
      number_of_voters: 2000,
      election_date: "2024-11-30",
      nomination_date: "2024-11-01",
    },
    {
      id: 2,
      name: "Gemeenteraadsverkiezingen 2026",
      committee_category: "CSB",
      election_id: "GR2024_Heemdamseburg",
      location: "Heemdamseburg",
      domain_id: "0035",
      category: "Municipal",
      number_of_seats: 0,
      number_of_voters: 0,
      election_date: "2024-11-30",
      nomination_date: "2024-11-01",
    },
  ],
};

export const mockInvestigations: PollingStationInvestigation[] = [
  {
    polling_station_id: 3,
    reason: "Test reason 1",
  },
  {
    polling_station_id: 1,
    reason: "Test reason 2",
    findings: "Test findings 2",
    corrected_results: true,
  },
  {
    polling_station_id: 4,
    reason: "Test reason 3",
    findings: "Test findings 3",
    corrected_results: true,
  },
  {
    polling_station_id: 2,
    reason: "Test reason 4",
    findings: "Test findings 4",
    corrected_results: true,
  },
  {
    polling_station_id: 8,
    reason: "Test reason 5",
    findings: "Test findings 5",
    corrected_results: false,
  },
];

export const getElectionMockData = (
  election: Partial<ElectionWithPoliticalGroups> = {},
  committeeSession: Partial<CommitteeSession> = {},
  investigations: PollingStationInvestigation[] = mockInvestigations,
): Required<ElectionDetailsResponse> => {
  const updatedCommitteeSession = getCommitteeSessionMockData(committeeSession);

  // If committee session number > 1, add prev_data_entry_id to polling stations
  const pollingStations =
    updatedCommitteeSession.number > 1
      ? pollingStationMockData.map((ps) => ({
          ...ps,
          prev_data_entry_id: 1000 + ps.id,
        }))
      : pollingStationMockData;

  return {
    current_committee_session: updatedCommitteeSession,
    committee_sessions: [updatedCommitteeSession],
    election: {
      ...electionListMockResponse.elections[0]!,
      political_groups: politicalGroupsMockData,
      ...election,
    },
    polling_stations: pollingStations,
    investigations: updatedCommitteeSession.number > 1 ? investigations : [],
  };
};

export const getCSBElectionMockData = (
  election: Partial<ElectionWithPoliticalGroups> = {},
  committeeSession: Partial<CommitteeSession> = {},
): Required<ElectionDetailsResponse> => {
  const updatedCommitteeSession = getCSBCommitteeSessionMockData(committeeSession);

  return {
    current_committee_session: updatedCommitteeSession,
    committee_sessions: [updatedCommitteeSession],
    election: {
      ...electionListMockResponse.elections[1]!,
      political_groups: politicalGroupsMockData,
      ...election,
    },
    polling_stations: [],
    investigations: [],
  };
};

export const getInvestigationMockData = (
  investigations: PollingStationInvestigation[] = mockInvestigations,
): InvestigationListResponse => {
  return {
    investigations,
  };
};

export const investigationListMockResponse: InvestigationListResponse = getInvestigationMockData();
export const electionDetailsMockResponse: Required<ElectionDetailsResponse> = getElectionMockData();
export const csbElectionDetailsMockResponse: Required<ElectionDetailsResponse> = getCSBElectionMockData();
export const electionMockData = electionDetailsMockResponse.election;
export const newElectionMockData = {
  ...electionDetailsMockResponse.election,
} satisfies NewElection;

export const newCSBElectionMockData = {
  ...csbElectionDetailsMockResponse.election,
  committee_category: "CSB",
} satisfies NewElection;

export const electionImportMockResponse: ElectionWithPoliticalGroups = {
  id: 2,
  name: "Gemeenteraad Test 2022",
  committee_category: "GSB",
  counting_method: "CSO",
  election_id: "GR2022_Test",
  location: "Test",
  domain_id: "0000",
  category: "Municipal",
  number_of_seats: 45,
  number_of_voters: 2000,
  election_date: "2022-03-16",
  nomination_date: "2022-01-31",
  political_groups: politicalGroupsMockData,
};

export const csbElectionImportMockResponse: ElectionWithPoliticalGroups = {
  id: 2,
  name: "Gemeenteraad Test 2022",
  committee_category: "CSB",
  election_id: "GR2022_Test",
  location: "Test",
  domain_id: "0000",
  category: "Municipal",
  number_of_seats: 0,
  number_of_voters: 0,
  election_date: "2022-03-16",
  nomination_date: "2022-01-31",
  political_groups: [],
};

export const gsbElectionImportValidateMockResponse = (
  matching_election: boolean = true,
  number_of_voters: number = 0,
): ElectionDefinitionValidateResponse => {
  return {
    committee_category: "GSB",
    hash: {
      chunks: [
        "asdf",
        "qwer",
        "",
        "tyui",
        "ghjk",
        "bnml",
        "1234",
        "5678",
        "8765",
        "",
        "a345",
        "qwer",
        "lgmg",
        "thnr",
        "nytf",
        "sdfr",
      ],
      redacted_indexes: [2, 9],
    },
    election: newElectionMockData,
    polling_stations: pollingStationMockData,
    polling_station_definition_matches_election: matching_election,
    number_of_voters: number_of_voters,
  };
};

export const csbElectionImportValidateMockResponse: ElectionDefinitionValidateResponse = {
  committee_category: "CSB",
  hash: {
    chunks: [
      "asdf",
      "qwer",
      "",
      "tyui",
      "ghjk",
      "bnml",
      "1234",
      "5678",
      "8765",
      "",
      "a345",
      "qwer",
      "lgmg",
      "thnr",
      "nytf",
      "sdfr",
    ],
    redacted_indexes: [2, 9],
  },
  election: newCSBElectionMockData,
};
