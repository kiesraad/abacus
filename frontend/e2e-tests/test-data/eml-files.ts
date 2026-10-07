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
  hashInput1: "0323",
  hashInput2: "24f0",
  fullHash: [
    "9ec4",
    "63e4",
    "7c98",
    "544f",
    "e4b8",
    "0323",
    "bc85",
    "d000",
    "93e4",
    "1cc2",
    "53ae",
    "bf8d",
    "cf84",
    "99b3",
    "24f0",
    "7334",
  ],
};

export const eml110a_less_than_19_seats: Eml110a = {
  filename: "eml110a_test_less_than_19_seats.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml110a_test_less_than_19_seats.eml.xml",
  electionName: "Gemeenteraad Test 2022",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "0a4d",
  hashInput2: "9126",
  fullHash: [
    "5499",
    "4bc6",
    "0a4d",
    "a878",
    "1b17",
    "e818",
    "3273",
    "d2bc",
    "54cc",
    "40af",
    "e5d9",
    "1b23",
    "d9cc",
    "4e60",
    "8dd4",
    "9126",
  ],
};

export const eml110a_AB: Eml110a = {
  filename: "eml110a_test_AB.eml.xml",
  path: "../backend/src/eml/tests/eml110a_test_AB.eml.xml",
  electionName: "Waterschap Rivier en Polder 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "d202",
  hashInput2: "40e3",
  fullHash: [
    "21d3",
    "291c",
    "fc95",
    "b2ed",
    "2eed",
    "37b6",
    "c697",
    "d202",
    "e4e0",
    "db18",
    "d30c",
    "40e3",
    "4c17",
    "66ac",
    "1d82",
    "afbc",
  ],
};

export const eml110a_PS1: Eml110a = {
  filename: "eml110a_test_PS1.eml.xml",
  path: "../backend/src/eml/tests/eml110a_test_PS1.eml.xml",
  electionName: "Provinciale Staten Oost-Holland 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "16de",
  hashInput2: "2d7e",
  fullHash: [
    "4011",
    "894b",
    "16de",
    "b0cf",
    "51ca",
    "a653",
    "3880",
    "dbd7",
    "16a2",
    "4809",
    "2d7e",
    "ac16",
    "826d",
    "d292",
    "04fd",
    "9253",
  ],
};

export const eml110a_PS2: Eml110a = {
  filename: "eml110a_test_PS2.eml.xml",
  path: "../backend/src/eml/tests/eml110a_test_PS2.eml.xml",
  electionName: "Provinciale Staten Zuid-Brabant 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "e1ac",
  hashInput2: "d939",
  fullHash: [
    "aa0e",
    "19de",
    "d822",
    "a6d4",
    "e1ac",
    "8730",
    "f24f",
    "3e7f",
    "2ae9",
    "0bfb",
    "0e3e",
    "5516",
    "d939",
    "85b7",
    "83e8",
    "1e61",
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
  hashInput1: "7c1a",
  hashInput2: "fa03",
  fullHash: [
    "7c1a",
    "b8f2",
    "aa51",
    "2b77",
    "0116",
    "802a",
    "9c46",
    "5ece",
    "5eab",
    "760d",
    "2f59",
    "9f21",
    "d21b",
    "e0c2",
    "8f0d",
    "fa03",
  ],
};

export const eml230b_with_gaps: Eml230b = {
  filename: "eml230b_test_with_gaps.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml230b_test_with_gaps.eml.xml",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "950f",
  hashInput2: "2f8c",
  fullHash: [
    "9086",
    "e0d6",
    "24b3",
    "b5d0",
    "08d7",
    "8829",
    "950f",
    "9ff1",
    "0568",
    "cf59",
    "7ad5",
    "2f8c",
    "b0d6",
    "0a96",
    "f23e",
    "e4e7",
  ],
};

export const eml230b_more_than_45_candidates: Eml230b = {
  filename: "eml230b_test_more_than_45_candidates.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml230b_test_more_than_45_candidates.eml.xml",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "810a",
  hashInput2: "a2c7",
  fullHash: [
    "b488",
    "eda7",
    "1dc6",
    "edbf",
    "84bb",
    "a16b",
    "810a",
    "fd54",
    "7f14",
    "8b10",
    "a2c7",
    "54d0",
    "30c1",
    "e1a4",
    "e743",
    "c7f2",
  ],
};

export const eml230b_AB: Eml230b = {
  filename: "eml230b_test_AB.eml.xml",
  path: "../backend/src/eml/tests/eml230b_test_AB.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "d319",
  hashInput2: "0c7d",
  fullHash: [
    "5708",
    "8b85",
    "4f52",
    "aeac",
    "7097",
    "6d45",
    "6ebe",
    "d319",
    "5bc0",
    "0c7d",
    "bd87",
    "52a8",
    "48d6",
    "a153",
    "333c",
    "1649",
  ],
};

export const eml230b_AB_more_than_45_candidates: Eml230b = {
  filename: "eml230b_test_AB_more_than_45_candidates.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml230b_test_AB_more_than_45_candidates.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "bc90",
  hashInput2: "4949",
  fullHash: [
    "b1bb",
    "d458",
    "db8e",
    "c73e",
    "716b",
    "2b29",
    "a8f4",
    "bc90",
    "3653",
    "05bb",
    "95e3",
    "4b09",
    "3c98",
    "4949",
    "7c4e",
    "1021",
  ],
};

export const eml230b_PS1: Eml230b = {
  filename: "eml230b_test_PS1.eml.xml",
  path: "../backend/src/eml/tests/eml230b_test_PS1.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "3b22",
  hashInput2: "9f6a",
  fullHash: [
    "95ea",
    "3b22",
    "d86e",
    "bd75",
    "1067",
    "2ae1",
    "73f8",
    "bb48",
    "262d",
    "b348",
    "4fe5",
    "87d2",
    "0845",
    "8b5b",
    "9f6a",
    "d84a",
  ],
};

export const eml230b_PS2: Eml230b = {
  filename: "eml230b_test_PS2.eml.xml",
  path: "../backend/src/eml/tests/eml230b_test_PS2.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "622c",
  hashInput2: "c7a1",
  fullHash: [
    "ca77",
    "d714",
    "99a3",
    "b89c",
    "6b56",
    "622c",
    "ffa3",
    "ac16",
    "f42e",
    "3d42",
    "c7a1",
    "7cf6",
    "027b",
    "e1e0",
    "7eee",
    "cab8",
  ],
};
