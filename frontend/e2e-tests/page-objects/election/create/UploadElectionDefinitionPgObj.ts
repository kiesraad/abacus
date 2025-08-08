import { type Locator, type Page } from "@playwright/test";

export class UploadElectionDefinitionPgObj {
  readonly header: Locator;
  readonly error: Locator;
  readonly upload: Locator;
  readonly main: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" });
    this.error = page.getByRole("strong").filter({ hasText: "Ongeldige verkiezingsdefinitie" });
    this.upload = page.getByRole("button", { name: "Bestand kiezen" });
    this.main = page.getByRole("main");
  }

  async uploadFile(page: Page, path: string) {
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Bestand kiezen").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path);
  }
}
