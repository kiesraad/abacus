import { expect, type Locator, type Page } from "@playwright/test";

import type { Election } from "@/types/generated/openapi";

export class CheckAndSavePgObj {
  readonly header: Locator;
  readonly electionName: Locator;
  readonly committeeCategory: Locator;
  readonly electionLocation: Locator;
  readonly numberOfListsAndCandidates: Locator;
  readonly numberOfPollingStations: Locator;
  readonly countingMethod: Locator;
  readonly numberOfVoters: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Controleren en opslaan" });
    this.electionName = page.getByTestId("election-name");
    this.committeeCategory = page.getByTestId("committee-category");
    this.electionLocation = page.getByTestId("election-location");
    this.numberOfListsAndCandidates = page.getByTestId("lists-and-candidates");
    this.numberOfPollingStations = page.getByTestId("polling-stations");
    this.countingMethod = page.getByTestId("counting-method");
    this.numberOfVoters = page.getByTestId("number-of-voters");
    this.save = page.getByRole("button", { name: "Opslaan" });
  }

  async saveElection(): Promise<Election> {
    const responsePromise = this.page.waitForResponse(`/api/elections/import`);
    await this.save.click();

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    return (await response.json()) as Election;
  }
}
