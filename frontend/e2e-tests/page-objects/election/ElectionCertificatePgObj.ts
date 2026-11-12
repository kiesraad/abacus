import type { Locator, Page } from "@playwright/test";

export class ElectionCertificate {
  readonly header: Locator;
  readonly downloadCertificate: Locator;
  readonly uploadDone: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Publieke sleutel" });
    this.downloadCertificate = page.getByRole("link", { name: /Download crt-bestand/ });
    this.uploadDone = page.getByRole("button", { name: "Ik heb dit gedaan" });
  }
}
