import { expect, type Locator, type Page } from "@playwright/test";

export class PollingStationImportPgObj {
  readonly header: Locator;
  readonly error: Locator;
  readonly upload: Locator;
  readonly importButton: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Stembureaus importeren" });
    this.importButton = page.getByRole("button", { name: "Stembureaus importeren" });
    this.error = page.getByRole("strong").filter({ hasText: "Ongeldig stembureaubestand" });
    this.upload = page.getByRole("button", { name: "Bestand kiezen" });
  }

  async uploadFile(path: string) {
    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await this.upload.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path);
  }

  async fileTooLargeError(filename: string) {
    await expect(this.error).toBeVisible();
    await expect(this.page.getByRole("strong").filter({ hasText: filename })).toBeVisible();
  }
}
