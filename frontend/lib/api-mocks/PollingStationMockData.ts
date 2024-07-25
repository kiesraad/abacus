import { PollingStationListResponse } from "@kiesraad/api";

export const pollingStationMockData: PollingStationListResponse = {
  polling_stations: [
    {
      election_id: 1,
      id: 1,
      number: 33,
      name: 'Stembureau "Op Rolletjes"',
      house_number: "1",
      locality: "Den Haag",
      polling_station_type: "Mobiel",
      postal_code: "1234 YQ",
      street: "Rijksweg A12",
    },
    {
      election_id: 1,
      id: 2,
      number: 34,
      name: "Testplek",
      house_number: "2",
      locality: "Testdorp",
      polling_station_type: "Bijzonder",
      postal_code: "1234 QY",
      street: "Teststraat",
    },
    {
      election_id: 1,
      id: 3,
      number: 35,
      name: "Testgebouw",
      house_number: "3",
      locality: "Teststad",
      polling_station_type: "VasteLocatie",
      postal_code: "1234 QA",
      street: "Testweg",
    },
  ],
};
