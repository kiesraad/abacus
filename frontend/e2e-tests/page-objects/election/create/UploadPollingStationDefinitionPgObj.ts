import { expect, type Locator, type Page } from "@playwright/test";

export class UploadPollingStationDefinitionPgObj {
  readonly header: Locator;
  readonly error: Locator;
  readonly upload: Locator;
  readonly skipButton: Locator;
  readonly main: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Importeer stembureaus" });
    this.error = page.getByRole("strong").filter({ hasText: "Ongeldig stembureaubestand" });
    this.upload = page.getByRole("button", { name: "Bestand kiezen" });
    this.skipButton = page.getByRole("button", { name: "Stap overslaan en stembureaus later toevoegen" });
    this.main = page.getByRole("main");
  }

  async uploadFile(page: Page, path: string) {
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Bestand kiezen").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path);
  }

  async fileTooLargeError(page: Page, path: string) {
    await expect(this.error).toBeVisible();
    await expect(page.getByRole("strong").filter({ hasText: path })).toBeVisible();
  }
}
