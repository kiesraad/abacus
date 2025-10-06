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

  async uploadFile(page: Page, path: string) {
    const fileChooserPromise = page.waitForEvent("filechooser");
    await this.upload.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path);
  }

  async fileTooLargeError(page: Page, path: string) {
    await expect(this.error).toBeVisible();
    await expect(page.getByRole("strong").filter({ hasText: path })).toBeVisible();
  }
}
