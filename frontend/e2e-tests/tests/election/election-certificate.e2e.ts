import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { ElectionCertificate } from "e2e-tests/page-objects/election/ElectionCertificatePgObj";
import { ElectionHome } from "e2e-tests/page-objects/election/ElectionHomePgObj";
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
