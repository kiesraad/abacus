import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { ElectionCertificate } from "e2e-tests/page-objects/election/ElectionCertificatePgObj";
import { ElectionHome } from "e2e-tests/page-objects/election/ElectionHomePgObj";
import { SubCommitteeKeysDetail } from "e2e-tests/page-objects/election/SubCommitteeKeysDetailPgObj";
import { SubCommitteeKeysOverview } from "e2e-tests/page-objects/election/SubCommitteeKeysOverviewPgObj";
import {
  certificate_0123_Heemdamseburg,
  certificate_0123_Heemdamseburg_expired,
} from "e2e-tests/test-data/certificates";
import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/admin1.json",
});

test.describe("election certificate", () => {
  test("download public key and mark it registered", async ({ page, emptyElectionGSB }) => {
    await page.goto(`/elections/${emptyElectionGSB.id}`);

    const electionHomePage = new ElectionHome(page);
    await expect(electionHomePage.alertRegisterPublicKey).toBeVisible();
    await electionHomePage.alertRegisterPublicKeyButton.click();

    const certificatePage = new ElectionCertificate(page);
    await expect(certificatePage.header).toBeVisible();
    await expect(certificatePage.downloadCertificate).toHaveAccessibleDescription(/Organisatie: GR2022_Test/);
    await expect(certificatePage.downloadCertificate).toHaveAccessibleDescription(/Algemene naam: Gemeente Test/);
    await expect(certificatePage.downloadCertificate).toHaveAccessibleDescription(
      /Handtekeningalgoritme: RSA 4096-bit/,
    );

    const responsePromise = page.waitForResponse(`/api/elections/${emptyElectionGSB.id}/certificate`);
    const downloadPromise = page.waitForEvent("download");
    await certificatePage.downloadCertificate.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("public_key_abacus_gr2022_test_gemeente_test.crt");
    const certificate = await readFile(await download.path(), "utf8");
    expect(certificate).toMatch(/^-----BEGIN CERTIFICATE-----\n[A-Za-z0-9+/=\n]+-----END CERTIFICATE-----\n?$/);

    await certificatePage.uploadDone.click();

    await expect(page).toHaveURL(`/elections/${emptyElectionGSB.id}`);
    await expect(electionHomePage.alertPublicKeyRegistered).toBeVisible();
    await expect(electionHomePage.alertRegisterPublicKey).toBeHidden();
  });
});

test.describe("GSB certificates", () => {
  test("upload public keys for a GSB and then delete them", async ({ page, emptyElectionCSBWS }) => {
    await page.goto(`/elections/${emptyElectionCSBWS.id}`);

    const electionHomePage = new ElectionHome(page);
    await expect(electionHomePage.importKeysButton).toBeVisible();
    await electionHomePage.importKeysButton.click();

    const overviewPage = new SubCommitteeKeysOverview(page);
    await expect(overviewPage.header).toBeVisible();
    await expect(overviewPage.subHeader).toBeVisible();
    await expect(overviewPage.pendingTableHeader).toBeVisible();
    await expect(overviewPage.pendingTable).toBeVisible();
    await expect(overviewPage.pendingSubCommittees).toHaveCount(4);
    await expect(overviewPage.pendingSubCommittees).toContainText([
      "'s-Gravenveen",
      "Heemdamseburg",
      "Juinen",
      "Middelgein",
    ]);
    await expect(overviewPage.importedTableHeader).toBeHidden();
    await expect(overviewPage.importedTable).toBeHidden();

    // Upload an expired certificate for a GSB
    await overviewPage.uploadFile(certificate_0123_Heemdamseburg_expired.path);

    await expect(overviewPage.alertPublicKeyAdded).toBeVisible();
    await expect(overviewPage.alertPublicKeyAdded).toContainText(
      "Let op: Deze sleutel is verlopen op 18 juni 2026, maar kan wel gebruikt worden. Neem bij twijfel contact op met het GSB van Heemdamseburg of de Kiesraad.",
    );

    await expect(overviewPage.pendingTableHeader).toBeVisible();
    await expect(overviewPage.pendingTable).toBeVisible();
    await expect(overviewPage.pendingSubCommittees).toHaveCount(3);
    await expect(overviewPage.pendingSubCommittees).toContainText(["'s-Gravenveen", "Juinen", "Middelgein"]);
    await expect(overviewPage.importedTableHeader).toBeVisible();
    await expect(overviewPage.importedTable).toBeVisible();
    await expect(overviewPage.importedSubCommittees).toHaveCount(1);
    await expect(overviewPage.importedSubCommittees).toContainText(["Heemdamseburg"]);

    await overviewPage.clickSubCommitteeFromList("0123");

    const detailPage = new SubCommitteeKeysDetail(page);
    await expect(detailPage.header).toBeVisible();
    await expect(detailPage.subHeader).toBeVisible();
    const firstCert = detailPage.getCertificateInfo(certificate_0123_Heemdamseburg_expired.fingerprint);
    await expect(firstCert).toContainText(
      [
        "Organisatie: AB2023_RivierenPolder",
        "Organisatorische eenheid: Abacus 1.1.0",
        "Algemene naam: Gemeente Heemdamseburg",
        "Geldig vanaf: 1 oktober 2025",
        "Geldig tot en met: 18 juni 2026",
        "Handtekeningalgoritme: RSA 4096-bit",
      ].join(""),
    );
    await expect(firstCert).toContainText("Publieke sleutel GSB Heemdamseburg AB2023_RivierenPolder");
    await expect(firstCert.getByRole("button", { name: "Verwijderen" })).toBeVisible();

    // Now go back and upload a valid certificate for the same GSB
    await page.goBack();

    await overviewPage.uploadFile(certificate_0123_Heemdamseburg.path);

    await expect(overviewPage.alertPublicKeyAdded).toBeVisible();
    await expect(overviewPage.alertPublicKeyAdded).not.toContainText(
      "Let op: Deze sleutel is verlopen op 18 juni 2026, maar kan wel gebruikt worden. Neem bij twijfel contact op met het GSB van Heemdamseburg of de Kiesraad.",
    );

    await overviewPage.clickSubCommitteeFromList("0123");

    await expect(detailPage.header).toBeVisible();
    await expect(detailPage.subHeader).toBeVisible();
    await expect(firstCert).toContainText(
      [
        "Organisatie: AB2023_RivierenPolder",
        "Organisatorische eenheid: Abacus 1.1.0",
        "Algemene naam: Gemeente Heemdamseburg",
        "Geldig vanaf: 1 oktober 2025",
        "Geldig tot en met: 18 juni 2026",
        "Handtekeningalgoritme: RSA 4096-bit",
      ].join(""),
    );
    await expect(firstCert).toContainText("Publieke sleutel GSB Heemdamseburg AB2023_RivierenPolder");
    await expect(firstCert.getByRole("button", { name: "Verwijderen" })).toBeVisible();

    const secondCert = detailPage.getCertificateInfo(certificate_0123_Heemdamseburg.fingerprint);
    await expect(secondCert).toContainText(
      [
        "Organisatie: AB2023_RivierenPolder",
        "Organisatorische eenheid: Abacus 1.1.0",
        "Algemene naam: Gemeente Heemdamseburg",
        "Geldig vanaf: 1 oktober 2026",
        "Geldig tot en met: 18 juni 2033",
        "Handtekeningalgoritme: RSA 4096-bit",
      ].join(""),
    );
    await expect(secondCert).toContainText("Publieke sleutel GSB Heemdamseburg AB2023_RivierenPolder");
    await expect(secondCert.getByRole("button", { name: "Verwijderen" })).toBeVisible();

    await detailPage.clickDeleteCertificate(certificate_0123_Heemdamseburg_expired.fingerprint);

    await expect(detailPage.deleteCertificateModal.header).toBeVisible();
    await detailPage.deleteCertificateModal.deleteButton.click();

    await expect(detailPage.alertPublicKeyDeleted).toBeVisible();
    await expect(detailPage.alertPublicKeyDeleted).toContainText(
      "De sleutel is verwijderd. Onderstaande sleutels zijn nog aanwezig.",
    );

    await detailPage.clickDeleteCertificate(certificate_0123_Heemdamseburg.fingerprint);

    await expect(detailPage.deleteCertificateModal.header).toBeVisible();
    await detailPage.deleteCertificateModal.deleteButton.click();

    await expect(overviewPage.header).toBeVisible();
    await expect(overviewPage.subHeader).toBeVisible();
    await expect(overviewPage.alertPublicKeyDeleted).toBeVisible();
    await expect(overviewPage.alertPublicKeyDeleted).not.toContainText(
      "De sleutel is verwijderd. Onderstaande sleutels zijn nog aanwezig.",
    );
    await expect(overviewPage.pendingTableHeader).toBeVisible();
    await expect(overviewPage.pendingTable).toBeVisible();
    await expect(overviewPage.pendingSubCommittees).toHaveCount(4);
    await expect(overviewPage.pendingSubCommittees).toContainText([
      "'s-Gravenveen",
      "Heemdamseburg",
      "Juinen",
      "Middelgein",
    ]);
    await expect(overviewPage.importedTableHeader).toBeHidden();
    await expect(overviewPage.importedTable).toBeHidden();
  });
});
