import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page } from "@playwright/test";
import { test } from "e2e-tests/fixtures";
import { DataEntryImportCheckAndSavePgObj } from "e2e-tests/page-objects/data_entry_import/DataEntryImportCheckAndSavePgObj";
import { DataEntryImportHashCheckPgObj } from "e2e-tests/page-objects/data_entry_import/DataEntryImportHashCheckPgObj";
import { DataEntryImportPgObj } from "e2e-tests/page-objects/data_entry_import/DataEntryImportPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { eml230b, eml510b } from "e2e-tests/test-data/eml-files";
import { zipSync } from "fflate";

const [emlData, signatureData] = await Promise.all([readFile(eml510b.emlPath), readFile(eml510b.signaturePath)]);

type InvalidFileCase = {
  name: string;
  buffer: Buffer;
  error: (importPage: DataEntryImportPgObj) => Locator;
};

const invalidFileCases: InvalidFileCase[] = [
  {
    name: "missing signature",
    buffer: Buffer.from(zipSync({ "telling.eml.xml": emlData })),
    error: (p) => p.errorSignatureMissing,
  },
  {
    name: "altered EML (signature mismatch)",
    buffer: Buffer.from(
      zipSync({
        "telling.eml.xml": Buffer.concat([emlData, Buffer.from("\n")]),
        "telling.eml.xml.signature": signatureData,
      }),
    ),
    error: (p) => p.errorSignatureMismatch,
  },
  {
    name: "ZIP without EML",
    buffer: Buffer.from(
      zipSync({
        "telling.eml.xml.signature": signatureData,
      }),
    ),
    error: (p) => p.errorInvalidZip,
  },
  {
    name: "ZIP with more than one EML",
    buffer: Buffer.from(
      zipSync({
        "telling1.eml.xml": emlData,
        "telling2.eml.xml": emlData,
        "telling.eml.xml.signature": signatureData,
      }),
    ),
    error: (p) => p.errorInvalidZip,
  },
  {
    name: "a file that is not a ZIP",
    buffer: Buffer.from("not zip data"),
    error: (p) => p.errorInvalidZip,
  },
];

async function openImportPage(page: Page, electionId: number): Promise<DataEntryImportPgObj> {
  await page.goto(`/elections/${electionId}/status`);
  const electionStatusPage = new ElectionStatus(page);
  await electionStatusPage.buttonImportCount.click();
  const dataEntryImportPage = new DataEntryImportPgObj(page);
  await expect(dataEntryImportPage.header).toBeVisible();
  return dataEntryImportPage;
}

// Override the candidate list to match it with the lists in the 510b
// (otherwise the import fails with 'Invalid data').
test.use({ eml230b_more_than_45_candidates: eml230b });

test.describe(`data entry import GSB 510b into CSB election`, () => {
  test("imports a GSB count file, shows it as imported and refuses a second import", async ({
    coordinatorOneCSB,
    electionCSBLargeCouncilWithSubCommitteeCertificate,
  }) => {
    const { election, subCommittee } = electionCSBLargeCouncilWithSubCommitteeCertificate;
    const { page } = coordinatorOneCSB;
    const dataEntryImportPage = await openImportPage(page, election.id);
    const electionStatusPage = new ElectionStatus(page);

    // Create valid zip and upload.
    const zipValid = Buffer.from(
      zipSync({
        "telling.eml.xml": emlData,
        "telling.eml.xml.signature": signatureData,
      }),
    );
    await dataEntryImportPage.uploadFile({
      name: eml510b.zipFileName,
      mimeType: "application/zip",
      buffer: zipValid,
    });

    // Hash check page.
    await expect(dataEntryImportPage.main).toContainText(eml510b.zipFileName);
    await expect(dataEntryImportPage.main).toContainText(eml510b.electionDate);

    // Incorrect hash.
    const hashCheckPage = new DataEntryImportHashCheckPgObj(page);
    await expect(hashCheckPage.header).toBeVisible();
    await hashCheckPage.inputHash("1234", "abcd");
    await expect(hashCheckPage.error).toBeVisible();

    // Correct hash.
    await hashCheckPage.hashInput1.click(); // Input needs focus again.
    await hashCheckPage.inputHashFrom(eml510b.fullHash);

    // Check and save.
    const dataEntryImportCheckAndSavePage = new DataEntryImportCheckAndSavePgObj(page);
    await expect(dataEntryImportCheckAndSavePage.header).toBeVisible();
    await expect(dataEntryImportCheckAndSavePage.description).toBeVisible();
    await expect(dataEntryImportCheckAndSavePage.electionName).toContainText(election.name);
    await expect(dataEntryImportCheckAndSavePage.committeeCategory).toContainText("Gemeentelijk stembureau");
    await expect(dataEntryImportCheckAndSavePage.areaDesignation).toContainText(
      `${subCommittee.authority_name} (${subCommittee.authority_id})`,
    );
    await expect(dataEntryImportCheckAndSavePage.saveButton).toBeVisible();
    await dataEntryImportCheckAndSavePage.saveButton.click();

    // Back at the status page.
    await expect(electionStatusPage.buttonImportCount).toBeVisible();

    // Confirmation alert.
    await expect(electionStatusPage.alertDataEntryImportSuccess).toBeVisible();

    // Table row.
    const row = electionStatusPage.firstEntryFinished.getByRole("row", { name: subCommittee.name });
    await expect(row).toContainText("Geïmporteerd");

    // Start import flow again.
    await electionStatusPage.buttonImportCount.click();
    await expect(dataEntryImportPage.header).toBeVisible();

    // Upload same zip again (error `DataEntryAlreadyImported`).
    await dataEntryImportPage.uploadFile({
      name: eml510b.zipFileName,
      mimeType: "application/zip",
      buffer: zipValid,
    });
    await expect(dataEntryImportPage.errorDataEntryAlreadyImported).toBeVisible();
    await dataEntryImportPage.buttonAbort.click();
    await expect(row).toContainText("Geïmporteerd");
  });

  test("abort returns to the status page", async ({ coordinatorOneCSB, electionCSBLargeCouncil }) => {
    const { election } = electionCSBLargeCouncil;
    const { page } = coordinatorOneCSB;
    const dataEntryImportPage = await openImportPage(page, election.id);
    const electionStatusPage = new ElectionStatus(page);

    await expect(dataEntryImportPage.buttonAbort).toBeVisible();
    await dataEntryImportPage.buttonAbort.click();
    await expect(electionStatusPage.buttonImportCount).toBeVisible();
  });

  test.describe("invalid files", () => {
    for (const { name, buffer, error } of invalidFileCases) {
      test(`shows an error for ${name}`, async ({
        coordinatorOneCSB,
        electionCSBLargeCouncilWithSubCommitteeCertificate,
      }) => {
        const { election } = electionCSBLargeCouncilWithSubCommitteeCertificate;
        const dataEntryImportPage = await openImportPage(coordinatorOneCSB.page, election.id);
        await dataEntryImportPage.uploadFile({
          name: eml510b.zipFileName,
          mimeType: "application/zip",
          buffer: buffer,
        });
        await expect(error(dataEntryImportPage)).toBeVisible();
      });
    }
  });
});
