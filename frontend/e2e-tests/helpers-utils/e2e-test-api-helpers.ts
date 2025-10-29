import { APIRequestContext, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

import { dataEntryRequest } from "../test-data/request-response-templates";
import { DataEntryApiClient } from "./api-clients";

const TEMP_DIR = "./e2e-tests/temp/";

export interface EmlTestFile {
  filename: string;
  path: string;
}

export function getTestPassword(username: string, prefix = ""): string {
  const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
  return `${prefix}${capitalizedUsername}Password01`;
}

export async function loginAs(request: APIRequestContext, username: string, passwordPrefix = "") {
  const password = getTestPassword(username, passwordPrefix);
  return await request.post("/api/login", {
    data: {
      username,
      password,
    },
  });
}

export async function completePollingStationDataEntries(
  request: APIRequestContext,
  pollingStationId: number,
  firstRequest = dataEntryRequest,
  secondRequest = dataEntryRequest,
) {
  await loginAs(request, "typist1");
  const firstDataEntry = new DataEntryApiClient(request, pollingStationId, 1);
  await firstDataEntry.claim();
  await firstDataEntry.save(firstRequest);
  await firstDataEntry.finalise();

  await loginAs(request, "typist2");
  const secondDataEntry = new DataEntryApiClient(request, pollingStationId, 2);
  await secondDataEntry.claim();
  await secondDataEntry.save(secondRequest);
  await secondDataEntry.finalise();
}

export async function generateEml(
  request: APIRequestContext,
  eml: "eml110a" | "eml110b" | "eml230b",
): Promise<EmlTestFile> {
  const fileSize = 5 * 1024 * 1024; // 5MB
  const response = await request.get(`/api/generate_${eml}/${fileSize}`);
  expect(response.headers()["content-type"]).toEqual("application/xml");

  const content = await response.text();
  const filename = `${eml}_invalid_file_size-${randomUUID()}.eml.xml`;

  // Recursive also to not fail if the directory already exists
  await mkdir(TEMP_DIR, { recursive: true });

  const path = TEMP_DIR + filename;
  await writeFile(path, content, "utf8");

  return { filename, path };
}
