import type { Locator, Page } from "@playwright/test";

export class DataEntryImportPgObj {
  readonly header: Locator;
  readonly buttonAbort: Locator;
  readonly fileUploadButton: Locator;
  readonly main: Locator;
  readonly errorInvalidZip: Locator;
  readonly errorSignatureMissing: Locator;
  readonly errorSignatureMismatch: Locator;
  readonly errorDataEntryAlreadyImported: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Importeer tellingsbestand" });
    this.buttonAbort = page.getByRole("button", { name: "Importeren afbreken" });
    this.fileUploadButton = page.getByRole("button", { name: "Bestand kiezen" });
    this.main = page.getByRole("main");
    this.errorInvalidZip = page.getByRole("alert").filter({ hasText: "Geen geldig ZIP-bestand" });
    this.errorSignatureMissing = page.getByRole("alert").filter({ hasText: "Digitale handtekening ontbreekt" });
    this.errorSignatureMismatch = page.getByRole("alert").filter({ hasText: "Onbekende digitale handtekening" });
    this.errorDataEntryAlreadyImported = page
      .getByRole("alert")
      .filter({ hasText: "Telresultaten GSB al geïmporteerd" });
  }

  async uploadFile(file: { name: string; mimeType: string; buffer: Buffer }) {
    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await this.page.getByText("Bestand kiezen").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);
  }
}
