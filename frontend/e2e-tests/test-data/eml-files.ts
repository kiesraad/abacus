export const eml110a = {
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

export const eml110b = {
  filename: "eml110b_test.eml.xml",
  path: "../backend/src/eml/tests/eml110b_test.eml.xml",
};

export const eml110b_short = {
  filename: "eml110b_less_than_10_stations.eml.xml",
  path: "../backend/src/eml/tests/eml110b_less_than_10_stations.eml.xml",
};

export const eml110b_single = {
  filename: "eml110b_1_station.eml.xml",
  path: "../backend/src/eml/tests/eml110b_1_station.eml.xml",
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
  path: "../backend/src/eml/tests/eml230b_test_with_gaps.eml.xml",
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
