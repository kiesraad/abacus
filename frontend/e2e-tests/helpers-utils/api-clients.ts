import { APIRequestContext, expect } from "@playwright/test";

import {
  DataEntry,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH,
} from "@/types/generated/openapi";

export class DataEntryApiClient {
  private session: APIRequestContext;
  private baseUrl: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH;

  public constructor(request: APIRequestContext, pollingStationId: number, entryNumber: number) {
    this.session = request;
    this.baseUrl = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
  }

  public async claim() {
    const claimUrl: POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH = `${this.baseUrl}/claim`;
    const claimResponse = await this.session.post(claimUrl);
    expect(claimResponse.ok()).toBeTruthy();
  }

  public async save(dataEntry: DataEntry) {
    const saveResponse = await this.session.post(this.baseUrl, { data: dataEntry });
    expect(saveResponse.ok()).toBeTruthy();
  }

  public async finalise() {
    const finaliseUrl: POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH = `${this.baseUrl}/finalise`;
    const finaliseResponse = await this.session.post(finaliseUrl);
    expect(finaliseResponse.ok()).toBeTruthy();
  }
}
