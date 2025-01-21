import { PollingStation } from "@kiesraad/api";

export const pollingStationMockData: PollingStation[] = [
  {
    id: 1,
    election_id: 1,
    name: "Op Rolletjes",
    number: 33,
    number_of_voters: undefined,
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
