import { type Locator, type Page } from "@playwright/test";

export class UploadCandidateDefinitionPgObj {
  readonly header: Locator;
  readonly error: Locator;
  readonly upload: Locator;
  readonly main: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Importeer kandidatenlijsten" });
    this.error = page.getByRole("strong").filter({ hasText: "Ongeldige kandidatenlijsten" });
    this.upload = page.getByRole("button", { name: "Bestand kiezen" });
    this.main = page.getByRole("main");
  }

  async uploadFile(path: string) {
    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await this.page.getByText("Bestand kiezen").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path);
  }

  fileTooLargeError(filename: string) {
    return this.page.getByRole("strong").filter({ hasText: filename });
  }
}
