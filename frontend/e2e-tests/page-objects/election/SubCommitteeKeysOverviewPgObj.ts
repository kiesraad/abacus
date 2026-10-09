import type { Locator, Page } from "@playwright/test";

export class SubCommitteeKeysOverview {
  readonly header: Locator;
  readonly subHeader: Locator;
  readonly upload: Locator;
  readonly pendingTableHeader: Locator;
  readonly pendingTable: Locator;
  readonly pendingSubCommittees: Locator;
  readonly importedTableHeader: Locator;
  readonly importedTable: Locator;
  readonly importedSubCommittees: Locator;
  readonly publicKeyAdded: Locator;
  readonly alertPublicKeyAdded: Locator;
  readonly publicKeyDeleted: Locator;
  readonly alertPublicKeyDeleted: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", {
      level: 1,
      name: "Sleutels van GSB's beheren",
    });
    this.subHeader = page.getByRole("heading", {
      level: 2,
      name: "Voeg de publieke sleutels van alle GSB's in de kieskring toe",
    });
    this.upload = page.getByRole("button", { name: "Bestand kiezen" });
    this.pendingTableHeader = page.getByRole("heading", {
      level: 3,
      name: "Nog toe te voegen publieke sleutels",
    });
    this.pendingTable = page.getByTestId("pending_sub_committee_keys");
    this.pendingSubCommittees = this.pendingTable.locator("tbody").getByRole("row");
    this.importedTableHeader = page.getByRole("heading", {
      level: 3,
      name: "Geïmporteerde publieke sleutels",
    });
    this.importedTable = page.getByTestId("imported_sub_committee_keys");
    this.importedSubCommittees = this.importedTable.locator("tbody").getByRole("row");

    this.publicKeyAdded = page.getByRole("strong").filter({
      hasText: /^Publieke sleutel Heemdamseburg toegevoegd$/,
    });
    this.alertPublicKeyAdded = page.getByRole("alert").filter({ has: this.publicKeyAdded });

    this.publicKeyDeleted = page.getByRole("strong").filter({
      hasText: /^Publieke sleutel Heemdamseburg verwijderd$/,
    });
    this.alertPublicKeyDeleted = page.getByRole("alert").filter({ has: this.publicKeyDeleted });
  }

  async uploadFile(path: string) {
    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await this.upload.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path);
  }

  async clickSubCommitteeFromList(number: string) {
    await this.importedTable.getByTestId(`subCommittee-${number}`).click();
  }
}
