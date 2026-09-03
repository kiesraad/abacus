export type Eml110a = {
  filename: string;
  path: string;
  electionName: string;
  electionDate: string;
  hashInput1: string;
  hashInput2: string;
  fullHash: string[];
};

export const eml110a: Eml110a = {
  filename: "eml110a_test.eml.xml",
  path: "../backend/src/eml/tests/eml110a_test.eml.xml",
  electionName: "Gemeenteraad Test 2022",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "476b",
  hashInput2: "c0de",
  fullHash: [
    "4291",
    "a4e7",
    "c76e",
    "ed19",
    "476b",
    "ae90",
    "3882",
    "c2dc",
    "9162",
    "1950",
    "0e13",
    "0651",
    "34ff",
    "c0de",
    "340a",
    "4a38",
  ],
};

export const eml110a_less_than_19_seats: Eml110a = {
  filename: "eml110a_test_less_than_19_seats.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml110a_test_less_than_19_seats.eml.xml",
  electionName: "Gemeenteraad Test 2022",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "f369",
  hashInput2: "2efd",
  fullHash: [
    "f369",
    "ea57",
    "0b45",
    "a68e",
    "416e",
    "a6a3",
    "1a39",
    "91ec",
    "5a33",
    "0785",
    "ee27",
    "2efd",
    "c376",
    "e869",
    "e3c3",
    "9848",
  ],
};

export const eml110a_AB2023_Limburg: Eml110a = {
  filename: "Verkiezingsdefinitie_AB2023_Limburg.eml.xml",
  path: "../backend/src/eml/tests/definitions/Verkiezingsdefinitie_AB2023_Limburg.eml.xml",
  electionName: "Waterschap Limburg 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "7776",
  hashInput2: "92ce",
  fullHash: [
    "8ca6",
    "b30d",
    "f37e",
    "5b8d",
    "b3e3",
    "b027",
    "7776",
    "7166",
    "d058",
    "92ce",
    "9202",
    "a90e",
    "acd9",
    "3e30",
    "a925",
    "44c2",
  ],
};

export const eml110a_PS2023_Drenthe: Eml110a = {
  filename: "Verkiezingsdefinitie_PS2023_Drenthe.eml.xml",
  path: "../backend/src/eml/tests/definitions/Verkiezingsdefinitie_PS2023_Drenthe.eml.xml",
  electionName: "Provinciale Staten Drenthe 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "623b",
  hashInput2: "4080",
  fullHash: [
    "e8e0",
    "b931",
    "623b",
    "cd14",
    "4a77",
    "35a4",
    "3012",
    "fef2",
    "a7e1",
    "ab0b",
    "d1dd",
    "4080",
    "b72c",
    "84e6",
    "1697",
    "8ff3",
  ],
};

export const eml110a_PS2023_Limburg: Eml110a = {
  filename: "Verkiezingsdefinitie_PS2023_Limburg.eml.xml",
  path: "../backend/src/eml/tests/definitions/Verkiezingsdefinitie_PS2023_Limburg.eml.xml",
  electionName: "Provinciale Staten Limburg 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "03f9",
  hashInput2: "a115",
  fullHash: [
    "1d9e",
    "3e54",
    "03f9",
    "734f",
    "d2b9",
    "2d8a",
    "9249",
    "ca2c",
    "4882",
    "db93",
    "8801",
    "5609",
    "ded4",
    "a115",
    "110b",
    "c563",
  ],
};

export const eml110b = {
  filename: "eml110b_test_420_polling_stations.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml110b_test_420_polling_stations.eml.xml",
};

export const eml110b_short = {
  filename: "eml110b_less_than_10_stations.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml110b_less_than_10_stations.eml.xml",
};

export const eml110b_single = {
  filename: "eml110b_1_station.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml110b_1_station.eml.xml",
};

export const eml110b_zero_voters = {
  filename: "eml110b_zero_number_of_voters.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml110b_zero_number_of_voters.eml.xml",
};

export type Eml230b = {
  filename: string;
  path: string;
  electionDate: string;
  hashInput1: string;
  hashInput2: string;
  fullHash: string[];
};

export const eml230b: Eml230b = {
  filename: "eml230b_test.eml.xml",
  path: "../backend/src/eml/tests/eml230b_test.eml.xml",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "721a",
  hashInput2: "7096",
  fullHash: [
    "146d",
    "3784",
    "efa2",
    "93b5",
    "721a",
    "7578",
    "a43f",
    "0636",
    "7281",
    "66a0",
    "acf1",
    "55d3",
    "ab25",
    "083c",
    "c000",
    "7096",
  ],
};

export const eml230b_with_gaps: Eml230b = {
  filename: "eml230b_test_with_gaps.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml230b_test_with_gaps.eml.xml",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "02c2",
  hashInput2: "0b83",
  fullHash: [
    "ed7b",
    "2278",
    "5ab0",
    "d7b3",
    "c28a",
    "02c2",
    "593f",
    "8bc7",
    "87e2",
    "5b15",
    "2465",
    "f229",
    "9307",
    "0b83",
    "9c8f",
    "ce26",
  ],
};

export const eml230b_more_than_45_candidates: Eml230b = {
  filename: "eml230b_test_more_than_45_candidates.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml230b_test_more_than_45_candidates.eml.xml",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "6c76",
  hashInput2: "56c2",
  fullHash: [
    "af6a",
    "9c2e",
    "610c",
    "af55",
    "6c76",
    "ce3a",
    "2bb7",
    "efd7",
    "b8fe",
    "8122",
    "2db6",
    "8592",
    "4cbe",
    "56c2",
    "1aa6",
    "ddbc",
  ],
};

export const eml230b_AB2023_Limburg: Eml230b = {
  filename: "Kandidatenlijsten_AB2023_Limburg.eml.xml",
  path: "../backend/src/eml/tests/definitions/Kandidatenlijsten_AB2023_Limburg.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "cd86",
  hashInput2: "92ac",
  fullHash: [
    "dbac",
    "871e",
    "4e26",
    "8ddf",
    "5127",
    "bbd3",
    "d744",
    "cd86",
    "f353",
    "3158",
    "fbbb",
    "92ac",
    "3a08",
    "f2ff",
    "c4df",
    "6510",
  ],
};

export const eml230b_PS2023_Drenthe: Eml230b = {
  filename: "Kandidatenlijsten_PS2023_Drenthe.eml.xml",
  path: "../backend/src/eml/tests/definitions/Kandidatenlijsten_PS2023_Drenthe.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "55e4",
  hashInput2: "f349",
  fullHash: [
    "fa92",
    "0b2b",
    "55e4",
    "086d",
    "cb23",
    "b346",
    "b475",
    "91f5",
    "a0d0",
    "6391",
    "bc76",
    "0610",
    "ca8d",
    "359c",
    "5f4d",
    "f349",
  ],
};

export const eml230b_PS2023_Limburg: Eml230b = {
  filename: "Kandidatenlijsten_PS2023_Limburg_Maastricht.eml.xml",
  path: "../backend/src/eml/tests/definitions/Kandidatenlijsten_PS2023_Limburg_Maastricht.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "9f0b",
  hashInput2: "46a9",
  fullHash: [
    "6242",
    "abef",
    "6e6d",
    "381c",
    "4197",
    "2ed6",
    "3ddb",
    "9f0b",
    "39c3",
    "46a9",
    "c680",
    "f376",
    "4460",
    "0240",
    "2824",
    "9d53",
  ],
};
