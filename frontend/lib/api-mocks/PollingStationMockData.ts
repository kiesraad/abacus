import { PollingStationListResponse } from "@kiesraad/api";

export const pollingStationMockData: PollingStationListResponse = {
  polling_stations: [
    {
      id: 1,
      number: 1,
      name: 'Stembureau "Op Rolletjes"',
      house_number: "33",
      locality: "Den Haag",
      polling_station_type: "Mobiel",
      postal_code: "1234 YQ",
      street: "Rijksweg A12",
    },
  ],
};
