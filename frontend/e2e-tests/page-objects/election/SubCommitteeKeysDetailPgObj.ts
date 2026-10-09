import type { Locator, Page } from "@playwright/test";
import { DeleteCertificateModal } from "./DeleteCertificateModalPgObj";

export class SubCommitteeKeysDetail {
  readonly deleteCertificateModal: DeleteCertificateModal;
  readonly header: Locator;
  readonly subHeader: Locator;
  readonly publicKeyDeleted: Locator;
  readonly alertPublicKeyDeleted: Locator;

  constructor(protected readonly page: Page) {
    this.deleteCertificateModal = new DeleteCertificateModal(page);
    this.header = page.getByRole("heading", {
      level: 1,
      name: "Sleutels van GSB's beheren",
    });
    this.subHeader = page.getByRole("heading", {
      level: 2,
      name: "Publieke sleutel(s) GSB Heemdamseburg",
    });

    this.publicKeyDeleted = page.getByRole("strong").filter({
      hasText: /^Publieke sleutel Heemdamseburg verwijderd$/,
    });
    this.alertPublicKeyDeleted = page.getByRole("alert").filter({ has: this.publicKeyDeleted });
  }

  getCertificateInfo(fingerprint: string) {
    return this.page.getByTestId(`certificate-${fingerprint}`);
  }

  async clickDeleteCertificate(fingerprint: string) {
    await this.getCertificateInfo(fingerprint).getByRole("button", { name: "Verwijderen" }).click();
  }
}
