import {
  CommitteeSession,
  ElectionDetailsResponse,
  ElectionListResponse,
  ElectionWithPoliticalGroups,
  NewElection,
  PoliticalGroup,
} from "@/types/generated/openapi";

import { committeeSessionMockData } from "./CommitteeSessionMockData";
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
      counting_method: "CSO",
      election_id: "Heemdamseburg_2024",
      location: "Heemdamseburg",
      domain_id: "0035",
      number_of_voters: 100,
      category: "Municipal",
      number_of_seats: 29,
      election_date: "2024-11-30",
      nomination_date: "2024-11-01",
    },
  ],
};

export const getElectionMockData = (
  election: Partial<ElectionWithPoliticalGroups> = {},
  committeeSession: Partial<CommitteeSession> = {},
): Required<ElectionDetailsResponse> => {
  return {
    committee_session: {
      ...committeeSessionMockData,
      ...committeeSession,
    },
    election: {
      ...electionListMockResponse.elections[0]!,
      political_groups: politicalGroupsMockData,
      ...election,
    },
    polling_stations: pollingStationMockData,
  };
};

export const electionDetailsMockResponse: Required<ElectionDetailsResponse> = getElectionMockData();
export const electionMockData = electionDetailsMockResponse.election;
export const newElectionMockData = {
  ...electionDetailsMockResponse.election,
  polling_stations: pollingStationMockData,
} as Required<NewElection>;
