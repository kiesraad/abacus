import fs from "fs/promises";
import path from "path";
import { describe, expect, test } from "vitest";

import { generate } from "../../scripts/openapi/generator";

const FRONTEND_ROOT = path.join(__dirname, "../..");
const BACKEND_ROOT = path.join(FRONTEND_ROOT, "..", "backend");

const OPEN_API_JSON_PATH = `${BACKEND_ROOT}/openapi.json`;
const CURRENT_SPEC_PATH = `${FRONTEND_ROOT}/src/api/gen/openapi.ts`;

describe("openapi spec", () => {
  test("openapi spec is up to date", async () => {
    const openAPIJSONString = await fs.readFile(OPEN_API_JSON_PATH, "utf8");

    const latestSpecString = await generate(openAPIJSONString);
    const currentSpecString = await fs.readFile(CURRENT_SPEC_PATH, "utf8");

    expect(currentSpecString).toBe(latestSpecString);
  });
});
