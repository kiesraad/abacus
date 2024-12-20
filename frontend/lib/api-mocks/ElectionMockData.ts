import {
  Candidate,
  Election,
  ElectionDetailsResponse,
  ElectionListResponse,
  ElectionStatusResponse,
  NotFoundError,
  PoliticalGroup,
} from "@kiesraad/api";

import { getPollingStationMockData } from "./PollingStationMockData.ts";

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

const candidates: Candidate[] = [
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
];

const politicalGroupsMockData: PoliticalGroup[] = [
  politicalGroupMockData,
  {
    number: 2,
    name: "Wijzen van Water en Wind",
    candidates: candidates,
  },
  {
    number: 3,
    name: "Eeuwenoude Aarde Unie",
    candidates: candidates,
  },
  {
    number: 4,
    name: "Verbond van Licht en Leven",
    candidates: candidates,
  },
  {
    number: 5,
    name: "Nieuwe Horizon Beweging",
    candidates: candidates,
  },
  {
    number: 6,
    name: "VRG",
    candidates: candidates,
  },
  {
    number: 7,
    name: "Harmonie van Hemel en Aarde",
    candidates: candidates,
  },
  {
    number: 8,
    name: "Stralende Sterren Alliantie",
    candidates: candidates,
  },
  {
    number: 9,
    name: "Tijdloze Toekomst Partij",
    candidates: candidates,
  },
  {
    number: 10,
    name: "Kosmische Kracht Coalitie",
    candidates: candidates,
  },
  {
    number: 11,
    name: "Magische Melodieën Beweging",
    candidates: candidates,
  },
  {
    number: 12,
    name: "Zilveren Zonnestralen Partij",
    candidates: candidates,
  },
  {
    number: 13,
    name: "Mystieke Maanlicht Liga",
    candidates: candidates,
  },
  {
    number: 14,
    name: "GVR",
    candidates: candidates,
  },
  {
    number: 15,
    name: "Partij voor de ontwikkeling",
    candidates: candidates,
  },
  {
    number: 16,
    name: "Bond van de kiezers",
    candidates: candidates,
  },
  {
    number: 17,
    name: "Omega",
    candidates: candidates,
  },
  {
    number: 18,
    name: "Partij van de werkers",
    candidates: candidates,
  },
  {
    number: 19,
    name: "Sterrenpartij",
    candidates: candidates,
  },
  {
    number: 20,
    name: "Partij voor de zon",
    candidates: candidates,
  },
];

export const electionListMockResponse: ElectionListResponse = {
  elections: [
    {
      id: 1,
      name: "Gemeenteraadsverkiezingen 2026",
      location: "Heemdamseburg",
      number_of_voters: 100,
      category: "Municipal",
      number_of_seats: 29,
      election_date: "2024-11-30",
      nomination_date: "2024-11-01",
      status: "DataEntryInProgress",
    },
    {
      id: 2,
      name: "Gemeenteraadsverkiezingen 2030",
      location: "Heemdamseburg",
      number_of_voters: 100,
      category: "Municipal",
      number_of_seats: 29,
      election_date: "2024-01-30",
      nomination_date: "2024-01-01",
      status: "DataEntryInProgress",
    },
    {
      id: 3,
      name: "Gemeenteraadsverkiezingen leeg",
      location: "Spookdorp",
      number_of_voters: 0,
      category: "Municipal",
      number_of_seats: 29,
      election_date: "2032-10-31",
      nomination_date: "2032-09-01",
      status: "DataEntryInProgress",
    },
    {
      id: 4,
      name: "Gemeenteraadsverkiezingen ingevuld",
      location: "Heemdamseburg",
      number_of_voters: 100,
      category: "Municipal",
      number_of_seats: 29,
      election_date: "2020-01-30",
      nomination_date: "2020-01-01",
      status: "DataEntryInProgress",
    },
    {
      id: 5,
      name: "Gemeenteraadsverkiezingen afgerond",
      location: "Heemdamseburg",
      number_of_voters: 100,
      category: "Municipal",
      number_of_seats: 29,
      election_date: "2020-01-30",
      nomination_date: "2020-01-01",
      status: "DataEntryFinished",
    },
  ],
};

export const getElectionMockData = (election_id: number): Required<ElectionDetailsResponse> => {
  const election = electionListMockResponse.elections.find((e) => e.id === election_id);

  if (!election) {
    throw new NotFoundError("error.election_not_found");
  }

  if (election_id === 2) {
    election.political_groups = politicalGroupsMockData.slice(0, 2);
  } else if (election_id === 3) {
    election.political_groups = [];
  } else {
    election.political_groups = politicalGroupsMockData;
  }

  return { election, polling_stations: getPollingStationMockData(election_id) };
};

export const electionDetailsMockResponse: Required<ElectionDetailsResponse> = getElectionMockData(1);
export const electionMockData = electionDetailsMockResponse.election as Required<Election>;

export const electionStatusMockResponse: ElectionStatusResponse = {
  statuses: [
    {
      id: 1,
      status: "not_started",
    },
    {
      id: 2,
      status: "definitive",
    },
    {
      id: 3,
      status: "first_second_entry_different",
    },
  ],
};
