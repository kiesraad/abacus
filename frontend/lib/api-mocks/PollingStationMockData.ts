import { PollingStation, PollingStationListResponse } from "@kiesraad/api";

export const pollingStationMockData: PollingStation = {
  id: 1,
  election_id: 1,
  name: "Op Rolletjes",
  number: 33,
  number_of_voters: undefined,
  polling_station_type: "Mobiel",
  street: "Rijksweg A12",
  house_number: "1",
  house_number_addition: undefined,
  postal_code: "1234 YQ",
  locality: "Den Haag",
  status: "first_entry",
};

export const getPollingStationListMockResponse = (election_id: number): PollingStationListResponse => {
  return {
    polling_stations: [
      { ...pollingStationMockData, election_id },
      {
        id: 2,
        election_id,
        name: "Testplek",
        number: 34,
        number_of_voters: 1000,
        polling_station_type: "Bijzonder",
        street: "Teststraat",
        house_number: "2",
        house_number_addition: "b",
        postal_code: "1234 QY",
        locality: "Testdorp",
        status: "first_entry",
      },
    ],
  };
};

export const pollingStationsMockResponse: PollingStationListResponse = getPollingStationListMockResponse(1);
