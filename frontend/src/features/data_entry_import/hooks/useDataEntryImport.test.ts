import { describe, expect, test } from "vitest";
import { importRequestBody } from "./useDataEntryImport";

const file = new File(["content"], "tellingbestand_510b.zip", { type: "application/zip" });

describe("importRequestBody", () => {
  test("sets the data field with File data", () => {
    const body = importRequestBody(file);
    // As jsdom stores the string representation of a file, asserting on it is the only
    // way to check whether it's actual File and not e.g. FornData.
    expect(body.get("data")).toEqual("[object File]");
  });

  test("leaves out the hash field when none is given", () => {
    const body = importRequestBody(file);
    expect(body.get("hash")).toBeNull();
  });

  test("sets the hash field with a JSON string", () => {
    const body = importRequestBody(file, ["5497", "947b", "9664", "d818"]);
    expect(body.get("hash")).toEqual('["5497","947b","9664","d818"]');
  });
});
