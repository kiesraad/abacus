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
  hashInput1: "13e6",
  hashInput2: "ee24",
  fullHash: [
    "c738",
    "4baf",
    "7edc",
    "13e6",
    "ede8",
    "ceb1",
    "57db",
    "d48a",
    "88fc",
    "771b",
    "be49",
    "a7c5",
    "a5a3",
    "aca7",
    "acbe",
    "ee24",
  ],
};

export const eml110a_less_than_19_seats: Eml110a = {
  filename: "eml110a_test_less_than_19_seats.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml110a_test_less_than_19_seats.eml.xml",
  electionName: "Gemeenteraad Test 2022",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "e8c6",
  hashInput2: "4b05",
  fullHash: [
    "d10d",
    "1871",
    "1bbe",
    "e8c6",
    "9765",
    "0a3c",
    "bf3d",
    "4d7f",
    "a6f0",
    "c32a",
    "7d25",
    "2b24",
    "61c3",
    "9d91",
    "4b05",
    "6d15",
  ],
};

export const eml110a_AB: Eml110a = {
  filename: "eml110a_test_AB.eml.xml",
  path: "../backend/src/eml/tests/eml110a_test_AB.eml.xml",
  electionName: "Waterschap Rivier en Polder 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "70ae",
  hashInput2: "8ed3",
  fullHash: [
    "972b",
    "b30f",
    "70ae",
    "5632",
    "702c",
    "5b1e",
    "2d34",
    "e30e",
    "16b2",
    "d9dd",
    "0a94",
    "57eb",
    "0877",
    "8ed3",
    "cedf",
    "0904",
  ],
};

export const eml110a_PS1: Eml110a = {
  filename: "eml110a_test_PS1.eml.xml",
  path: "../backend/src/eml/tests/eml110a_test_PS1.eml.xml",
  electionName: "Provinciale Staten Oost-Holland 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "b302",
  hashInput2: "5689",
  fullHash: [
    "4e34",
    "9467",
    "c418",
    "efcd",
    "f2c4",
    "b302",
    "bafd",
    "30ba",
    "b0eb",
    "5689",
    "aaeb",
    "3d5e",
    "f4c8",
    "9bd3",
    "0a51",
    "e384",
  ],
};

export const eml110a_PS2: Eml110a = {
  filename: "eml110a_test_PS2.eml.xml",
  path: "../backend/src/eml/tests/eml110a_test_PS2.eml.xml",
  electionName: "Provinciale Staten Zuid-Brabant 2023",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "74a4",
  hashInput2: "5a73",
  fullHash: [
    "e1a1",
    "cc6d",
    "46d0",
    "2225",
    "74a4",
    "8ca9",
    "ad3e",
    "e2a5",
    "d08f",
    "9cb9",
    "6a5a",
    "5a73",
    "0f6b",
    "1a97",
    "ab3e",
    "80fe",
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
  hashInput1: "0e5b",
  hashInput2: "f18e",
  fullHash: [
    "0e5b",
    "7360",
    "6c66",
    "4093",
    "68e5",
    "f853",
    "1470",
    "b5cf",
    "5293",
    "21dd",
    "f92e",
    "76b8",
    "8ed5",
    "f18e",
    "81f6",
    "4fe9",
  ],
};

export const eml230b_with_gaps: Eml230b = {
  filename: "eml230b_test_with_gaps.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml230b_test_with_gaps.eml.xml",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "9c26",
  hashInput2: "00ed",
  fullHash: [
    "0ae4",
    "2204",
    "9c26",
    "3e68",
    "c494",
    "d5fa",
    "8737",
    "b81f",
    "6ae1",
    "0a33",
    "5ab8",
    "6c99",
    "0431",
    "03bc",
    "4c8f",
    "00ed",
  ],
};

export const eml230b_more_than_45_candidates: Eml230b = {
  filename: "eml230b_test_more_than_45_candidates.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml230b_test_more_than_45_candidates.eml.xml",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "1bbb",
  hashInput2: "bc88",
  fullHash: [
    "6155",
    "bd20",
    "f66e",
    "1a12",
    "961d",
    "ae57",
    "cc10",
    "1bbb",
    "7226",
    "f440",
    "6131",
    "1e18",
    "275d",
    "c67a",
    "bc88",
    "8141",
  ],
};

export const eml230b_AB: Eml230b = {
  filename: "eml230b_test_AB.eml.xml",
  path: "../backend/src/eml/tests/eml230b_test_AB.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "69e1",
  hashInput2: "5ba4",
  fullHash: [
    "9526",
    "1053",
    "22c1",
    "69e1",
    "abb0",
    "1b89",
    "65cc",
    "5cfd",
    "49c0",
    "392a",
    "161a",
    "5ba4",
    "5e96",
    "77ae",
    "fe0d",
    "b775",
  ],
};

export const eml230b_AB_more_than_45_candidates: Eml230b = {
  filename: "eml230b_test_AB_more_than_45_candidates.eml.xml",
  path: "e2e-tests/test-data/eml-files/eml230b_test_AB_more_than_45_candidates.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "8d5c",
  hashInput2: "651c",
  fullHash: [
    "b5ac",
    "8d5c",
    "caf5",
    "10bc",
    "0114",
    "9166",
    "5a32",
    "9c72",
    "431c",
    "030d",
    "1236",
    "65de",
    "0c66",
    "651c",
    "2179",
    "b6d6",
  ],
};

export const eml230b_PS1: Eml230b = {
  filename: "eml230b_test_PS1.eml.xml",
  path: "../backend/src/eml/tests/eml230b_test_PS1.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "d464",
  hashInput2: "6559",
  fullHash: [
    "d464",
    "56c3",
    "78b3",
    "941a",
    "baff",
    "1ee2",
    "eb41",
    "d88c",
    "0af8",
    "465c",
    "33aa",
    "6559",
    "ac15",
    "5a78",
    "64b0",
    "09d4",
  ],
};

export const eml230b_PS2: Eml230b = {
  filename: "eml230b_test_PS2.eml.xml",
  path: "../backend/src/eml/tests/eml230b_test_PS2.eml.xml",
  electionDate: "woensdag 15 maart 2023",
  hashInput1: "b285",
  hashInput2: "667c",
  fullHash: [
    "bce2",
    "c279",
    "6418",
    "b285",
    "9620",
    "9a4d",
    "69ca",
    "72e4",
    "7481",
    "4cb2",
    "667c",
    "53bb",
    "d97d",
    "cbc3",
    "78c9",
    "d5f9",
  ],
};

export type Eml510b = {
  emlPath: string;
  signaturePath: string;
  certificatePath: string;
  zipFileName: string;
  electionDate: string;
  hashInput1: string;
  hashInput2: string;
  fullHash: string[];
};

export const eml510b: Eml510b = {
  emlPath: "../backend/src/eml/tests/eml510b_test.eml.xml",
  signaturePath: "../backend/src/eml/tests/eml510b_test.eml.xml.signature",
  certificatePath: "../backend/src/eml/tests/eml510b_test.crt",
  zipFileName: "telling.eml.xml.zip",
  electionDate: "woensdag 16 maart 2022",
  hashInput1: "c9a9",
  hashInput2: "41a4",
  fullHash: [
    "10a9",
    "c9a9",
    "3d71",
    "2fd0",
    "f92f",
    "65ac",
    "f4c0",
    "1601",
    "2fbe",
    "baee",
    "1293",
    "72e3",
    "28a6",
    "65b4",
    "973b",
    "41a4",
  ],
};
