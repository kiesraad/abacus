import { mergeTests } from "@playwright/test";
import { csbFixtures } from "./fixtures/csb-fixtures";
import { gsbFixtures } from "./fixtures/gsb-fixtures";
import { userFixtures } from "./fixtures/user-fixtures";

export const test = mergeTests(userFixtures, gsbFixtures, csbFixtures);
