import { mergeTests } from "@playwright/test";
import { csbFixtures } from "./fixtures/csb-fixtures";
import { gsbFixtures } from "./fixtures/gsb-fixtures";

// userFixtures are available through the other fixtures
export const test = mergeTests(gsbFixtures, csbFixtures);
