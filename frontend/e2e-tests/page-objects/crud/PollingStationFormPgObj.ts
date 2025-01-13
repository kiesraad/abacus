import { type Locator, type Page } from "@playwright/test";

import { PollingStation } from "@kiesraad/api";

export class PollingStationFormPgObj {
  protected readonly page: Page;

  //hidden inputs
  readonly idInput: Locator;
  readonly electionIdInput: Locator;

  //required inputs
  readonly numberInput: Locator;
  readonly nameInput: Locator;

  //optional inputs
  readonly pollingStationTypeInput: Locator;
  readonly numberOfVotersInput: Locator;
  readonly addressInput: Locator;
  readonly postalCodeInput: Locator;
  readonly localityInput: Locator;

  readonly createButton: Locator;
  readonly updateButton: Locator;

  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;

    this.idInput = page.getByRole("textbox", { name: "id" });
    this.electionIdInput = page.getByRole("textbox", { name: "election_id" });

    this.numberInput = page.getByTestId("number");
    this.nameInput = page.getByTestId("name");

    this.pollingStationTypeInput = page.getByRole("radio", { name: "Vaste locatie" });
    this.numberOfVotersInput = page.getByRole("textbox", { name: "Aantal kiesgerechtigden Optioneel" });
    this.addressInput = page.getByRole("textbox", { name: "Straatnaam en huisnummer" });
    this.postalCodeInput = page.getByRole("textbox", { name: "Postcode" });
    this.localityInput = page.getByRole("textbox", { name: "Plaats" });

    this.createButton = page.getByRole("button", { name: "Opslaan en toevoegen" });
    this.updateButton = page.getByRole("button", { name: "Wijzigingen opslaan" });

    this.error = page.getByRole("alert");
  }

  async submitCreate() {
    await this.createButton.click();
  }
  async submitUpdate() {
    await this.updateButton.click();
  }

  async fillIn(values: Partial<PollingStation>) {
    if (values.id) {
      await this.idInput.fill(values.id.toString());
    }
    if (values.election_id) {
      await this.electionIdInput.fill(values.election_id.toString());
    }
    if (values.number !== undefined) {
      await this.numberInput.fill(values.number.toString());
    }
    if (values.name) {
      await this.nameInput.fill(values.name);
    }
    if (values.polling_station_type) {
      await this.pollingStationTypeInput.fill(values.polling_station_type);
    }
    if (values.number_of_voters) {
      await this.numberOfVotersInput.fill(values.number_of_voters.toString());
    }
    if (values.address) {
      await this.addressInput.fill(values.address);
    }
    if (values.postal_code) {
      await this.postalCodeInput.fill(values.postal_code);
    }
    if (values.locality) {
      await this.localityInput.fill(values.locality);
    }
  }
}
