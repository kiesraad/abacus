import fs from "fs";
import path from "path";

import { generate } from "./openapi/generator";

const PROJECT_ROOT = path.join(__dirname, "..");
const TARGET_PATH = `${PROJECT_ROOT}/lib/api/gen`;
const FILE_NAME = "openapi.ts";
//const PRETTIER_CONFIG = path.join(PROJECT_ROOT, "/.prettierrc.cjs");

async function run() {
  const fileString = fs.readFileSync("../backend/openapi.json", "utf8");
  if (!fileString) {
    return;
  }

  if (fs.existsSync(TARGET_PATH)) {
    fs.rmSync(TARGET_PATH, { recursive: true });
  }
  fs.mkdirSync(TARGET_PATH);

  const result = await generate(fileString);
  fs.writeFileSync(`${TARGET_PATH}/${FILE_NAME}`, result);
}

run().catch((e: unknown) => {
  console.error(e);
});
