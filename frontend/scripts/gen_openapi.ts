import fs from "fs";

import { generate } from "./openapi/generator";

const TARGET_PATH = "src/types/generated/openapi.ts";

async function run() {
  const fileString = fs.readFileSync("../backend/openapi.json", "utf8");
  if (!fileString) {
    throw new Error("Failed to read openapi.json");
  }
  const result = await generate(fileString);
  fs.writeFileSync(TARGET_PATH, result);
}

run().catch((e: unknown) => {
  console.error(e);
});
