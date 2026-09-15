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

export const eml110a_AB: Eml110a = {
  filename: "eml110a_test_AB.eml.xml",
  path: "../backend/src/eml/tests/eml110a_test_AB.eml.xml",
  electionName: "Waterschap Rivier en Polder 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "2989",
  hashInput2: "d0f4",
  fullHash: [
    "f958",
    "1366",
    "c63f",
    "b36e",
    "2989",
    "bf4e",
    "4bb2",
    "e6a8",
    "ba2f",
    "e9b6",
    "9d40",
    "7ac6",
    "f546",
    "863c",
    "6a6c",
    "d0f4",
  ],
};

export const eml110a_PS1: Eml110a = {
  filename: "eml110a_test_PS1.eml.xml",
  path: "../backend/src/eml/tests/eml110a_test_PS1.eml.xml",
  electionName: "Provinciale Staten Oost-Holland 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "4d1e",
  hashInput2: "7a28",
  fullHash: [
    "135c",
    "e08d",
    "519f",
    "1d3f",
    "4d1e",
    "8122",
    "4c67",
    "f676",
    "6746",
    "a0ac",
    "020d",
    "0a76",
    "7a28",
    "21e6",
    "5a01",
    "5ad2",
  ],
};

export const eml110a_PS2: Eml110a = {
  filename: "eml110a_test_PS2.eml.xml",
  path: "../backend/src/eml/tests/eml110a_test_PS2.eml.xml",
  electionName: "Provinciale Staten Zuid-Brabant 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "2844",
  hashInput2: "a5cd",
  fullHash: [
    "2844",
    "f3a9",
    "0e11",
    "1027",
    "0e7f",
    "db07",
    "1cd9",
    "6744",
    "5b48",
    "a995",
    "541c",
    "9f93",
    "a5cd",
    "58b0",
    "b00a",
    "e067",
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

export const eml230b_AB: Eml230b = {
  filename: "eml230b_test_AB.eml.xml",
  path: "../backend/src/eml/tests/eml230b_test_AB.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "9762",
  hashInput2: "1639",
  fullHash: [
    "2ef7",
    "9762",
    "3b27",
    "1c08",
    "7ba6",
    "0473",
    "40b0",
    "a7fe",
    "7e43",
    "35e1",
    "014f",
    "0e61",
    "e737",
    "1d0d",
    "1639",
    "999d",
  ],
};

export const eml230b_AB_more_than_45_candidates: Eml230b = {
  filename: "eml230b_test_AB_more_than_45_candidates.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml230b_test_AB_more_than_45_candidates.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "28bd",
  hashInput2: "1f07",
  fullHash: [
    "2f80",
    "6d2f",
    "3e8a",
    "2dc3",
    "5a7e",
    "28bd",
    "3c70",
    "b2e5",
    "4ada",
    "9e0b",
    "0370",
    "0880",
    "1f07",
    "4116",
    "9185",
    "a043",
  ],
};

export const eml230b_PS1: Eml230b = {
  filename: "eml230b_test_PS1.eml.xml",
  path: "../backend/src/eml/tests/eml230b_test_PS1.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "1e48",
  hashInput2: "0862",
  fullHash: [
    "9cc9",
    "29f3",
    "c415",
    "67de",
    "f033",
    "c1d2",
    "1e48",
    "dfee",
    "8ad8",
    "0862",
    "05f2",
    "5dcc",
    "c3e4",
    "e812",
    "1034",
    "4953",
  ],
};

export const eml230b_PS2: Eml230b = {
  filename: "eml230b_test_PS2.eml.xml",
  path: "../backend/src/eml/tests/eml230b_test_PS2.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "3f3a",
  hashInput2: "5f49",
  fullHash: [
    "3f3a",
    "2975",
    "3552",
    "8261",
    "120d",
    "5e0a",
    "562e",
    "6ae6",
    "1a61",
    "2358",
    "5f49",
    "d065",
    "9696",
    "3bcd",
    "0b3f",
    "ed3b",
  ],
};
