import { PollingStation } from "@kiesraad/api";

// should match backend/fixtures/polling_stations.sql

export const pollingStation33: PollingStation = {
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
