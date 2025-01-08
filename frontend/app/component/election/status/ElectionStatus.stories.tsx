import type { Story } from "@ladle/react";

import { Election, ElectionStatusResponseEntry, PollingStation } from "@kiesraad/api";

import { ElectionStatus } from "./ElectionStatus";

export const Werkvoorraad: Story = () => (
  <ElectionStatus
    statuses={mockStatuses}
    election={mockElection}
    pollingStations={mockPollingStations}
    navigate={() => {}}
  />
);

export default {
  title: "App / ElectionStatus",
  argTypes: {
    background: {
      control: { type: "background" },
      options: ["#f9fafb", "white"],
      defaultValue: "#f9fafb",
    },
  },
};

const mockStatuses: ElectionStatusResponseEntry[] = [
  {
    polling_station_id: 1,
    status: "first_entry_not_started",
  },
  {
    polling_station_id: 2,
    status: "first_entry_not_started",
  },
  {
    polling_station_id: 3,
    status: "first_entry_not_started",
  },
  {
    polling_station_id: 4,
    status: "first_entry_not_started",
  },
];

const mockPollingStations: PollingStation[] = [
  {
    id: 1,
    election_id: 1,
    name: "Op Rolletjes",
    number: 33,
    polling_station_type: "Mobile",
    address: "Rijksweg A12 1a",
    postal_code: "1234 YQ",
    locality: "Den Haag",
  },
  {
    id: 2,
    election_id: 1,
    name: "Testplek",
    number: 34,
    number_of_voters: 1000,
    polling_station_type: "Special",
    address: "Teststraat 2a",
    postal_code: "1234 QY",
    locality: "Testdorp",
  },
  {
    id: 3,
    election_id: 1,
    name: "Testschool",
    number: 35,
    number_of_voters: 1000,
    polling_station_type: "FixedLocation",
    address: "Testplein 1",
    postal_code: "1234 AB",
    locality: "Teststad",
  },
  {
    id: 4,
    election_id: 1,
    name: "Testbuurthuis",
    number: 36,
    number_of_voters: 1000,
    polling_station_type: "FixedLocation",
    address: "Testlaan 100",
    postal_code: "1234 WZ",
    locality: "Testplaats",
  },
];

const mockElection: Required<Election> = {
  id: 1,
  name: "Gemeenteraadsverkiezingen 2026",
  location: "Heemdamseburg",
  number_of_voters: 100,
  category: "Municipal",
  number_of_seats: 29,
  election_date: "2024-11-30",
  nomination_date: "2024-11-01",
  status: "DataEntryInProgress",
  political_groups: [
    {
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
    },
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
    {
      number: 3,
      name: "Eeuwenoude Aarde Unie",
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
    {
      number: 4,
      name: "Verbond van Licht en Leven",
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
    {
      number: 5,
      name: "Nieuwe Horizon Beweging",
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
    {
      number: 6,
      name: "VRG",
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
    {
      number: 7,
      name: "Harmonie van Hemel en Aarde",
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
    {
      number: 8,
      name: "Stralende Sterren Alliantie",
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
    {
      number: 9,
      name: "Tijdloze Toekomst Partij",
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
    {
      number: 10,
      name: "Kosmische Kracht Coalitie",
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
    {
      number: 11,
      name: "Magische Melodieën Beweging",
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
    {
      number: 12,
      name: "Zilveren Zonnestralen Partij",
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
    {
      number: 13,
      name: "Mystieke Maanlicht Liga",
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
    {
      number: 14,
      name: "GVR",
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
    {
      number: 15,
      name: "Partij voor de ontwikkeling",
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
    {
      number: 16,
      name: "Bond van de kiezers",
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
    {
      number: 17,
      name: "Omega",
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
    {
      number: 18,
      name: "Partij van de werkers",
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
    {
      number: 19,
      name: "Sterrenpartij",
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
    {
      number: 20,
      name: "Partij voor de zon",
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
  ],
};
