import { mergeTests } from "@playwright/test";
import { csbFixtures } from "./fixtures/csb-fixtures";
import { gsbFixtures } from "./fixtures/gsb-fixtures";
import { userFixtures } from "./fixtures/user-fixtures";

export const test = mergeTests(userFixtures, gsbFixtures, csbFixtures);

export const FIXTURE_TYPIST_TEMP_PASSWORD: string = "temp_password_9876";

export interface DataEntry {
  election_id: number;
  id: number;
  name: string;
  number: string;
}
